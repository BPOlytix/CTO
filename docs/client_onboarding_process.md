# Client Onboarding Process for Accrue AI

This document outlines the systematic process for onboarding a new SMB client to the Accrue AI platform, ensuring their Xero organization is configured for GAAP-compliant, automated bookkeeping.

## Phase 0: Technical Pre-requisites (Engineering Handover)

Before a client can be onboarded, the following system components must be verified:
- **OAuth2 Service**: Functional and capable of handling multi-tenant `TenantID` storage.
- **OCR Engine**: Ready to receive and process documents for the specific client namespace.
- **Sync Engine**: Database tables (`xero_connections`, `transactions`) initialized for the new tenant.
- **Base Ruleset**: Global GAAP mapping rules loaded into the tenant's local configuration.

---

## Phase 1: Initial Discovery & Access

### 1.1 Xero Connection
*   **Step**: Use the OAuth2 flow to connect the client's Xero organization.
*   **Validation**: Verify that the correct "Tenant ID" is retrieved and stored.
*   **Action**: Sync basic organization details (Legal Name, Registration Number, Fiscal Year End).

### 1.2 Initial Data Load & Access Review
*   **Step**: Sync the last 12 months of transaction history and all current "Draft/Awaiting Approval" items from Xero.
*   **Access Review**: Verify the Accrue AI agent has "Standard" or "Adviser" level access in Xero to perform reconciliations and record journals.

---

## Phase 2: Chart of Accounts (CoA) Mapping

### 2.1 GAP Analysis & Standardization
*   **Step**: Export the client's current Chart of Accounts.
*   **Action**: Map each account to the standard categories defined in `gaap_mapping_rules.md`.
*   **Standardization**: 
    *   Ensure all "Sales" accounts have the correct tax rate assigned.
    *   Validate that "COGS" accounts are only used for direct costs.
    *   Review "Other Income/Expense" for items that should be in "Operating".
*   **Flag**: Identify any custom accounts that do not fit standard GAAP classifications for manual review.

### 2.2 Account Creation & Configuration
*   **Step**: If missing, create the following required accounts in Xero:
    *   *Unearned Revenue* (Current Liability)
    *   *Prepaid Expenses* (Current Asset)
    *   *Accrued Liabilities* (Current Liability)
    *   *Bank Fees* (Expense)
*   **Tracking Categories**: Set up or verify Tracking Categories (e.g., Department, Region) if required for departmental reporting as per the management report templates.

---

## Phase 3: Bank & Reconciliation Setup

### 3.1 Bank Feed Verification
*   **Step**: Confirm all business bank accounts and credit cards have active feeds in Xero.
*   **Action**: Record the "Starting Balance" for each account as of the onboarding date.
*   **Audit**: Verify that no personal accounts are connected to the business Xero organization.

### 3.2 Establishing Bank Rules & Initial Training
*   **Step**: Review existing bank rules in Xero for GAAP compliance.
*   **Action**: Implement standard Accrue AI bank rules for common transactions (e.g., Bank Fees, Interest, Merchant Charges).
*   **Fuzzy Logic Training**: Feed the last 3 months of bank statements into the AI engine to "learn" the client's common payees and categorization patterns.
*   **Refer to**: `reconciliation_workflow.md` for matching logic.

---

## Phase 4: Workflow & Preference Configuration

### 4.1 Bill Processing (AP)
*   **Step**: Configure the bill intake method (Email-to-Xero or direct upload).
*   **Action**: Set default mapping for recurring vendors (e.g., Rent, Utilities).
*   **Refer to**: `billing_invoice_structures.md`.

### 4.2 Automated Invoicing (AR)
*   **Step**: Import existing invoice templates.
*   **Action**: Set standard payment terms (e.g., Net 30) if not already defined.

---

## Phase 5: Historical Data Review & Cleanup

### 5.1 Open Item Review
*   **Step**: Review all "Awaiting Payment" Bills and "Awaiting Payment" Invoices.
*   **Action**: Flag any items >60 days old for a "Bad Debt" or "Stale Bill" review with the client.
*   **Unreconciled Lines**: Identify any bank statement lines older than the onboarding date that have not been reconciled and request the client to resolve them or provide details.

### 5.2 Opening Balance Reconciliation & Prior Year Audit
*   **Step**: Ensure the previous month's bank reconciliation was completed and matches the statement.
*   **Action**: Compare the Xero Trial Balance against the last filed Tax Return or Audited Financial Statements to ensure opening balances for the current fiscal year are correct.
*   **Adjustment**: Record any required "Opening Balance Adjustments" to align Xero with the last official financial records.

---

## Phase 6: Shadow Period & Activation

### 6.1 Shadow Period (Optional but Recommended)
*   **Step**: Run the AI agent in "Draft Mode" for the first 15 days.
*   **Action**: The agent prepares reconciliations and bills but does not "Approve" or "Post" them without human sign-off.
*   **Validation**: Bookkeeping specialist reviews the agent's work for accuracy against the client's historical patterns.

### 6.2 Audit Readiness Check
*   **Step**: Run the "Discrepancy Detection" engine (as defined in `audit_and_discrepancy_logic.md`) on the last 30 days of data.
*   **Validation**: Ensure no high-risk flags are present.

### 6.3 Agent Activation
*   **Step**: Set the "Go-Live Date" for automated daily syncs.
*   **Action**: Notify the client that the "Super User" assistant is now active and monitoring their books.
*   **Handover**: Provide the client with the "Super User Command Guide" (refer to `super_user_commands.md`).
