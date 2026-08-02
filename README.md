# AQ Dashboard

A Blazor Server examole air quality dashboard: live monitoring data, dispersion-model contour
visualisation, and a full year of historical per-pollutant analysis.

## Pages

- **Home** (`/`) — landing page with links to the other pages.
- **Map View** (`/mapview`) — dispersion-model contour plots on a Leaflet map (OpenStreetMap
  base layer, toggleable satellite overlay), hourly playback, and a wind rose.
- **Live API downloads** (`/airquality`) — live readings from the Queensland Government
  Air Quality API for a selected station, with a time-series chart and wind rose.
- **Long Term Analysis** (`/longterm-analysis`) — a year of hourly data, broken down per
  pollutant: monthly averages, a pollution rose, a month-by-hour heatmap, a diurnal
  profile, and a 24-hour trend with NEPM guideline reference lines where one exists.

## Running it

```bash
dotnet run
```

Opens at `http://localhost:5180` by default.

## Data

Map View and Long Term Analysis read from a `Data/` folder (grid files, met data, and a
long-term CSV — paths configured in `appsettings.json`). That folder isn't part of this
repo. To get Map View working locally, generate a synthetic grid/met dataset with:

```powershell
scripts/generate-sample-data.ps1
```

Long Term Analysis expects its own hourly CSV at the path set in `appsettings.json`
under `AppConfig:LongTermAqDataPath` — point that at any file with the same column
layout to try it out.

The live API page doesn't need any of this; it talks to QLD Government's public API
directly.

## Stack

.NET 10, Blazor Server, Leaflet + d3-contour, Chart.js, Bootstrap.

## Project layout

```
Components/
  Layout/       app shell — sidebar nav, reconnect modal
  Pages/        one file per route
Services/       grid/DSAA parsing, wind rose math, QLD AQ API client, long-term CSV loader
wwwroot/js/     Leaflet/d3 map interop, Chart.js interop, wind rose SVG rendering
```
