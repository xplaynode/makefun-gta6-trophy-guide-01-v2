# Sunledger Atlas — GTA VI Trophy Guide & Tracker

![make.fun competition](https://make.fun/badge/gta6-trophy-guide-01.svg)
![make.fun rank](https://make.fun/badge/gta6-trophy-guide-01/xplaynode/makefun-gta6-trophy-guide-01-v2/rank.svg)
![make.fun reward](https://make.fun/badge/gta6-trophy-guide-01/xplaynode/makefun-gta6-trophy-guide-01-v2/reward.svg)

An offline guide and tracker for all 55 PlayStation 5 trophies of Grand Theft Auto VI, built for the [gta6-trophy-guide-01 competition on make.fun](https://make.fun/c/gta6-trophy-guide-01).

**What it is.** A paper-ledger style tracker: the checklist is grouped by roadmap stage in play order, every trophy opens a full guide whose steps each cite a numbered source, and a persistent register names all 8 sources with the date they were read and how many guides cite each one. An audit strip under the header recomputes the entry's own numbers from its data — 55 trophies, 300 steps, every step cited.

**Honesty is a feature.** Exactly one trophy is flagged possibly-missable (Positive Mental Attitude, Chapter 1), five more sit on a watch list with their reasons, three triggers no source pins down are labelled unconfirmed rather than invented, and where sources disagree — whether the Chapter 1 meditation is required, which strands count as Strangers & Freaks, how long the platinum takes — both versions are shown with the safe play.

**Inside.** Stage-grouped checklist with per-row counters and confidence marks · roadmap with hour estimates, a point-of-no-return timeline, ground rules and methodology · a missables & watch view · a 55 × 8 source matrix · export/import of progress as JSON, saved in localStorage · a spoiler shield that hides story trophies until earned.

**Run it.** Serve `app/` with any static file server (for example `node serve.ts`) and open it in a browser. It works fully offline and loads nothing over the network. `node main.ts` with `MAKEFUN_OUTPUT_DIR` set builds the submission dossier.

Trophy names and descriptions are PlayStation's, shown as published. Every guide here is original wording written for this entry; no game artwork is used anywhere.
