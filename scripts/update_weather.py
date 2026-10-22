#!/usr/bin/env python3
"""Server-side NOAA fetch: browsers cannot fetch AviationWeather.gov directly (CORS)."""
import json, urllib.request, datetime
from pathlib import Path
ids = ("KABQ", "KSAF", "K0E0")
url = "https://aviationweather.gov/api/data/metar?ids=" + ",".join(ids) + "&format=json"
req = urllib.request.Request(url, headers={"User-Agent":"DensityAltitudePWA/1.1 (personal aviation weather calculator)","Accept":"application/json"})
with urllib.request.urlopen(req, timeout=25) as response:
    observations = json.load(response)
if not isinstance(observations,list):
    raise ValueError("Unexpected NOAA METAR response")
stations = {m.get("icaoId"):m for m in observations if m.get("icaoId") in ids and m.get("obsTime") and m.get("temp") is not None and m.get("altim") is not None}
if not stations:
    raise ValueError("No valid METAR observations returned; keeping existing weather data")
Path("weather.json").write_text(json.dumps({"updatedUTC":datetime.datetime.now(datetime.timezone.utc).isoformat(),"stations":stations},separators=(",",":")))
print("Saved METARs:", ", ".join(stations))
