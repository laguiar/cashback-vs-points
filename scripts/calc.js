// Pure calculation and utility functions.
// Loaded as a plain <script> in the browser (sets window.Calc).
// Tests import via tests/calc-exports.js wrapper.

(function (root) {
  "use strict";

  // ── Parsing Helpers ───────────────────────────────────

  function parseDecimal(str) {
    if (!str) return NaN;
    str = str.trim();
    var lastDot = str.lastIndexOf(".");
    var lastComma = str.lastIndexOf(",");
    if (lastComma > lastDot) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else if (lastDot > lastComma) {
      str = str.replace(/,/g, "");
    } else {
      str = str.replace(/,/g, "");
    }
    return parseFloat(str);
  }

  function parseTransferRatio(str) {
    if (!str) return NaN;
    str = str.trim();

    var colonMatch = str.match(/^([\d.,]+)\s*:\s*([\d.,]+)$/);
    if (colonMatch) {
      var left = parseDecimal(colonMatch[1]);
      var right = parseDecimal(colonMatch[2]);
      return left > 0 ? right / left : NaN;
    }

    var pctMatch = str.match(/^([\d.,]+)\s*%$/);
    if (pctMatch) {
      return parseDecimal(pctMatch[1]) / 100;
    }

    return parseDecimal(str);
  }

  function parseIntegerInput(str) {
    if (!str) return NaN;
    var raw = str.replace(/,/g, "").trim();
    return parseFloat(raw);
  }

  // ── Formatting ────────────────────────────────────────

  function formatCurrency(value) {
    if (value === 0) return "0.00";
    var negative = value < 0;
    var abs = Math.abs(value);
    var parts = abs.toFixed(2).split(".");
    var intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    var result = intPart + "." + parts[1];
    return negative ? "-" + result : result;
  }

  function formatNumber(value) {
    if (value === 0) return "0";
    var negative = value < 0;
    var abs = Math.abs(value);
    var rounded = Math.round(abs).toString();
    var formatted = rounded.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return negative ? "-" + formatted : formatted;
  }

  // ── Snap Helpers ──────────────────────────────────────

  function snapToThousand(value, minValue) {
    if (minValue === undefined) minValue = 1000;
    if (isNaN(value) || value < minValue) return minValue;
    return Math.round(value / 1000) * 1000;
  }

  function getGoalTargetValue(str) {
    var v = parseIntegerInput(str);
    if (isNaN(v) || v <= 0) return 0;
    return Math.round(v / 1000) * 1000 || 1000;
  }

  function getMinBuyableValue(str) {
    var v = parseDecimal(str);
    if (isNaN(v)) return 1000;
    if (v < 100) {
      v = v * 1000;
    }
    if (v < 1000) return 1000;
    return Math.round(v / 1000) * 1000;
  }

  // ── Calculation Constants ─────────────────────────────

  var CASHBACK_RATES = [0.01, 0.015, 0.02, 0.03];
  var CB_LABELS = ["Cashback 1%", "Cashback 1.5%", "Cashback 2%", "Cashback 3%"];

  // ── Core Calculations ─────────────────────────────────

  /**
   * @param {object} inputs
   * @param {number} inputs.spendAmount
   * @param {string} inputs.spendPeriod        - "monthly" | "yearly"
   * @param {number} inputs.pointsCardFeeRaw
   * @param {string} inputs.pointsFeePeriod    - "monthly" | "yearly"
   * @param {number} inputs.earningsRate
   * @param {number} inputs.rawPrice
   * @param {string} inputs.priceUnit          - "per-thousand" | "per-unit"
   * @param {string} inputs.earningType        - "miles" | "points"
   * @param {number} inputs.transferRatio
   * @param {number} inputs.transferBonus      - percentage, e.g. 25
   * @param {number[]} inputs.annualCbFees     - per-rate annual fees (length 4)
   * @param {number} inputs.minBuyable
   * @param {number} inputs.goalTarget
   */
  function calculate(inputs) {
    var spendAmount = inputs.spendAmount || 0;
    var annualSpend =
      inputs.spendPeriod === "monthly" ? spendAmount * 12 : spendAmount;

    var pointsCardFee =
      inputs.pointsFeePeriod === "monthly"
        ? (inputs.pointsCardFeeRaw || 0) * 12
        : inputs.pointsCardFeeRaw || 0;
    var earningsRate = inputs.earningsRate || 0;
    var pricePerUnit =
      inputs.priceUnit === "per-thousand"
        ? (inputs.rawPrice || 0) / 1000
        : inputs.rawPrice || 0;

    var bonusType = inputs.purchaseBonusType || "none";
    var bonusValue = inputs.purchaseBonusValue || 0;

    var effectiveBuyPricePerUnit = pricePerUnit;
    if (bonusType === "discount") {
      effectiveBuyPricePerUnit = pricePerUnit * (1 - bonusValue / 100);
    } else if (bonusType === "miles") {
      effectiveBuyPricePerUnit = pricePerUnit / (1 + bonusValue / 100);
    }

    var totalEarned = annualSpend * earningsRate;
    var totalMiles;

    if (inputs.earningType === "points") {
      var transferRatio = inputs.transferRatio;
      if (isNaN(transferRatio)) transferRatio = 1;
      var bonusMultiplier = 1 + (inputs.transferBonus || 0) / 100;
      totalMiles = totalEarned * transferRatio * bonusMultiplier;
    } else {
      totalMiles = totalEarned;
    }

    var grossMilesValue = totalMiles * pricePerUnit;
    var netMilesValue = grossMilesValue - pointsCardFee;

    var annualCbFees = inputs.annualCbFees || [0, 0, 0, 0];
    var cbResults = CASHBACK_RATES.map(function (rate, i) {
      var gross = annualSpend * rate;
      var net = gross - annualCbFees[i];
      return { gross: gross, net: net, fee: annualCbFees[i] };
    });

    var minBuy = inputs.minBuyable || 1000;
    var cbMilesBuyable = cbResults.map(function (r) {
      if (effectiveBuyPricePerUnit <= 0) return 0;
      if (bonusType === "miles") {
        if (pricePerUnit <= 0) return 0;
        var baseMiles = Math.floor((r.gross / pricePerUnit) / minBuy) * minBuy;
        return baseMiles * (1 + bonusValue / 100);
      } else {
        return Math.floor((r.gross / effectiveBuyPricePerUnit) / minBuy) * minBuy;
      }
    });

    var pointsEffectiveCost = totalMiles > 0 ? pointsCardFee / totalMiles : 0;
    var cbEffectiveCost = cbMilesBuyable.map(function (miles, i) {
      if (miles <= 0) return 0;
      return effectiveBuyPricePerUnit + annualCbFees[i] / miles;
    });

    var cbBeating = cbMilesBuyable.map(function (buyable) {
      return buyable > totalMiles;
    });
    var anyBeats = spendAmount > 0 && cbBeating.some(Boolean);
    var pointsWins = spendAmount > 0 && !anyBeats;

    var monthlySpend =
      inputs.spendPeriod === "monthly" ? spendAmount : spendAmount / 12;
    var costOfMinBuy = minBuy * (bonusType === "discount" ? effectiveBuyPricePerUnit : pricePerUnit);
    var monthlyMilesEarned = totalMiles / 12;
    var pointsMonthsToBuy =
      monthlyMilesEarned > 0 ? Math.ceil(minBuy / monthlyMilesEarned) : 0;
    var cbMonthsToBuy = cbResults.map(function (r) {
      var monthlyCb = r.gross / 12;
      if (monthlyCb <= 0 || costOfMinBuy <= 0) return 0;
      return Math.ceil(costOfMinBuy / monthlyCb);
    });

    var goalTarget = inputs.goalTarget || 0;
    var gPointsMonths =
      monthlyMilesEarned > 0 ? Math.ceil(goalTarget / monthlyMilesEarned) : 0;
    var gPointsSpend = gPointsMonths * monthlySpend;
    var gPointsFees = Math.ceil(gPointsMonths / 12) * pointsCardFee;

    var goalCost = goalTarget * effectiveBuyPricePerUnit;
    var bestGoalMonths = Infinity;
    var bestGoalIdx = -1;

    var gCbData = cbResults.map(function (r, i) {
      var monthlyCb = r.gross / 12;
      if (monthlyCb <= 0 || goalCost <= 0)
        return { months: 0, spend: 0, fees: 0 };
      var months = Math.ceil(goalCost / monthlyCb);
      var spend = months * monthlySpend;
      var fees = Math.ceil(months / 12) * annualCbFees[i];
      if (months < bestGoalMonths) {
        bestGoalMonths = months;
        bestGoalIdx = i;
      }
      return { months: months, spend: spend, fees: fees };
    });

    var pointsBeatAllGoal =
      spendAmount > 0 && gPointsMonths > 0 && gPointsMonths <= bestGoalMonths;

    // Cashback Accumulation Section Logic
    var cashbackGoal = (inputs.cashbackGoal !== undefined && !isNaN(inputs.cashbackGoal)) ? inputs.cashbackGoal : 500;
    var monthlyMilesValue = monthlyMilesEarned * pricePerUnit;
    var gCbPointsMonths =
      monthlyMilesValue > 0 ? Math.ceil(cashbackGoal / monthlyMilesValue) : 0;
    var gCbPointsSpend = gCbPointsMonths * monthlySpend;
    var gCbPointsFees = Math.ceil(gCbPointsMonths / 12) * pointsCardFee;

    var bestCbGoalMonths = Infinity;
    var bestCbGoalIdx = -1;

    var gCbGoalData = cbResults.map(function (r, i) {
      var monthlyCb = r.gross / 12;
      if (monthlyCb <= 0 || cashbackGoal <= 0)
        return { months: 0, spend: 0, fees: 0 };
      var months = Math.ceil(cashbackGoal / monthlyCb);
      var spend = months * monthlySpend;
      var fees = Math.ceil(months / 12) * annualCbFees[i];
      if (months < bestCbGoalMonths) {
        bestCbGoalMonths = months;
        bestCbGoalIdx = i;
      }
      return { months: months, spend: spend, fees: fees };
    });

    var cbPointsBeatAll =
      spendAmount > 0 &&
      gCbPointsMonths > 0 &&
      gCbPointsMonths <= bestCbGoalMonths;

    return {
      annualSpend: annualSpend,
      monthlySpend: monthlySpend,
      pointsCardFee: pointsCardFee,
      pricePerUnit: pricePerUnit,
      effectiveBuyPricePerUnit: effectiveBuyPricePerUnit,
      totalEarned: totalEarned,
      totalMiles: totalMiles,
      grossMilesValue: grossMilesValue,
      netMilesValue: netMilesValue,
      cbResults: cbResults,
      cbMilesBuyable: cbMilesBuyable,
      pointsEffectiveCost: pointsEffectiveCost,
      cbEffectiveCost: cbEffectiveCost,
      cbBeating: cbBeating,
      pointsWins: pointsWins,
      minBuy: minBuy,
      costOfMinBuy: costOfMinBuy,
      monthlyMilesEarned: monthlyMilesEarned,
      pointsMonthsToBuy: pointsMonthsToBuy,
      cbMonthsToBuy: cbMonthsToBuy,
      goal: {
        target: goalTarget,
        pointsMonths: gPointsMonths,
        pointsSpend: gPointsSpend,
        pointsFees: gPointsFees,
        goalCost: goalCost,
        cbData: gCbData,
        bestMonths: bestGoalMonths,
        bestIdx: bestGoalIdx,
        pointsBeatAll: pointsBeatAllGoal,
      },
      cbGoal: {
        target: cashbackGoal,
        pointsMonths: gCbPointsMonths,
        pointsSpend: gCbPointsSpend,
        pointsFees: gCbPointsFees,
        cbData: gCbGoalData,
        bestMonths: bestCbGoalMonths,
        bestIdx: bestCbGoalIdx,
        pointsBeatAll: cbPointsBeatAll,
      },
    };
  }

  // ── Annual CB Fees Helper ─────────────────────────────

  function resolveAnnualCbFees(perRateFees, sharedFee, rateFees) {
    if (!perRateFees) {
      return [sharedFee, sharedFee, sharedFee, sharedFee];
    }
    return rateFees.map(function (f) {
      return f.period === "monthly" ? f.raw * 12 : f.raw;
    });
  }

  // ── Export ─────────────────────────────────────────────

  var Calc = {
    parseDecimal: parseDecimal,
    parseTransferRatio: parseTransferRatio,
    parseIntegerInput: parseIntegerInput,
    formatCurrency: formatCurrency,
    formatNumber: formatNumber,
    snapToThousand: snapToThousand,
    getGoalTargetValue: getGoalTargetValue,
    getMinBuyableValue: getMinBuyableValue,
    CASHBACK_RATES: CASHBACK_RATES,
    CB_LABELS: CB_LABELS,
    calculate: calculate,
    resolveAnnualCbFees: resolveAnnualCbFees,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Calc;
  } else {
    root.Calc = Calc;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
