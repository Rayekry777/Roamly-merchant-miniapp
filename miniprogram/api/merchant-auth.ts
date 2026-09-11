import type {
  CurrentMerchant,
  MerchantAccountStatus,
  MerchantAuthToken,
  MerchantRole,
  MerchantSmsCodeScene,
} from "../types/merchant-auth";
import { merchantAccountStatuses, merchantRoles } from "../types/merchant-auth";
import { ApiError, request } from "../utils/request";

type UnknownRecord = Record<string, unknown>;

export async function sendMerchantSmsCode(
  phone: string,
  scene: MerchantSmsCodeScene,
): Promise<void> {
  await request<null, { phone: string; scene: MerchantSmsCodeScene }>(
    "/v1/merchant/auth/sms-codes",
    {
      method: "POST",
      data: { phone, scene },
      auth: "public",
      showError: false,
    },
  );
}

export async function loginMerchant(
  phone: string,
  code: string,
): Promise<MerchantAuthToken> {
  const result = await request<
    MerchantAuthToken,
    { phone: string; code: string }
  >("/v1/merchant/auth/login", {
    method: "POST",
    data: { phone, code },
    auth: "public",
    showError: false,
  });
  return parseToken(result.data);
}

export async function registerMerchant(
  phone: string,
  code: string,
  password: string,
  confirmPassword: string,
): Promise<MerchantAuthToken> {
  const result = await request<
    MerchantAuthToken,
    { phone: string; code: string; password: string; confirmPassword: string }
  >("/v1/merchant/auth/registrations", {
    method: "POST",
    data: { phone, code, password, confirmPassword },
    auth: "public",
    showError: false,
  });
  return parseToken(result.data);
}

export async function loginMerchantByPassword(
  phone: string,
  password: string,
): Promise<MerchantAuthToken> {
  const result = await request<
    MerchantAuthToken,
    { phone: string; password: string }
  >("/v1/merchant/auth/password-sessions", {
    method: "POST",
    data: { phone, password },
    auth: "public",
    showError: false,
  });
  return parseToken(result.data);
}

export async function getCurrentMerchant(): Promise<CurrentMerchant> {
  const result = await request<CurrentMerchant>("/v1/merchant/auth/me", {
    showError: false,
  });
  return parseCurrentMerchant(result.data);
}

export async function logoutMerchant(): Promise<void> {
  await request<null>("/v1/merchant/auth/logout", {
    method: "POST",
    showError: false,
  });
}

export function parseToken(value: unknown): MerchantAuthToken {
  const item = record(value);
  if (
    item.tokenType !== "Bearer" ||
    !isNonEmptyString(item.accessToken) ||
    typeof item.expiresIn !== "number" ||
    item.expiresIn < 0
  ) {
    throw contractError();
  }
  return item as unknown as MerchantAuthToken;
}

export function parseCurrentMerchant(value: unknown): CurrentMerchant {
  const item = record(value);
  if (
    !isNonEmptyString(item.id) ||
    !isNonEmptyString(item.maskedPhone) ||
    !isNonEmptyString(item.nickname) ||
    !isMerchantRole(item.role) ||
    !isNonEmptyString(item.roleLabel) ||
    !isMerchantStatus(item.status) ||
    !isNonEmptyString(item.statusLabel) ||
    typeof item.canAcceptStaffInvitation !== "boolean" ||
    !Array.isArray(item.permissions) ||
    !item.permissions.every(isNonEmptyString)
  ) {
    throw contractError();
  }
  if (
    item.avatarContentPath !== undefined &&
    typeof item.avatarContentPath !== "string"
  ) {
    throw contractError();
  }
  if (item.shop !== undefined) parseShop(item.shop);
  return item as unknown as CurrentMerchant;
}

function parseShop(value: unknown): void {
  const shop = record(value);
  if (
    !isNonEmptyString(shop.id) ||
    !isNonEmptyString(shop.name) ||
    !isNonEmptyString(shop.address)
  ) {
    throw contractError();
  }
}

function record(value: unknown): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw contractError();
  }
  return value as UnknownRecord;
}

function isMerchantStatus(value: unknown): value is MerchantAccountStatus {
  return merchantAccountStatuses.includes(value as MerchantAccountStatus);
}

function isMerchantRole(value: unknown): value is MerchantRole {
  return merchantRoles.includes(value as MerchantRole);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function contractError(): ApiError {
  return new ApiError("商户身份响应格式异常", 200, "RESPONSE_CONTRACT_INVALID");
}
