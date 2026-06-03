import { XeroService } from './xero.js';

export interface PandLReport {
  period: string;
  operatingRevenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: {
    marketing: number;
    ga: number;
    rd: number;
    total: number;
  };
  ebitda: number;
  netIncome: number;
  ratios: {
    grossMargin: number;
    netMargin: number;
    operatingMargin: number;
  };
}

export interface BalanceSheetReport {
  date: string;
  assets: {
    current: number;
    nonCurrent: number;
    total: number;
  };
  liabilities: {
    current: number;
    longTerm: number;
    total: number;
  };
  equity: {
    total: number;
  };
  ratios: {
    currentRatio: number;
    quickRatio: number;
  };
}

export class ReportService {
  /**
   * Fetches and structures the Profit & Loss report from Xero.
   */
  static async getProfitAndLoss(tenantId: string, startDate?: string, endDate?: string): Promise<PandLReport> {
    const xero = await XeroService.getClient(tenantId);
    
    // API: GET /Reports/ProfitAndLoss
    // Note: parameters are (tenantId, fromDate, toDate, periods, timeframe, trackingCategoryID, trackingOptionID, trackingCategoryID2, trackingOptionID2, standardLayout)
    const response = await xero.accountingApi.getReportProfitAndLoss(
      tenantId,
      startDate,
      endDate
    );
    
    const report = response.body.reports?.[0];
    if (!report) throw new Error('Profit & Loss report not found');

    const operatingRevenue = this.sumReportSection(report, 'Revenue') || this.sumReportSection(report, 'Trading Income') || 0;
    const cogs = this.sumReportSection(report, 'Less Cost of Sales') || this.sumReportSection(report, 'Cost of Goods Sold') || 0;
    const grossProfit = operatingRevenue - cogs;
    
    // Attempt to break down OpEx
    const totalOpEx = this.sumReportSection(report, 'Operating Expenses') || 0;
    // In a real scenario, we would parse individual accounts. Here we'll simulate a breakdown if possible.
    const marketing = this.findValueInRow(report, 'Marketing') || 0;
    const rd = this.findValueInRow(report, 'Research and Development') || 0;
    const ga = totalOpEx - marketing - rd;
    
    const ebitda = grossProfit - totalOpEx;
    const netIncome = this.getReportSummaryValue(report, 'Net Profit') || ebitda;

    return {
      period: `${startDate || 'MTD'} to ${endDate || 'Now'}`,
      operatingRevenue,
      cogs,
      grossProfit,
      operatingExpenses: {
        marketing,
        ga,
        rd,
        total: totalOpEx,
      },
      ebitda,
      netIncome,
      ratios: {
        grossMargin: operatingRevenue !== 0 ? (grossProfit / operatingRevenue) * 100 : 0,
        netMargin: operatingRevenue !== 0 ? (netIncome / operatingRevenue) * 100 : 0,
        operatingMargin: operatingRevenue !== 0 ? (ebitda / operatingRevenue) * 100 : 0,
      }
    };
  }

  /**
   * Fetches and structures the Balance Sheet report from Xero.
   */
  static async getBalanceSheet(tenantId: string, date?: string): Promise<BalanceSheetReport> {
    const xero = await XeroService.getClient(tenantId);
    
    // API: GET /Reports/BalanceSheet
    const response = await xero.accountingApi.getReportBalanceSheet(
      tenantId,
      date
    );
    
    const report = response.body.reports?.[0];
    if (!report) throw new Error('Balance Sheet report not found');

    const currentAssets = this.sumReportSection(report, 'Current Assets') || 0;
    const fixedAssets = this.sumReportSection(report, 'Fixed Assets') || 0;
    const totalAssets = currentAssets + fixedAssets;

    const currentLiabilities = this.sumReportSection(report, 'Current Liabilities') || 0;
    const longTermLiabilities = this.sumReportSection(report, 'Non-Current Liabilities') || 0;
    const totalLiabilities = currentLiabilities + longTermLiabilities;

    const totalEquity = this.sumReportSection(report, 'Equity') || 0;

    // Simplified inventory extraction
    const inventory = this.findValueInRow(report, 'Inventory') || 0;

    return {
      date: date || new Date().toISOString().split('T')[0],
      assets: {
        current: currentAssets,
        nonCurrent: fixedAssets,
        total: totalAssets,
      },
      liabilities: {
        current: currentLiabilities,
        longTerm: longTermLiabilities,
        total: totalLiabilities,
      },
      equity: {
        total: totalEquity,
      },
      ratios: {
        currentRatio: currentLiabilities !== 0 ? currentAssets / currentLiabilities : 0,
        quickRatio: currentLiabilities !== 0 ? (currentAssets - inventory) / currentLiabilities : 0,
      }
    };
  }

  /**
   * Helper to sum values in a report section by title.
   */
  private static sumReportSection(report: any, sectionTitle: string): number {
    const section = report.rows?.find((r: any) => 
      r.rowType === 'Section' && 
      (r.title === sectionTitle || r.title?.includes(sectionTitle))
    );
    
    if (!section || !section.rows) return 0;
    
    const summaryRow = section.rows.find((r: any) => r.rowType === 'SummaryRow');
    if (summaryRow && summaryRow.cells) {
      const lastCell = summaryRow.cells[summaryRow.cells.length - 1];
      return parseFloat(lastCell.value) || 0;
    }
    
    // If no summary row, sum individual rows
    return section.rows.reduce((sum: number, r: any) => {
      if (r.rowType === 'Row' && r.cells) {
        return sum + (parseFloat(r.cells[r.cells.length - 1]?.value) || 0);
      }
      return sum;
    }, 0);
  }

  /**
   * Helper to find a specific value in any row by its label.
   */
  private static findValueInRow(report: any, rowLabel: string): number {
    const searchRows = (rows: any[]): number => {
      for (const row of rows) {
        if (row.cells?.[0]?.value?.includes(rowLabel)) {
          return parseFloat(row.cells[row.cells.length - 1]?.value) || 0;
        }
        if (row.rows) {
          const found = searchRows(row.rows);
          if (found !== 0) return found;
        }
      }
      return 0;
    };
    return searchRows(report.rows || []);
  }

  /**
   * Helper to get a specific summary value from the report.
   */
  private static getReportSummaryValue(report: any, rowTitle: string): number {
    const searchSummary = (rows: any[]): number => {
      for (const row of rows) {
        if (row.rowType === 'SummaryRow' && row.cells?.[0]?.value?.includes(rowTitle)) {
          return parseFloat(row.cells[row.cells.length - 1]?.value) || 0;
        }
        if (row.rows) {
          const found = searchSummary(row.rows);
          if (found !== 0) return found;
        }
      }
      return 0;
    };
    return searchSummary(report.rows || []);
  }
}
