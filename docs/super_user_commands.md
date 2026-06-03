# Accrue AI "Super User" Assistant Logic

This document defines the conversational intents, commands, and required parameters for the Accrue AI "Super User" Bookkeeping Assistant.

## 1. Overview
The assistant acts as a high-level bookkeeping expert. It translates natural language requests into structured actions within the Xero environment, ensuring GAAP compliance and operational efficiency.

## 2. Core Intents and Commands

### 2.1 Bank Reconciliation
**Intent**: `RECONCILE_BANK_ACCOUNT`  
**Description**: Triggers or checks the status of bank reconciliation.  
**Parameters**:
- `account_id` (Optional): Specific bank account to reconcile (defaults to all if omitted).
- `date_range` (Optional): Limit reconciliation to a specific period.

**Sample Utterances**:
- "Reconcile my main business account for May."
- "Start bank reconciliation."
- "What's the status of my bank rec?"

---

### 2.2 Invoicing (Accounts Receivable)
**Intent**: `CREATE_INVOICE`  
**Description**: Drafts or sends a new customer invoice.  
**Parameters**:
- `contact_name` (Required): Customer name.
- `line_items` (Required): List of items (Description, Quantity, Unit Amount).
- `due_date` (Optional): Defaults to Net 30 if omitted.
- `account_code` (Optional): GAAP mapping (uses AI engine if omitted).

**Sample Utterances**:
- "Create an invoice for Acme Corp for $500 for consulting services."
- "Bill John Doe 2 units of software licenses at $100 each."

---

### 2.3 Bill Processing (Accounts Payable)
**Intent**: `PROCESS_BILL`  
**Description**: Records a new vendor bill.  
**Parameters**:
- `vendor_name` (Required): Vendor name.
- `amount` (Required): Total bill amount.
- `date` (Required): Bill/Invoice date.
- `attachment_id` (Optional): Link to uploaded PDF/image.

**Sample Utterances**:
- "I just uploaded a bill from AWS for $120. Please process it."
- "Record a new bill from Apple for $1,500 dated yesterday."

---

### 2.4 Financial Reporting
**Intent**: `GENERATE_REPORT`  
**Description**: Produces management or standard financial reports.  
**Parameters**:
- `report_type` (Required): P&L, Balance Sheet, Cash Flow, AR Aging, etc.
- `period` (Required): e.g., "Last Month", "Q1 2026", "Year-to-Date".

**Sample Utterances**:
- "Show me my P&L for last month."
- "Generate a Balance Sheet for the end of Q2."
- "Who owes us money? (Triggers AR Aging)"

---

### 2.5 GAAP Query / Advice
**Intent**: `GAAP_ADVICE`  
**Description**: Provides guidance on transaction categorization or GAAP rules.  
**Parameters**:
- `query` (Required): The specific question.

**Sample Utterances**:
- "Should I capitalize a $3,000 laptop purchase?"
- "How do I record unearned revenue for a 12-month contract?"

---

## 3. Interaction Logic & Safeguards

### 3.1 Confirmation Workflow
For all state-changing actions (e.g., Sending an invoice, Authorizing a bill), the assistant must follow a **Double-Confirmation** pattern:
1. **Analyze**: Identify intent and extract parameters.
2. **Draft**: Show a summary of the proposed action (e.g., "I've drafted an invoice for Acme Corp for $500. It's mapped to 'Sales - Consulting'. Shall I approve it?")
3. **Confirm**: Wait for user "Yes/Confirm" before final execution in Xero.

### 3.2 Error Handling
- **Missing Required Params**: If a required parameter (like `contact_name`) is missing, the assistant must proactively ask (e.g., "Who should I address this invoice to?").
- **Ambiguity**: If multiple contacts match a name, provide a list for selection.

## 4. Parameter Mapping Reference
| Intent | Parameter | Source/Validation |
| :--- | :--- | :--- |
| `CREATE_INVOICE` | `account_code` | Validated against `gaap_mapping_rules.md` |
| `GENERATE_REPORT` | `period` | Normalized to start/end dates for Xero API |
| `RECONCILE_BANK_ACCOUNT` | `account_id` | Matched against Xero bank account list |
