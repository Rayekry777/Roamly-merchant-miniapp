import type { PageResult } from "../types/http";
import { request } from "../utils/request";

export type MerchantSettlement = {
  id: string;
  shopId: string;
  settlementDate: string;
  status: string;
  totalAmount: number;
  failureReason?: string;
  processedTime?: string;
};

export function listMerchantSettlements(page = 1, size = 20) {
  return request<PageResult<MerchantSettlement>>(
    `/v1/merchant/settlements?page=${page}&size=${size}`,
    { showError: false },
  );
}

export function getMerchantSettlement(id: string) {
  return request<MerchantSettlement>(`/v1/merchant/settlements/${id}`, {
    showError: false,
  });
}
