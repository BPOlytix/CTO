# Discrepancy Detection & Audit Logic

This document defines the logic for identifying financial discrepancies, ensuring data integrity, and maintaining audit readiness in the Accrue AI system.

## 1. Automated Discrepancy Detection

The AI agent runs continuous background checks on all ledger entries to flag potential issues.

### 1.1 Duplicate Detection
*   **Bills (AP)**: Flag if `Vendor Reference` AND `Vendor Name` AND `Total` match an existing record within the last 12 months.
*   **Invoices (AR)**: Flag if `Invoice Number` already exists.
*   **Bank Transactions**: Flag if `Reference`, `Amount`, and `Date` match another bank statement line.

### 1.2 Misclassification Detection
*   **AI Validation**: Compare the `Account Code` of a new transaction against historical mappings for the same vendor/payee.
*   **Nature Check**: Use LLM to verify if the transaction description matches the account's GAAP category (e.g., flagging "Laptop purchase" mapped to "Office Supplies" instead of "Fixed Assets" if > $2,500).
*   **Consistency Check**: Flag if a recurring vendor (e.g., AWS) is mapped to different accounts in the same period.

### 1.3 Outlier Detection
*   **Amount Variance**: Flag any transaction where the amount is > 2.5 standard deviations from the vendor's 6-month historical average.
*   **Date Variance**: Flag bills received significantly earlier or later than the historical pattern for that vendor.

## 2. Audit Trail Requirements

To remain GAAP-compliant and audit-ready, every automated action must leave a permanent trail.

### 2.1 Change Logs
*   Every modification to a transaction (status change, account re-mapping) must log:
    *   `Timestamp`
    *   `Agent/User ID`
    *   `Old Value`
    *   `New Value`
    *   `Reason/Confidence Score`

### 2.2 Source Document Linking
*   Every Bill and Receipt must have a direct link to the original PDF/Image file stored in the system.
*   Unlinked transactions (manual journals) must include a mandatory `Narrative` field explaining the purpose.

## 3. Period-End Audit Checks

Prior to the monthly close, the agent performs the following reconciliations:

### 3.1 Subsidiary Ledger Reconciliation
*   **Accounts Payable**: `Total AP Balance` in General Ledger must equal the sum of all `Unpaid Bills`.
*   **Accounts Receivable**: `Total AR Balance` in General Ledger must equal the sum of all `Outstanding Invoices`.

### 3.2 Bank Balance Verification
*   The `GL Bank Balance` must match the `Statement Balance` as of the period end date. Any difference must be accounted for in the "Outstanding Payments/Deposits" report.

## 4. GAAP Compliance Flags

The system automatically flags the following for human review as "High Risk":
*   **Threshold Capitalization**: Any expense > $2,500 not mapped to a Fixed Asset account.
*   **Revenue Recognition**: Large invoices (> $10k) without an attached contract or proof of delivery.
*   **Related Party Transactions**: Transactions with vendors identified as related parties (based on owner input).
