import csv
import pandas as pd
pd.set_option('display.max_columns', None)

dtypes = {
    "text": str,
    "is_from_me": bool,
    "is_spam": bool,
    "is_emote": bool,
    "is_audio_message": bool,
    "phone_number": str,
}

contacts = pd.read_csv("data/contacts.csv").drop(columns=["Z_PK_x", "Z_PK_y"])
msgs = pd.read_csv("data/messages.csv", dtype=dtypes).drop(columns=["chat_id", "handle_id"])

print(len(contacts))
print(len(msgs))

# print(msgs.head())

df = pd.merge(msgs, contacts, how="inner")
print(df.head())

df.to_csv("data/clean_data.csv", index=False, quoting=csv.QUOTE_ALL)
