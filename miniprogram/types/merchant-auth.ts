export const merchantAccountStatuses = [
  "NOT_APPLIED",
  "PENDING",
  "ACTIVE",
  "REJECTED",
  "DISABLED",
] as const;

export type MerchantAccountStatus = (typeof merchantAccountStatuses)[number];

export const merchantRoles = ["OWNER", "MANAGER", "VERIFIER"] as const;

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
  avatarUrl?: string;
  role: MerchantRole;
  roleLabel: string;
  status: MerchantAccountStatus;
  statusLabel: string;
  shop?: MerchantShopSummary;
  permissions: string[];
}
