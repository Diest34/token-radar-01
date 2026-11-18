// The token launch radar, model radar-2.
//
// What it does, in one paragraph: it takes the sealed snapshot — every
// protocol DefiLlama tracks, with TVL, 7-day change, market cap when a token
// exists, and a listing date — and it ranks the pre-token protocols by what a
// token might be worth. The ranking is an implied value: the protocol's TVL
// times a multiple, the multiple being the median market-cap-to-TVL ratio of
// the tokened protocols in its own category, adjusted for how fast it is
// growing and how mature it is. A protocol with no token yet, a high TVL and
// a strong category multiple scores high; a young protocol, or one in a
// category where tokens trade cheaply against TVL, scores low.
//
// The snapshot is sealed before the model runs, so the model cannot reach for
// anything newer than the snapshot. The model is deterministic: the same
// snapshot always gives the same board, the same implied values, the same
// farm steps. There is no network, no randomness, no clock read at scoring
// time — the only date that matters is the snapshot's own as_of.
//
// A protocol makes the board when it has no token, is not in an excluded
// category and is not a versioned clone. The watchlist (40 names) is always
// on the board, even when the protocol already has a token live — those rows
// are flagged token_live, so the board never pretends a launch is still
// coming when it is not. Below the watchlist, the board takes the 160
// highest-TVL early protocols. Live protocols that are not on the watchlist
// are set aside: up to 24 of the largest by market cap are kept as a live
// list for the dashboard, and the rest are dropped.
//
// Every board row carries six farm steps: a concrete plan for a position
// before the token, with a cost, a time and a hold. The steps are written
// from the protocol's own category and age, and they never promise a token
// that already exists — a live row's steps say so in plain words.
//
// The numbers that feed the board are in the constants below. Change them
// and the board changes; the gate checks the board, not the constants, so a
// change here is a change to the entry, and it must be checked the same way.

/** One protocol from the snapshot, as the snapshot's own fields describe it. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The snapshot itself: when it was taken, where it came from, the floor and the watchlist. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** One farm step: what to do, what it costs, how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of the board: the protocol, its score and the model behind the score. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token' | 'token_live';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    multiple: number;
    multiple_source: string;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The same row, trimmed for the dashboard's data script. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  token_status: 'pre-token' | 'token_live';
  implied_value_usd: number;
  multiple: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  farm_steps: string[];
}

/** One live (already tokened) protocol, for the dashboard's live list. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live list and the model's own numbers. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  multiples: Record<string, number>;
  global_multiple: number;
  watchlist: string[];
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  token_live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** The headline figures: how many watchlist slugs, how many rows, how many live protocols. */
export interface BoardSummary {
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
}

/** The model's own numbers: the weights and caps that shape every implied value. */
export interface ModelConstants {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  multiple_min: number;
  multiple_max: number;
  multiple_min_peers: number;
}

export const MODEL: ModelConstants = {
  growth_weight: 0.5, growth_floor: -60, growth_cap: 120,
  maturity_floor: 0.6, maturity_range: 0.4, maturity_days: 1095,
  unknown_age_days: 365, multiple_min: 0.05, multiple_max: 1.5,
  multiple_min_peers: 3,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-2';

/** How many pre-token protocols below the watchlist floor the early radar carries, by TVL. */
export const EARLY_ROWS = 160;

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** Categories the watchlist rule itself excludes: wrapped, staked or bridged products of a token
 *  that already trades. Early rows use the same rule; watchlist rows are always kept. */
export const EXCLUDED_CATEGORIES: ReadonlySet<string> = new Set(['CEX', 'Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC']);

/**
 * Watchlist rows whose token already trades, found by hand verification on 2026-11-17 (CoinGecko
 * search plus the project's own pages; evidence in VERIFICATION.md). The snapshot records no token
 * for them, which is wrong: USDD, TAO, ONYC, PLUME, XDP and USDAT all trade. They stay on the board only
 * because the gate requires every watchlist slug to appear; the flag changes the row's status and
 * farm plan, never its implied value or rank. A protocol whose product token trades but whose
 * governance token is genuinely still to come with a public sale announced (Axis: USDx trades,
 * Coordinates points season running, public token sale planned) is NOT listed here — see
 * PRODUCT_TOKEN_NOTE instead.
 */
export const TOKEN_LIVE: Readonly<Record<string, { token: string; detail: string }>> = {
  'usdd': { token: 'USDD', detail: "USDD is TRON DAO's decentralised stablecoin, listed on CoinGecko as 'usdd' and trading on centralised exchanges and DEXes since 2022" },
  'bittensor-dtao': { token: 'TAO', detail: "TAO is Bittensor's native token, listed on CoinGecko as 'bittensor'; dTAO is Bittensor's subnet-token mechanism, not a new launch" },
  'onre': { token: 'ONYC', detail: "ONYC is OnRe's yield-bearing tokenised reinsurance token on Solana, listed on CoinGecko as 'onyc' and trading on Orca and Raydium at about $100M market cap" },
  'plume-vaults': { token: 'PLUME', detail: "PLUME is Plume Network's native token, listed on CoinGecko as 'plume'; Plume Vaults is a yield product of the Plume chain, not a separate launch" },
  'saturn': { token: 'USDAT', detail: "USDAT is Saturn's Bitcoin-backed stablecoin, listed on CoinGecko as 'saturn-dollar' and trading at about $96M market cap" },
  'doppler-finance': { token: 'XDP', detail: "XDP is Doppler's native token, listed on CoinGecko as 'doppler-finance' with its homepage at doppler.finance, trading on Uniswap v3 and v4 on Base since 28 September 2026 at about $18M market cap" },
};

/**
 * Early rows verified tokened, so the early radar does not carry them: the snapshot records no
 * token for them, which is wrong (evidence in VERIFICATION.md). Unlike the watchlist rows in
 * TOKEN_LIVE, early rows are the radar's own picks and can be left out — the next pre-token
 * protocols by TVL take their place. Aegis YUSD is Aegis's Bitcoin-backed stablecoin (CoinGecko
 * 'aegis-yusd', ~$35M market cap, trading); Noon USN is Noon's yield-bearing stablecoin
 * (CoinGecko 'noon-usn', ~$39M market cap, trading). Both protocols ARE their stablecoin: there
 * is no launch left to rank.
 */
export const EXCLUDED_EARLY: Readonly<Record<string, string>> = {
  'aegis-yusd': 'Aegis YUSD, its Bitcoin-backed stablecoin, already trades (~$35M market cap)',
  'noon': 'Noon USN, its yield-bearing stablecoin, already trades (~$39M market cap)',
};

/**
 * Pre-token rows that already issue a product token: the farm plan's check step names it, so a
 * reader is not misled into thinking nothing trades. Axis issues USDx, its synthetic dollar
 * (CoinGecko 'axis-usd', trading since July 2026, about $70M market cap); infiniFi issues iUSD
 * (~$74M); b14g issues dualCORE and Firelight stXRP (staking receipts); Syntetika issues hBTC,
 * a tokenized Bitcoin strategy token. In each case the token still to come — if any — is a
 * governance token, not the product token.
 */
export const PRODUCT_TOKEN_NOTE: Readonly<Record<string, string>> = {
  'axis': 'Before you deposit more than a test amount, note that Axis already issues USDx, its synthetic dollar trading since July 2026: the token still to come is a governance token, with a public sale planned and a Coordinates points season running.',
  'infinifi': 'Before you deposit more than a test amount, note that infiniFi already issues iUSD, its stablecoin receipt token trading at about $74M: the token still to come is INFI, its governance token, with a points campaign running and a token launch announced for Q4 2026.',
  'b14g': 'Before you deposit more than a test amount, note that b14g already issues dualCORE, its dual-staking receipt token: that is a receipt for a staked position, not a protocol launch token.',
  'firelight': 'Before you deposit more than a test amount, note that Firelight already issues stXRP, its liquid staking receipt token for XRP trading at about $38M: that is a staking receipt, not a protocol launch token.',
  'syntetika': 'Before you deposit more than a test amount, note that Syntetika already issues hBTC, a tokenized Bitcoin strategy token trading at about $14M: that is a receipt for one investment strategy, not a protocol launch token.',
};

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const MS_PER_DAY = 86_400_000;

/** A finite number, else `fallback`. */
function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a non-empty list of numbers. */
function middleValue(values: number[]): number {
  const ordered = [...values].sort((a, b) => a - b);
  const mid = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1 ? ordered[mid]! : (ordered[mid - 1]! + ordered[mid]!) / 2;
}

/** A date string as a UTC midnight timestamp, or NaN when it does not parse. */
function midnight(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = midnight(asOf);
  const b = midnight(listedAt);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / MS_PER_DAY));
}

/**
 * The category multiples of one snapshot: for each category, the median market-cap-to-TVL ratio of
 * its tokened protocols (at least `minPeers` of them), capped to [min, max]; the global median over
 * all tokened protocols is the fallback for thin categories. Deterministic: same snapshot, same map.
 */
export function categoryMultiples(
  snapshot: Snapshot,
  model: ModelConstants = MODEL,
): { multiples: Record<string, number>; global: number } {
  const perCategory = new Map<string, number[]>();
  const allRatios: number[] = [];
  for (const proto of snapshot.protocols) {
    if (proto.mcap_usd === null || proto.tvl_usd <= 0) continue;
    const ratio = proto.mcap_usd / proto.tvl_usd;
    if (!Number.isFinite(ratio) || ratio <= 0) continue;
    allRatios.push(ratio);
    const key = proto.category ?? 'Other';
    const list = perCategory.get(key) ?? [];
    list.push(ratio);
    perCategory.set(key, list);
  }
  const clampMultiple = (n: number): number => Math.min(model.multiple_max, Math.max(model.multiple_min, n));
  const global = allRatios.length > 0 ? clampMultiple(middleValue(allRatios)) : 1;
  const multiples: Record<string, number> = {};
  const ordered = [...perCategory.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  for (const [category, ratios] of ordered) {
    if (ratios.length >= model.multiple_min_peers) multiples[category] = clampMultiple(middleValue(ratios));
  }
  return { multiples, global };
}

/** The multiple one protocol gets: its category's, or the global fallback. */
export function multipleFor(
  protocol: SnapshotProtocol,
  multiples: Record<string, number>,
  global: number,
): { multiple: number; source: string } {
  const key = protocol.category ?? 'Other';
  const m = multiples[key];
  if (m !== undefined) return { multiple: m, source: `category median (${key})` };
  return { multiple: global, source: 'global median fallback' };
}

/** The three multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  multiples: Record<string, number>,
  global: number,
  model: ModelConstants = MODEL,
): { implied: number; multiple: number; source: string; growthPct: number; growthMult: number; maturityMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const { multiple, source } = multipleFor(protocol, multiples, global);
  const growthRaw = asNumber(protocol.change_7d, 0);
  const growthClamped = Math.min(model.growth_cap, Math.max(model.growth_floor, growthRaw));
  const growthFactor = 1 + (growthClamped / 100) * model.growth_weight;
  const ageUsed = age ?? model.unknown_age_days;
  const maturityFactor = model.maturity_floor + (Math.min(Math.max(ageUsed, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const baseValue = protocol.tvl_usd * multiple;
  const implied = Math.max(1, Math.round(baseValue * growthFactor * maturityFactor));
  return { implied, multiple, source, growthPct: growthClamped, growthMult: growthFactor, maturityMult: maturityFactor, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED_NAME = new RegExp('\\s(V\\d+(\\.\\d+)?|v\\d+(\\.\\d+)?|\\d+\\.\\d+)$');

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token, not in an excluded category, not a
 *  versioned pool. The watchlist's own rows are always kept by buildBoard, whatever their category. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && !EXCLUDED_CATEGORIES.has(p.category ?? '') && !VERSIONED_NAME.test(p.name);
}

/** The snapshot's protocol by slug. */
function slugIndex(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const { multiples, global } = categoryMultiples(snapshot, model);
  const index = slugIndex(snapshot.protocols);
  const picked = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but the
  // board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const proto = index.get(slug);
    if (proto !== undefined) picked.set(slug, proto);
  }
  // The early radar: pre-token protocols below the watchlist floor, by TVL, capped. Never a replacement
  // for a watchlist row: a picked protocol stays picked. EXCLUDED_EARLY leaves out the early rows
  // hand verification found tokened (their stablecoin already trades); the next protocols by TVL
  // take their place.
  const earlyPicks = snapshot.protocols
    .filter((proto) => !picked.has(proto.slug) && isRankable(proto) && proto.tvl_usd < snapshot.floor_usd && !(proto.slug in EXCLUDED_EARLY))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const proto of earlyPicks) picked.set(proto.slug, proto);

  const ranked = [...picked.values()].map((proto) => {
    const scored = impliedValue(proto, snapshot.as_of, multiples, global, model);
    return { proto, ...scored };
  });
  ranked.sort((a, b) => b.implied - a.implied || (a.proto.slug < b.proto.slug ? -1 : a.proto.slug > b.proto.slug ? 1 : 0));
  return ranked.map((s, i) => {
    const liveToken = TOKEN_LIVE[s.proto.slug];
    const status = liveToken !== undefined ? ('token_live' as const) : ('pre-token' as const);
    return {
      rank: i + 1,
      slug: s.proto.slug,
      name: s.proto.name,
      category: s.proto.category,
      chains: s.proto.chains,
      tvl_usd: s.proto.tvl_usd,
      change_7d: s.proto.change_7d,
      mcap_usd: s.proto.mcap_usd,
      listed_at: s.proto.listed_at,
      gecko_id: s.proto.gecko_id,
      symbol: s.proto.symbol,
      token_status: status,
      age_days: s.age,
      implied_value_usd: s.implied,
      model: {
        multiple: s.multiple,
        multiple_source: s.source,
        growth_pct: s.growthPct,
        growth_multiplier: to4dp(s.growthMult),
        maturity_multiplier: to4dp(s.maturityMult),
        age_days: s.age,
      },
      farm_steps: farmSteps(s.proto, s.age, liveToken).map(stepText),
    };
  });
}

const to4dp = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function firstChain(proto: SnapshotProtocol): string {
  return proto.chains.length > 0 ? proto.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function stakeSize(proto: SnapshotProtocol): number {
  if (proto.tvl_usd >= 5_000_000_000) return 250;
  if (proto.tvl_usd >= 1_000_000_000) return 150;
  if (proto.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionText(proto: SnapshotProtocol, stake: number, venue: string): string {
  const cat = (proto.category ?? '').toLowerCase();
  const protoName = proto.name;
  if (cat.includes('lend') || cat.includes('cdp') || cat.includes('collateral')) return `Supply $${stake} of USDC to ${protoName} on ${venue} and keep the position open.`;
  if (cat.includes('dex') || cat.includes('yield') || cat.includes('leveraged farm')) return `Provide $${stake} of liquidity to ${protoName}'s main pool on ${venue} and keep the position open.`;
  if (cat.includes('bridge')) return `Bridge $${stake} of USDC to ${venue} through ${protoName} and use the bridged funds in its app.`;
  if (cat.includes('staking') || cat.includes('restak')) return `Stake $${stake} of the chain's staking asset through ${protoName} and keep the receipt.`;
  if (cat.includes('perpetual') || cat.includes('derivative')) return `Deposit $${stake} of USDC as margin on ${protoName} and open one small hedge.`;
  if (cat.includes('prediction')) return `Fund $${stake} and place one market position on ${protoName}.`;
  if (cat.includes('curator') || cat.includes('allocator')) return `Deposit $${stake} into a ${protoName} vault on ${venue} and keep the shares.`;
  if (cat.includes('stable')) return `Mint or deposit $${stake} of the stable asset through ${protoName} on ${venue}.`;
  if (cat.includes('rwa')) return `Mint $${stake} of the protocol's yield asset on ${venue} and hold it.`;
  if (cat.includes('insurance')) return `Buy $${stake} of cover from ${protoName} on ${venue} and keep the policy.`;
  return `Deposit $${stake} of USDC into ${protoName} on ${venue} and keep the position open.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived from
 * the protocol's own record (category, chains, TVL, age), never from a hand-written list of names.
 * A token-live row gets no farm plan at all: six steps that say the token already trades, why the row
 * stays on the board, and what to do instead. A pre-token row with a product token names it in the
 * check step (PRODUCT_TOKEN_NOTE).
 */
export function farmSteps(proto: SnapshotProtocol, age: number | null, liveToken?: { token: string; detail: string }): FarmStep[] {
  if (liveToken !== undefined) {
    return [
      {
        text: `Do not farm ${proto.name} for a new token: ${liveToken.token} already trades, so there is no launch left to farm.`,
        cost: 'nothing to spend — this row is a warning, not a plan',
        time: '2 minutes to read',
      },
      {
        text: `${liveToken.detail}.`,
        cost: 'no fee to check',
        time: '5 minutes',
      },
      {
        text: `This row stays on the board only because the watchlist gate requires every watchlist slug to appear, ranked by the same model as the rest.`,
        cost: 'no cost — the rank is for comparison only',
        time: '1 minute',
      },
      {
        text: `If you still want exposure, buy ${liveToken.token} on an exchange you already use instead of depositing here to chase points.`,
        cost: 'only what you choose to buy, plus exchange fees',
        time: '10 minutes',
      },
      {
        text: `Check ${liveToken.token} on a token tracker such as CoinGecko before you believe any new-token claim about ${proto.name}.`,
        cost: 'no fee to check',
        time: '5 minutes',
      },
      {
        text: `Log this row as token-live in your farm log so you never spend gas farming it by mistake.`,
        cost: 'nothing but the log',
        time: '2 minutes',
      },
    ];
  }
  const venue = firstChain(proto);
  const stake = stakeSize(proto);
  const days = holdFor(age);
  const step = actionText(proto, stake, venue);
  const verify = PRODUCT_TOKEN_NOTE[proto.slug] ??
    `Before you deposit more than a test amount, check the protocol's own site and a token tracker: this board records no token for it, which is not proof it has none.`;
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: step,
      cost: `$${stake} of capital and about $${stake >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${days} days so the activity is counted in more than one snapshot.`,
      cost: `the $${stake} stays in the position`,
      time: `${days} days`,
    },
    {
      text: verify,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((proto) => !isPreToken(proto) && proto.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((proto) => ({
      slug: proto.slug,
      name: proto.name,
      category: proto.category,
      chains: proto.chains,
      tvl_usd: proto.tvl_usd,
      mcap_usd: proto.mcap_usd,
      change_7d: proto.change_7d,
    }));
}

/** A board row's compact form for data.js, carrying the farm plan as board.json carries it. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    token_status: row.token_status,
    implied_value_usd: row.implied_value_usd,
    multiple: row.model.multiple,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const { multiples, global } = categoryMultiples(snapshot, model);
  const liveList = liveRows(snapshot);
  const earlyCount = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const tokenLiveCount = board.filter((r) => r.token_status === 'token_live').length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    multiples,
    global_multiple: global,
    watchlist: snapshot.watchlist,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: earlyCount,
    live_size: liveList.length,
    token_live_size: tokenLiveCount,
    rows: board.map(radarRow),
    live: liveList,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const doc = raw as Record<string, unknown>;
  if (typeof doc.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(doc.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof doc.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof doc.floor_usd !== 'number' || !Number.isSafeInteger(doc.floor_usd) || doc.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(doc.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(doc.watchlist) || doc.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = doc.protocols.map((entry, idx) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) throw new SnapshotError(`snapshot.json's protocol ${idx} is not an object`);
    const proto = entry as Record<string, unknown>;
    if (typeof proto.slug !== 'string' || typeof proto.name !== 'string' || typeof proto.tvl_usd !== 'number' || !Number.isFinite(proto.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${idx} lacks a slug, a name or a TVL`);
    }
    return {
      slug: proto.slug,
      name: proto.name,
      category: typeof proto.category === 'string' ? proto.category : null,
      chains: Array.isArray(proto.chains) ? proto.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: proto.tvl_usd,
      change_7d: typeof proto.change_7d === 'number' && Number.isFinite(proto.change_7d) ? proto.change_7d : null,
      mcap_usd: typeof proto.mcap_usd === 'number' && Number.isFinite(proto.mcap_usd) ? proto.mcap_usd : null,
      listed_at: typeof proto.listed_at === 'string' ? proto.listed_at : null,
      gecko_id: typeof proto.gecko_id === 'string' ? proto.gecko_id : null,
      symbol: typeof proto.symbol === 'string' ? proto.symbol : null,
    };
  });
  return {
    as_of: doc.as_of,
    source: doc.source,
    floor_usd: doc.floor_usd,
    protocols,
    watchlist: doc.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const seen = new Set(board.map((r) => r.slug));
  const absent = snapshot.watchlist.filter((s) => !seen.has(s));
  if (absent.length > 0) return `the board misses ${absent.length} watchlist slug${absent.length === 1 ? '' : 's'}: ${absent.slice(0, 5).join(', ')}`;
  const ordered = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ordered.length; i++) if (ordered[i] !== i + 1) return `rank ${i + 1} is ${ordered[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const plan = r.farm_steps;
    if (plan.length < 3 || plan.length > 12) return `${r.slug} has ${plan.length} farm steps`;
    for (const s of plan) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
