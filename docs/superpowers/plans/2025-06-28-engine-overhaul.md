# v2.0 Engine Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 systemic bugs destroying prediction accuracy; raise from 38% → target 55-60% overall, 65-70% selective

**Architecture:** All changes in single file `index.html`. Bayesian conjugate prior replaces arbitrary regression. Adaptive market blend. New score composition with H2H/set-piece factors. Adjusted thresholds and selective mode.

**Tech Stack:** Vanilla JS, single HTML file, localStorage.

---

### Task 1: Bayesian Goal Averaging — Replace Poisson λ

**Files:** Modify `index.html` (inside `estCover()`)

- [ ] **Step 1: Read current estCover() function in index.html to find exact lines for the λ estimation and regression block**
- [ ] **Step 2: Add Gamma prior constants and bayesStrength function before the λ estimation**
- [ ] **Step 3: Replace the λ estimation block with Bayesian call**
- [ ] **Step 4: Remove the 70% regression block, replace with light cap at 95%**
- [ ] **Step 5: Verify syntax and commit**

---

### Task 2: Adaptive Market Blend + New Score Composition

**Files:** Modify `index.html` (inside `scoreBet()`)

- [ ] **Step 1: Read current scoreBet() function to find exact line numbers**
- [ ] **Step 2: Replace static 60/40 blend with adaptive blend based on data volume**
- [ ] **Step 3: Remove marketAgreement from score, replace with new weights**
- [ ] **Step 4: Relax finalScore cap from 0.80 to 0.85 and finalCover cap from 0.80 to 0.95**
- [ ] **Step 5: Verify syntax and commit**

---

### Task 3: H2H Score + Set-Piece Score + Weighted Form

**Files:** Modify `index.html` (add 3 new functions, update scoreBet to use them)

- [ ] **Step 1: Read current score area for insertion points**
- [ ] **Step 2: Add h2hScoreFn(pickT, oppT) function**
- [ ] **Step 3: Add setPieceScore(team) function**
- [ ] **Step 4: Add weightedFormScore(team) function**
- [ ] **Step 5: Update scoreBet to use weightedForm instead of formScore, add h2h + sp to total**
- [ ] **Step 6: Verify syntax and commit**

---

### Task 4: Odds Movement Input

**Files:** Modify `index.html` (HTML form + analyze() + scoreBet())

- [ ] **Step 1: Read current HTML form section and analyze() function**
- [ ] **Step 2: Add 3 opening odds input fields below existing handicap inputs**
- [ ] **Step 3: Update analyze() to read opening odds and pass to scoreBet**
- [ ] **Step 4: Update scoreBet to apply odds movement bonus/malus**
- [ ] **Step 5: Verify syntax and commit**

---

### Task 5: New Confidence Thresholds + Enhanced Selective Mode

**Files:** Modify `index.html` (confLabel + selective mode filter + skip banner)

- [ ] **Step 1: Read confLabel and selective mode filter**
- [ ] **Step 2: Update confLabel with new thresholds**
- [ ] **Step 3: Update selective mode filter in renderResults()**
- [ ] **Step 4: Update skip banner text**
- [ ] **Step 5: Verify syntax and commit**

---

### Task 6: Enhanced Calibration Dashboard

**Files:** Modify `index.html` (renderHist function)

- [ ] **Step 1: Read renderHist() calibration section**
- [ ] **Step 2: Add favorite/underdog split stats**
- [ ] **Step 3: Add running accuracy (last 10, last 20)**
- [ ] **Step 4: Add systematic bias alert**
- [ ] **Step 5: Verify syntax and commit**

---

### Task 7: Version Bump + Final Commit

- [ ] **Step 1: Bump to v2.0, update VERSION_HISTORY, update footer**
- [ ] **Step 2: Final commit and push**
- [ ] **Step 3: Verify app loads with no console errors**
