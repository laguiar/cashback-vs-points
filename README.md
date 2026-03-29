# SkyReward — Cashback vs Points Calculator

A static web calculator that helps you determine whether earning airline miles/points or taking cashback rewards is the better financial strategy for your credit card spending.

## Purpose

Credit card rewards programs offer two main strategies: **cashback** (a percentage of spending returned as cash) and **points/miles** (loyalty currency redeemable for flights). This calculator compares both side-by-side so you can make an informed decision based on your actual spending habits, card fees, and the market value of miles.

## Features

- Compare a points/miles card against 4 cashback rates (1%, 1.5%, 2%, 3%) simultaneously
- Support for both direct airline miles and points-based programs with transfer ratios and bonuses
- Per-rate cashback card fees (toggle to set different annual fees for each rate)
- Flexible input: monthly or yearly spend, per-unit or per-thousand pricing
- Locale-aware number parsing (handles both `1,500.50` and `1.500,50` formats)
- Goal accumulation calculator: see how long each strategy takes to reach a target miles amount
- Fully static — no build step, no framework, opens directly in a browser

## Project Structure

```
cashback-vs-points/
  index.html              # Main page — all UI markup
  styles/
    main.css              # All styling (dark travel-themed design, CSS animations)
  scripts/
    calc.js               # Pure calculation engine and utility functions (no DOM)
    main.js               # DOM wiring, event listeners, rendering
  tests/
    calc.test.js          # Vitest unit tests for calc.js (105 tests)
  requirements.md         # Original feature requirements
  package.json            # Dev dependencies (Vitest only)
```

### Key files

- **`scripts/calc.js`** — All pure logic extracted into testable functions. Exports via `module.exports` for Node/Vitest and `window.Calc` for the browser. Contains:
  - Parsing: `parseDecimal`, `parseTransferRatio`, `parseIntegerInput`
  - Formatting: `formatCurrency`, `formatNumber`
  - Snap helpers: `snapToThousand`, `getGoalTargetValue`, `getMinBuyableValue`
  - Fee resolution: `resolveAnnualCbFees`
  - Core engine: `calculate(inputs)` — takes a flat config object, returns all computed results

- **`scripts/main.js`** — Reads DOM inputs, calls `Calc.calculate()`, and renders results into the table. Handles toggle state, event listeners, and UI updates.

## Usage

Open `index.html` in any browser. No server required — it works directly from the filesystem via `file://`.

Fill in your spending details:
1. **Your Spending** — monthly or yearly spend amount
2. **Cashback Card** — annual fee (shared or per-rate)
3. **Points/Miles Card** — fee, earning rate, purchase price, transfer settings

Results update in real time as you type.

## Testing

Tests cover the pure calculation engine in `calc.js` using [Vitest](https://vitest.dev/).

```bash
# Install dev dependencies (first time only)
npm install

# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

### What's tested (105 tests)

- **Parsing** — decimal formats, transfer ratio formats (colon, percentage, plain), integer input with comma stripping
- **Formatting** — currency with commas and 2 decimals, integer formatting, negative values
- **Snap helpers** — rounding to nearest 1,000, minimum value enforcement, edge cases
- **Fee resolution** — shared vs per-rate fees, monthly-to-annual conversion
- **Core calculation** — annual spend conversion, card fee handling, miles earning (direct and via points transfer with bonus), cashback gross/net for all rates, miles buyable with minimum-buyable flooring, effective cost per mile, winner comparison logic, goal accumulation (months, spend, fees for all strategies)
- **Integration scenarios** — full end-to-end calculations with realistic inputs

## Design

Dark luxury travel-themed interface with:
- DM Serif Display / DM Sans typography
- Navy and gold color palette
- CSS-only animated background elements (rotating globe, flight routes, floating planes, pulsing city dots, passport stamp)
- Glassmorphic dark cards with colored accent stripes
- Staggered fade-in animations on page load
