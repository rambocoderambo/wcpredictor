# v2.0 Prediction Engine Overhaul — Design Spec

**Status:** Approved  
**Target version:** v2.0  
**Goal:** Fix 5 systemic bugs destroying prediction accuracy; raise from 38% → target 55-60% overall, 65-70% selective  

## 1. Architecture Overview

No architectural changes — all changes within existing functions in `index.html`. Single-file HTML remains the deployment artifact.

**Files affected:**
- `index.html` — all changes (engine, scoring, UI, calibration)

## 2. Component Details

### 2.1 Bayesian Goal Averaging

Replace the naive Poisson λ estimation with a conjugate Gamma prior.

**Current:**
```js
const lamA = Math.max(.2, (gsA/avgGoal) * (gcB/avgGoal) * avgGoal + homeAdj);
const lamB = Math.max(.2, (gsB/avgGoal) * (gcA/avgGoal) * avgGoal);
```

**New — Gamma(5,4) prior (mean 1.25, shape 5):**
```js
function bayesStrength(goals, matches) {
  return (5 + goals) / (4 + matches);
}
```

Then for each match:
```
attackStrength_A = bayesStrength(goalsScored_A, matchesPlayed_A)
defenseWeakness_B = bayesStrength(goalsConceded_B, matchesPlayed_B)
lambda_A = (attackStrength_A / 1.25) * (defenseWeakness_B / 1.25) * 1.25
```

**Behavior:**
- 0 matches: λ = 1.25 (pure prior)
- 1 match: λ ≈ 70% prior, 30% data
- 3 matches: λ ≈ 55% prior, 45% data
- Naturally handles data scarcity without arbitrary regression

### 2.2 Remove Aggressive Regression

Delete the 70% shrink block. Replace with light caps at 5% and 95%.

### 2.3 Adaptive Market Blend

Replace fixed 60/40 blend with data-driven weight:
```
dataWeight = min(1, (matchesA + matchesB) / 6)
blendedCover = marketCover × (1 - dataWeight) + modelCover × dataWeight
```

- Both teams with 3+ matches → pure model
- Both teams with 0 matches → pure market
- Sum = 3 matches → 50/50 blend

Relax final cap from 0.80 to 0.95.

### 2.4 New Score Composition

Remove `marketAgreement` factor entirely. New weights:

| Factor | Weight |
|--------|--------|
| EV | 40% |
| Form (weighted) | 12% |
| Attack | 12% |
| Defense | 12% |
| Context | 8% |
| Discipline | 6% |
| Late Goals | 5% |
| H2H History | 5% |

Total capped at 0.85.

### 2.5 New Sub-Functions

**h2hScoreFn(teamA, teamB):** Uses LIVE_DATA[teamA].h2h[teamB] wins/ total. If < 2 matches, return neutral 0.5.

**setPieceScore(team):** Uses corners per match. >7 corners/game = +0.10, >5 = +0.05.

**weightedFormScore(team):** Last 3 matches at 2x weight, earlier at 1x.

### 2.6 Odds Movement Input

Three optional input fields "Opening Odds". If populated, compare with current odds:
- Odds shortened (>2% drop) → sharp money → +0.03 bonus
- Odds drifted (>2% rise) → market fading → -0.03 malus

### 2.7 New Confidence Thresholds

```
HIGH:  score > 0.55, EV > 8%, cover > 55%, line ≤ 1.0
MEDIUM: score > 0.45, EV > 3%, cover > 50%, line ≤ 1.5
LOW:   everything else
```

### 2.8 Enhanced Selective Mode

Requires:
- EV 5-25%
- Cover 55-80%
- Line ≤ 1.0
- Score > 0.50
- HIGH or MEDIUM confidence

### 2.9 Enhanced Calibration Dashboard

Add to renderHist():
- Favorite vs underdog split (win rate for each)
- Running accuracy (last 10, last 20)
- Alert when favorites win rate < 45% (systematic underdog bias)

## 3. Testing

1. Argentina (-0.5) at 1.80 should show cover ~65-75% (previously destroyed by regression)
2. Selective mode should filter properly
3. Odds movement input should adjust score
4. Calibration dashboard should show split stats
