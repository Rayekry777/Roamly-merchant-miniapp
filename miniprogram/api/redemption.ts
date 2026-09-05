import { request } from "../utils/request";
import type { PageResult } from "../types/http";
export type RedemptionPreview = {
  previewToken: string;
  voucherId: string;
  codeLast4: string;
  productTitle: string;
  remainingUseCount: number;
  consumptionAmount: number;
  discountAmount: number;
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
  consumptionAmount: number;
  discountAmount: number;
  redeemedTime: string;
  reversedTime?: string;
  reversalReason?: string;
};
export function previewRedemption(code: string, consumptionAmount = 0) {
  return request<RedemptionPreview>(
    "/v1/merchant/redemptions/previews/by-code",
    { method: "POST", data: { code, consumptionAmount } },
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

export function listMerchantRedemptions(page = 1, size = 20) {
  return request<PageResult<Redemption>>(
    `/v1/merchant/redemptions?page=${page}&size=${size}`,
    { showError: false },
  );
}
