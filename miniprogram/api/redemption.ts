import { request } from "../utils/request";
import type { PageResult } from "../types/http";
export type RedemptionPreview = {
  previewToken: string;
  voucherId: string;
  codeLast4: string;
  productTitle: string;
  productType?: string;
  productTypeLabel?: string;
  benefitText?: string;
  validityText?: string;
  usageRules?: string;
  remainingUseCount: number;
  expiresAt: string;
};
export type Redemption = {
  id: string;
  voucherId: string;
  shopId: string;
  operatorId: string;
  status: string;
  useCount: number;
  remainingUseCount: number;
  redeemedTime: string;
  reversedTime?: string;
  reversalReason?: string;
  orderId?: string;
  productId?: string;
  productTitle?: string;
  productCover?: string;
  shopName?: string;
  operatorName?: string;
  redemptionMethod?: string;
  merchantNote?: string;
  income?: {
    saleAmount: number;
    merchantSubsidyAmount: number;
    platformDiscountAmount: number;
    customerPaidAmount: number;
    serviceFeeBaseAmount: number;
    serviceFeeRateBps: number;
    serviceFeeAmount: number;
    estimatedIncomeAmount: number;
  };
  canReverse?: boolean;
  canAssistRefund?: boolean;
  refundId?: string;
  orderSource?: string;
  dealChannel?: string;
  promoterRole?: string;
  promoterName?: string;
  contentAddress?: string;
  orderTime?: string;
  paidTime?: string;
};
export function previewRedemption(code: string) {
  return request<RedemptionPreview>(
    "/v1/merchant/redemptions/previews/by-code",
    { method: "POST", data: { code } },
  );
}
export function previewRedemptionByQrToken(token: string) {
  return request<RedemptionPreview>(
    "/v1/merchant/redemptions/previews/by-qr-token",
    { method: "POST", data: { token } },
  );
}
export function confirmRedemption(
  previewToken: string,
  idempotencyKey: string,
) {
  return request<Redemption>("/v1/merchant/redemptions", {
    method: "POST",
    data: { previewToken },
    headers: { "Idempotency-Key": idempotencyKey },
  });
}
export function reverseRedemption(
  id: string,
  reason: string,
  idempotencyKey: string,
) {
  return request<Redemption>(`/v1/merchant/redemptions/${id}/reversal`, {
    method: "POST",
    data: { reason },
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

export function listMerchantRedemptions(
  page = 1,
  size = 20,
  status?: string,
  keyword?: string,
) {
  const params = [`page=${page}`, `size=${size}`];
  if (status && status !== "ALL") {
    params.push(`status=${encodeURIComponent(status)}`);
  }
  if (keyword) {
    params.push(`keyword=${encodeURIComponent(keyword)}`);
  }
  return request<PageResult<Redemption>>(
    `/v1/merchant/redemptions?${params.join("&")}`,
    { showError: false },
  );
}
export function getMerchantRedemption(id: string) {
  return request<Redemption>(`/v1/merchant/redemptions/${id}`);
}
export function updateRedemptionNote(id: string, merchantNote: string) {
  return request<Redemption>(`/v1/merchant/redemptions/${id}/note`, {
    method: "PUT",
    data: { merchantNote },
  });
}
