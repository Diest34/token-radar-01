# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Diest34/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Diest34/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A Solana token launch radar: it reads a sealed snapshot of DefiLlama-tracked protocols, estimates what token each pre-token protocol might issue is worth, and plans how to farm it. The board covers all 40 watchlist protocols plus 141 early pre-token protocols below the watchlist floor (181 rows), ranked by implied value under model radar-2. Six watchlist rows turned out to already have a live token (USDD, TAO, ONYC, PLUME, USDAT, XDP); they are kept for watchlist coverage and flagged TOKEN LIVE instead of farmed. See VERIFICATION.md for the manual token-status checks.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input ../token-radar-01-kit/input/snapshot.json
```

Requires Node.js 22.18+. The program writes `board.json`, `data.js`, the offline `dashboard/` and `dossier.json` to the output directory, and copies the three screenshots. Running it twice produces byte-identical output.

---

<sub>Entered on [make.fun](https://make.fun/?ref=qdjpn7xw&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
