# Density Altitude PWA — Version 1.1

## Fix for the live-weather error
NOAA AviationWeather.gov explicitly blocks browser cross-origin requests. This version downloads METARs through a **GitHub Actions** scheduled job and serves a same-origin `weather.json` file through GitHub Pages. The job runs hourly (GitHub scheduling may be delayed). Observations older than 3 hours are rejected.

## Update your existing GitHub repository
1. Unzip this archive and upload **all files and folders**, including `.github/workflows/update-metar.yml` and `scripts/update_weather.py`, to the root of your existing repository. Overwrite the older files.
2. Go to **Settings → Actions → General → Workflow permissions** and select **Read and write permissions**; save.
3. Go to **Actions → Update METAR → Run workflow** and run it once.
4. Wait for the workflow to succeed and verify `weather.json` appears in the repository root.
5. Wait for GitHub Pages to deploy. On Pixel, close and reopen the PWA; refresh the site in Chrome if necessary. Tap **Load recent METAR**.

**Supported automatic airports:** KABQ, KSAF, K0E0. Other airports require manual inputs in this version.

## First installation
Create a public GitHub repository, upload these files to the repository root, and enable **Settings → Pages → Deploy from a branch → main → / (root)**. Install using Chrome's Add to Home screen option.

**Caution:** This is supplemental software, not an approved flight-planning source. Verify METAR age and aircraft POH/AFM performance.
