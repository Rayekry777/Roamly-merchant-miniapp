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
  reasonCode?: string;
  refundNo?: string;
  merchantOrderNo?: string;
  decisionStatus?: string;
  executionStatus?: string;
  rejectReason?: string;
  failureCode?: string;
  failureMessage?: string;
  providerRefundNo?: string;
  retryCount?: number;
  items?: AfterSaleItem[];
};

export type AfterSaleItem = {
  id: string;
  voucherId: string;
  redeemed: boolean;
  customerPaidAmount: number;
  platformSubsidyAmount: number;
  merchantSubsidyAmount: number;
  serviceFeeAmount: number;
  refundAmount: number;
  status: string;
  reversedIncomeAmount: number;
  refundedServiceFeeAmount: number;
};
export type RefundTimelineEvent = {
  type: string;
  title: string;
  status: string;
  description?: string;
  occurredAt?: string;
};

export type RefundStage = "PENDING" | "PROCESSING" | "DECLINED" | "COMPLETED";
export type RefundCandidateVoucher = {
  id: string;
  sequenceNo: number;
  voucherCodeLast4?: string;
  status: string;
  refundAmount: number;
  refundable: boolean;
  unavailableReason?: string;
};
export type RefundCandidate = {
  orderId: string;
  orderNo: string;
  productTitle?: string;
  status: string;
  quantity: number;
  payAmount?: number;
  refundable: boolean;
  unavailableReason?: string;
  matchedVoucherId?: string;
  vouchers: RefundCandidateVoucher[];
};

export function listAfterSales(
  options: {
    status?: string;
    stage?: RefundStage;
    keyword?: string;
    page?: number;
    size?: number;
  } = {},
) {
  const params = [`page=${options.page || 1}`, `size=${options.size || 20}`];
  if (options.status)
    params.push(`status=${encodeURIComponent(options.status)}`);
  if (options.stage) params.push(`stage=${encodeURIComponent(options.stage)}`);
  if (options.keyword)
    params.push(`keyword=${encodeURIComponent(options.keyword)}`);
  return request<PageResult<AfterSale>>(
    `/v1/merchant/after-sales?${params.join("&")}`,
    { showError: false },
  );
}

export function getRefundCandidate(keyword: string) {
  return request<RefundCandidate>(
    `/v1/merchant/after-sales/candidate?keyword=${encodeURIComponent(keyword)}`,
    { showError: false },
  );
}

export function getAfterSale(id: string) {
  return request<AfterSale>(`/v1/merchant/after-sales/${id}`, {
    showError: false,
  });
}

export function getAfterSaleTimeline(id: string) {
  return request<RefundTimelineEvent[]>(
    "/v1/merchant/after-sales/" + id + "/timeline",
    { showError: false },
  );
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
    data,
    headers: { "Idempotency-Key": key },
    showError: false,
  });
}
