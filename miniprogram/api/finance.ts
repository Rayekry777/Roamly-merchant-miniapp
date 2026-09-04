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
