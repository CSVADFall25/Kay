# README

## Process, Reflection, and Outcomes

I was curious about my texting data and also wanted to do some basic natural language processing/analysis on it, so I decided to go with text message data. It's not hollistically representative of all my conversations since there are other platforms like WhatsApp, Discord, etc that I exclusively talk to certain people on; it also only has texts stored from mid-2021 onward, but I figured it would be interesting to explore my texting trends nonetheless. 

Some statistics and comparisons I was interested in was seeing how many texts I had across the years, as well as with which people (and also looking at the breakdown of proportion of texts sent to received). To start with this, I originally started with d3's example code for a circle packing chart (https://observablehq.com/@d3/zoomable-circle-packing) and focused on preprocessing and parsing the data to make it in a format that would be compatible to this. 

I used a variety of python scripts for preprocessing and obtaining the data I wanted; I had to access both the messages database (chats.db) as well as a contacts database in order to  obtain all text messages and then link the the sender/receiver phone numbers to contacts in my address book application (I wanted to see the names of various people I had texted with, rather than just look at numbers). On the natural language processing side, I wanted to analyze common words and emojis used across my texts with different people, so I also wrote functions to parse text messages, remove stopwords and common words, and store these with their associated person and year sent as well. I wrote functions to help organize and sort the data by year, person and sent/received to create the initial JSON file that the d3 chart could ingest on the frontend. This allowed basic interaction with the circles in the chart and viewing the number of messages sent across each year and person to boot.

ChatGPT was used to help modify and build on the original d3 example. Since I wanted to look at common words and emojis, I added a bar graph that display the common words for each circle that is hovered over, labeled with the number of occurances per word. 

Something that I was also personally interested in was looking at common sites/links I had sent to others. I found the most cmmon sites to display on the right, and wanted to investigate further into the top sites (in my case, youtube and spotify) that I had linked. I used the Youtube API as well as the Spotify API to fetch (a) the corresponding video title for a video linked and (b) the artist for a sent Spotify song. I then did more natural language analysis to determine common words in Youtube videos I've sent as well as most common musical artists I've sent. Hovering over the bars on these two websites thus shows this breakdown split out on the far right side.

Outcomes: Deciding on my final grouping of data for the bubble/circle chart took a few different iterations. Originally, I was thinking about sorting by in order of year > month > person, but I also wanted to look at the breakdown between common words and emojis I have sent compared to what other people have sent me/I have received. I then tried splitting sent/received > year > person, but this created an unintuitive visualization with respect to time frame. I finally decided to visualize by year > person > sent/received so that I could have an idea of size of conversations by time period and then person, and then within each person and time frame compare common words sent and received.

I also later added an additional checkbox to filter out more common words, because upon initial data processing I found that I used a lot of words in my text conversations like 'lol', 'yes', 'like', etc that aren't super meaningful (but nonetheless indicative of the content of conversations...). An unintential outcome of this is that I'm now a little more aware of when I type out yet another 'lol.' Regardless, adding the extra filter further removes some more of these common words when selected, but I still end up with a good amount of words that could subjectively be considered filler. 

Reflection: In the future I think it would be cool to expand on this by going deeper into links/sites sent and exploring trends across other websites other than just Spotify and Youtube. I also think I could implement better language processing and word filtering, as mentioned above; even after extra filtering a lot of common word trends I see are still quite common words, and I think it would be interesting to explore unique words in conversations between different people or more nuanced differences across years. 

## Requirements

- MacOS in order to access messages and contact information databases.

    - You have to provide full disk access to VSCode and/or terminal in `Settings > Privacy and Security > Full Disk Access` in order to access the chat and contacts database files. 
- Spotify Developer API key to query spotify for track information (to get artists for a linked track)  
- Google Developer/Cloud API key to query youtube v3 API for youtube title information from linked videos
- Libraries to pip install for NLP:
    - python3 -m pip install nltk
    - python3 -m pip install spacy
    - python3 -m spacy download en_core_web_sm