import re
import spacy

from collections import Counter
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

nlp = spacy.load("en_core_web_sm")
imsg_reaction_words = ["loved", "liked", "disliked", "laughed", "emphasized", "questioned", "reacted"]
other_stop_words = ["im", "u", "ill", "na", "ur"]
stop_words = set(stopwords.words('english') + 
                 list(nlp.Defaults.stop_words) + 
                 imsg_reaction_words + 
                 other_stop_words)

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

