import spotipy
import pandas as pd

from spotipy.oauth2 import SpotifyClientCredentials, SpotifyOAuth

from config import CLIENT_ID, CLIENT_SECRET

spotify_links = pd.read_csv("data/spotify_linked.csv")

# Filter to keep only Spotify track links (exclude playlists and others)
def is_track_link(link):
    # Spotify track links have the format: https://open.spotify.com/track/{track_id}
    return "open.spotify.com/track/" in link

track_links = spotify_links['text'].dropna().unique()
track_links = [link for link in track_links if is_track_link(link)]

print(f"Found {len(track_links)} track links")


# auth_manager = SpotifyClientCredentials(client_id=client_id, client_secret=client_secret)

sp = spotipy.Spotify(auth_manager=SpotifyOAuth(client_id=CLIENT_ID,
                                                           client_secret=CLIENT_SECRET,
                                                           redirect_uri="http://127.0.0.1:8000",
                                                        scope="user-library-read"))

# Function to extract track ID from Spotify track URL
def extract_track_id(url):
    # URL format: https://open.spotify.com/track/{track_id}
    parts = url.split('/')
    if len(parts) > 4 and parts[3] == 'track':
        track_id = parts[4].split('?')[0]  # Remove any query params
        return track_id
    return None

# Query Spotify API for each track and collect artist names
artist_counts = {}

for link in track_links:
    track_id = extract_track_id(link)
    if not track_id:
        continue
    try:
        track = sp.track(track_id)
        artists = track['artists']
        for artist in artists:
            name = artist['name']
            artist_counts[name] = artist_counts.get(name, 0) + 1
    except Exception as e:
        print(f"Error fetching track {track_id}: {e}")

print(f"Processed {len(track_links)} tracks")

# Print artist counts sorted by frequency descending
print("\nArtist counts across linked tracks:")
artists = []
for artist, count in sorted(artist_counts.items(), key=lambda x: x[1], reverse=True):
    print(f"{artist}: {count}")
    artists.append([artist, count])

artists_df = pd.DataFrame(artists, columns=['artist', 'count'])
artists_df.to_csv("data/spotify_artists.csv",index=False)


