Keep unmodified original official CSV downloads here:

- `places_2025_county_gis.csv`: PLACES 2025 county GIS-friendly, CDC dataset i46a-9kgh.
- `svi_2022_us_county.csv`: SVI 2022, United States, Counties, national rankings.

Never substitute a tract file, concatenated state-ranked files, or simulated data.
The pipeline inspects actual columns and hashes these files at runtime.
Both files were supplied by the user and copied here without changing their contents.
The `.source.json` records in `../../docs/validation/sources/` record original filenames, source pages, file hashes and
local acquisition time; they do not assert an independently observed download time.
