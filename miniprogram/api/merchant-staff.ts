import { request } from "../utils/request";
import type { PageResult } from "../types/http";

export type MerchantStaff = { id: string; phone: string; nickname: string; role: string; roleLabel: string; status: string; statusLabel: string };
export type StaffInvitation = { id: string; phone: string; role: string; roleLabel: string; status: string; expireTime: string; token?: string };
export function listStaff(page=1,size=20){return request<PageResult<MerchantStaff>>(`/v1/merchant/staff?page=${page}&size=${size}`);}
export function inviteStaff(phone:string,role:"MANAGER"|"VERIFIER"){return request<StaffInvitation>("/v1/merchant/staff-invitations",{method:"POST",data:{phone,role},headers:{"Idempotency-Key":`staff-${Date.now()}`}});}
export function disableStaff(id:string){return request<MerchantStaff>(`/v1/merchant/staff/${id}/disablement`,{method:"POST",headers:{"Idempotency-Key":`staff-disable-${id}-${Date.now()}`}});}
export function activateStaff(id:string){return request<MerchantStaff>(`/v1/merchant/staff/${id}/activation`,{method:"POST",headers:{"Idempotency-Key":`staff-enable-${id}-${Date.now()}`}});}
export function acceptStaffInvitation(token:string){return request<MerchantStaff>("/v1/merchant/staff-invitations/acceptance",{method:"POST",data:{token},headers:{"Idempotency-Key":`staff-accept-${Date.now()}`}});}
