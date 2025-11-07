import pandas as pd

df = pd.read_csv("data/activities.csv")

# select the columns I'm interested in
df = df[["Activity Date", "Activity Type", "Moving Time", 
         "Distance", "Max Speed", "Average Speed", "Elevation Gain"]]

df["Activity Date"] = pd.to_datetime(df["Activity Date"], utc=True)
df["Activity Date"] = df["Activity Date"].dt.tz_convert('US/Pacific')
df["Activity Date"] = df["Activity Date"].astype(str) # need it to be str for sketch.js

# look at running data only
df = df[df["Activity Type"] == "Run"]

# convert sec to min
df["Moving Time"] = pd.to_numeric(df["Moving Time"]).divide(60)

# convert km data to mi 
df["Distance"] = pd.to_numeric(df["Distance"]).multiply(0.621371)
df["Max Speed"] = pd.to_numeric(df["Max Speed"]).divide(0.621371)
df["Average Speed"] = pd.to_numeric(df["Average Speed"]).divide(0.621371)
df["Speed"] =  df["Distance"] / (df["Moving Time"] / 60)

# m to ft
df["Elevation Gain"] = pd.to_numeric(df["Elevation Gain"]).multiply(3.28084)

# round to 3 decimal places
df = df.round(3)

df.to_csv("data/activities_cleaned.csv", index=False)

