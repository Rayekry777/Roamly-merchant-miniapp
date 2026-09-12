import { request } from "../utils/request";
export type FinanceSummary = {
  frozenAmount: number;
  recognizedAmount: number;
  commissionAmount: number;
  netAmount: number;
};
export function loadFinanceSummary() {
  return request<FinanceSummary>("/v1/merchant/finance/summary");
}
export type TodayFinance = {
  date: string;
  timezone: string;
  redeemedVoucherCount: number;
  redemptionCount: number;
  redemptionAmount: number;
  saleAmount: number;
  merchantSubsidyAmount: number;
  platformSubsidyAmount: number;
  customerPaidAmount: number;
  serviceFeeAmount: number;
  estimatedIncomeAmount: number;
  refundedVoucherCount: number;
  refundAmount: number;
  netReceiptAmount: number;
};
export function loadTodayFinance(date?: string) {
  return request<TodayFinance>(
    `/v1/merchant/finance/today${date ? `?date=${date}` : ""}`,
  );
}
export type ServiceFeePolicy = {
  rateBps: number;
  rateText: string;
  formula: string;
  effectiveFrom?: string;
  effectiveTo?: string;
};
export function loadServiceFeePolicy() {
  return request<ServiceFeePolicy>("/v1/merchant/finance/service-fee-policy");
}
