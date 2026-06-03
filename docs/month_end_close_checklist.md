# Month-End Close Checklist for AI Bookkeeper

This checklist defines the systematic steps the Accrue AI agent must perform at the end of each fiscal month to ensure GAAP-compliant financial statements and a "hard close" of the books.

## 1. Bank and Liquidity Reconciliations
- [ ] **Bank Reconciliation**: Run the automated reconciliation logic for all connected bank accounts. Ensure "GL Bank Balance" matches "Statement Balance".
- [ ] **Credit Card Reconciliation**: Reconcile all corporate credit card statements. Ensure all merchant fees and interest are recorded.
- [ ] **Petty Cash**: (If applicable) Reconcile manual petty cash logs against the GL.

## 2. Accounts Receivable (AR)
- [ ] **AR Aging Review**: Identify any invoices overdue by >30, 60, and 90 days.
- [ ] **Bad Debt Provision**: Evaluate if any overdue invoices require an allowance for doubtful accounts adjustment.
- [ ] **Unapplied Credits**: Ensure customer deposits/overpayments are correctly mapped to "Unearned Revenue" or applied to open invoices.

## 3. Accounts Payable (AP)
- [ ] **AP Aging Review**: Ensure all vendor bills received in the current month are recorded in the current month (Accrual Basis).
- [ ] **Unrecorded Liabilities**: Check subsequent month's bank feed for bills dated in the closing month.
- [ ] **Vendor Statement Match**: (Optional/High-tier) Reconcile top 5 vendor statements against AP ledger.

## 4. Accruals and Deferrals
- [ ] **Prepaid Expenses**: Run automated amortization journals for all assets in the "Prepaid Expenses" account (e.g., Annual Insurance, Software Subs).
- [ ] **Accrued Expenses**: Record accruals for services received but not yet billed (e.g., end-of-month utilities, payroll taxes, legal fees).
- [ ] **Deferred Revenue**: Record revenue recognition journals for payments received in advance.

## 5. Fixed Assets and Intangibles
- [ ] **Depreciation**: Calculate and record monthly depreciation for all items in the Fixed Asset Register.
- [ ] **Asset Additions**: Review "G&A" and "Repair & Maintenance" accounts for any purchases >$2,500 that should have been capitalized.

## 6. Intercompany and Clearing Accounts
- [ ] **Intercompany Reconciliations**: Match "Due To/Due From" balances between related entities.
- [ ] **Clearing Accounts**: Ensure all clearing/suspense accounts have a $0 balance.

## 7. Financial Review and Validation
- [ ] **P&L Trend Analysis**: Compare current month's expenses against the previous 3 months. Flag any variance >20% for review.
- [ ] **Gross Margin Check**: Validate that Gross Margin is consistent with historical averages; investigate significant drops.
- [ ] **Balance Sheet Validation**: Ensure the Balance Sheet "Balances" (Assets = Liabilities + Equity).

## 8. Final Close Steps
- [ ] **Lock Period**: Update the "Period Lock Date" in Xero to prevent accidental back-dated entries.
- [ ] **Generate Reports**: Trigger the automated generation of the Management Report Package (P&L, Balance Sheet, Ratios).
- [ ] **Archive Documentation**: Ensure all reconciliation reports and supporting PDFs are linked and archived for audit.
