import pandas as pd

import requests
from tqdm import tqdm
from urllib.parse import urlparse, parse_qs

from config import YOUTUBE_API_KEY
from utils import most_common_words

def extract_video_id(url):
    """
    Extract the YouTube video ID from various URL formats.
    Returns None if the URL is a channel or invalid.
    """
    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    path = parsed.path

    # Ignore channel URLs
    if "channel" in path or "@" in path:
        return None

    # youtu.be short link
    if hostname in ["youtu.be"]:
        video_id = path.lstrip('/')
        return video_id

    # youtube.com URLs
    if hostname in ["www.youtube.com", "youtube.com"]:
        # Shorts URL
        if path.startswith("/shorts/"):
            return path.split("/")[2]
        # Watch URL
        if path == "/watch":
            query = parse_qs(parsed.query)
            return query.get("v", [None])[0]

    return None

def get_video_title(video_id):
    """
    Query the YouTube Data API to get the video title for a given video ID.
    """
    if not video_id:
        return None
    api_url = f"https://www.googleapis.com/youtube/v3/videos?part=snippet&id={video_id}&key={YOUTUBE_API_KEY}"
    response = requests.get(api_url)
    if response.status_code != 200:
        return None
    data = response.json()
    items = data.get("items", [])
    if not items:
        return None
    return items[0]["snippet"]["title"]

def get_video_titles_from_csv(csv_path):
    df = pd.read_csv(csv_path)
    titles = []
    for url in tqdm(df["text"]):
        # Extract video ID
        video_id = extract_video_id(url)
        if video_id:
            title = get_video_title(video_id)
            if title:
                titles.append((url, title))
    return titles

if __name__ == "__main__":
    csv_path = "./data/youtube_linked.csv"
    titles = get_video_titles_from_csv(csv_path)
    matched_titles = []
    for url, title in titles:
        print(f"{url} -> {title}")
        matched_titles.append([url, title])

    matched_titles = pd.DataFrame(matched_titles, columns=['link', 'title'])
    matched_titles.to_csv("data/youtube_titles.csv", index=False)

    common_title_words = most_common_words(matched_titles['title'], get_all=True)
    df = pd.DataFrame(common_title_words, columns=['word', 'count'])

    df.to_csv("data/youtube_title_counts.csv", columns=['word', 'count'], index=False)
