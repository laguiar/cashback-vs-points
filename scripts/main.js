(function () {
  "use strict";

  var C = window.Calc;
  var parseDecimal = C.parseDecimal;
  var parseTransferRatio = C.parseTransferRatio;
  var parseIntegerInput = C.parseIntegerInput;
  var formatCurrency = C.formatCurrency;
  var formatNumber = C.formatNumber;
  var snapToThousand = C.snapToThousand;
  var getGoalTargetValue = C.getGoalTargetValue;
  var getMinBuyableValue = C.getMinBuyableValue;
  var resolveAnnualCbFees = C.resolveAnnualCbFees;
  var runCalculation = C.calculate;
  var CB_LABELS = C.CB_LABELS;

  // ── DOM References ──────────────────────────────────

  var els = {
    spendAmount: document.getElementById("spend-amount"),
    pointsCardFee: document.getElementById("points-card-fee"),
    earningsRate: document.getElementById("earnings-rate"),
    purchasePrice: document.getElementById("purchase-price"),
    transferRatio: document.getElementById("transfer-ratio"),
    transferBonus: document.getElementById("transfer-bonus"),
    cashbackCardFee: document.getElementById("cashback-card-fee"),
    minBuyable: document.getElementById("min-buyable"),
    pointsFields: document.getElementById("points-fields"),
    winnerBanner: document.getElementById("winner-banner"),
    winnerText: document.getElementById("winner-text"),
    colPointsHeader: document.getElementById("col-points-header"),
    perRateFeesToggle: document.getElementById("per-rate-fees-toggle"),
    perRateFields: document.getElementById("per-rate-fields"),
    cbFee1: document.getElementById("cb-fee-1"),
    cbFee15: document.getElementById("cb-fee-15"),
    cbFee2: document.getElementById("cb-fee-2"),
    cbFee3: document.getElementById("cb-fee-3"),
    goalTarget: document.getElementById("goal-target"),
    goalBanner: document.getElementById("goal-banner"),
    goalBannerText: document.getElementById("goal-banner-text"),
    goalColPointsHeader: document.getElementById("goal-col-points-header"),
  };

  // ── Toggle State ────────────────────────────────────

  var state = {
    spendPeriod: "monthly",
    earningType: "miles",
    priceUnit: "per-thousand",
    pointsFeePeriod: "yearly",
    cashbackFeePeriod: "yearly",
    perRateFees: false,
    cbFee1Period: "yearly",
    cbFee15Period: "yearly",
    cbFee2Period: "yearly",
    cbFee3Period: "yearly",
  };

  // ── Toggle Setup ────────────────────────────────────

  function setupToggles() {
    document.querySelectorAll(".toggle").forEach(function (group) {
      var buttons = group.querySelectorAll(".toggle-btn");
      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          buttons.forEach(function (b) {
            b.classList.remove("active");
            b.setAttribute("aria-pressed", "false");
          });
          btn.classList.add("active");
          btn.setAttribute("aria-pressed", "true");

          var value = btn.dataset.value;

          var label = group.getAttribute("aria-label");
          if (label === "Spend period") {
            state.spendPeriod = value;
          } else if (label === "Earning type") {
            state.earningType = value;
            updateEarningTypeUI();
          } else if (label === "Price unit") {
            state.priceUnit = value;
          } else if (label === "Points fee period") {
            state.pointsFeePeriod = value;
          } else if (label === "Cashback fee period") {
            state.cashbackFeePeriod = value;
          } else if (label === "CB 1% fee period") {
            state.cbFee1Period = value;
          } else if (label === "CB 1.5% fee period") {
            state.cbFee15Period = value;
          } else if (label === "CB 2% fee period") {
            state.cbFee2Period = value;
          } else if (label === "CB 3% fee period") {
            state.cbFee3Period = value;
          }

          calculate();
        });
      });
    });
  }

  // ── Per-Rate Fees Setup ─────────────────────────

  function setupPerRateFees() {
    els.perRateFeesToggle.addEventListener("change", function () {
      state.perRateFees = els.perRateFeesToggle.checked;
      els.perRateFields.classList.toggle("hidden", !state.perRateFees);
      calculate();
    });
  }

  // ── Snap Field Setup ────────────────────────────

  function setupSnapField(el, snapFn) {
    el.addEventListener("blur", snapFn);
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        snapFn();
        el.blur();
      }
    });
  }

  function snapMinBuyable() {
    var raw = parseDecimal(els.minBuyable.value);
    var val = isNaN(raw) || raw < 1 ? 1 : Math.round(raw);
    els.minBuyable.value = val;
    calculate();
  }

  function snapGoalTarget() {
    var raw = parseIntegerInput(els.goalTarget.value);
    els.goalTarget.value = formatNumber(snapToThousand(raw, 1000));
    calculate();
  }

  function updateEarningTypeUI() {
    var isPoints = state.earningType === "points";
    els.pointsFields.classList.toggle("hidden", !isPoints);
    var label = isPoints ? "Points" : "Miles";
    els.colPointsHeader.textContent = label;
    els.goalColPointsHeader.textContent = label;
  }

  // ── Input Helpers ───────────────────────────────────

  function num(input, fallback) {
    var v = parseDecimal(input.value);
    return isNaN(v) ? (fallback !== undefined ? fallback : 0) : v;
  }

  function setCell(id, value, isWinner, isNegative, isBenchmark) {
    var cell = document.getElementById(id);
    if (!cell) return;
    cell.textContent = formatCurrency(value);
    cell.classList.toggle("cell-winner", !!isWinner);
    cell.classList.toggle("cell-negative", isNegative && value < 0);
    cell.classList.toggle("cell-benchmark", !!isBenchmark);
  }

  function setCellRaw(id, text, classes) {
    var cell = document.getElementById(id);
    if (!cell) return;
    cell.textContent = text;
    cell.className = classes || "";
  }

  // ── Calculation Engine ──────────────────────────────

  var cbPrefixes = ["r-cb1", "r-cb15", "r-cb2", "r-cb3"];

  function calculate() {
    var sharedCbFeeRaw = num(els.cashbackCardFee);
    var sharedCbFee = state.cashbackFeePeriod === "monthly" ? sharedCbFeeRaw * 12 : sharedCbFeeRaw;
    var annualCbFees = resolveAnnualCbFees(state.perRateFees, sharedCbFee, [
      { raw: num(els.cbFee1), period: state.cbFee1Period },
      { raw: num(els.cbFee15), period: state.cbFee15Period },
      { raw: num(els.cbFee2), period: state.cbFee2Period },
      { raw: num(els.cbFee3), period: state.cbFee3Period },
    ]);

    var transferRatio = parseTransferRatio(els.transferRatio.value);

    var r = runCalculation({
      spendAmount: num(els.spendAmount),
      spendPeriod: state.spendPeriod,
      pointsCardFeeRaw: num(els.pointsCardFee),
      pointsFeePeriod: state.pointsFeePeriod,
      earningsRate: num(els.earningsRate),
      rawPrice: num(els.purchasePrice),
      priceUnit: state.priceUnit,
      earningType: state.earningType,
      transferRatio: transferRatio,
      transferBonus: num(els.transferBonus),
      annualCbFees: annualCbFees,
      minBuyable: getMinBuyableValue(els.minBuyable.value),
      goalTarget: getGoalTargetValue(els.goalTarget.value),
    });

    // Transfer ratio preview
    var preview = document.getElementById("transfer-ratio-preview");
    if (preview) {
      if (els.transferRatio.value.trim() && !isNaN(transferRatio)) {
        preview.textContent = "= 1 point \u2192 " + transferRatio.toFixed(4).replace(/0+$/, "").replace(/\.$/, "") + " miles";
      } else {
        preview.textContent = "";
      }
    }

    var earningLabel = state.earningType === "points" ? "Points" : "Miles";

    // Min buyable preview
    var minBuyPreview = document.getElementById("min-buyable-preview");
    if (minBuyPreview) {
      if (els.minBuyable.value.trim() !== "") {
        minBuyPreview.textContent = "= " + formatNumber(r.minBuy) + " " + earningLabel.toLowerCase();
      } else {
        minBuyPreview.textContent = "";
      }
    }

    var spendAmount = num(els.spendAmount);

    // Render points/miles column (benchmark)
    setCell("r-points-gross-annual", r.grossMilesValue, false, false, true);
    setCell("r-points-net-annual", r.netMilesValue, false, r.netMilesValue < 0, true);
    setCell("r-points-net-monthly", r.netMilesValue / 12, false, r.netMilesValue < 0, true);

    // Effective cost per 1k miles row
    setCellRaw(
      "r-points-effective-cost",
      spendAmount > 0 && r.totalMiles > 0 ? formatCurrency(r.pointsEffectiveCost * 1000) : "\u2014",
      "cell-benchmark"
    );
    r.cbEffectiveCost.forEach(function (cost, i) {
      var prefix = cbPrefixes[i];
      var beats = spendAmount > 0 && r.cbBeating[i];
      setCellRaw(
        prefix + "-effective-cost",
        spendAmount > 0 && r.cbMilesBuyable[i] > 0 ? formatCurrency(cost * 1000) : "\u2014",
        beats ? "cell-winner" : ""
      );
    });

    // Miles earned row
    document.getElementById("r-miles-earned-label").textContent =
      earningLabel + " earned / buyable";
    setCellRaw("r-points-miles-earned", formatNumber(r.totalMiles), r.pointsWins ? "cell-benchmark cell-winner" : "cell-benchmark");

    // Render cashback columns
    r.cbResults.forEach(function (cr, i) {
      var prefix = cbPrefixes[i];
      var beats = spendAmount > 0 && r.cbBeating[i];
      setCell(prefix + "-gross-annual", cr.gross, beats, false, false);
      setCell(prefix + "-net-annual", cr.net, beats, cr.net < 0, false);
      setCell(prefix + "-net-monthly", cr.net / 12, beats, cr.net < 0, false);
      setCellRaw(
        prefix + "-miles-buyable",
        formatNumber(r.cbMilesBuyable[i]),
        beats ? "cell-winner" : ""
      );
    });

    // Difference row
    setCellRaw("r-points-diff", "baseline", "cell-benchmark cell-diff-baseline");
    r.cbMilesBuyable.forEach(function (buyable, i) {
      var prefix = cbPrefixes[i];
      var beats = spendAmount > 0 && r.cbBeating[i];
      var diffPct;
      if (r.totalMiles === 0) {
        diffPct = buyable > 0 ? "+100.0%" : "\u2014";
      } else {
        var pct = ((buyable - r.totalMiles) / r.totalMiles) * 100;
        diffPct = (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
      }
      var cls = beats ? "cell-winner cell-diff" : "cell-diff";
      if (spendAmount > 0 && buyable < r.totalMiles) cls += " cell-negative";
      setCellRaw(prefix + "-diff", spendAmount > 0 ? diffPct : "\u2014", cls);
    });

    // Winner banner
    if (spendAmount > 0) {
      els.winnerBanner.classList.remove("hidden");
      if (r.pointsWins) {
        els.winnerText.textContent = earningLabel + " card wins \u2014 " + formatNumber(r.totalMiles) + " miles earned beats all cashback options";
      } else {
        els.winnerText.textContent = "Cashback beats " + earningLabel + " \u2014 see highlighted columns";
      }
    } else {
      els.winnerBanner.classList.add("hidden");
    }

    // ── Goal Accumulation Rendering ───────────────
    var goalPrefix = ["g-cb1", "g-cb15", "g-cb2", "g-cb3"];
    var g = r.goal;

    setCellRaw("g-points-months", spendAmount > 0 && g.pointsMonths > 0 ? g.pointsMonths + " mo" : "\u2014", "cell-benchmark");
    setCellRaw("g-points-spend", spendAmount > 0 && g.pointsMonths > 0 ? formatCurrency(g.pointsSpend) : "\u2014", "cell-benchmark");
    setCellRaw("g-points-fees", spendAmount > 0 && g.pointsMonths > 0 ? formatCurrency(g.pointsFees) : "\u2014", "cell-benchmark");

    g.cbData.forEach(function (d, i) {
      var prefix = goalPrefix[i];
      var show = spendAmount > 0 && d.months > 0;
      var beatsBaseline = show && g.pointsMonths > 0 && d.months < g.pointsMonths;
      var cls = beatsBaseline ? "cell-winner" : "";
      setCellRaw(prefix + "-months", show ? d.months + " mo" : "\u2014", cls);
      setCellRaw(prefix + "-spend", show ? formatCurrency(d.spend) : "\u2014", cls);
      setCellRaw(prefix + "-fees", show ? formatCurrency(d.fees) : "\u2014", cls);
    });

    if (spendAmount > 0 && g.pointsMonths > 0 && g.pointsBeatAll) {
      setCellRaw("g-points-months", g.pointsMonths + " mo", "cell-benchmark cell-winner");
      setCellRaw("g-points-spend", formatCurrency(g.pointsSpend), "cell-benchmark cell-winner");
      setCellRaw("g-points-fees", formatCurrency(g.pointsFees), "cell-benchmark cell-winner");
    }

    // Goal banner
    if (spendAmount > 0 && (g.pointsMonths > 0 || g.bestMonths < Infinity)) {
      els.goalBanner.classList.remove("hidden");
      if (g.pointsBeatAll) {
        els.goalBannerText.textContent = earningLabel + " card reaches " + formatNumber(g.target) + " miles fastest \u2014 " + g.pointsMonths + " months";
      } else if (g.bestMonths < Infinity) {
        els.goalBannerText.textContent = CB_LABELS[g.bestIdx] + " reaches " + formatNumber(g.target) + " miles fastest \u2014 " + g.bestMonths + " months";
      }
    } else {
      els.goalBanner.classList.add("hidden");
    }
  }

  // ── Event Listeners ─────────────────────────────────

  function setupInputListeners() {
    var inputs = document.querySelectorAll('input[type="text"]');
    inputs.forEach(function (input) {
      input.addEventListener("input", calculate);
    });
  }

  // ── Init ────────────────────────────────────────────

  setupToggles();
  setupPerRateFees();
  setupSnapField(els.minBuyable, snapMinBuyable);
  setupSnapField(els.goalTarget, snapGoalTarget);
  setupInputListeners();
  calculate();
})();
