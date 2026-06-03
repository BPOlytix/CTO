import { DateTime } from 'luxon';

export interface BankTransaction {
  id: string;
  amount: number;
  date: Date | string;
  payee: string;
  description: string;
}

export interface XeroTransaction {
  id: string;
  amount: number;
  date: Date | string;
  contactName: string;
  reference: string;
  invoiceNumber: string;
  amountDue: number;
}

export interface MatchResult {
  bank_transaction_id: string;
  match_type: 'exact' | 'close_date' | 'multi' | 'suggested' | 'none';
  confidence_score: number;
  matched_transactions: string[];
  suggested_action: string;
  reasoning: string;
}

/**
 * Core reconciliation matching engine with priority hierarchy.
 * 
 * Priority: Exact > Close Date > Multi > Suggested
 */
export function reconcile(
  bankTransactions: BankTransaction[],
  xeroTransactions: XeroTransaction[]
): MatchResult[] {
  return bankTransactions.map(bt => findMatch(bt, xeroTransactions));
}

function findMatch(bt: BankTransaction, xts: XeroTransaction[]): MatchResult {
  const btDate = DateTime.fromISO(new Date(bt.date).toISOString());

  // 1. Exact Match (same amount, same date, same payee) — confidence 100%
  const exact = xts.find(xt => {
    const xtDate = DateTime.fromISO(new Date(xt.date).toISOString());
    const sameAmount = Math.abs(xt.amount - bt.amount) < 0.01;
    const sameDate = xtDate.hasSame(btDate, 'day');
    const samePayee = 
      xt.contactName.toLowerCase() === bt.payee.toLowerCase() || 
      xt.reference === bt.description || 
      xt.invoiceNumber === bt.description;
    return sameAmount && sameDate && samePayee;
  });

  if (exact) {
    return {
      bank_transaction_id: bt.id,
      match_type: 'exact',
      confidence_score: 1.0,
      matched_transactions: [exact.id],
      suggested_action: 'reconcile',
      reasoning: 'Exact match on amount, date, and payee/reference.'
    };
  }

  // 2. Close Date match (same amount, +/- 2 days, same payee) — confidence 90%
  const closeDate = xts.find(xt => {
    const xtDate = DateTime.fromISO(new Date(xt.date).toISOString());
    const sameAmount = Math.abs(xt.amount - bt.amount) < 0.01;
    const diffDays = Math.abs(xtDate.diff(btDate, 'days').days);
    const samePayee = 
      xt.contactName.toLowerCase().includes(bt.payee.toLowerCase()) || 
      bt.payee.toLowerCase().includes(xt.contactName.toLowerCase()) ||
      (bt.description && xt.reference && xt.reference.includes(bt.description));
    
    return sameAmount && diffDays <= 2 && samePayee;
  });

  if (closeDate) {
    return {
      bank_transaction_id: bt.id,
      match_type: 'close_date',
      confidence_score: 0.9,
      matched_transactions: [closeDate.id],
      suggested_action: 'reconcile',
      reasoning: 'Matched amount and payee within +/- 2 days.'
    };
  }

  // 3. Multi match (multiple transactions summing to bank amount) — confidence 80%
  // Simple implementation for pairs within 5 days
  for (let i = 0; i < xts.length; i++) {
    for (let j = i + 1; j < xts.length; j++) {
      const sum = xts[i].amount + xts[j].amount;
      if (Math.abs(sum - bt.amount) < 0.01) {
        const xtDate1 = DateTime.fromISO(new Date(xts[i].date).toISOString());
        const xtDate2 = DateTime.fromISO(new Date(xts[j].date).toISOString());
        const diff1 = Math.abs(xtDate1.diff(btDate, 'days').days);
        const diff2 = Math.abs(xtDate2.diff(btDate, 'days').days);
        
        if (diff1 <= 5 && diff2 <= 5) {
          return {
            bank_transaction_id: bt.id,
            match_type: 'multi',
            confidence_score: 0.8,
            matched_transactions: [xts[i].id, xts[j].id],
            suggested_action: 'review_and_reconcile',
            reasoning: 'Two transactions sum exactly to the bank amount within 5 days.'
          };
        }
      }
    }
  }

  // 4. Bank Fee Handling (Edge case)
  // If amount is slightly less (up to 5%) but same payee/date
  const withFee = xts.find(xt => {
    const fee = xt.amount - bt.amount;
    const xtDate = DateTime.fromISO(new Date(xt.date).toISOString());
    const sameDate = xtDate.hasSame(btDate, 'day');
    const samePayee = 
      xt.contactName.toLowerCase().includes(bt.payee.toLowerCase()) || 
      bt.payee.toLowerCase().includes(xt.contactName.toLowerCase());
    return fee > 0 && fee <= xt.amount * 0.05 && sameDate && samePayee;
  });

  if (withFee) {
    return {
      bank_transaction_id: bt.id,
      match_type: 'suggested',
      confidence_score: 0.75,
      matched_transactions: [withFee.id],
      suggested_action: 'reconcile_with_fee',
      reasoning: `Matched payee and date, but amount is ${withFee.amount - bt.amount} less (likely bank fee).`
    };
  }

  // 5. Partial/Overpayment (Edge case)
  const refMatch = xts.find(xt => 
    (xt.reference && bt.description && xt.reference === bt.description) || 
    (xt.invoiceNumber && bt.description && xt.invoiceNumber === bt.description)
  );
  if (refMatch) {
    const isOverpayment = bt.amount > refMatch.amountDue;
    return {
      bank_transaction_id: bt.id,
      match_type: 'suggested',
      confidence_score: 0.7,
      matched_transactions: [refMatch.id],
      suggested_action: isOverpayment ? 'record_overpayment' : 'record_partial_payment',
      reasoning: `Exact reference match but amount differs (Bank: ${bt.amount}, Xero Due: ${refMatch.amountDue}).`
    };
  }

  // 6. Suggested match (close but not tight) — confidence 60%
  const suggested = xts.find(xt => {
    const sameAmount = Math.abs(xt.amount - bt.amount) < 0.01;
    const xtDate = DateTime.fromISO(new Date(xt.date).toISOString());
    const diffDays = Math.abs(xtDate.diff(btDate, 'days').days);
    return sameAmount && diffDays <= 7;
  });

  if (suggested) {
    return {
      bank_transaction_id: bt.id,
      match_type: 'suggested',
      confidence_score: 0.6,
      matched_transactions: [suggested.id],
      suggested_action: 'review',
      reasoning: 'Same amount found within 7 days but payee does not match.'
    };
  }

  return {
    bank_transaction_id: bt.id,
    match_type: 'none',
    confidence_score: 0,
    matched_transactions: [],
    suggested_action: 'manual_match',
    reasoning: 'No automated match found.'
  };
}
