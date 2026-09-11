import type { BusinessMedia } from "../types/merchant-application";
import {
  merchantAccountStatuses,
  merchantRoles,
  type MerchantAccountProfile,
  type MerchantAccountStatus,
  type MerchantRole,
} from "../types/merchant-auth";
import { ApiError, downloadPrivateFile, request } from "../utils/request";
import {
  deleteBusinessImage,
  uploadBusinessImage,
} from "./merchant-application";

type UnknownRecord = Record<string, unknown>;

export async function getMerchantAccountProfile(): Promise<MerchantAccountProfile> {
  const result = await request<MerchantAccountProfile>(
    "/v1/merchant/account/profile",
    { showError: false },
  );
  return parseProfile(result.data);
}

export async function updateMerchantNickname(
  nickname: string,
): Promise<MerchantAccountProfile> {
  const result = await request<MerchantAccountProfile, { nickname: string }>(
    "/v1/merchant/account/nickname",
    { method: "PUT", data: { nickname } },
  );
  return parseProfile(result.data);
}

export async function updateMerchantAvatar(
  mediaId: string,
): Promise<MerchantAccountProfile> {
  const result = await request<MerchantAccountProfile, { mediaId: string }>(
    "/v1/merchant/account/avatar",
    { method: "PUT", data: { mediaId } },
  );
  return parseProfile(result.data);
}

export async function replaceMerchantAvatar(
  filePath: string,
): Promise<MerchantAccountProfile> {
  let uploaded: BusinessMedia | undefined;
  try {
    uploaded = await uploadBusinessImage(filePath, "MERCHANT_AVATAR");
    return await updateMerchantAvatar(uploaded.id);
  } catch (error) {
    if (uploaded) {
      try {
        await deleteBusinessImage(uploaded.id);
      } catch {
        /* 已绑定媒体不可删除，失败临时媒体由服务端定时清理。 */
      }
    }
    throw error;
  }
}

export const downloadMerchantAvatar = downloadPrivateFile;

export async function sendMerchantPhoneChangeCode(
  newPhone: string,
): Promise<void> {
  await request<null, { newPhone: string }>(
    "/v1/merchant/account/phone-change/sms-codes",
    { method: "POST", data: { newPhone } },
  );
}

export async function changeMerchantPhone(
  currentPassword: string,
  newPhone: string,
  code: string,
): Promise<void> {
  await request<
    null,
    { currentPassword: string; newPhone: string; code: string }
  >("/v1/merchant/account/phone", {
    method: "PUT",
    data: { currentPassword, newPhone, code },
  });
}

export async function sendMerchantPasswordChangeCode(): Promise<void> {
  await request<null>("/v1/merchant/account/password-change/sms-codes", {
    method: "POST",
  });
}

export async function changeMerchantPassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
  code: string,
): Promise<void> {
  await request<
    null,
    {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
      code: string;
    }
  >("/v1/merchant/account/password", {
    method: "PUT",
    data: { currentPassword, newPassword, confirmPassword, code },
  });
}

export function parseProfile(value: unknown): MerchantAccountProfile {
  const item = record(value);
  if (
    !nonEmpty(item.id) ||
    !nonEmpty(item.nickname) ||
    !/^1[3-9]\d{9}$/.test(String(item.phone || "")) ||
    !role(item.role) ||
    !nonEmpty(item.roleLabel) ||
    !status(item.status) ||
    !nonEmpty(item.statusLabel)
  ) {
    throw contractError();
  }
  if (
    item.avatarContentPath !== undefined &&
    typeof item.avatarContentPath !== "string"
  ) {
    throw contractError();
  }
  if (item.shop !== undefined) {
    const shop = record(item.shop);
    if (!nonEmpty(shop.id) || !nonEmpty(shop.name) || !nonEmpty(shop.address)) {
      throw contractError();
    }
  }
  return item as unknown as MerchantAccountProfile;
}

function record(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw contractError();
  }
  return value as UnknownRecord;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function role(value: unknown): value is MerchantRole {
  return merchantRoles.includes(value as MerchantRole);
}

function status(value: unknown): value is MerchantAccountStatus {
  return merchantAccountStatuses.includes(value as MerchantAccountStatus);
}

function contractError(): ApiError {
  return new ApiError(
    "商户个人信息响应格式异常",
    200,
    "RESPONSE_CONTRACT_INVALID",
  );
}
