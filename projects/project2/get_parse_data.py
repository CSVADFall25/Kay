"""
Extract the data from the apple database files
Do some basic cleaning/filtering and save parsed down data to CSVs
"""

import re
import sqlite3
import pandas as pd
import csv

pd.set_option('display.max_columns', None)

lib_path = "/Users/KayK/Library/"
chat_db_path = f"{lib_path}/Messages/chat.db"
contacts_db_path = f"{lib_path}/Application Support/AddressBook/Sources/421B0BD6-7A47-414B-81EC-0ABE220BC4E2/AddressBook-v22.abcddb"

"""
Chat data i can use for my reference:


Index(['ROWID', 'guid', 'text', 'replace', 'service_center', 'handle_id',
       'subject', 'country', 'attributedBody', 'version', 'type', 'service',
       'account', 'account_guid', 'error', 'date', 'date_read',
       'date_delivered', 'is_delivered', 'is_finished', 'is_emote',
       'is_from_me', 'is_empty', 'is_delayed', 'is_auto_reply', 'is_prepared',
       'is_read', 'is_system_message', 'is_sent', 'has_dd_results',
       'is_service_message', 'is_forward', 'was_downgraded', 'is_archive',
       'cache_has_attachments', 'cache_roomnames', 'was_data_detected',
       'was_deduplicated', 'is_audio_message', 'is_played', 'date_played',
       'item_type', 'other_handle', 'group_title', 'group_action_type',
       'share_status', 'share_direction', 'is_expirable', 'expire_state',
       'message_action_type', 'message_source', 'associated_message_guid',
       'associated_message_type', 'balloon_bundle_id', 'payload_data',
       'expressive_send_style_id', 'associated_message_range_location',
       'associated_message_range_length', 'time_expressive_send_played',
       'message_summary_info', 'ck_sync_state', 'ck_record_id',
       'ck_record_change_tag', 'destination_caller_id', 'sr_ck_sync_state',
       'sr_ck_record_id', 'sr_ck_record_change_tag', 'is_corrupt',
       'reply_to_guid', 'sort_id', 'is_spam', 'has_unseen_mention',
       'thread_originator_guid', 'thread_originator_part',
       'syndication_ranges', 'was_delivered_quietly', 'did_notify_recipient',
       'synced_syndication_ranges', 'date_retracted', 'date_edited',
       'was_detonated', 'part_count', 'is_stewie', 'is_sos', 'is_critical',
       'bia_reference_id', 'is_kt_verified', 'fallback_hash',
       'associated_message_emoji', 'is_pending_satellite_send', 'needs_relay',
       'schedule_type', 'schedule_state', 'sent_or_received_off_grid'],
      dtype='object')

"""

conn = sqlite3.connect(chat_db_path)
conn2 = sqlite3.connect(contacts_db_path)

# connect to database
cur = conn.cursor()
cur2 = conn2.cursor()

cur.execute("select name from sqlite_master where type = 'table'")
# for name in cur.fetchall():
#     print(name)
print(f"{'-' * 20}")
cur2.execute("select name from sqlite_master where type = 'table'")


# Read ZABCDRECORD and ZABCDPHONENUMBER, join on ZABCDPHONENUMBER.ZOWNER = ZABCDRECORD.Z_PK, keep ZFIRSTNAME and ZLASTNAME from ZABCDRECORD
zabcdrecord = pd.read_sql_query("select Z_PK, ZFIRSTNAME, ZLASTNAME from ZABCDRECORD", conn2)
zabcdphonenumber = pd.read_sql_query("select * from ZABCDPHONENUMBER", conn2)
contacts = pd.merge(zabcdphonenumber, zabcdrecord, left_on="ZOWNER", right_on="Z_PK", how="inner")
contacts = contacts[[
    "ZFULLNUMBER",
    "ZLASTFOURDIGITS",
    "ZFIRSTNAME",
    "ZLASTNAME",
    "ZOWNER",
    "Z_PK_x",
    "Z_PK_y",
    # "ZUNIQUEID"
]]

# Function to standardize phone numbers
def standardize_phone_number(number):
    if "(" not in number and "+" in number:
        # already standardized, just return it
        return number
    
    country_code = number.split("(")[0].strip().replace('+', '')
    if country_code == '':
        country_code = '1' # default to US phone #
    else:
        number = number.split("(")[-1].strip()

    # Remove all characters except digits
    cleaned = re.sub(r'[^\d+]', '', number)

    return f"+{country_code}{cleaned}"

contacts['phone_number'] = contacts['ZFULLNUMBER'].apply(standardize_phone_number)
contacts['ZFIRSTNAME'] = contacts['ZFIRSTNAME'].fillna('')
contacts['ZLASTNAME'] = contacts['ZLASTNAME'].fillna('')
contacts['name'] = (contacts['ZFIRSTNAME'] + " " + contacts['ZLASTNAME']).str.strip()
df_contacts = contacts[[
    "name",
    "phone_number",
    "Z_PK_x",
    "Z_PK_y"
]]

print(contacts.head())
print(len(contacts))

messages = pd.read_sql_query("select * from message order by ROWID desc", conn) # limit 10000
print(f"{'-' * 20}")


# get the handles to apple-id mapping table
handles = pd.read_sql_query("select * from handle", conn)
# and join to the messages, on handle_id
messages.rename(columns={'ROWID' : 'message_id'}, inplace = True)
handles.rename(columns={'id' : 'phone_number', 'ROWID': 'handle_id'}, inplace = True)
merge_level_1 = temp = pd.merge(messages[['text', 
                                          'handle_id', 
                                          'date',
                                          'message_id',
                                          #'is_sent', seems to convey same info as 'is_from_me'
                                          'is_from_me',
                                          #'is_spam', none of these are marked as spam anyway
                                          'is_emote',
                                          'is_audio_message']],  
                                handles[['handle_id',
                                         'phone_number']],
                                on ='handle_id', how='left')

chats = pd.read_sql_query("select * from chat", conn)
#print(chats.iloc[10])
#print(handles.iloc[10])

# get the chat to message mapping
chat_message_joins = pd.read_sql_query("select * from chat_message_join", conn)
# and join back to the merge_level_1 table
df_messages = pd.merge(merge_level_1, chat_message_joins[['chat_id', 'message_id']], on = 'message_id', how='left')

print(len(df_messages))
# print(df_messages["text"].value_counts()) # helpful later on for getting common msgs?

df_messages = df_messages.dropna(subset="text")
print(len(df_messages))

# Convert nanoseconds to milliseconds (ms precision)
df_messages['date'] = df_messages['date'].divide(1000000)
# Convert Apple epoch (2001-01-01) milliseconds timestamp to human-readable datetime in Pacific Time
df_messages['date'] = pd.to_datetime(df_messages['date'], unit='ms', origin=pd.Timestamp('2001-01-01')).dt.round('1s')
df_messages['date'] = df_messages['date'].dt.tz_localize('UTC').dt.tz_convert('America/Los_Angeles').dt.tz_localize(None)
print(df_messages.head(10))

df_contacts.to_csv("data/contacts.csv",index=False)
df_messages.to_csv("data/messages.csv",index=False, quoting=csv.QUOTE_ALL)
