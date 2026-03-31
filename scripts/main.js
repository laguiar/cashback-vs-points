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
    // Card 2
    card2Wrapper: document.getElementById("card-2-wrapper"),
    addCard2Btn: document.getElementById("add-card-2-btn"),
    removeCard2Btn: document.getElementById("remove-card-2-btn"),
    c2PointsCardFee: document.getElementById("c2-points-card-fee"),
    c2EarningsRate: document.getElementById("c2-earnings-rate"),
    c2PurchasePrice: document.getElementById("c2-purchase-price"),
    c2TransferRatio: document.getElementById("c2-transfer-ratio"),
    c2TransferBonus: document.getElementById("c2-transfer-bonus"),
    c2MinBuyable: document.getElementById("c2-min-buyable"),
    c2PointsFields: document.getElementById("c2-points-fields"),
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
    card2Active: false,
    c2EarningType: "miles",
    c2PriceUnit: "per-thousand",
    c2PointsFeePeriod: "yearly",
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
            var purchaseSlider = document.getElementById("purchase-price-slider");
            if (purchaseSlider) purchaseSlider.style.display = value === "per-unit" ? "none" : "";
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
          } else if (label === "C2 Points fee period") {
            state.c2PointsFeePeriod = value;
          } else if (label === "C2 Earning type") {
            state.c2EarningType = value;
            updateC2EarningTypeUI();
          } else if (label === "C2 Price unit") {
            state.c2PriceUnit = value;
            var c2Slider = document.getElementById("c2-purchase-price-slider");
            if (c2Slider) c2Slider.style.display = value === "per-unit" ? "none" : "";
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

  function snapC2MinBuyable() {
    var raw = parseDecimal(els.c2MinBuyable.value);
    var val = isNaN(raw) || raw < 1 ? 1 : Math.round(raw);
    els.c2MinBuyable.value = val;
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

    var typeLower = label.toLowerCase();
    var purchasePriceLabel = document.getElementById("purchase-price-label-type");
    if (purchasePriceLabel) purchasePriceLabel.textContent = typeLower;
    var minBuyableLabel = document.getElementById("min-buyable-label-type");
    if (minBuyableLabel) minBuyableLabel.textContent = typeLower;
  }

  function updateC2EarningTypeUI() {
    var isPoints = state.c2EarningType === "points";
    els.c2PointsFields.classList.toggle("hidden", !isPoints);
    var label = isPoints ? "Points" : "Miles";
    var colHeader = document.getElementById("col-c2-header");
    if (colHeader) colHeader.textContent = "Card 2 \u2014 " + label;
    var goalColHeader = document.getElementById("goal-col-c2-header");
    if (goalColHeader) goalColHeader.textContent = "Card 2 \u2014 " + label;
    var typeLower = label.toLowerCase();
    var priceLabelEl = document.getElementById("c2-purchase-price-label-type");
    if (priceLabelEl) priceLabelEl.textContent = typeLower;
    var minBuyLabelEl = document.getElementById("c2-min-buyable-label-type");
    if (minBuyLabelEl) minBuyLabelEl.textContent = typeLower;
  }

  // ── Card 2 Toggle ────────────────────────────────────

  function setupCard2Toggle() {
    els.addCard2Btn.addEventListener("click", function () {
      state.card2Active = true;
      els.card2Wrapper.classList.add("visible");
      els.addCard2Btn.style.display = "none";
      document.body.classList.add("card2-active");
      calculate();
    });

    els.removeCard2Btn.addEventListener("click", function () {
      state.card2Active = false;
      els.card2Wrapper.classList.remove("visible");
      els.addCard2Btn.style.display = "";
      document.body.classList.remove("card2-active");
      calculate();
    });
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
    var isColC2 = cell.classList.contains("col-c2");
    cell.className = classes || "";
    if (isColC2) cell.classList.add("col-c2");
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

    // ── Card 2 Rendering ───────────────────────────
    if (state.card2Active) {
      var c2TransferRatio = parseTransferRatio(els.c2TransferRatio.value);
      var r2 = runCalculation({
        spendAmount: num(els.spendAmount),
        spendPeriod: state.spendPeriod,
        pointsCardFeeRaw: num(els.c2PointsCardFee),
        pointsFeePeriod: state.c2PointsFeePeriod,
        earningsRate: num(els.c2EarningsRate),
        rawPrice: num(els.c2PurchasePrice),
        priceUnit: state.c2PriceUnit,
        earningType: state.c2EarningType,
        transferRatio: c2TransferRatio,
        transferBonus: num(els.c2TransferBonus),
        annualCbFees: annualCbFees,
        minBuyable: getMinBuyableValue(els.c2MinBuyable.value),
        goalTarget: getGoalTargetValue(els.goalTarget.value),
      });

      var c2TransferPreview = document.getElementById("c2-transfer-ratio-preview");
      if (c2TransferPreview) {
        if (els.c2TransferRatio.value.trim() && !isNaN(c2TransferRatio)) {
          c2TransferPreview.textContent = "= 1 point \u2192 " + c2TransferRatio.toFixed(4).replace(/0+$/, "").replace(/\.$/, "") + " miles";
        } else {
          c2TransferPreview.textContent = "";
        }
      }

      var c2MinBuyPreview = document.getElementById("c2-min-buyable-preview");
      if (c2MinBuyPreview) {
        if (els.c2MinBuyable.value.trim() !== "") {
          var c2EarningLabel = state.c2EarningType === "points" ? "points" : "miles";
          c2MinBuyPreview.textContent = "= " + formatNumber(r2.minBuy) + " " + c2EarningLabel;
        } else {
          c2MinBuyPreview.textContent = "";
        }
      }

      // Annual comparison column
      setCell("r-c2-gross-annual", r2.grossMilesValue, false, false, true);
      setCell("r-c2-net-annual", r2.netMilesValue, false, r2.netMilesValue < 0, true);
      setCell("r-c2-net-monthly", r2.netMilesValue / 12, false, r2.netMilesValue < 0, true);

      setCellRaw(
        "r-c2-effective-cost",
        spendAmount > 0 && r2.totalMiles > 0 ? formatCurrency(r2.pointsEffectiveCost * 1000) : "\u2014",
        "cell-benchmark"
      );

      var c2Wins = spendAmount > 0 && r2.totalMiles > r.totalMiles;
      setCellRaw(
        "r-c2-miles-earned",
        formatNumber(r2.totalMiles),
        c2Wins ? "cell-benchmark cell-winner" : "cell-benchmark"
      );

      // Difference vs card 1 baseline
      var c2DiffPct;
      if (r.totalMiles === 0) {
        c2DiffPct = r2.totalMiles > 0 ? "+\u221e" : "\u2014";
      } else {
        var c2Pct = ((r2.totalMiles - r.totalMiles) / r.totalMiles) * 100;
        c2DiffPct = (c2Pct >= 0 ? "+" : "") + c2Pct.toFixed(1) + "%";
      }
      var c2DiffCls = "cell-diff";
      if (spendAmount > 0 && r2.totalMiles > r.totalMiles) c2DiffCls += " cell-winner";
      if (spendAmount > 0 && r2.totalMiles < r.totalMiles) c2DiffCls += " cell-negative";
      setCellRaw("r-c2-diff", spendAmount > 0 ? c2DiffPct : "\u2014", c2DiffCls);

      // Goal accumulation column
      var g2 = r2.goal;
      var c2GoalWins = spendAmount > 0 && g2.pointsMonths > 0 && g.pointsMonths > 0 && g2.pointsMonths < g.pointsMonths;
      setCellRaw("g-c2-months", spendAmount > 0 && g2.pointsMonths > 0 ? g2.pointsMonths + " mo" : "\u2014", c2GoalWins ? "cell-benchmark cell-winner" : "cell-benchmark");
      setCellRaw("g-c2-spend", spendAmount > 0 && g2.pointsMonths > 0 ? formatCurrency(g2.pointsSpend) : "\u2014", c2GoalWins ? "cell-benchmark cell-winner" : "cell-benchmark");
      setCellRaw("g-c2-fees", spendAmount > 0 && g2.pointsMonths > 0 ? formatCurrency(g2.pointsFees) : "\u2014", c2GoalWins ? "cell-benchmark cell-winner" : "cell-benchmark");
    }
  }

  // ── Ergonomics Setup ────────────────────────────────

  function setupInputSelection() {
    var inputs = document.querySelectorAll('input[type="text"]');
    inputs.forEach(function (input) {
      input.addEventListener("focus", function() {
        var el = this;
        setTimeout(function() {
          if (document.activeElement === el) {
            el.select();
          }
        }, 50);
      });
      
      input.addEventListener("mouseup", function(e) {
        // Prevent Safari from clearing the selection immediately after focus
        if (this.selectionStart === 0 && this.selectionEnd === this.value.length) {
          e.preventDefault();
        }
      });
    });
  }

  function setupChips() {
    var chips = document.querySelectorAll(".chip");
    chips.forEach(function (chip) {
      chip.addEventListener("click", function() {
        var targetId = chip.getAttribute("data-target");
        var val = chip.getAttribute("data-value");
        var el = document.getElementById(targetId);
        if (el) {
          el.value = val;
          calculate();
        }
      });
    });
  }

  function setupSteppers() {
    var buttons = document.querySelectorAll(".stepper-btn");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function() {
        var targetId = btn.getAttribute("data-target");
        var el = document.getElementById(targetId);
        if (el) {
          var val = parseDecimal(el.value);
          if (isNaN(val)) val = 1;
          if (btn.classList.contains("plus")) {
            val += 1;
          } else if (btn.classList.contains("minus")) {
            val = Math.max(1, val - 1);
          }
          el.value = val;
          calculate();
          
          // Trigger snap logic if this element has any
          el.blur();
        }
      });
    });
  }

  function setupSliders() {
    var purchasePriceInput = document.getElementById("purchase-price");
    var purchasePriceSlider = document.getElementById("purchase-price-slider");
    var transferBonusInput = document.getElementById("transfer-bonus");
    var transferBonusSlider = document.getElementById("transfer-bonus-slider");

    if (purchasePriceInput && purchasePriceSlider) {
      purchasePriceSlider.addEventListener("input", function() {
        purchasePriceInput.value = purchasePriceSlider.value;
        calculate();
      });
      purchasePriceInput.addEventListener("input", function() {
        var val = parseDecimal(purchasePriceInput.value);
        if (!isNaN(val)) purchasePriceSlider.value = val;
      });
    }

    if (transferBonusInput && transferBonusSlider) {
      transferBonusSlider.addEventListener("input", function() {
        transferBonusInput.value = transferBonusSlider.value;
        calculate();
      });
      transferBonusInput.addEventListener("input", function() {
        var val = parseDecimal(transferBonusInput.value);
        if (!isNaN(val)) transferBonusSlider.value = val;
      });
    }

    var c2PriceInput = document.getElementById("c2-purchase-price");
    var c2PriceSlider = document.getElementById("c2-purchase-price-slider");
    var c2BonusInput = document.getElementById("c2-transfer-bonus");
    var c2BonusSlider = document.getElementById("c2-transfer-bonus-slider");

    if (c2PriceInput && c2PriceSlider) {
      c2PriceSlider.addEventListener("input", function() {
        c2PriceInput.value = c2PriceSlider.value;
        calculate();
      });
      c2PriceInput.addEventListener("input", function() {
        var val = parseDecimal(c2PriceInput.value);
        if (!isNaN(val)) c2PriceSlider.value = val;
      });
    }

    if (c2BonusInput && c2BonusSlider) {
      c2BonusSlider.addEventListener("input", function() {
        c2BonusInput.value = c2BonusSlider.value;
        calculate();
      });
      c2BonusInput.addEventListener("input", function() {
        var val = parseDecimal(c2BonusInput.value);
        if (!isNaN(val)) c2BonusSlider.value = val;
      });
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
  setupCard2Toggle();
  setupSnapField(els.minBuyable, snapMinBuyable);
  setupSnapField(els.c2MinBuyable, snapC2MinBuyable);
  setupSnapField(els.goalTarget, snapGoalTarget);
  setupInputListeners();
  setupInputSelection();
  setupChips();
  setupSteppers();
  setupSliders();
  calculate();
})();
