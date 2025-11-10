import pandas as pd

from utils import most_common_words

spotify_data = pd.read_csv("data/spotify_artists.csv")
youtube_data = pd.read_csv("data/youtube_titles.csv")

common_title_words = most_common_words(youtube_data['title'], get_all=True)
df = pd.DataFrame(common_title_words, columns=['word', 'count'])

df.to_csv("data/youtube_title_counts.csv", columns=['word', 'count'], index=False)