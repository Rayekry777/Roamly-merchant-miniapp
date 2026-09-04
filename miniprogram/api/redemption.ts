import { request } from "../utils/request";
export type RedemptionPreview = { previewToken:string; voucherId:string; codeLast4:string; productTitle:string; remainingUseCount:number; consumptionAmount:number; discountAmount:number; expiresAt:string };
export type Redemption = { id:string; voucherId:string; status:string; remainingUseCount:number; discountAmount:number };
export function previewRedemption(code:string,consumptionAmount=0){return request<RedemptionPreview>("/v1/merchant/redemptions/previews/by-code",{method:"POST",data:{code,consumptionAmount}});}
export function previewRedemptionByQrToken(token:string){return request<RedemptionPreview>("/v1/merchant/redemptions/previews/by-qr-token",{method:"POST",data:{token}});}
export function confirmRedemption(previewToken:string){return request<Redemption>("/v1/merchant/redemptions",{method:"POST",data:{previewToken},headers:{"Idempotency-Key":`redeem-${Date.now()}`}});}
export function reverseRedemption(id:string,reason:string){return request<Redemption>(`/v1/merchant/redemptions/${id}/reversal`,{method:"POST",data:{reason},headers:{"Idempotency-Key":`reverse-${id}-${Date.now()}`}});}
