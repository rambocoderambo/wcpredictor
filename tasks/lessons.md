# Lessons Learned — WC Prediction

## Session: Build WC Prediction Tool

### What went well
- /last30days skill yielded 48-team data with FIFA rankings, form, injuries
- Kimi report (277 pages) fully exported to markdown for reference
- Systematic extraction yielded 26 structured data sources from the report
- Impeccable skill provided strong OKLCH palette and design system guidance

### Mistakes & fixes
1. **Duplicate const declarations** — During a large edit of `showTeamInfo`, duplicate `const elo` and `const qual` were left in, breaking the page. Fix: removed duplicates.
2. **PDF text extraction noise** — PyMuPDF extraction of tables from 277-page PDF lost table structure. Fix: used manual structured data from the earlier sub-agent extraction instead.
3. **Overwriting data on edit** — When replacing large code blocks, some variables (like `title` from `TITLE_PROBS`) were accidentally removed. Fix: verified all variable references after each edit.

### Data sources used
- Kimi 2026 WC Report (277 pages, 114 tables, 300 agents)
- /last30days skill for team research
- Official Elo ratings (Table 1.4)
- Group qualification matrices (Tables 4.1-4.12)
- Match predictions (Table 4.14)
- Injury risk matrix (Table 8.6)
- Championship probabilities (Tables 8.1-8.5)
- Backtesting data (Tables 9.7-9.9)
- Monte Carlo simulations (Ch.1.2)
- Travel/altitude/heat data (Ch.6)

### Rules for future sessions
- Always verify `const` declarations have no duplicates after bulk edits
- When editing template literals, check opening/closing backticks match
- Prefer incremental edits over large block replacements when possible
