# SMRT Trading Analytics — Engineering Report

Generated during the operationalization audit and repair cycle.

## A. Initial audit

### Architecture
- **Stack**: Next.js 14 App Router, React 18, Zustand, Dexie (IndexedDB local-first), Tailwind.
- **Persistence**: Browser IndexedDB for journal trades, settings, broker connection metadata, account snapshots.
- **Broker credentials**: OANDA / MT bridges via server env; Deriv PAT via browser session (not IndexedDB).
- **Market data**: Binance public klines (crypto), Deriv public WS (forex/metals), Yahoo Finance fallback, Frankfurter EOD FX fallback.

### Critical weaknesses found
1. Deriv API tokens were persisted in IndexedDB despite UI copy claiming otherwise.
2. No shared broker adapter contract / sync orchestrator for OANDA / MT bridges.
3. OANDA catalog understated real capabilities (order route + summary existed; catalog said balance-only).
4. Order UI reported “sent” without verifying OANDA create/fill transactions.
5. Nested `trade-vault/` clone broke Vitest (duplicate suites / worker crash).
6. Corrupted `.gitignore` merge markers.
7. Empty `.env.local` — no authorized broker credentials available in this environment for live connection proof.
8. Binance / Bybit / cTrader / Exness official API remain pending verified adapters.
9. Close-all remains correctly blocked (501) until an adapter exposes authoritative positions for mass close.
10. Demo journal seed exists but is not auto-loaded (source: `demo` when used).

## B. Broker connectivity

| Broker | Status | Method | Notes |
|--------|--------|--------|-------|
| OANDA | IMPLEMENTED | Official v20 REST (server env) | Sync: summary, open positions, pending orders. Orders with risk gate. |
| Deriv | PARTIALLY IMPLEMENTED / BLOCKED (creds) | PAT + OTP WebSocket | Connection test + account-data routes exist. Needs user App ID/token. |
| MT5 | PARTIALLY IMPLEMENTED | Authenticated bridge | Requires `MT5_BRIDGE_URL` + token + logged-in terminal. |
| MT4 | PARTIALLY IMPLEMENTED | Authenticated bridge | Same bridge pattern. |
| Exness | PARTIALLY IMPLEMENTED | MT5 bridge path | Official API not assumed eligible. |
| Binance | BLOCKED | — | Market data public only; trading adapter pending. |
| Bybit | BLOCKED | — | Pending verified adapter. |
| cTrader | BLOCKED | — | Pending OAuth verification. |
| IC Markets / Pepperstone | BLOCKED | — | No public API assumed; use MT5 bridge when available. |

**Successfully connected and tested in this environment:** none — credentials empty in `.env.local`.

## C. Account management
- Multi-connection records in IndexedDB with explicit demo/real environment.
- Active account selection persisted in settings.
- Duplicate Deriv discoveries stored as disconnected until OTP verification.
- Synchronize action writes verified `BrokerAccountSnapshot` rows.
- Live/Demo never merged silently.

**Status:** PARTIALLY IMPLEMENTED — UI + persistence operational; live verification blocked without credentials.

## D. Market data
- Forex majors/minors via Deriv → Yahoo → Frankfurter.
- XAUUSD / XAGUSD via Deriv only (no fabricated metal candles).
- Crypto via Binance with Yahoo fallback.
- Timeframes: M1–W1 (+ Deriv 2h). Monthly blocked when unsupported.
- Status labels: realtime / delayed / eod.

**Status:** OPERATIONAL for public providers; broker-account-specific symbol maps still limited.

## E. Trading system
- OANDA market orders with mandatory SL distance and server-side equity risk cap (≤5%).
- Live blocked unless `OANDA_ALLOW_LIVE=true` + UI confirm.
- Order response now distinguishes accepted / filled / rejected / uncertain.
- Close-all remains unsupported until verified.

**Status:** PARTIALLY IMPLEMENTED (OANDA practice path ready; not live-tested here).

## F. Intelligence
- Deterministic SMC/price-action modules under `lib/market-intelligence/`.
- Scanner and signals use retrieved candles only.
- AI analyst is heuristic/explainable — does not invent prices.

**Status:** IMPLEMENTED (deterministic); AI interpretation remains local heuristics.

## G. Portfolio / journal
- Journal metrics explicitly labeled as manual journal (not broker equity).
- Broker snapshots separate from journal P/L.
- Consolidated multi-currency conversion not implemented (correctly blocked for OANDA cross-currency risk).

**Status:** PARTIALLY IMPLEMENTED.

## H. Security
- Cleared Deriv token persistence from IndexedDB; sessionStorage + React state only.
- Settings updater strips `derivToken`.
- OANDA/MT secrets server-only.
- Account ID mismatch checks on reconnect/sync.
- No user auth / multi-tenant isolation yet (local-first single device).

**Status:** PARTIALLY IMPLEMENTED — local-first limits apply.

## I. Technical changes (this cycle)
### Created
- `lib/broker/adapter.ts`
- `lib/broker/oanda-adapter.ts`
- `lib/broker/mt-bridge-adapter.ts`
- `lib/broker/registry.ts`
- `lib/broker/sync-engine.ts`
- `lib/broker/sync-engine.test.ts`
- `lib/broker/adapter.test.ts`
- `app/api/broker/sync/route.ts`
- `docs/ENGINEERING_REPORT.md`

### Modified
- `lib/broker/core.ts` — accurate capabilities
- `lib/db.ts` — v3 snapshots + secret stripping
- `types/index.ts` — snapshots + sync metadata
- `components/broker/BrokerCenter.tsx` — sync UI + session token handling
- `components/broker/BrokerOrderForm.tsx` — verified order statuses
- `app/api/broker/oanda/order/route.ts` — fill/accept verification
- `app/page.tsx` — session credentials
- `.gitignore` — repaired
- `package.json` — vitest excludes nested clone

## J. Verification
- Unit tests: broker registry, adapter contract, sync engine, risk engine, market intelligence (run via `npm test`).
- Integration against live brokers: **BLOCKED** — no API tokens configured in this environment.

## K. Follow-up audit remediation
Addressed findings from broker/market audits:
- MT4 bridge now uses `MT4_BRIDGE_*` (no longer aliases MT5 env).
- OANDA order form + status panel mounted in Broker Center.
- Yahoo no longer maps `4h→1h`; H4 fails closed without a true H4 provider.
- Frankfurter EOD only used for `1d` forex fallback.
- Pending brokers (Binance/Bybit/cTrader) cannot run Test & connect.
- Optional `SMRT_EXECUTION_SECRET` gates order/status/close-all.
- Chart live poll merges via functional state (no stale `liveCandles` closure).
- `smrt-analysis` BOS requires swing close break, not structure label alone.
- `DERIV_APP_ID` required for Deriv candle WS (no hardcoded `1089`).

### Feature status summary
| Feature | Status |
|---------|--------|
| Broker catalog honesty | IMPLEMENTED |
| Adapter interface | IMPLEMENTED |
| OANDA sync | IMPLEMENTED (untested without creds) |
| OANDA orders + risk | IMPLEMENTED (untested without creds) |
| Deriv connect + account data | IMPLEMENTED (creds BLOCKED) |
| MT bridge sync | PARTIALLY IMPLEMENTED |
| Multi-account UI | IMPLEMENTED |
| Market data forex/crypto/metals | OPERATIONAL (public feeds) |
| Charting | OPERATIONAL |
| Market intelligence | OPERATIONAL |
| Portfolio consolidation FX | BLOCKED (no verified FX conversion) |
| Binance/Bybit trading | BLOCKED |
| Auth / multi-user | BLOCKED (local-first) |
