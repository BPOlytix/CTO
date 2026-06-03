# Project Handoff: Accrue AI

## 1. Mission & Value Proposition
**Accrue AI** is a "Super User" bookkeeping agent designed for SMBs and accounting firms using Xero. It automates daily reconciliations, bill processing, and financial reporting while maintaining 100% GAAP compliance and audit-readiness.

## 2. Team Composition
The team consists of three specialized AI agents plus a lead:

| Agent | Role | Status | Current Task |
|---|---|---|---|
| **fin-dev** | Senior Software Engineer — Xero API, OAuth2, backend infra | ✅ Done | DB refactor (parameterized queries + schema init) — merged to main |
| **automation-dev** | Automation Specialist — reconciliation engine, OCR, data processing | ✅ Done | Reconciliation matching engine (PR #1) — merged to main |
| **bookkeeping-specialist** | GAAP Expert — accounting logic, CoA mapping, SOPs | 🟢 Active | Adding 4 gap test scenarios to docs |
| **lead (you)** | Team management, planning, monitoring | 🟢 Active | Coordinating |

## 3. Technical Architecture
- **Repository**: [BPOlytix/CTO](https://github.com/BPOlytix/CTO)
- **Stack**: Node.js, TypeScript, Express
- **Database**: Turso (`team-db`) for shared state and high-integrity financial logging
- **Xero Integration**: Deep integration with Accounting and Bank Feed APIs (`xero-node` SDK)

## 4. Current Status

### ✅ Completed
- **OAuth2 Authorization & Token Refresh** — Full Xero auth flow (`src/services/xero.ts`)
- **Bank Feed Delta Sync** — Paginated transaction sync with `last_sync_at` tracking (`src/services/transactions.ts`)
- **DB Layer Refactor** — Parameterized query support via `query(sql, params)` with proper escaping (`src/utils/db.ts`). Merged to main.
- **Automated Reconciliation Engine** — Priority-based matching (Exact → Close Date → Multi → Suggested) with confidence scoring, partial payment/overpayment/bank fee handling. PR #1 merged to main.
- **GAAP Mapping Rules & Reconciliation Workflows** — All docs committed in `docs/`
- **Error Handling & User Feedback SOPs** — Confidence thresholds, feedback loops, escalation paths
- **Month-End Close Checklist & Onboarding Processes** — Full close procedure and client onboarding pipeline
- **Reconciliation Test Scenarios** — 9 test cases (3 auto-reconcile, 3 draft-for-review, 3 flag-for-review)
- **GAAP Validation Report** — All 9 scenarios validated as GAAP-compliant by bookkeeping specialist
- **Audit Trail SOP** — Metadata requirements for reconciliation logging (rule_id, confidence_score, etc.)

### 🟡 In Progress
- **4 Gap Test Scenarios** — Adding Fixed Asset capitalization, Prepaid Expense, Duplicate Bill, Related Party scenarios to docs
- **Bill/Invoice Processing System** — OCR data extraction + Xero draft creation. Code on branch `feature/bill-processing-ocr` (597 lines), not yet merged

### 📋 Pending (next priorities)
- **Merge bill-processing-ocr branch** into main — OCR + bill-processing pipeline is complete
- **Push local main** to GitHub — DB refactor merge is local-only, needs `git push origin main`
- **Super User conversational interface** — Build the Express API routes for natural language commands (see `docs/super_user_commands.md`)
- **Validate engine against test scenarios** — Once merged, run the engine against `docs/reconciliation_test_scenarios.md`
- **Xero credentials** — Ensure `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET` are configured in `.env`

## 5. Repository Documentation (in `docs/`)
- `gaap_mapping_rules.md` — Thresholds and categorization logic
- `reconciliation_workflow.md` — Match hierarchy (Exact > Close Date > Multi > Suggested)
- `error_handling_and_feedback_workflows.md` — Confidence thresholds, user feedback, escalation
- `reconciliation_test_scenarios.md` — 9 test cases (updated with gaps pending)
- `audit_and_discrepancy_logic.md` — Duplicate detection, misclassification, outlier detection
- `billing_invoice_structures.md` — Data structures for bills and invoices
- `client_onboarding_process.md` — 6-phase onboarding pipeline
- `daily_bookkeeping_workflows.md` — Day-to-day SOPs
- `management_report_template.md` — P&L, Balance Sheet, ratios
- `month_end_close_checklist.md` — 8-section close process
- `super_user_commands.md` — Conversational intents (RECONCILE, CREATE_INVOICE, PROCESS_BILL, etc.)
- `WORKFLOW.md` — Git and code review standards

## 6. Shared Artifacts (in `/home/team/shared/`)
- `gaap_validation_report.md` — Detailed validation of all test scenarios + 4 gap recommendations
- `audit_trail_sop.md` — Technical spec for reconciliation logging metadata

## 7. Branch Overview
| Branch | Status | Description |
|---|---|---|
| `main` | Active | Production branch. Has DB refactor + reconciliation engine merged locally |
| `feature/bill-processing-ocr` | ⏳ Ready to merge | OCR engine + bill processing pipeline (4 files, 597 lines) |
| `feature/reconciliation-engine` | ✅ Merged (PR #1) | Matching engine (Exact > Close Date > Multi > Suggested) |

## 8. Critical Tooling
- Use `team-db` for all task management and state reads
- Refer to `docs/WORKFLOW.md` for team-specific dev processes
- The `query()` function in `src/utils/db.ts` now supports `?`-placeholders for safe parameterized queries