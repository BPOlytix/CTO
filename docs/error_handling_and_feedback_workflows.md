# Error Handling and User Feedback Workflows

This document outlines the workflows for managing low-confidence transactions, handling errors, and gathering user feedback to improve the Accrue AI bookkeeping engine's accuracy.

## 1. Low-Confidence Transaction Management

When the automated categorization or reconciliation engine cannot determine a match with high confidence, the transaction is flagged for human intervention.

### 1.1 Confidence Thresholds
- **High Confidence (>95%)**: Auto-process the transaction. Log the rule applied.
- **Medium Confidence (75% - 95%)**: Draft the entry in Xero but mark for "Review". Do not approve/post.
- **Low Confidence (<75%)**: Place the transaction in the "Uncategorized/Review Queue" without drafting an entry.

### 1.2 Identification Logic
Transactions are flagged as "Low Confidence" if:
- Multiple GAAP accounts match the payee description with similar probability.
- The amount is a significant outlier compared to historical patterns for that vendor.
- No matching Bill/Invoice exists and the payee is unrecognized.
- The bank statement reference is ambiguous or empty.

---

## 2. Agent-User Communication

The agent must proactively communicate when it requires help or has identified a discrepancy.

### 2.1 Daily Digest
- The agent generates a "Daily Bookkeeping Summary" sent via email/dashboard.
- Includes:
    - Total transactions auto-processed.
    - Number of items in the "Review Queue".
    - Critical alerts (e.g., potential duplicates, high-value outliers).

### 2.2 In-Context Notifications
- For the "Super User" assistant, if a user requests an action (e.g., "Pay this bill") but the data is incomplete, the assistant replies:
    - *"I found the bill from AWS, but I'm not sure which account to map it to. Is this 'Software Subscriptions' or 'Hosting Fees'?"*

---

## 3. User Feedback Mechanism

Users provide feedback to resolve flags and improve the agent's performance.

### 3.1 Resolution Actions
- **Confirm**: User approves the agent's "Medium Confidence" suggestion. 
    - *Result*: Agent logs this as a successful rule for future use.
- **Correct**: User changes the account mapping or amount.
    - *Result*: Agent updates its internal weights for that vendor/payee string.
- **Ignore**: User dismisses a discrepancy alert (e.g., acknowledging an intentional outlier).

### 3.2 Feedback Loop (Learning)
- Every "Correction" provided by a user is used to fine-tune the AI Mapping Engine.
- If a user corrects a mapping for a vendor 3 times in a row, the agent should propose a new "Permanent Rule" for that organization.

---

## 4. Error Escalation Path

1. **Agent Flag**: Item moved to Review Queue.
2. **User Resolution**: User corrects/confirms via dashboard or assistant.
3. **Validation**: Agent re-runs the "Discrepancy Detection" logic on the corrected item.
4. **Resolution**: Item marked as "Done" and posted to Xero.

## 5. Edge Case Handling Logic

Certain complex scenarios require specialized escalation and logic beyond simple categorization.

### 5.1 Missing Supporting Documentation
- **Scenario**: A large transaction (> $500) matches a vendor but has no attached receipt or bill.
- **Agent Action**: Draft the transaction but flag as "Incomplete Documentation".
- **Escalation**: Assistant asks: *"I've matched this payment to AWS, but I'm missing the invoice for audit-readiness. Can you upload it or shall I mark it as a pending item?"*

### 5.2 Multi-Currency Discrepancies
- **Scenario**: Bank amount in local currency doesn't match the FX-converted amount of the Bill due to unexpected bank fees or significant rate flux.
- **Agent Action**: Calculate the variance. If > 2%, flag for "FX/Fee Review".
- **User Feedback**: User specifies if the difference is a "Bank Fee" or an "FX Gain/Loss".

### 5.3 Cross-Period Transactions
- **Scenario**: A bill is dated in a closed period but the payment occurs in the current period.
- **Agent Action**: Flag for "Accrual Review".
- **Logic**: Agent suggests a reversing journal entry if the amount is material, ensuring GAAP compliance for the closed period.

## 6. Audit of Interventions

All human interventions and feedback are logged:
- `transaction_id`
- `agent_suggestion`
- `user_action` (Confirm/Correct)
- `final_value`
- `timestamp`

This log serves as part of the audit trail to show where manual overrides occurred in the automated process.
