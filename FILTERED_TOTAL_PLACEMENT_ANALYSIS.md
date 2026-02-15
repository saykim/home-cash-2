# Filtered Total UI Placement Analysis

## Executive Summary
Based on analysis of existing amount-format and total/sum display patterns, **recommend placing the filtered total in a sticky footer bar below the TransactionTable**, using the established design system and amount formatting conventions.

---

## 1. EXISTING AMOUNT-FORMAT PATTERNS

### Pattern 1: `toLocaleString()` with Sign Prefix
**Location:** TransactionTable.tsx:150, CashflowSummary.tsx:28,36,44, CardPerformanceGauge.tsx:44,74

```tsx
// Income/positive amounts: prefix with '+'
{tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}

// Balance/net amounts: conditional sign
{summary.balance > 0 ? '+' : ''}{summary.balance.toLocaleString()}

// Performance amounts: no sign, just formatted
{card.currentPerformance.toLocaleString()}원
```

**Key Observations:**
- All amounts use `toLocaleString()` for Korean number formatting (comma separators)
- Positive amounts (income) get `+` prefix
- Negative amounts (expenses) show naturally with `-`
- Optional `원` (won) suffix used in some contexts
- Color coding: blue for income, red for expenses, green for balance/savings

### Pattern 2: Color-Coded Amount Display
**Location:** TransactionTable.tsx:147-150, CashflowSummary.tsx:27-45

```tsx
// Income amounts
<td className={`text-right font-bold whitespace-nowrap ${
  tx.amount > 0 ? 'text-blue-600' : 'text-primary'
}`}>

// Expense amounts (red)
<p className="text-2xl font-bold text-red-600">
  {summary.expense.toLocaleString()}
</p>

// Balance (conditional red/green)
<p className={`text-2xl font-bold ${
  isDeficit ? 'text-red-500' : 'text-green-600'
}`}>
```

**Key Observations:**
- Income: `text-blue-600` (light mode) / `text-blue-300` (dark mode)
- Expenses: `text-red-600` (light mode) / `text-red-500` (dark mode)
- Balance: `text-green-600` (positive) / `text-red-500` (negative)
- Font weight: `font-bold` for emphasis

---

## 2. EXISTING TOTAL/SUM DISPLAY PATTERNS

### Pattern 1: CashflowSummary (Monthly Totals)
**Location:** src/components/CashflowSummary.tsx

```tsx
<section className="surface-card rounded-2xl p-6">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
    <div>
      <span className="flex items-center justify-center gap-2 text-secondary text-sm mb-1">
        <TrendingUp size={16} className="text-blue-500" /> 수입
      </span>
      <p className="text-2xl font-bold text-blue-600">
        {summary.income.toLocaleString()}
      </p>
    </div>
    {/* Similar for expense and balance */}
  </div>
</section>
```

**Design Elements:**
- Container: `surface-card` (frosted glass effect with blur)
- Layout: 3-column grid (responsive to 1 column on mobile)
- Typography: `text-2xl font-bold` for amounts
- Icons: Lucide icons (TrendingUp, TrendingDown, Wallet)
- Spacing: `gap-6` between columns, `mb-1` for label spacing
- Dividers: `divide-y md:divide-y-0 md:divide-x` (responsive)

### Pattern 2: CardPerformanceGauge (Card-Level Totals)
**Location:** src/components/CardPerformanceGauge.tsx

```tsx
<div className="text-right">
  <span className="block text-2xl font-bold text-primary">
    {card.currentPerformance.toLocaleString()}원
  </span>
  <span className="text-xs text-secondary">
    {hasTiers ? '실적 인정 금액' : '사용 금액'}
  </span>
</div>
```

**Design Elements:**
- Amount: `text-2xl font-bold text-primary`
- Label: `text-xs text-secondary` (smaller, muted)
- Suffix: `원` appended to amount
- Layout: Right-aligned in card header

### Pattern 3: TransactionTable (Row-Level Amounts)
**Location:** src/components/TransactionTable.tsx:147-150

```tsx
<td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${
  tx.amount > 0 ? 'text-blue-600' : 'text-primary'
}`}>
  {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
</td>
```

**Design Elements:**
- Alignment: `text-right` (right-aligned for numeric data)
- Font: `font-bold` for emphasis
- Whitespace: `whitespace-nowrap` (prevent wrapping)
- Color: Conditional (blue for income, primary for expenses)

---

## 3. SHARED STYLE TOKENS (globals.css)

### Color Palette
```css
:root {
  --text-primary: #141b2d;      /* Dark blue-gray */
  --text-secondary: #4b5567;    /* Medium gray */
  --text-muted: #697389;        /* Light gray */
  --accent: #4158f6;            /* Indigo */
  --accent-soft: #e8edff;       /* Light indigo background */
  --danger: #db2f2f;            /* Red */
  --danger-soft: #fee6e6;       /* Light red background */
  --success: #159354;           /* Green */
}

.dark {
  --text-primary: #e6ecff;      /* Light indigo */
  --text-secondary: #bec8e8;    /* Light gray */
  --text-muted: #8e9ac0;        /* Medium gray */
  --accent: #7b92ff;            /* Light indigo */
  --danger: #ff798f;            /* Light red */
  --success: #44d38d;           /* Light green */
}
```

### Component Classes
```css
.surface-card {
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(8px);
}

.accent-chip {
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid color-mix(in oklab, var(--accent) 22%, var(--border));
}

.danger-chip {
  background: var(--danger-soft);
  color: var(--danger);
  border: 1px solid color-mix(in oklab, var(--danger) 24%, var(--border));
}
```

---

## 4. RECOMMENDED PLACEMENT: FILTERED TOTAL UI

### Option A: **Sticky Footer Bar (RECOMMENDED)**

**Location:** Below TransactionTable, above the section closing tag

**Rationale:**
- ✅ Mirrors CashflowSummary's 3-column layout pattern
- ✅ Consistent with existing `surface-card` styling
- ✅ Sticky positioning keeps total visible while scrolling table
- ✅ Separates filtered results from table rows
- ✅ Accessible: semantic `<tfoot>` alternative or separate summary section

**Implementation Structure:**
```tsx
<section className="surface-card rounded-2xl p-6" aria-label="거래 내역 검색 및 목록">
  {/* Filters */}
  {/* Table */}
  
  {/* NEW: Filtered Total Footer */}
  <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
      <div>
        <span className="text-secondary text-sm mb-1 block">필터된 수입</span>
        <p className="text-2xl font-bold text-blue-600">
          {filteredIncome.toLocaleString()}원
        </p>
      </div>
      <div>
        <span className="text-secondary text-sm mb-1 block">필터된 지출</span>
        <p className="text-2xl font-bold text-red-600">
          {filteredExpense.toLocaleString()}원
        </p>
      </div>
      <div>
        <span className="text-secondary text-sm mb-1 block">필터된 순액</span>
        <p className={`text-2xl font-bold ${
          filteredNet > 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {filteredNet > 0 ? '+' : ''}{filteredNet.toLocaleString()}원
        </p>
      </div>
    </div>
  </div>
</section>
```

**Styling Details:**
- Container: `mt-6 pt-4 border-t` (top border separator)
- Grid: `grid-cols-1 md:grid-cols-3 gap-6 text-center` (matches CashflowSummary)
- Amount: `text-2xl font-bold` (matches existing pattern)
- Label: `text-secondary text-sm` (matches CardPerformanceGauge)
- Colors: Blue (income), Red (expense), Green/Red (net)
- Suffix: `원` appended to all amounts

---

### Option B: Sticky Floating Bar (Alternative)

**Location:** Fixed position at bottom of TransactionTable section

**Rationale:**
- ✅ Always visible while scrolling
- ✅ Prominent placement
- ⚠️ May obscure content on small screens
- ⚠️ Requires careful z-index management

**Implementation:**
```tsx
<div className="sticky bottom-0 left-0 right-0 surface-card rounded-t-2xl p-4 border-t mt-4">
  {/* Same 3-column grid as Option A */}
</div>
```

---

### Option C: Inline Summary Row (Not Recommended)

**Location:** As a `<tfoot>` row in the table

**Rationale:**
- ⚠️ Breaks semantic table structure (tfoot for headers, not data)
- ⚠️ Inconsistent with existing total display patterns
- ⚠️ Harder to style distinctly from data rows

---

## 5. IMPLEMENTATION CHECKLIST

### Amount Calculation
```tsx
const filteredIncome = transactions
  .filter(tx => tx.amount > 0)
  .reduce((sum, tx) => sum + tx.amount, 0);

const filteredExpense = transactions
  .filter(tx => tx.amount < 0)
  .reduce((sum, tx) => sum + tx.amount, 0);

const filteredNet = filteredIncome + filteredExpense;
```

### Formatting
- ✅ Use `toLocaleString()` for all amounts
- ✅ Append `원` suffix to all amounts
- ✅ Prefix `+` for positive net amounts
- ✅ Use color coding: blue (income), red (expense), green/red (net)

### Styling
- ✅ Use `surface-card` for container (or inherit from parent)
- ✅ Use `text-2xl font-bold` for amounts
- ✅ Use `text-secondary text-sm` for labels
- ✅ Use `grid-cols-1 md:grid-cols-3 gap-6 text-center` for layout
- ✅ Use `border-t` with `var(--border)` for separator
- ✅ Respect dark mode via CSS variables

### Accessibility
- ✅ Use semantic `<div>` with clear labels
- ✅ Ensure sufficient color contrast (already met by existing palette)
- ✅ Consider `aria-label` for screen readers
- ✅ Test with keyboard navigation

---

## 6. VISUAL REFERENCE

### CashflowSummary Pattern (Existing)
```
┌─────────────────────────────────────────┐
│ 2025-02 Cashflow                        │
├─────────────────────────────────────────┤
│  수입          │  지출          │  잔액  │
│ +1,500,000원   │ -800,000원     │ +700,000원 │
└─────────────────────────────────────────┘
```

### Recommended Filtered Total (New)
```
┌─────────────────────────────────────────┐
│ [Filters]                               │
├─────────────────────────────────────────┤
│ [Table Rows]                            │
├─────────────────────────────────────────┤
│ 필터된 수입    │ 필터된 지출    │ 필터된 순액 │
│ +500,000원    │ -300,000원     │ +200,000원 │
└─────────────────────────────────────────┘
```

---

## 7. SUMMARY & RECOMMENDATION

| Aspect | Finding |
|--------|---------|
| **Amount Format** | `{amount.toLocaleString()}원` with conditional `+` prefix |
| **Color Coding** | Blue (income), Red (expense), Green/Red (net) |
| **Typography** | `text-2xl font-bold` for amounts, `text-secondary text-sm` for labels |
| **Container** | `surface-card` with `rounded-2xl p-6` |
| **Layout** | 3-column grid: `grid-cols-1 md:grid-cols-3 gap-6 text-center` |
| **Placement** | **Below TransactionTable, within same section** (Option A) |
| **Separator** | `border-t` with `var(--border)` color |
| **Responsive** | Mobile: 1 column, Tablet+: 3 columns |

**✅ RECOMMENDED APPROACH:**
Place the filtered total as a footer summary within the TransactionTable section, using the established 3-column grid pattern from CashflowSummary, with consistent amount formatting, color coding, and styling tokens.

