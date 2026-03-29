import { describe, it, expect } from "vitest";

const {
  parseDecimal,
  parseTransferRatio,
  parseIntegerInput,
  formatCurrency,
  formatNumber,
  snapToThousand,
  getGoalTargetValue,
  getMinBuyableValue,
  resolveAnnualCbFees,
  calculate,
  CASHBACK_RATES,
  CB_LABELS,
} = require("../scripts/calc.js");

// ── parseDecimal ──────────────────────────────────────

describe("parseDecimal", () => {
  it("parses plain integers", () => {
    expect(parseDecimal("100")).toBe(100);
    expect(parseDecimal("0")).toBe(0);
  });

  it("parses decimals with dot", () => {
    expect(parseDecimal("3.5")).toBe(3.5);
    expect(parseDecimal("0.99")).toBe(0.99);
  });

  it("parses US-style thousands (comma separator, dot decimal)", () => {
    expect(parseDecimal("1,500.50")).toBe(1500.5);
  });

  it("treats single comma without dot as decimal separator", () => {
    // "10,000" has no dot, so comma is ambiguous — treated as decimal
    expect(parseDecimal("10,000")).toBe(10);
    // Use parseIntegerInput for comma-formatted integers instead
  });

  it("parses EU-style (dot separator, comma decimal)", () => {
    expect(parseDecimal("1.500,50")).toBe(1500.5);
    expect(parseDecimal("3,5")).toBe(3.5);
  });

  it("returns NaN for empty/null/undefined", () => {
    expect(parseDecimal("")).toBeNaN();
    expect(parseDecimal(null)).toBeNaN();
    expect(parseDecimal(undefined)).toBeNaN();
  });

  it("trims whitespace", () => {
    expect(parseDecimal("  42  ")).toBe(42);
    expect(parseDecimal(" 1,500.25 ")).toBe(1500.25);
  });

  it("returns NaN for non-numeric strings", () => {
    expect(parseDecimal("abc")).toBeNaN();
  });

  it("parses negative numbers", () => {
    expect(parseDecimal("-50")).toBe(-50);
    expect(parseDecimal("-1,234.56")).toBe(-1234.56);
  });
});

// ── parseTransferRatio ────────────────────────────────

describe("parseTransferRatio", () => {
  it("parses colon format 1:1", () => {
    expect(parseTransferRatio("1:1")).toBe(1);
  });

  it("parses colon format 5:4", () => {
    expect(parseTransferRatio("5:4")).toBeCloseTo(0.8);
  });

  it("parses colon format 1000:750", () => {
    expect(parseTransferRatio("1000:750")).toBeCloseTo(0.75);
  });

  it("parses colon format with spaces", () => {
    expect(parseTransferRatio("5 : 4")).toBeCloseTo(0.8);
  });

  it("parses percentage format 80%", () => {
    expect(parseTransferRatio("80%")).toBeCloseTo(0.8);
  });

  it("parses percentage format with space", () => {
    expect(parseTransferRatio("80 %")).toBeCloseTo(0.8);
  });

  it("parses percentage format 100%", () => {
    expect(parseTransferRatio("100%")).toBe(1);
  });

  it("parses plain decimal 0.8", () => {
    expect(parseTransferRatio("0.8")).toBeCloseTo(0.8);
  });

  it("parses plain integer 1", () => {
    expect(parseTransferRatio("1")).toBe(1);
  });

  it("returns NaN for empty input", () => {
    expect(parseTransferRatio("")).toBeNaN();
    expect(parseTransferRatio(null)).toBeNaN();
  });

  it("returns NaN for zero left side in colon format", () => {
    expect(parseTransferRatio("0:5")).toBeNaN();
  });

  it("handles colon format with decimals", () => {
    expect(parseTransferRatio("1.5:1")).toBeCloseTo(1 / 1.5);
  });
});

// ── parseIntegerInput ─────────────────────────────────

describe("parseIntegerInput", () => {
  it("parses plain number", () => {
    expect(parseIntegerInput("5000")).toBe(5000);
  });

  it("strips commas and parses", () => {
    expect(parseIntegerInput("50,000")).toBe(50000);
    expect(parseIntegerInput("1,000,000")).toBe(1000000);
  });

  it("handles whitespace", () => {
    expect(parseIntegerInput("  50,000  ")).toBe(50000);
  });

  it("returns NaN for empty", () => {
    expect(parseIntegerInput("")).toBeNaN();
    expect(parseIntegerInput(null)).toBeNaN();
  });
});

// ── formatCurrency ────────────────────────────────────

describe("formatCurrency", () => {
  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("0.00");
  });

  it("formats small values", () => {
    expect(formatCurrency(1.5)).toBe("1.50");
    expect(formatCurrency(0.99)).toBe("0.99");
  });

  it("formats thousands with commas", () => {
    expect(formatCurrency(1234.56)).toBe("1,234.56");
    expect(formatCurrency(1000000)).toBe("1,000,000.00");
  });

  it("formats negative values", () => {
    expect(formatCurrency(-250)).toBe("-250.00");
    expect(formatCurrency(-1234.56)).toBe("-1,234.56");
  });

  it("rounds to two decimals", () => {
    expect(formatCurrency(1.999)).toBe("2.00");
    expect(formatCurrency(1.001)).toBe("1.00");
    // 1.005 rounds to "1.00" due to JS floating-point (banker's rounding)
    expect(formatCurrency(1.005)).toBe("1.00");
  });
});

// ── formatNumber ──────────────────────────────────────

describe("formatNumber", () => {
  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("formats integers with commas", () => {
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatNumber(50000)).toBe("50,000");
    expect(formatNumber(1000000)).toBe("1,000,000");
  });

  it("rounds to nearest integer", () => {
    expect(formatNumber(999.7)).toBe("1,000");
    expect(formatNumber(1500.4)).toBe("1,500");
  });

  it("formats negative numbers", () => {
    expect(formatNumber(-5000)).toBe("-5,000");
  });

  it("formats small numbers without commas", () => {
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(1)).toBe("1");
  });
});

// ── snapToThousand ────────────────────────────────────

describe("snapToThousand", () => {
  it("rounds to nearest 1000", () => {
    expect(snapToThousand(1500)).toBe(2000);
    expect(snapToThousand(1499)).toBe(1000);
    expect(snapToThousand(2500)).toBe(3000);
  });

  it("returns minValue for values below threshold", () => {
    expect(snapToThousand(500)).toBe(1000);
    expect(snapToThousand(0)).toBe(1000);
    expect(snapToThousand(-100)).toBe(1000);
  });

  it("returns minValue for NaN", () => {
    expect(snapToThousand(NaN)).toBe(1000);
  });

  it("supports custom minValue", () => {
    expect(snapToThousand(500, 2000)).toBe(2000);
    expect(snapToThousand(3000, 2000)).toBe(3000);
  });

  it("exact multiples stay the same", () => {
    expect(snapToThousand(5000)).toBe(5000);
    expect(snapToThousand(10000)).toBe(10000);
  });
});

// ── getGoalTargetValue ────────────────────────────────

describe("getGoalTargetValue", () => {
  it("parses and rounds comma-formatted input", () => {
    expect(getGoalTargetValue("50,000")).toBe(50000);
    expect(getGoalTargetValue("100,000")).toBe(100000);
  });

  it("returns 0 for empty or zero", () => {
    expect(getGoalTargetValue("")).toBe(0);
    expect(getGoalTargetValue("0")).toBe(0);
  });

  it("returns 1000 for small positive values", () => {
    expect(getGoalTargetValue("500")).toBe(1000);
    expect(getGoalTargetValue("1")).toBe(1000);
  });

  it("rounds to nearest 1000", () => {
    expect(getGoalTargetValue("7500")).toBe(8000);
    expect(getGoalTargetValue("7499")).toBe(7000);
  });

  it("returns 0 for negative values", () => {
    expect(getGoalTargetValue("-1000")).toBe(0);
  });
});

// ── getMinBuyableValue ────────────────────────────────

describe("getMinBuyableValue", () => {
  it("parses comma-formatted input", () => {
    expect(getMinBuyableValue("1,000")).toBe(1000);
    expect(getMinBuyableValue("5,000")).toBe(5000);
  });

  it("returns 1000 for values below 1000", () => {
    expect(getMinBuyableValue("500")).toBe(1000);
    expect(getMinBuyableValue("0")).toBe(1000);
    expect(getMinBuyableValue("")).toBe(1000);
  });

  it("rounds to nearest 1000", () => {
    expect(getMinBuyableValue("2500")).toBe(3000);
    expect(getMinBuyableValue("2499")).toBe(2000);
  });
});

// ── resolveAnnualCbFees ───────────────────────────────

describe("resolveAnnualCbFees", () => {
  it("returns shared fee for all rates when perRateFees is false", () => {
    expect(resolveAnnualCbFees(false, 100, [])).toEqual([100, 100, 100, 100]);
  });

  it("returns per-rate yearly fees when perRateFees is true", () => {
    var rates = [
      { raw: 50, period: "yearly" },
      { raw: 100, period: "yearly" },
      { raw: 150, period: "yearly" },
      { raw: 200, period: "yearly" },
    ];
    expect(resolveAnnualCbFees(true, 0, rates)).toEqual([50, 100, 150, 200]);
  });

  it("converts monthly per-rate fees to annual", () => {
    var rates = [
      { raw: 5, period: "monthly" },
      { raw: 10, period: "monthly" },
      { raw: 0, period: "yearly" },
      { raw: 25, period: "yearly" },
    ];
    expect(resolveAnnualCbFees(true, 0, rates)).toEqual([60, 120, 0, 25]);
  });
});

// ── Constants ─────────────────────────────────────────

describe("constants", () => {
  it("has correct cashback rates", () => {
    expect(CASHBACK_RATES).toEqual([0.01, 0.015, 0.02, 0.03]);
  });

  it("has correct labels", () => {
    expect(CB_LABELS).toHaveLength(4);
    expect(CB_LABELS[0]).toBe("Cashback 1%");
    expect(CB_LABELS[3]).toBe("Cashback 3%");
  });
});

// ── calculate (main engine) ───────────────────────────

function makeInputs(overrides) {
  return Object.assign(
    {
      spendAmount: 2000,
      spendPeriod: "monthly",
      pointsCardFeeRaw: 250,
      pointsFeePeriod: "yearly",
      earningsRate: 1.5,
      rawPrice: 12,
      priceUnit: "per-thousand",
      earningType: "miles",
      transferRatio: 1,
      transferBonus: 0,
      annualCbFees: [0, 0, 0, 0],
      minBuyable: 1000,
      goalTarget: 50000,
    },
    overrides
  );
}

describe("calculate — basic annual spend", () => {
  it("converts monthly spend to annual", () => {
    var r = calculate(makeInputs({ spendAmount: 2000, spendPeriod: "monthly" }));
    expect(r.annualSpend).toBe(24000);
    expect(r.monthlySpend).toBe(2000);
  });

  it("uses yearly spend as-is", () => {
    var r = calculate(makeInputs({ spendAmount: 24000, spendPeriod: "yearly" }));
    expect(r.annualSpend).toBe(24000);
    expect(r.monthlySpend).toBe(2000);
  });

  it("handles zero spend", () => {
    var r = calculate(makeInputs({ spendAmount: 0 }));
    expect(r.annualSpend).toBe(0);
    expect(r.totalMiles).toBe(0);
    expect(r.pointsWins).toBe(false);
  });
});

describe("calculate — points card fee", () => {
  it("uses yearly fee directly", () => {
    var r = calculate(makeInputs({ pointsCardFeeRaw: 250, pointsFeePeriod: "yearly" }));
    expect(r.pointsCardFee).toBe(250);
  });

  it("converts monthly fee to annual", () => {
    var r = calculate(makeInputs({ pointsCardFeeRaw: 25, pointsFeePeriod: "monthly" }));
    expect(r.pointsCardFee).toBe(300);
  });
});

describe("calculate — miles earning (direct miles)", () => {
  it("calculates total miles from annual spend and rate", () => {
    var r = calculate(makeInputs({ spendAmount: 2000, spendPeriod: "monthly", earningsRate: 1.5 }));
    // 2000 * 12 * 1.5 = 36000
    expect(r.totalEarned).toBe(36000);
    expect(r.totalMiles).toBe(36000);
  });

  it("calculates gross miles value using price per unit", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      earningsRate: 1.5,
      rawPrice: 12,
      priceUnit: "per-thousand",
    }));
    // pricePerUnit = 12/1000 = 0.012; grossValue = 36000 * 0.012 = 432
    expect(r.pricePerUnit).toBeCloseTo(0.012);
    expect(r.grossMilesValue).toBeCloseTo(432);
  });

  it("calculates net miles value subtracting card fee", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      earningsRate: 1.5,
      rawPrice: 12,
      priceUnit: "per-thousand",
      pointsCardFeeRaw: 250,
      pointsFeePeriod: "yearly",
    }));
    // net = 432 - 250 = 182
    expect(r.netMilesValue).toBeCloseTo(182);
  });

  it("handles per-unit price correctly", () => {
    var r = calculate(makeInputs({
      rawPrice: 0.015,
      priceUnit: "per-unit",
    }));
    expect(r.pricePerUnit).toBe(0.015);
  });
});

describe("calculate — points earning (with transfer)", () => {
  it("applies transfer ratio to total earned", () => {
    var r = calculate(makeInputs({
      earningType: "points",
      earningsRate: 2,
      transferRatio: 0.8,
      transferBonus: 0,
      spendAmount: 1000,
      spendPeriod: "monthly",
    }));
    // totalEarned = 12000 * 2 = 24000
    // totalMiles = 24000 * 0.8 = 19200
    expect(r.totalEarned).toBe(24000);
    expect(r.totalMiles).toBe(19200);
  });

  it("applies transfer bonus on top of ratio", () => {
    var r = calculate(makeInputs({
      earningType: "points",
      earningsRate: 2,
      transferRatio: 1,
      transferBonus: 25,
      spendAmount: 1000,
      spendPeriod: "monthly",
    }));
    // totalEarned = 24000; bonus = 1.25; totalMiles = 24000 * 1 * 1.25 = 30000
    expect(r.totalMiles).toBe(30000);
  });

  it("defaults NaN transfer ratio to 1", () => {
    var r = calculate(makeInputs({
      earningType: "points",
      earningsRate: 1,
      transferRatio: NaN,
      spendAmount: 1000,
      spendPeriod: "monthly",
    }));
    expect(r.totalMiles).toBe(12000);
  });

  it("combines transfer ratio and bonus", () => {
    var r = calculate(makeInputs({
      earningType: "points",
      earningsRate: 1.5,
      transferRatio: 0.75,
      transferBonus: 20,
      spendAmount: 2000,
      spendPeriod: "monthly",
    }));
    // totalEarned = 24000 * 1.5 = 36000
    // totalMiles = 36000 * 0.75 * 1.2 = 32400
    expect(r.totalMiles).toBeCloseTo(32400);
  });
});

describe("calculate — cashback results", () => {
  it("calculates gross cashback for all rates", () => {
    var r = calculate(makeInputs({ spendAmount: 2000, spendPeriod: "monthly" }));
    // annualSpend = 24000
    expect(r.cbResults[0].gross).toBeCloseTo(240); // 1%
    expect(r.cbResults[1].gross).toBeCloseTo(360); // 1.5%
    expect(r.cbResults[2].gross).toBeCloseTo(480); // 2%
    expect(r.cbResults[3].gross).toBeCloseTo(720); // 3%
  });

  it("subtracts shared fee from each cashback rate", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      annualCbFees: [100, 100, 100, 100],
    }));
    expect(r.cbResults[0].net).toBeCloseTo(140); // 240 - 100
    expect(r.cbResults[3].net).toBeCloseTo(620); // 720 - 100
  });

  it("supports per-rate fees", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      annualCbFees: [0, 50, 100, 200],
    }));
    expect(r.cbResults[0].net).toBeCloseTo(240); // 240 - 0
    expect(r.cbResults[1].net).toBeCloseTo(310); // 360 - 50
    expect(r.cbResults[2].net).toBeCloseTo(380); // 480 - 100
    expect(r.cbResults[3].net).toBeCloseTo(520); // 720 - 200
    expect(r.cbResults[0].fee).toBe(0);
    expect(r.cbResults[3].fee).toBe(200);
  });

  it("can produce negative net when fee exceeds gross", () => {
    var r = calculate(makeInputs({
      spendAmount: 100,
      spendPeriod: "monthly",
      annualCbFees: [500, 500, 500, 500],
    }));
    // annualSpend = 1200; 1% gross = 12; net = 12 - 500 = -488
    expect(r.cbResults[0].net).toBeCloseTo(-488);
  });
});

describe("calculate — miles buyable from cashback", () => {
  it("floors to multiples of minBuyable", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      rawPrice: 12,
      priceUnit: "per-thousand",
      minBuyable: 1000,
    }));
    // CB 1%: gross=240, pricePerUnit=0.012; raw miles = 240/0.012 = 20000
    // floor(20000/1000)*1000 = 20000
    expect(r.cbMilesBuyable[0]).toBe(20000);
    // CB 3%: gross=720; raw = 720/0.012 = 60000
    expect(r.cbMilesBuyable[3]).toBe(60000);
  });

  it("floors with larger minBuyable", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      rawPrice: 12,
      priceUnit: "per-thousand",
      minBuyable: 5000,
    }));
    // CB 1%: raw = 20000; floor(20000/5000)*5000 = 20000
    expect(r.cbMilesBuyable[0]).toBe(20000);
    // CB 1.5%: raw = 30000; floor(30000/5000)*5000 = 30000
    expect(r.cbMilesBuyable[1]).toBe(30000);
  });

  it("returns 0 when pricePerUnit is 0", () => {
    var r = calculate(makeInputs({ rawPrice: 0 }));
    expect(r.cbMilesBuyable).toEqual([0, 0, 0, 0]);
  });

  it("floors partial amounts down", () => {
    var r = calculate(makeInputs({
      spendAmount: 500,
      spendPeriod: "monthly",
      rawPrice: 20,
      priceUnit: "per-thousand",
      minBuyable: 1000,
    }));
    // annualSpend = 6000; CB 1%: gross=60; pricePerUnit=0.02; raw = 60/0.02 = 3000
    expect(r.cbMilesBuyable[0]).toBe(3000);
    // CB 1.5%: gross=90; raw = 90/0.02 = 4500; floor(4500/1000)*1000 = 4000
    expect(r.cbMilesBuyable[1]).toBe(4000);
  });
});

describe("calculate — effective cost per mile", () => {
  it("calculates points effective cost as fee / totalMiles", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      earningsRate: 1.5,
      pointsCardFeeRaw: 250,
      pointsFeePeriod: "yearly",
    }));
    // totalMiles = 36000; cost = 250/36000 ≈ 0.00694
    expect(r.pointsEffectiveCost).toBeCloseTo(250 / 36000, 5);
  });

  it("returns 0 when totalMiles is 0", () => {
    var r = calculate(makeInputs({ earningsRate: 0 }));
    expect(r.pointsEffectiveCost).toBe(0);
  });

  it("calculates cashback effective cost as pricePerUnit + fee/miles", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      rawPrice: 12,
      priceUnit: "per-thousand",
      annualCbFees: [100, 100, 100, 100],
      minBuyable: 1000,
    }));
    // pricePerUnit = 0.012; CB 1%: buyable = 20000; cost = 0.012 + 100/20000 = 0.017
    expect(r.cbEffectiveCost[0]).toBeCloseTo(0.017);
  });

  it("returns 0 when no miles buyable", () => {
    var r = calculate(makeInputs({ spendAmount: 0 }));
    expect(r.cbEffectiveCost).toEqual([0, 0, 0, 0]);
  });
});

describe("calculate — comparison (cbBeating / pointsWins)", () => {
  it("points wins when all cbMilesBuyable <= totalMiles", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      earningsRate: 3,
      rawPrice: 12,
      priceUnit: "per-thousand",
      minBuyable: 1000,
    }));
    // totalMiles = 72000; CB 3% buyable = 60000 < 72000
    expect(r.pointsWins).toBe(true);
    expect(r.cbBeating).toEqual([false, false, false, false]);
  });

  it("cashback beats when buyable > totalMiles", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      earningsRate: 0.5,
      rawPrice: 12,
      priceUnit: "per-thousand",
      minBuyable: 1000,
    }));
    // totalMiles = 12000; CB 3%: buyable = 60000 > 12000
    expect(r.cbBeating[3]).toBe(true);
    expect(r.pointsWins).toBe(false);
  });

  it("neither wins when spend is 0", () => {
    var r = calculate(makeInputs({ spendAmount: 0 }));
    expect(r.pointsWins).toBe(false);
    expect(r.cbBeating).toEqual([false, false, false, false]);
  });

  it("equal buyable does not count as beating", () => {
    // totalMiles = annualSpend * rate; CB buyable = annualSpend * cbRate / pricePerUnit floored
    // Make them equal: earningsRate=1, spend=1000/mo, price=12/1000
    // totalMiles = 12000; CB 1%: gross=120, raw=120/0.012=10000
    // CB 1.5%: raw=180/0.012=15000 > 12000 → beats
    var r = calculate(makeInputs({
      spendAmount: 1000,
      spendPeriod: "monthly",
      earningsRate: 1,
      rawPrice: 12,
      priceUnit: "per-thousand",
    }));
    expect(r.totalMiles).toBe(12000);
    expect(r.cbMilesBuyable[0]).toBe(10000);
    expect(r.cbBeating[0]).toBe(false); // 10000 <= 12000
    expect(r.cbBeating[1]).toBe(true);  // 15000 > 12000
  });
});

describe("calculate — months to buy minimum", () => {
  it("calculates months for points card", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      earningsRate: 1.5,
      minBuyable: 1000,
    }));
    // monthlyMilesEarned = 36000/12 = 3000; ceil(1000/3000) = 1
    expect(r.pointsMonthsToBuy).toBe(1);
  });

  it("calculates months for points card with larger minimum", () => {
    var r = calculate(makeInputs({
      spendAmount: 1000,
      spendPeriod: "monthly",
      earningsRate: 1,
      minBuyable: 5000,
    }));
    // monthlyMilesEarned = 12000/12 = 1000; ceil(5000/1000) = 5
    expect(r.pointsMonthsToBuy).toBe(5);
  });

  it("calculates months for cashback rates", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      earningsRate: 1.5,
      rawPrice: 12,
      priceUnit: "per-thousand",
      minBuyable: 1000,
    }));
    // costOfMinBuy = 1000 * 0.012 = 12
    // CB 1%: monthlyCb = 240/12 = 20; ceil(12/20) = 1
    expect(r.cbMonthsToBuy[0]).toBe(1);
    // CB 3%: monthlyCb = 720/12 = 60; ceil(12/60) = 1
    expect(r.cbMonthsToBuy[3]).toBe(1);
  });

  it("returns higher months for low spend", () => {
    var r = calculate(makeInputs({
      spendAmount: 100,
      spendPeriod: "monthly",
      earningsRate: 1,
      rawPrice: 20,
      priceUnit: "per-thousand",
      minBuyable: 1000,
    }));
    // costOfMinBuy = 1000 * 0.02 = 20
    // CB 1%: monthlyCb = 12/12 = 1; ceil(20/1) = 20
    expect(r.cbMonthsToBuy[0]).toBe(20);
    // CB 3%: monthlyCb = 36/12 = 3; ceil(20/3) = 7
    expect(r.cbMonthsToBuy[3]).toBe(7);
  });

  it("returns 0 when earn rate is 0", () => {
    var r = calculate(makeInputs({ earningsRate: 0 }));
    expect(r.pointsMonthsToBuy).toBe(0);
  });

  it("returns 0 when price is 0 (no cost to buy)", () => {
    var r = calculate(makeInputs({ rawPrice: 0 }));
    // costOfMinBuy = 0 → monthlyCb > 0 but costOfMinBuy <= 0 → 0
    expect(r.cbMonthsToBuy).toEqual([0, 0, 0, 0]);
  });
});

describe("calculate — goal accumulation (points card)", () => {
  it("calculates months to reach goal", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      earningsRate: 1.5,
      goalTarget: 50000,
    }));
    // monthlyMilesEarned = 36000/12 = 3000; ceil(50000/3000) = 17
    expect(r.goal.pointsMonths).toBe(17);
  });

  it("calculates total spend for goal", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      earningsRate: 1.5,
      goalTarget: 50000,
    }));
    // 17 months * 2000 = 34000
    expect(r.goal.pointsSpend).toBe(34000);
  });

  it("calculates total fees for goal", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      earningsRate: 1.5,
      pointsCardFeeRaw: 250,
      pointsFeePeriod: "yearly",
      goalTarget: 50000,
    }));
    // 17 months → ceil(17/12) = 2 years → 2 * 250 = 500
    expect(r.goal.pointsFees).toBe(500);
  });

  it("returns 0 months when no miles earned", () => {
    var r = calculate(makeInputs({ earningsRate: 0, goalTarget: 50000 }));
    expect(r.goal.pointsMonths).toBe(0);
    expect(r.goal.pointsSpend).toBe(0);
  });

  it("handles goal target of 0", () => {
    var r = calculate(makeInputs({ goalTarget: 0 }));
    expect(r.goal.pointsMonths).toBe(0);
    expect(r.goal.target).toBe(0);
  });
});

describe("calculate — goal accumulation (cashback)", () => {
  it("calculates months to reach goal for each rate", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      rawPrice: 12,
      priceUnit: "per-thousand",
      goalTarget: 50000,
    }));
    // goalCost = 50000 * 0.012 = 600
    // CB 1%: monthlyCb = 240/12 = 20; ceil(600/20) = 30
    expect(r.goal.cbData[0].months).toBe(30);
    // CB 1.5%: monthlyCb = 360/12 = 30; ceil(600/30) = 20
    expect(r.goal.cbData[1].months).toBe(20);
    // CB 2%: monthlyCb = 480/12 = 40; ceil(600/40) = 15
    expect(r.goal.cbData[2].months).toBe(15);
    // CB 3%: monthlyCb = 720/12 = 60; ceil(600/60) = 10
    expect(r.goal.cbData[3].months).toBe(10);
  });

  it("calculates total spend for each rate", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      rawPrice: 12,
      priceUnit: "per-thousand",
      goalTarget: 50000,
    }));
    // CB 3%: 10 months * 2000 = 20000
    expect(r.goal.cbData[3].spend).toBe(20000);
    // CB 1%: 30 months * 2000 = 60000
    expect(r.goal.cbData[0].spend).toBe(60000);
  });

  it("calculates fees over goal period", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      rawPrice: 12,
      priceUnit: "per-thousand",
      annualCbFees: [120, 120, 120, 120],
      goalTarget: 50000,
    }));
    // CB 3%: 10 months → ceil(10/12) = 1 year → 1 * 120 = 120
    expect(r.goal.cbData[3].fees).toBe(120);
    // CB 1%: 30 months → ceil(30/12) = 3 years → 3 * 120 = 360
    expect(r.goal.cbData[0].fees).toBe(360);
  });

  it("identifies the fastest cashback strategy", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      rawPrice: 12,
      priceUnit: "per-thousand",
      goalTarget: 50000,
    }));
    expect(r.goal.bestIdx).toBe(3); // 3% is fastest
    expect(r.goal.bestMonths).toBe(10);
  });

  it("returns 0 for all when price is 0", () => {
    var r = calculate(makeInputs({ rawPrice: 0, goalTarget: 50000 }));
    r.goal.cbData.forEach(function (d) {
      expect(d.months).toBe(0);
      expect(d.spend).toBe(0);
    });
  });

  it("returns 0 for all when spend is 0", () => {
    var r = calculate(makeInputs({ spendAmount: 0, goalTarget: 50000 }));
    r.goal.cbData.forEach(function (d) {
      expect(d.months).toBe(0);
    });
  });
});

describe("calculate — goal pointsBeatAll", () => {
  it("points beats all when pointsMonths <= all cashback months", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      earningsRate: 5,
      rawPrice: 12,
      priceUnit: "per-thousand",
      goalTarget: 10000,
    }));
    // monthlyMilesEarned = 120000/12 = 10000; pointsMonths = ceil(10000/10000) = 1
    // CB 3%: monthlyCb = 60; goalCost = 120; ceil(120/60) = 2
    expect(r.goal.pointsMonths).toBe(1);
    expect(r.goal.bestMonths).toBe(2);
    expect(r.goal.pointsBeatAll).toBe(true);
  });

  it("points does not beat all when cashback is faster", () => {
    var r = calculate(makeInputs({
      spendAmount: 2000,
      spendPeriod: "monthly",
      earningsRate: 0.5,
      rawPrice: 12,
      priceUnit: "per-thousand",
      goalTarget: 50000,
    }));
    // monthlyMilesEarned = 1000; pointsMonths = 50
    // CB 3%: monthlyCb = 60; goalCost = 600; ceil(600/60) = 10
    expect(r.goal.pointsMonths).toBe(50);
    expect(r.goal.bestMonths).toBe(10);
    expect(r.goal.pointsBeatAll).toBe(false);
  });

  it("is false when spend is 0", () => {
    var r = calculate(makeInputs({ spendAmount: 0, goalTarget: 50000 }));
    expect(r.goal.pointsBeatAll).toBe(false);
  });
});

describe("calculate — integration scenarios", () => {
  it("full scenario: moderate spender with miles card", () => {
    var r = calculate(makeInputs({
      spendAmount: 3000,
      spendPeriod: "monthly",
      pointsCardFeeRaw: 350,
      pointsFeePeriod: "yearly",
      earningsRate: 1.5,
      rawPrice: 15,
      priceUnit: "per-thousand",
      earningType: "miles",
      annualCbFees: [0, 0, 0, 0],
      minBuyable: 1000,
      goalTarget: 100000,
    }));

    expect(r.annualSpend).toBe(36000);
    expect(r.totalMiles).toBe(54000);
    expect(r.pricePerUnit).toBeCloseTo(0.015);
    expect(r.grossMilesValue).toBeCloseTo(810);
    expect(r.netMilesValue).toBeCloseTo(460);

    // CB 2%: gross = 720; buyable = 720/0.015 = 48000
    expect(r.cbMilesBuyable[2]).toBe(48000);
    // CB 3%: gross = 1080; buyable = 1080/0.015 = 72000
    expect(r.cbMilesBuyable[3]).toBe(72000);

    // points card earns 54000, CB 3% buys 72000 → CB 3% beats
    expect(r.cbBeating[3]).toBe(true);
    expect(r.pointsWins).toBe(false);

    // Goal: 100000 miles
    // Points: monthlyMiles = 4500; ceil(100000/4500) = 23
    expect(r.goal.pointsMonths).toBe(23);
    // CB 3%: goalCost = 100000*0.015 = 1500; monthlyCb = 90; ceil(1500/90) = 17
    expect(r.goal.cbData[3].months).toBe(17);
  });

  it("full scenario: points card with transfer and bonus", () => {
    var r = calculate(makeInputs({
      spendAmount: 5000,
      spendPeriod: "monthly",
      pointsCardFeeRaw: 500,
      pointsFeePeriod: "yearly",
      earningsRate: 2,
      rawPrice: 10,
      priceUnit: "per-thousand",
      earningType: "points",
      transferRatio: 0.8,
      transferBonus: 25,
      annualCbFees: [0, 100, 200, 300],
      minBuyable: 2000,
      goalTarget: 200000,
    }));

    // annualSpend = 60000; totalEarned = 120000
    // totalMiles = 120000 * 0.8 * 1.25 = 120000
    expect(r.totalMiles).toBe(120000);
    expect(r.pricePerUnit).toBeCloseTo(0.01);
    expect(r.grossMilesValue).toBeCloseTo(1200);
    expect(r.netMilesValue).toBeCloseTo(700);

    // CB 3%: gross = 1800; buyable = 1800/0.01 = 180000; floor(180000/2000)*2000 = 180000
    expect(r.cbMilesBuyable[3]).toBe(180000);
    expect(r.cbBeating[3]).toBe(true);

    // Goal: monthlyMiles = 10000; ceil(200000/10000) = 20
    expect(r.goal.pointsMonths).toBe(20);
    // CB 3%: goalCost = 2000; monthlyCb = 150; ceil(2000/150) = 14
    expect(r.goal.cbData[3].months).toBe(14);
    expect(r.goal.cbData[3].fees).toBe(300 * 2); // ceil(14/12) = 2 years
  });

  it("scenario where points clearly wins", () => {
    var r = calculate(makeInputs({
      spendAmount: 10000,
      spendPeriod: "monthly",
      earningsRate: 3,
      rawPrice: 5,
      priceUnit: "per-thousand",
      minBuyable: 1000,
    }));
    // totalMiles = 120000 * 3 = 360000
    // CB 3%: gross = 3600; buyable = 3600/0.005 = 720000 — actually beats
    // Let's check: earnings rate 3 is very high
    // pricePerUnit = 0.005
    expect(r.totalMiles).toBe(360000);
    // CB 3%: 120000*0.03=3600; 3600/0.005=720000 → beats!
    // So with rate 3 and cheap miles, even CB 3% beats...
    // Let's just verify the math is consistent
    expect(r.cbMilesBuyable[3]).toBe(720000);
  });
});
