# Project Handoff: Accrue AI

## 1. Mission & Value Proposition
**Accrue AI** is a "Super User" bookkeeping agent designed for SMBs and accounting firms using Xero. Its goal is to automate daily reconciliations, bill processing, and financial reporting while maintaining 100% GAAP compliance and audit-readiness.

## 2. Team Composition (Currently PAUSED)
The team consists of three specialized AI agents:
*   **`fin-dev`**: Senior Software Engineer. Focuses on the Xero API, OAuth2 flows, and backend infrastructure.
*   **`automation-dev`**: Automation Specialist. Focuses on the reconciliation matching engine, OCR integration, and data processing.
*   **`bookkeeping-specialist`**: GAAP Expert. Focuses on accounting logic, chart of accounts mapping, and SOP design.

**Note**: All agents are currently in a `paused` state per owner request.

## 3. Technical Architecture
*   **Repository**: [BPOlytix/CTO](https://github.com/BPOlytix/CTO).
*   **Stack**: Node.js, TypeScript, Express.
*   **Database**: Turso (`team-db`) for shared state and high-integrity financial logging.
*   **Xero Integration**: Deep integration with Accounting and Bank Feed APIs.

## 4. Current Status
*   **Completed**:
    *   OAuth2 Authorization & Token Refresh logic.
    *   Bank Feed Delta Sync logic (fetching statement lines).
    *   GAAP Mapping Rules & Reconciliation Workflows (Stored in `docs/`).
    *   Error Handling & User Feedback SOPs.
    *   Month-End Close Checklist & Onboarding Processes.
    *   Reconciliation Matching Test Scenarios.
*   **In-Progress**:
    *   **Automated Reconciliation Engine**: Priority-based matching logic (Implementation started by `automation-dev`).
    *   **Bill/Invoice Processing System**: OCR data extraction and Xero draft creation (Implementation started by `automation-dev`).

## 5. Repository Documentation (Found in `docs/`)
The following GAAP and workflow standards are now committed to the repository:
*   `gaap_mapping_rules.md`: Thresholds and categorization logic.
*   `reconciliation_workflow.md`: The hierarchy of matching (Exact > Window > Multi).
*   `error_handling_and_feedback_workflows.md`: Logic for low-confidence transactions.
*   `reconciliation_test_scenarios.md`: Test cases for validating the engine.
*   `WORKFLOW.md`: The team's Git and Code Review standards.

## 6. Immediate Priorities for Resume
1.  **Resume Agents**: Issue `resume_member` for all agents when ready to continue.
2.  **Verify Reconciliation Engine**: Once `automation-dev` resumes and finishes, validate against the test scenarios in `docs/reconciliation_test_scenarios.md`.
3.  **Xero App Credentials**: Ensure `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET` are configured in the environment.
4.  **UI/UX Integration**: Begin building the conversational interface for the "Super User" commands.

## 7. Critical Tooling
*   Use `team-db` for all task management and state reads.
*   Refer to `docs/WORKFLOW.md` for team-specific dev processes.
