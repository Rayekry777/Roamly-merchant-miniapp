export const merchantAccountStatuses = [
  "NOT_APPLIED",
  "PENDING",
  "ACTIVE",
  "REJECTED",
  "DISABLED",
] as const;

export type MerchantAccountStatus = (typeof merchantAccountStatuses)[number];

export const merchantRoles = [
  "VISITOR",
  "TENANT",
  "MANAGER",
  "VERIFIER",
] as const;

export type MerchantRole = (typeof merchantRoles)[number];

export interface MerchantAuthToken {
  tokenType: "Bearer";
  accessToken: string;
  expiresIn: number;
}

export interface MerchantShopSummary {
  id: string;
  name: string;
  address: string;
}

export interface CurrentMerchant {
  id: string;
  maskedPhone: string;
  nickname: string;
  avatarContentPath?: string;
  role: MerchantRole;
  roleLabel: string;
  status: MerchantAccountStatus;
  statusLabel: string;
  shop?: MerchantShopSummary;
  canAcceptStaffInvitation: boolean;
  permissions: string[];
}

export type MerchantSmsCodeScene = "LOGIN" | "REGISTRATION";

export interface MerchantAccountProfile {
  id: string;
  nickname: string;
  phone: string;
  avatarContentPath?: string;
  role: MerchantRole;
  roleLabel: string;
  status: MerchantAccountStatus;
  statusLabel: string;
  shop?: MerchantShopSummary;
}
