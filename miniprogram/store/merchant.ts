import {
  getCurrentMerchant,
  loginMerchant,
  loginMerchantByPassword,
  logoutMerchant,
  registerMerchant,
} from "../api/merchant-auth";
import type {
  CurrentMerchant,
  MerchantAccountProfile,
  MerchantAuthToken,
} from "../types/merchant-auth";
import { ApiError } from "../utils/request";
import { merchantSession } from "../utils/session";
import { voucherDraftStore } from "./voucher-draft";

class MerchantStore {
  current: CurrentMerchant | null = null;
  initialized = false;
  authState: "unknown" | "anonymous" | "authenticated" = "unknown";
  private restoring: Promise<CurrentMerchant | null> | null = null;

  bootstrap(): Promise<CurrentMerchant | null> {
    return this.restore().then((current) => {
      this.authState = current ? "authenticated" : "anonymous";
      return current;
    });
  }

  login(phone: string, code: string): Promise<CurrentMerchant> {
    return this.establishSession(loginMerchant(phone, code));
  }

  register(
    phone: string,
    code: string,
    password: string,
    confirmPassword: string,
  ): Promise<CurrentMerchant> {
    return this.establishSession(
      registerMerchant(phone, code, password, confirmPassword),
    );
  }

  loginByPassword(phone: string, password: string): Promise<CurrentMerchant> {
    return this.establishSession(loginMerchantByPassword(phone, password));
  }

  applyProfile(profile: MerchantAccountProfile): void {
    if (!this.current || this.current.id !== profile.id) return;
    this.current = {
      ...this.current,
      nickname: profile.nickname,
      avatarContentPath: profile.avatarContentPath,
      role: profile.role,
      roleLabel: profile.roleLabel,
      status: profile.status,
      statusLabel: profile.statusLabel,
      shop: profile.shop,
    };
  }

  private async establishSession(
    tokenPromise: Promise<MerchantAuthToken>,
  ): Promise<CurrentMerchant> {
    const token = await tokenPromise;
    merchantSession.setToken(token.accessToken);
    this.initialized = false;
    try {
      const current = await this.restore(true);
      if (!current) throw new ApiError("登录状态恢复失败", 401, "UNAUTHORIZED");
      return current;
    } catch (error) {
      this.clear();
      throw error;
    }
  }

  async restore(force = false): Promise<CurrentMerchant | null> {
    if (!merchantSession.getToken()) {
      this.clear();
      return null;
    }
    if (!force && this.initialized) return this.current;
    if (this.restoring) return this.restoring;

    this.restoring = getCurrentMerchant()
      .then((current) => {
        this.current = current;
        this.initialized = true;
        this.authState = "authenticated";
        return current;
      })
      .catch((error: ApiError) => {
        if (error.statusCode === 401) this.clear();
        throw error;
      })
      .finally(() => {
        this.restoring = null;
      });
    return this.restoring;
  }

  async logout(): Promise<void> {
    try {
      if (merchantSession.getToken()) await logoutMerchant();
    } finally {
      this.clear();
    }
  }

  clear(): void {
    voucherDraftStore.clear();
    this.current = null;
    this.initialized = true;
    this.authState = "anonymous";
    merchantSession.clear();
  }
}

export const merchantStore = new MerchantStore();
