import { request } from "../utils/request";
import type { PageResult } from "../types/http";
export type MerchantOrder = {
  id: string;
  orderNo: string;
  userId: string;
  shopId: string;
  productId: string;
  productTitle: string;
  quantity: number;
  unitAmount?: number;
  totalAmount?: number;
  payAmount?: number;
  status: string;
  createdTime?: string;
  paidTime?: string;
  cancelledTime?: string;
  expireTime?: string;
};
export function listMerchantOrders(status?: string, page = 1, size = 20) {
  return request<PageResult<MerchantOrder>>(
    `/v1/merchant/orders?page=${page}&size=${size}${status ? `&status=${encodeURIComponent(status)}` : ""}`,
  );
}
