# Draft: Web Design Guideline Audit

## Requirements (confirmed)
- User request: "이용해서 지금 디자인 점검해. 그리고 수정은 하지말고 아이디어 제시해"
- Scope: review current UI code against web interface guidelines
- Constraint: no code modification, audit + idea suggestions only

## Technical Decisions
- Guideline source fetched from vercel-labs web-interface-guidelines command.md
- Review target files selected from active UI surface:
  - `src/app/page.tsx`
  - `src/app/layout.tsx`
  - `src/app/globals.css`
  - `src/components/TransactionForm.tsx`
  - `src/components/TransactionTable.tsx`
  - `src/components/SettingsView.tsx`
  - `src/components/CardPerformanceGauge.tsx`
  - `src/components/CashflowSummary.tsx`

## Research Findings
- Highest-risk issues cluster in accessibility semantics and form labeling.
- Multiple icon-only buttons lack explicit `aria-label`.
- Tab-like controls are visual-only and missing tab semantics.
- Motion system lacks reduced-motion fallback.
- Dark mode token system exists, but document metadata/theming polish is incomplete.

## Scope Boundaries
- INCLUDE: design guideline compliance review, prioritized findings, non-code improvement ideas
- EXCLUDE: direct implementation or file edits

## Open Questions
- None blocking for audit-only response.
