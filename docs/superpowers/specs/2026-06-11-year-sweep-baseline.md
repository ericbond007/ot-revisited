# Year sweep — 60 runs × 3 personas × 6 start years (Apr 15), 4 adults + 2 children

## balanced

| Year | Arrived | Snowed in | Wiped | Stalled | Deaths/run (a+c) | Child share | Median arrival day | Disease-event fires/run | Top causes |
|---|---|---|---|---|---|---|---|---|---|
| 1843 | 49 (82%) | 2 | 0 | 9 | 0.02 (0+1) | 100% | 188 | 0.45 | Wagon Accident 1 |
| 1846 | 57 (95%) | 0 | 0 | 3 | 0.02 (0+1) | 100% | 188 | 0.43 | Wagon Accident 1 |
| 1849 | 57 (95%) | 0 | 0 | 3 | 0.00 (0+0) | — | 188 | 2.58 | — |
| 1852 | 57 (95%) | 0 | 1 | 2 | 0.12 (4+3) | 43% | 188 | 3.55 | Dehydration 6 · Wagon Accident 1 |
| 1855 | 57 (95%) | 0 | 2 | 1 | 0.20 (8+4) | 33% | 189 | 0.42 | Dehydration 12 |
| 1858 | 58 (97%) | 0 | 0 | 2 | 0.00 (0+0) | — | 188 | 0.52 | — |

## cautious

| Year | Arrived | Snowed in | Wiped | Stalled | Deaths/run (a+c) | Child share | Median arrival day | Disease-event fires/run | Top causes |
|---|---|---|---|---|---|---|---|---|---|
| 1843 | 44 (73%) | 1 | 1 | 14 | 0.12 (4+3) | 43% | 190 | 0.47 | Dehydration 6 · Wagon Accident 1 |
| 1846 | 52 (87%) | 0 | 5 | 3 | 0.52 (20+11) | 35% | 191 | 0.43 | Dehydration 31 |
| 1849 | 56 (93%) | 0 | 0 | 4 | 0.00 (0+0) | — | 190 | 2.55 | — |
| 1852 | 56 (93%) | 0 | 0 | 4 | 0.02 (0+1) | 100% | 193 | 3.63 | Wagon Accident 1 |
| 1855 | 59 (98%) | 0 | 0 | 1 | 0.00 (0+0) | — | 190 | 0.47 | — |
| 1858 | 55 (92%) | 0 | 1 | 4 | 0.10 (4+2) | 33% | 189 | 0.65 | Dehydration 6 |

## pace_pusher

| Year | Arrived | Snowed in | Wiped | Stalled | Deaths/run (a+c) | Child share | Median arrival day | Disease-event fires/run | Top causes |
|---|---|---|---|---|---|---|---|---|---|
| 1843 | 49 (82%) | 0 | 1 | 10 | 0.10 (4+2) | 33% | 177 | 0.78 | Dehydration 6 |
| 1846 | 58 (97%) | 1 | 0 | 1 | 0.00 (0+0) | — | 179 | 0.60 | — |
| 1849 | 57 (95%) | 0 | 0 | 3 | 0.02 (0+1) | 100% | 179 | 2.43 | Wagon Accident 1 |
| 1852 | 58 (97%) | 0 | 0 | 2 | 0.00 (0+0) | — | 177 | 3.62 | — |
| 1855 | 57 (95%) | 1 | 0 | 2 | 0.00 (0+0) | — | 178 | 0.37 | — |
| 1858 | 54 (90%) | 0 | 0 | 6 | 0.00 (0+0) | — | 179 | 0.68 | — |

Elapsed: 92.4s

## Addendum (2026-06-12): the anomaly cells are variance, not mechanism

The flagged cautious-1846 (and balanced-1855) spikes do NOT replicate
across seed families (three families, 60 runs each: 1846 = 0.62/0.40/
0.75 deaths/run, 1855 = 0.20/0.30/0.62 — the "1846 signature" Gate of
Death cluster appears in 1855-third at 13 deaths). Two structural
reasons the year-sweep over-reads cell differences:

1. **Deaths arrive as whole-party wipes** on the Snake desert stretch
   (Gate of Death / Three Island / Salmon Falls — multiples of ~6 in
   every death-leg table), so 60-run cells swing ±0.2–0.3 deaths/run
   on 2-vs-7 wipe luck. Compare WIPE counts, or use ≥150 runs/cell,
   before reading a year effect.
2. **Same seed strings are NOT paired across years**: year-gated
   branches (donner_rumor ≥1847, canBoilWater ≥1854, the cholera
   corridor 1849–53) consume different rng draws, reshuffling every
   downstream roll. Cross-year cells are independent samples.

The Snake stretch being cautious's graveyard in ALL years is the known
dry-stretch design (#1264 corridor), not a bug. Entering state at the
leg is year-identical (median day 107, keg 28, ~$190 across years).
