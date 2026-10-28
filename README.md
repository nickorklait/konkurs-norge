# Konkurs-Norge – konkursene i Norge, hver morgen

An Instagram account that posts the bankruptcies in Norway every morning at 08:00, Monday to Saturday:
how many there were the previous working day against a normal day, by county and industry, how many
employees were affected and how old the companies were. Monday covers Friday and the weekend. Saturday
covers the week: per county per 100,000 inhabitants, and bankruptcies against new businesses per industry.

**Bankrupt companies are never named.** Behind many of them are individuals. The saved data
(`data/konkurs/<date>.json`) has no names and no organisation numbers, only the fields the counts use.

Built from the Trafikken project (same publishing, dashboard, Reels and controls) with the industry
grouping from Nytt i Bærum.

## Data

- **Bankruptcies:** Enhetsregisteret (data.brreg.no, NLOD). Every unit under bankruptcy has
  `konkurs=true` until the estate is wound up, a few thousand in all, so the whole set is read once a day
  and the recent ones taken by `konkursdato`. County from the business address (else the postal address).
- **New registrations** (Saturday): the register's date-range search, counted per industry (companies in
  operation, not holding) and county.
- **Population:** SSB table 07459, per county, 1 January.

## How the numbers are made (`src/summary.ts`)

- **Span:** the previous working day; Monday's post Friday to Sunday; Saturday's the working week.
- **Normal:** the same span in the 4 weeks before (spans touching a public holiday skipped).
- **Checks:** the register must return at least 500 units under bankruptcy, and a span's count must be
  plausible; otherwise no post. Every number in the caption is checked against the summary (`factCheck`).

## Commands

```
npm run generate [-- --date 2026-10-28] [--refresh]
npm run publish [-- --dry-run | --only 2026-10-28-feed]
npm run dashboard
npm run autopilot
npm run brand
npm test
```

Locally on a PC behind a company certificate, set `NODE_OPTIONS=--use-system-ca` so Node trusts it.

## Schedule

The planlegger Worker starts the workflow at 07:50, 08:10 and 09:10 Oslo time, Monday to Saturday;
GitHub's own cron is a backup. Until the Instagram token is added, every run builds the post and
publishes nothing.
