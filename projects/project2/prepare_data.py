"""
Reads text message data and extracts statistics/information I want to display:
- Common words and emojis sent in each conversation (to/from each person) per year
- Various links sent, to find common websites I've linked in text messages
"""

import re
import csv
import json
import spacy
import string
import pandas as pd

from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from collections import Counter
from urllib.parse import urlparse

from utils import *

pd.set_option('display.max_columns', None)

dtypes = {
    "text": str,
    "is_from_me": bool,
    "is_emote": bool,
    "is_audio_message": bool,
    "phone_number": str,
}

contacts = pd.read_csv("data/contacts.csv").drop(columns=["Z_PK_x", "Z_PK_y"])
msgs = pd.read_csv("data/messages.csv", dtype=dtypes).drop(columns=["chat_id", "handle_id"])

contacts['first_name'] = contacts['name'].str.split().str[0].str.split('-').str[0]

print(len(contacts))
print(len(msgs))

df = pd.merge(msgs, contacts, how="inner")

# Convert 'date' column to datetime
df['date'] = pd.to_datetime(df['date'])

# Extract year, month, day, and time components
df['year'] = df['date'].dt.year
df['month'] = df['date'].dt.month
df['day'] = df['date'].dt.day
df['time'] = df['date'].dt.time.astype(str)

print(df.head())


def text_counter(df, remove_common_words=False):
    """
    Group a dataframe and count common words and emojis for text groupings
    This counts by year, and then by conversation/person
    Saves the stats to a JSON file to be used by the d3 functions in the sketch
    """

    # Group by year and count texts
    yearly_counts = df.groupby('year').size()
    print("\nTexts sent per year:")
    print(yearly_counts)

    # Group by year and month and count texts
    monthly_counts = df.groupby(['year', 'month']).size()
    print("\nTexts sent per year and month:")
    print(monthly_counts)

    # Group by year, name, and sent/received and count texts
    grouped_counts = df.groupby(['year', 'first_name', 'is_from_me']).size()
    print("\nTexts sent and received per year and person:")
    print(grouped_counts)

    is_from_me = {
        1: "Sent", 0: "Received"
    }
    
    # Convert daily_counts Series to nested dictionary with name/value objects
    # Hierarchy: Years > Names > Sent/Received
    nested_counts = []
    total_value = 0
    for year, people in grouped_counts.groupby(level=0):
        year_obj = {"name": str(year), "children": [], "value": 0}
        for person, sent_received in people.groupby(level=1):
            person_obj = {"name": person, "children": [], "value": 0}
            for (y, p, sent), count in sent_received.items():
                selected_info = df[((df["year"] == year) & (df["first_name"] == person) & (df["is_from_me"] == sent))]
                common_words = most_common_words(selected_info["text"], remove_common_words=remove_common_words)
                common_emoji = most_common_emoji(selected_info["text"])
                sent_received_obj = {"name": is_from_me[sent],
                                     "value": int(count),
                                     "common_words": common_words,
                                     "common_emoji": common_emoji}
                person_obj["children"].append(sent_received_obj)
                person_obj["value"] += int(count)
            year_obj["children"].append(person_obj)
            year_obj["value"] += person_obj["value"]
        nested_counts.append(year_obj)
        total_value += year_obj["value"]
    
    # Save nested_counts to JSON file
    if remove_common_words:
        file_name = "data/text_counts_no_common_words.json"
    else:
        file_name = "data/text_counts.json"
    with open(file_name, "w") as f:
        json.dump({"name": "lifetime", "children": nested_counts, "value": total_value}, f, indent=4)
        
    # Group by year and get stats
    yearly_groups = df.groupby('year')
    print_group_stats(yearly_groups, "year")
    
    # Group by year and month and get stats
    monthly_groups = df.groupby(['year', 'month'])
    print_group_stats(monthly_groups, "year-month")
    
    # Group by year, month, and day and get stats
    daily_groups = df.groupby(['year', 'month', 'day'])
    # print_group_stats(daily_groups, "year-month-day")


text_counter(df)
text_counter(df, remove_common_words=True)

print(f"{'=' * 20}")

df = df[df['is_from_me'] == 1] # only look at texts i've sent

overall_common_word = most_common_words(df['text'], get_all=True)
overall_common_emoji = most_common_emoji(df['text'])
print(f"most_common_words={overall_common_word}, most_common_emoji={overall_common_emoji}")

# df_links = df[df['text'].str.contains('link_pattern, na=False, case=False, regex=True')]
df_links = df[df['text'].str.contains('http')]
print(len(df_links))

spotify_df = df[df['text'].str.contains('open.spotify.com')]
spotify_df[['text']].to_csv("data/spotify_linked.csv", index=False)

youtube_df = df[df['text'].str.contains('youtu.be') | df['text'].str.contains('youtube.com')]
youtube_df[['text']].to_csv("data/youtube_linked.csv", index=False)

# Print the value counts of the base URLs in the text messages that are links
print("\nValue counts of base URLs in text messages that are links:")

def get_base_url(url):
    for word in imsg_reaction_words:
        if word in url.lower():
            return '' # it's just a reaction to a url, not a url that i sent
    try:
        parsed_url = urlparse(url)
        return parsed_url.netloc.replace('www.', '')
    except Exception:
        return url  # fallback to original if parsing fails

base_urls = df_links['text'].apply(get_base_url)
counts = base_urls.value_counts()
print(counts)

# Filter out base URLs with count of 1
filtered_counts = counts[counts > 1]

# Save to CSV
filtered_counts_df = filtered_counts.reset_index()
filtered_counts_df.columns = ['base_url', 'count']
filtered_counts_df = filtered_counts_df[filtered_counts_df['base_url'] != '']
filtered_counts_df.to_csv("data/websites_linked.csv", index=False)
