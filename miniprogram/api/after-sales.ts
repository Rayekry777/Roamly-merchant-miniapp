import { request } from "../utils/request";
import type { PageResult } from "../types/http";

export type AfterSale = {
  id: string;
  orderId: string;
  voucherId: string;
  userId: string;
  amount: number;
  status: string;
  reason?: string;
  description?: string;
  source?: string;
  requestedTime?: string;
  processedTime?: string;
};

export function listAfterSales(status?: string, page = 1, size = 20) {
  return request<PageResult<AfterSale>>(
    `/v1/merchant/after-sales?page=${page}&size=${size}${status ? `&status=${encodeURIComponent(status)}` : ""}`,
    { showError: false },
  );
}

export function getAfterSale(id: string) {
  return request<AfterSale>(`/v1/merchant/after-sales/${id}`, {
    showError: false,
  });
}

export function createAfterSale(
  data: {
    orderId: string;
    voucherIds: string[];
    reasonCode: string;
    description?: string;
  },
  key: string,
) {
  return request<AfterSale>("/v1/merchant/after-sales", {
    method: "POST",
    data: {
      ...data,
      orderId: Number(data.orderId),
      voucherIds: data.voucherIds.map(Number),
    },
    headers: { "Idempotency-Key": key },
    showError: false,
  });
}
