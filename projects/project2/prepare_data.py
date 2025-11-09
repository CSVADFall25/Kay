import re
import csv
import spacy
import string
import pandas as pd

from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from collections import Counter

pd.set_option('display.max_columns', None)

nlp = spacy.load("en_core_web_sm")
imsg_reaction_words = ["loved", "liked", "disliked", "laughed", "emphasized", "questioned", "reacted"]
other_stop_words = ["im", "u", "ill", "na", "ur"]
stop_words = set(stopwords.words('english') + 
                 list(nlp.Defaults.stop_words) + 
                 imsg_reaction_words + 
                 other_stop_words)

dtypes = {
    "text": str,
    "is_from_me": bool,
    "is_emote": bool,
    "is_audio_message": bool,
    "phone_number": str,
}

contacts = pd.read_csv("data/contacts.csv").drop(columns=["Z_PK_x", "Z_PK_y"])
msgs = pd.read_csv("data/messages.csv", dtype=dtypes).drop(columns=["chat_id", "handle_id"])

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


def most_common_words(texts, get_all=False):
    all_text = ' '.join(texts).lower().replace("'", ' ')
    cleaned_text = re.sub(r'[^\w\s]', '', all_text)

    # translator = str.maketrans('', '', string.punctuation)
    # cleaned_string = cleaned_text.translate(translator)

    word_tokens = word_tokenize(cleaned_text)
    words = [w for w in word_tokens if w not in stop_words and w.strip() != '']

    if not words:
        return None
    c = Counter(words)
    top_10 = c.most_common(10)

    # Find the most common word longer than 5 letters
    long_words = [word for word in words if len(word) > 5]
    if not long_words:
        most_common_long_word = None
    else:
        c_long = Counter(long_words)
        most_common_long_word = c_long.most_common(1)[0]

    if not get_all:
        return top_10 + [most_common_long_word]
    else:
        return c.most_common(100) # still just do 100 for brevity

def most_common_emoji(texts):
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags (iOS)
        "\U00002700-\U000027BF"  # Dingbats
        "\U0001F900-\U0001F9FF"  # Supplemental Symbols and Pictographs
        "\U00002600-\U000026FF"  # Misc symbols
        "]", flags=re.UNICODE)  # Removed '+' to match single emoji characters
    emojis = []
    for text in texts:
        emojis.extend(emoji_pattern.findall(text))
    if not emojis:
        return None
    return Counter(emojis).most_common(1)[0]

def print_group_stats(grouped_df, group_name):
    print(f"\nStatistics for texts grouped by {group_name}:")
    for group_keys, group_data in grouped_df:
        texts = group_data['text']
        count = len(texts)
        common_word = most_common_words(texts)
        common_emoji = most_common_emoji(texts)
        print(f"{group_name} {group_keys}: count={count}, most_common_words={common_word}, most_common_emoji={common_emoji}")


def text_counter(df):
    # Group by year and count texts
    yearly_counts = df.groupby('year').size()
    print("\nTexts sent per year:")
    print(yearly_counts)

    # Group by year and month and count texts
    monthly_counts = df.groupby(['year', 'month']).size()
    print("\nTexts sent per year and month:")
    print(monthly_counts)

    # Group by year, month, and day and count texts
    daily_counts = df.groupby(['year', 'month', 'day']).size()
    print("\nTexts sent per year, month, and day:")
    print(daily_counts)
    
    # Group by year and get stats
    yearly_groups = df.groupby('year')
    print_group_stats(yearly_groups, "year")
    
    # Group by year and month and get stats
    monthly_groups = df.groupby(['year', 'month'])
    print_group_stats(monthly_groups, "year-month")
    
    # Group by year, month, and day and get stats
    daily_groups = df.groupby(['year', 'month', 'day'])
    # print_group_stats(daily_groups, "year-month-day")


# text_counter(df)

print(f"{'=' * 20}")

overall_common_word = most_common_words(df[df['is_from_me'] == 1]['text'], get_all=True)
overall_common_emoji = most_common_emoji(df[df['is_from_me'] == 1]['text'])
print(f"most_common_words={overall_common_word}, most_common_emoji={overall_common_emoji}")
text_counter(df[df['is_from_me'] == 1])


df.to_csv("data/clean_data.csv", index=False, quoting=csv.QUOTE_ALL)
