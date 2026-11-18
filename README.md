# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Diest34/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Diest34/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: a board of the pre-token protocols whose next launch is worth watching, ranked by implied value. It reads a sealed snapshot of 758 DefiLlama protocols, scores each of the 40 watchlist names and the early list with the radar-2 model, and publishes a 181-row board plus an offline dashboard. Six watchlist rows already have a token live — USDD, TAO, ONYC, PLUME, USDAT and XDP — and they stay on the board, flagged `token_live`, so the board keeps the full watchlist and never pretends a launch is still coming when it is not.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input ../token-radar-01-kit/input/snapshot.json
```

## The board

Every row carries its implied value in USD, the multiple the category median gave it, the growth and maturity multipliers behind the score, and six farm steps — a concrete plan for a position before the token, with a cost, a time and a hold. The dashboard (`dashboard/`) renders the board with no network: search, filter by category, sort by implied value, TVL or growth, and open any row for the full detail. The model lives in `lib/model.ts`; `main.ts` is the entrypoint.

---

<sub>Entered on [make.fun](https://make.fun/?ref=nn10gehx&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
