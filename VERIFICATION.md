# Verification — token radar entry (token-radar-01)

Entry: `~/workspace/makefun/entry/` — model `radar-2`, snapshot `as_of 2026-11-14`
(sealed `token-radar-01-kit/input/snapshot.json`, 758 protocols, watchlist 40, floor $50M).
Verified 2026-11-17 by the building agent. No API key or keypair value is recorded here.

## 1. The snapshot is wrong about six watchlist rows

The snapshot records no token (`mcap_usd`, `gecko_id`, `symbol` all null) for every
watchlist row. Hand verification on 2026-11-17 shows that is wrong for six of the 40:

| Rank | Slug | Finding | Evidence |
| --- | --- | --- | --- |
| 4 | `usdd` | **TOKEN LIVE — USDD.** TRON DAO's decentralised stablecoin, trading since 2022. | CoinGecko search: `USDD / USDD / usdd`; `api.llama.fi/protocol/usdd` returns `gecko_id: null` (the snapshot's record is stale, not the market). |
| 6 | `bittensor-dtao` | **TOKEN LIVE — TAO.** Bittensor's native token; dTAO is its subnet-token mechanism, not a new launch. | CoinGecko search: `Bittensor / TAO / bittensor`. |
| 7 | `onre` | **TOKEN LIVE — ONYC.** OnRe's yield-bearing tokenised reinsurance token on Solana, ~$100M market cap, trading on Orca and Raydium. | CoinGecko search: `OnRe Tokenized Reinsurance / ONYC / onyc`; onre.finance blog "Building Market Infrastructure for Tokenized Reinsurance" (ONyc $285.5M reinsurance capital, 9,100+ holders); stablecoinbeat lists ONYC launched 2025, Solana `5Y8NV33Vv7WbnLfq3zBcKSdYPrk7g2KoiQoe7M2tcxp5`, mcap $108M as of 2026-11-16. |
| 10 | `plume-vaults` | **TOKEN LIVE — PLUME.** Plume Network's native token; Plume Vaults is a yield product of the Plume chain, not a separate launch. | CoinGecko search: `Plume / PLUME / plume`. |
| 24 | `saturn` | **TOKEN LIVE — USDAT.** Saturn's Bitcoin-backed stablecoin, ~$96M market cap. | CoinGecko `coins/saturn-dollar`: price $0.998, mcap $95.9M, homepage saturn.credit, "building the digital monetary layer for a financial system backed by Bitcoin". |
| 29 | `doppler-finance` | **TOKEN LIVE — XDP.** Doppler's native token, trading on Uniswap v3/v4 on Base since 28 Sep 2026, ~$18M market cap. | CoinGecko `coins/doppler-finance`: price $0.0177, mcap $17.7M, homepage doppler.finance, twitter doppler_fi. A same-name meme coin was ruled out by the official homepage link on the CoinGecko page. |
| 19 | `axis` | **Pre-token, with a product token.** Axis issues USDx, its synthetic dollar (CoinGecko `axis-usd`, trading since July 2026, ~$70M mcap). The token still to come is a governance token: a public sale is planned and a Coordinates points season is running. | CoinGecko search: `Axis USD / USDX / axis-usd`; ourcryptotalk FAQ: "Does Axis have a token? No. Axis does not currently have a live native governance token… Coordinates are loyalty points"; The Block 2025-12-03: public token sale planned ahead of full launch. |
| 38 | `infinifi` | **Pre-token, with a product token.** infiniFi issues iUSD, its stablecoin receipt token (~$74M mcap). The token still to come is INFI, its governance token: a points campaign ("Road to TGE") is running and a launch is announced for Q4 2026, not yet live. | CoinGecko `coins/infinifi-token`: price $1.16 but market cap $0.00 — a placeholder with no circulating supply; AirdropTracker: "INFI has 45% of supply for the ecosystem including the airdrop, with TGE announced for Q4 2026". iUSD confirmed trading via `coins/infinifi-usd` ($73.6M mcap). |

### How the board treats them

The gate requires every watchlist slug to appear, so none of these rows can be removed.
The six TOKEN LIVE rows (`usdd`, `bittensor-dtao`, `onre`, `plume-vaults`, `saturn`,
`doppler-finance`) are kept at the rank and implied value the uniform model gives them,
but are flagged `token_status: "token_live"` in `board.json` (extra key, allowed by the
gate), shown as **TOKEN LIVE** in the dashboard, and carry a six-step warning instead of
a farm plan: the token already trades, the row stays only for watchlist coverage, buy the
token on an exchange instead of farming points. The flag changes the label and the plan
only — never the implied value or the rank. The list lives in `TOKEN_LIVE` in
`lib/model.ts`. `axis` and `infinifi` stay `pre-token` (their governance tokens genuinely
have not launched) and their farm plans' check steps name the product token, so no reader
mistakes them for protocols with nothing trading (`PRODUCT_TOKEN_NOTE` in `lib/model.ts`;
`b14g` and `firelight` carry the same kind of note for their staking-receipt tokens).

### The other 15 of the top 20 — verified pre-token

CoinGecko search (`api.coingecko.com/api/v3/search`, 2026-11-17) returned no coin of the
protocol itself for each of these. Vault receipt tokens (e.g. Gauntlet `GTUSDA`, Veda vault
shares, RockawayX `ROXUSDCY`, K3 `sBOLD`, OpenTrade `SPLUS`) are shares of the protocol's
own vaults, not a protocol token, and do not count as token-live:

| Rank | Slug | CoinGecko result |
| --- | --- | --- |
| 1 | `steakhouse-financial` | no coin |
| 2 | `gauntlet` | only Gauntlet vault receipt tokens (`GTUSDA`, `GTUSDTB`, …) |
| 3 | `veda` | no VEDA token (unrelated `MedicalVeda`, `veDAO`; `Ink USDT Veda Vault` is a vault receipt) |
| 5 | `upshift` | no coin |
| 8 | `nonce-capital` | no coin |
| 9 | `opentrade` | only a Sierra vault share (`SPLUS`) |
| 11 | `symbiotic` | no coin |
| 12 | `rockawayx` | only vault receipt tokens (`ROXUSDCY`, `ROXCUSDC`) |
| 13 | `hive-protocol` | see name-collision note below |
| 14 | `hyperithm` | only Midas vault products (`MARB`, `MHYPERBTC`, …) |
| 15 | `r25` | no coin |
| 16 | `k3-capital` | only a vault share (`sBOLD by K3 Capital`) |
| 17 | `tori-finance` | no coin |
| 18 | `lightning-network` | no coin (Bitcoin Lightning has no token) |
| 20 | `lofty` | no coin |

**Name collision — `hive-protocol` (rank 13).** CoinGecko's `hive-protocol-2` (`HIVE`) is a
*different* project: an AI-agent marketplace on Solana at uphive.xyz (Solscan token
`6JfonM6a24xngXh5yJ1imZzbMhpfvEsiafkb4syHBAGS`). The DefiLlama `hive-protocol` row is
the BSquared staking protocol ("Stake BTC, safeguard B², and receive $B2 Tokens") — its
reward is `$B2`, BSquared's own token, and it issues no token of its own. Verified
pre-token; the aggregator pages that call HIVE its "native token" conflate the two
projects of the same name.

### The other 20 watchlist rows (board ranks 21–49) — verified

Same CoinGecko search + `coins/` detail check, 2026-11-17. Besides `saturn` (#24) and
`doppler-finance` (#30) above, all verified pre-token:

| Rank | Slug | CoinGecko result |
| --- | --- | --- |
| 21 | `b14g` | `dualCORE` trades ($360K mcap) — a dual-staking receipt token, not a launch token; noted in the farm plan. b14g was exploited 31 Oct 2026 (~97M CORE drained, partial recovery via hard fork). |
| 22 | `lagoon` | no coin |
| 23 | `clearstar` | no coin |
| 25 | `galaxy-curation` | no coin |
| 26 | `valos` | only `yValos`, a YieldFi vault share with ~$10 market cap (placeholder) |
| 27 | `ember` | see name note below |
| 30 | `armitage-by-wintermute` | no coin |
| 32 | `curvance` | CoinGecko lists `curvance` (CVE) but with **no price, no tickers, zero circulating supply**; direct `eth_call` on Monad (Vitrine risk report, 2026-11-07) shows the registry's `cve()` and `veCVE()` return the zero address — CVE has not launched |
| 33 | `noble` | only bridged USDC on Noble (`USDC.N`); Noble issues no token of its own |
| 35 | `reti-pooling` | no coin |
| 36 | `keyrock` | no coin |
| 37 | `tydro` | no coin |
| 38 | `infinifi` | see product-token row in §1 table above |
| 39 | `gami-labs` | no coin |
| 43 | `tulipa-capital` | no coin |
| 46 | `yuzu-money` | no coin |
| 48 | `firelight` | only `stXRP`, its liquid-staking receipt token for XRP (~$38M mcap); noted in the farm plan |
| 49 | `mezo-earn` | no coin |

**Name note — `ember` (rank 28).** DefiLlama's `ember` is ember.so (EmberProtocol,
RWA: "originates and issues tokenized investment products"). CoinGecko's `embercurve`
(EMBER) is a different project, embercurve.fun, a Solana token launcher on Meteora — not
Ember's token. No coin of Ember itself was found: verified pre-token.

**Receipt tokens do not count as token-live.** Vault shares, staking receipts and
principal tokens (`GTUSDA`, `ROXUSDCY`, `sBOLD`, `SPLUS`, `dualCORE`, `stXRP`, `yValos`,
`PT-DUALBTC`, Midas vault products) represent a deposit position, not the protocol's own
value-capture token. A row is flagged token-live only when the protocol's own token
(governance, native or stablecoin product) already trades.

## 2. Full-board CoinGecko screen (all 181 rows)

Method: one call to CoinGecko's full coin list (`api/v3/coins/list`, 21,674 coins,
2026-11-17), matched locally against every board row's name — exact name plus names
starting with the protocol's name. 27 rows matched; every match was reviewed. The
watchlist matches are all covered in §1. The early-row matches:

| Rank | Slug | Disposition |
| --- | --- | --- |
| 27 (was) | `aegis-yusd` | **REMOVED.** YUSD is Aegis's Bitcoin-backed stablecoin (`coins/aegis-yusd`: $0.998, $34.6M mcap, homepage aegis.im). The protocol IS its stablecoin. Left out of the board (`EXCLUDED_EARLY` in `lib/model.ts`). |
| 54 (was) | `noon` | **REMOVED.** USN is Noon's yield-bearing stablecoin (`coins/noon-usn`: $0.999, $38.6M mcap, homepage noon.capital). The protocol IS its stablecoin. Left out of the board (`EXCLUDED_EARLY`). |
| 27 | `ember` | Pre-token. CoinGecko's `ember` links to embertoken.io / Ember Agency, a different project from ember.so (the DefiLlama row); it has no price and no market cap anyway. Name collision, confirmed. |
| 53 | `makina` | Pre-token. CoinGecko's `makina` (MAK) has no price and no market cap — a placeholder, not trading. |
| 87 | `sygnum-fiusd-liquidity-fund` | Pre-token. FIUSD is a tokenized Fidelity money-market fund share ($48.4M, price $12,104 = fund NAV): a fund share receipt, not a protocol token. |
| 98 | `nuva` | Pre-token. `NUVA nvPRIME` / `nvYLDS` are Nuva's tokenized yield vault products — vault receipts, not a launch token. |
| 119 | `goose` | Pre-token. CoinGecko's `goose` ($GOOSE) links to goldengoose.lol, a memecoin with $3,737 market cap — unrelated to the DefiLlama `goose` CeDeFi yield protocol (no URL on record). Name collision. |
| 133 | `syntetika` | Pre-token, with a note. hBTC is Syntetika's tokenized Bitcoin strategy token ($13.7M mcap): a receipt for one investment strategy, not a protocol launch token. Named in the farm plan's check step. |
| 56, 95, 107, 146, 147, 148 | `3f`, `flowdesk`, `agua`, `abstract`, `yieldfi`, `mev-capital` | Pre-token. Matches are vault shares, strategy receipts or bridged assets (`3F x Steakhouse USDC Morpho Vault`, Flowdesk strategy receipts, `Agua Global Carry Vault`, Abstract bridged USDT / liquid-staked ETH, YieldFi `yValos`/`vyBTC`/`vyETH`/`vyUSD`, MEV Capital vault shares). |

The other 154 rows had no CoinGecko name match at all.

**Pool exhaustion.** After removing `aegis-yusd` and `noon`, the board has 181 rows
(40 watchlist + 141 early), not 183: the rankable early pool is exactly 143 protocols
(439 non-watchlist protocols below the $50M floor, of which 229 record a token, 58 fall
in the watchlist rule's excluded categories, 9 have versioned names, leaving 143). There
is no further pre-token protocol below the floor to add, and the filters were not loosened
to pad the count. 181 is inside the gate's 100–4,000 rows.

## 3. Model notes

- **Category multiples.** `multiple = median(mcap_usd / tvl_usd)` over tokened peers in the
  category (n ≥ 3), else the global median 0.2138, capped [0.05, 1.5]. Peers with
  `mcap_usd ≤ 0` are dropped as data errors (16 protocols record mcap 0, e.g. YieldNest):
  e.g. Onchain Capital Allocator has only 2 positive peers (Concrete 0.019x, Grove 0.0059x)
  after dropping YieldNest's $0, so it falls back to the global median; Risk Curators has
  1 positive peer (Api3, 2.97x — Api3's category is Risk Curators, not Onchain Capital
  Allocator), so it also falls back to the global median.
- **Determinism.** `main.ts` run twice into separate output dirs produces byte-identical
  trees (`diff -r` clean). See §5.
- **Dashboard honesty.** `data.js` carries each row's `farm_steps` exactly as `board.json`
  does; the page renders them unchanged, so the detail view cannot drift from the board.

## 4. Gate self-check (local)

Run from `~/workspace/makefun/entry/` after every rebuild:

- `MAKEFUN_OUTPUT_DIR=outA node main.ts --input ../token-radar-01-kit/input/snapshot.json`
- `MAKEFUN_OUTPUT_DIR=outB node main.ts --input ../token-radar-01-kit/input/snapshot.json`
- `diff -r outA outB` → clean (byte-identical)
- Board: 181 rows, ranks 1..181 unique, implied non-increasing with rank, all 40 watchlist
  slugs present, every `farm_steps` 6 strings of 20–600 chars (checked by `boardIssue`
  inside `main.ts`, which exits 1 on any violation). 141 early rows: the rankable pool
  below the floor is exhausted (see §2); the filters were not loosened to pad the count.
- Dashboard: `index.html` + `app.css` + `app.js` (3 files, ~31 KB), no `http://` or
  `https://` in any attribute, style, script or import (offline page).
- Screenshots: 3 PNGs, 1440×900, each ≤ 512 KiB.
- `dossier.json`: written by `buildDossier` from the same output (byte-identical by
  construction), ≤ 1.5 MiB.

## 5. Build log

- 2026-11-17 ~18:29 — entry scaffolded from the kit starter into `~/workspace/makefun/entry/`;
  model rewritten as `radar-2` (category multiples), dashboard rewritten.
- 2026-11-17 — top-20 token verification (CoinGecko search + web) found 4 token-live
  watchlist rows + Axis product-token note; `TOKEN_LIVE` / `PRODUCT_TOKEN_NOTE` added,
  dashboard shows TOKEN LIVE badge + detail notice, farm steps carry the disclosure.
- 2026-11-17 — `main.ts` run twice (out3/out4): byte-identical. Screenshots retaken with
  headless Chromium (Chrome for Testing 157.0.8103.78, `~/workspace/makefun/.browser/`)
  at 1440×900; stale starter screenshots replaced.
- 2026-11-17 — full-board CoinGecko list screen (21,674 coins) found 2 tokened early rows
  (`aegis-yusd`, `noon` — their stablecoins already trade); both removed via
  `EXCLUDED_EARLY`, board now 181 rows (pool exhausted, filters not loosened). `syntetika`
  added to `PRODUCT_TOKEN_NOTE`. Screenshots retaken after the final rebuild.
