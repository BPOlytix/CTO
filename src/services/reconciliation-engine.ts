import { Invoice } from 'xero-node';

export interface ReconciliationMatch {
  ruleId: string;
  confidenceScore: number;
  reasoning: string;
  matchMetadata: any;
  requiresReview: boolean;
  adjustmentType?: 'bank_fee' | 'partial_payment' | 'overpayment';
  adjustmentAmount?: number;
}

export class ReconciliationEngine {
  /**
   * Main entry point for matching a bank transaction against candidate invoices/bills.
   */
  static findBestMatch(
    tx: { amount: number; date: Date; description: string },
    candidates: Invoice[],
  ): ReconciliationMatch | null {
    // 1. Rule 1: Exact Match
    const exactMatch = this.checkExactMatch(tx, candidates);
    if (exactMatch) return exactMatch;

    // 2. Rule 2: Close Date Match (High Confidence)
    const closeDateMatch = this.checkCloseDateMatch(tx, candidates);
    if (closeDateMatch && closeDateMatch.confidenceScore >= 0.9) return closeDateMatch;

    // 3. Partial Payments / Overpayments
    const partialOverMatch = this.checkPartialOverpaymentMatch(tx, candidates);
    if (partialOverMatch) return partialOverMatch;

    // 4. Merchant Fees / Bank Fees
    const feeMatch = this.checkBankFeeMatch(tx, candidates);
    if (feeMatch) return feeMatch;

    // 4. Rule 3: Multi-Transaction Match (Pairs)
    const multiMatch = this.checkMultiMatch(tx, candidates);
    if (multiMatch) return multiMatch;

    // 5. Rule 4: Suggested Match - Ambiguous Amounts
    const ambiguousMatch = this.checkAmbiguousAmountMatch(tx, candidates);
    if (ambiguousMatch) return ambiguousMatch;

    // 6. Rule 5: Suggested Match - Capitalization Check (for missing transactions)
    const capitalizationMatch = this.checkCapitalizationMatch(tx, candidates);
    if (capitalizationMatch) return capitalizationMatch;

    // 7. Best remaining close date match
    if (closeDateMatch) return closeDateMatch;

    return null;
  }

  private static checkExactMatch(
    tx: { amount: number; date: Date; description: string },
    candidates: Invoice[],
  ): ReconciliationMatch | null {
    for (const inv of candidates) {
      if (inv.amountDue !== tx.amount) continue;

      const invDate = inv.date ? new Date(inv.date) : null;
      if (!invDate) continue;

      const isExactDate = this.isSameDay(invDate, tx.date);
      const isExactRef =
        inv.invoiceNumber === tx.description || inv.reference === tx.description;

      if (isExactDate && isExactRef) {
        return {
          ruleId: 'RULE-1.1-EXACT-MATCH',
          confidenceScore: 0.99,
          reasoning: 'Exact amount, date, and reference match.',
          matchMetadata: { invoiceId: inv.invoiceID, invoiceNumber: inv.invoiceNumber },
          requiresReview: false,
        };
      }

      if (isExactDate) {
        return {
          ruleId: 'RULE-1.2-EXACT-DATE-AMOUNT',
          confidenceScore: 0.95,
          reasoning: 'Exact amount and date match.',
          matchMetadata: { invoiceId: inv.invoiceID, invoiceNumber: inv.invoiceNumber },
          requiresReview: false,
        };
      }
    }
    return null;
  }

  private static checkCloseDateMatch(
    tx: { amount: number; date: Date; description: string },
    candidates: Invoice[],
  ): ReconciliationMatch | null {
    let bestMatch: ReconciliationMatch | null = null;

    for (const inv of candidates) {
      if (inv.amountDue !== tx.amount) continue;

      const invDate = inv.date ? new Date(inv.date) : null;
      if (!invDate) continue;

      const diffDays = this.getDayDiff(invDate, tx.date);

      if (diffDays <= 3) {
        const isFuzzyPayee = this.isFuzzyMatch(tx.description, inv.contact?.name || '') ||
                             this.isFuzzyMatch(tx.description, inv.invoiceNumber || '') ||
                             this.isFuzzyMatch(tx.description, inv.reference || '');

        const score = isFuzzyPayee ? 0.92 : 0.85;
        
        if (!bestMatch || score > bestMatch.confidenceScore) {
          bestMatch = {
            ruleId: 'RULE-2.1-CLOSE-DATE',
            confidenceScore: score,
            reasoning: `Exact amount, date within ${diffDays.toFixed(0)} days.${isFuzzyPayee ? ' Fuzzy reference match.' : ''}`,
            matchMetadata: { invoiceId: inv.invoiceID, invoiceNumber: inv.invoiceNumber },
            requiresReview: score < 0.9,
          };
        }
      }
    }
    return bestMatch;
  }

  private static checkBankFeeMatch(
    tx: { amount: number; date: Date; description: string },
    candidates: Invoice[],
  ): ReconciliationMatch | null {
    const feeThreshold = tx.amount * 0.05;
    
    for (const inv of candidates) {
      const amountDue = inv.amountDue || 0;
      const fee = amountDue - tx.amount;
      if (fee > 0 && fee <= feeThreshold) {
        const isMerchant = /stripe|paypal|payout|merchant|square/i.test(tx.description);
        const invDate = inv.date ? new Date(inv.date) : null;
        if (!invDate) continue;
        
        const diffDays = this.getDayDiff(invDate, tx.date);

        if (isMerchant && diffDays <= 5) {
          return {
            ruleId: 'RULE-1.3-BANK-FEE',
            confidenceScore: 0.96,
            reasoning: `Merchant payout match with ${fee.toFixed(2)} fee adjustment.`,
            matchMetadata: { invoiceId: inv.invoiceID, invoiceNumber: inv.invoiceNumber },
            adjustmentType: 'bank_fee',
            adjustmentAmount: fee,
            requiresReview: false,
          };
        }
      }
    }
    return null;
  }

  private static checkMultiMatch(
    tx: { amount: number; date: Date; description: string },
    candidates: Invoice[],
  ): ReconciliationMatch | null {
    for (let i = 0; i < candidates.length; i++) {
      const inv1 = candidates[i];
      if (!inv1) continue;

      for (let j = i + 1; j < candidates.length; j++) {
        const inv2 = candidates[j];
        if (!inv2) continue;

        const sum = (inv1.amountDue || 0) + (inv2.amountDue || 0);
        if (Math.abs(sum - tx.amount) < 0.01) {
          const date1 = inv1.date ? new Date(inv1.date) : null;
          const date2 = inv2.date ? new Date(inv2.date) : null;
          if (!date1 || !date2) continue;

          const diffDaysI = this.getDayDiff(date1, tx.date);
          const diffDaysJ = this.getDayDiff(date2, tx.date);

          if (diffDaysI <= 5 && diffDaysJ <= 5) {
            return {
              ruleId: 'RULE-3.1-MULTI-MATCH-PAIR',
              confidenceScore: 0.88,
              reasoning: 'Transaction amount matches sum of two invoices within 5-day window.',
              matchMetadata: { 
                invoiceIds: [inv1.invoiceID, inv2.invoiceID],
                invoiceNumbers: [inv1.invoiceNumber, inv2.invoiceNumber]
              },
              requiresReview: true,
            };
          }
        }
      }
    }
    return null;
  }

  private static checkPartialOverpaymentMatch(
    tx: { amount: number; date: Date; description: string },
    candidates: Invoice[],
  ): ReconciliationMatch | null {
    for (const inv of candidates) {
      const invDate = inv.date ? new Date(inv.date) : null;
      if (!invDate) continue;

      const diffDays = this.getDayDiff(invDate, tx.date);
      if (diffDays > 7) continue;

      const isExactRef =
        inv.invoiceNumber === tx.description || inv.reference === tx.description;

      if (isExactRef) {
        if (tx.amount < (inv.amountDue || 0)) {
          return {
            ruleId: 'RULE-3.2-PARTIAL-PAYMENT',
            confidenceScore: 0.94,
            reasoning: 'Exact reference match with partial payment amount.',
            matchMetadata: { invoiceId: inv.invoiceID, invoiceNumber: inv.invoiceNumber },
            adjustmentType: 'partial_payment',
            adjustmentAmount: tx.amount,
            requiresReview: false,
          };
        } else if (tx.amount > (inv.amountDue || 0)) {
          return {
            ruleId: 'RULE-3.3-OVERPAYMENT',
            confidenceScore: 0.94,
            reasoning: 'Exact reference match with overpayment amount.',
            matchMetadata: { invoiceId: inv.invoiceID, invoiceNumber: inv.invoiceNumber },
            adjustmentType: 'overpayment',
            adjustmentAmount: tx.amount - (inv.amountDue || 0),
            requiresReview: true,
          };
        }
      }
    }
    return null;
  }

  private static checkAmbiguousAmountMatch(
    tx: { amount: number; date: Date; description: string },
    candidates: Invoice[],
  ): ReconciliationMatch | null {
    const sameAmount = candidates.filter(inv => inv.amountDue === tx.amount);
    if (sameAmount.length > 1) {
      return {
        ruleId: 'RULE-4.1-AMBIGUOUS-AMOUNT',
        confidenceScore: 0.6,
        reasoning: 'Multiple invoices found with the same amount. Manual selection required.',
        matchMetadata: { 
          candidateIds: sameAmount.map(inv => inv.invoiceID),
          candidateNumbers: sameAmount.map(inv => inv.invoiceNumber)
        },
        requiresReview: true,
      };
    }
    return null;
  }

  private static checkCapitalizationMatch(
    tx: { amount: number; date: Date; description: string },
    candidates: Invoice[],
  ): ReconciliationMatch | null {
    // If amount > $2,500 and no matching invoice, suggest capitalization review
    if (candidates.length === 0 && tx.amount >= 2500) {
      const isFixedAssetVendor = /apple|dell|lenovo|hardware|furniture|equipment/i.test(tx.description);
      if (isFixedAssetVendor) {
        return {
          ruleId: 'RULE-4.1-CAPITALIZATION',
          confidenceScore: 0.7,
          reasoning: `Large transaction amount ($${tx.amount}) with potential fixed asset vendor. Manual review for capitalization required.`,
          matchMetadata: { vendor: tx.description },
          requiresReview: true,
        };
      }
    }
    return null;
  }

  private static isSameDay(d1: Date, d2: Date): boolean {
    return d1.toISOString().split('T')[0] === d2.toISOString().split('T')[0];
  }

  private static getDayDiff(d1: Date, d2: Date): number {
    return Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
  }

  private static isFuzzyMatch(str: string, target: string): boolean {
    if (!str || !target) return false;
    const s1 = str.toLowerCase();
    const s2 = target.toLowerCase();
    return s1.includes(s2) || s2.includes(s1);
  }
}
