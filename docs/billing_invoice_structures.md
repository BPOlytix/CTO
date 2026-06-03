# Bill and Invoice Data Structures

This document defines the standard data structures for processing Bills (Accounts Payable) and Invoices (Accounts Receivable) within Accrue AI. These structures are designed to be GAAP-compliant and compatible with Xero's API.

## 1. Shared Components

### 1.1 Line Item Structure
Each Bill or Invoice contains one or more line items.
*   **Description**: (String) Detailed description of the service or product.
*   **Quantity**: (Decimal) Number of units.
*   **Unit Amount**: (Decimal) Price per unit.
*   **Discount Rate**: (Decimal) Percentage discount applied to the line item.
*   **Account Code**: (String) The GAAP-compliant ledger account (from Chart of Accounts).
*   **Tax Type**: (String) The tax rate applied (e.g., "Output", "Input", "Exempt").
*   **Tax Amount**: (Decimal) The calculated tax for the line item.
*   **Line Amount**: (Decimal) The total amount for the line item (Quantity * Unit Amount - Discount + Tax).
*   **Tracking Categories**: (Object) Optional tags for departmental or project-based reporting.

## 2. Invoice Data Structure (Accounts Receivable)

Used for recording revenue earned from customers.

*   **Invoice ID**: (UUID) Unique identifier in the system.
*   **Invoice Number**: (String) User-facing unique reference (e.g., INV-001).
*   **Contact**:
    *   **Name**: (String) Customer name.
    *   **Email**: (String) Customer contact email.
*   **Date**: (Date) The date the invoice was issued (Revenue Recognition date under accrual GAAP).
*   **Due Date**: (Date) The date payment is expected.
*   **Status**: (Enum) `DRAFT`, `SUBMITTED`, `AUTHORISED`, `PAID`, `VOIDED`.
*   **LineItems**: (Array of Line Item Structure)
*   **SubTotal**: (Decimal) Sum of line items before tax.
*   **TotalTax**: (Decimal) Total tax amount.
*   **Total**: (Decimal) Total amount due from customer.
*   **Currency**: (String) ISO currency code (e.g., "USD").
*   **Reference**: (String) Optional reference field.

## 3. Bill Data Structure (Accounts Payable)

Used for recording expenses or asset purchases from vendors.

*   **Bill ID**: (UUID) Unique identifier in the system.
*   **Vendor Reference**: (String) The invoice number provided by the vendor.
*   **Contact**:
    *   **Name**: (String) Vendor name.
*   **Date**: (Date) The date on the vendor's invoice (Expense recognition date).
*   **Due Date**: (Date) The date the bill is due for payment.
*   **Status**: (Enum) `DRAFT`, `SUBMITTED`, `AUTHORISED`, `PAID`, `VOIDED`.
*   **LineItems**: (Array of Line Item Structure)
*   **SubTotal**: (Decimal) Sum of line items before tax.
*   **TotalTax**: (Decimal) Total tax amount (Input tax credit).
*   **Total**: (Decimal) Total amount owed to vendor.
*   **Currency**: (String) ISO currency code (e.g., "USD").
*   **Reference**: (String) Optional internal reference.

## 4. GAAP Compliance Requirements

### 4.1 Accrual Basis
*   **Invoices**: Must be recorded in the period they are issued/earned, regardless of when cash is received.
*   **Bills**: Must be recorded when the obligation is incurred (usually the vendor invoice date).

### 4.2 Tax Handling
*   **Output Tax**: Tax collected on Invoices must be mapped to a "Sales Tax Payable" liability account.
*   **Input Tax**: Tax paid on Bills should be recorded as a "Tax Receivable" or offset against "Sales Tax Payable", depending on jurisdiction.

### 4.3 Account Mapping
*   Every line item MUST map to an account code defined in the `gaap_mapping_rules.md`.
*   The AI agent must validate that the `Account Code` matches the nature of the transaction (e.g., an office supply bill shouldn't map to a Revenue account).
