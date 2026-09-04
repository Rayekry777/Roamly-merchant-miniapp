import {
  getCurrentMerchant,
  loginMerchant,
  logoutMerchant,
} from "../api/merchant-auth";
import type { CurrentMerchant } from "../types/merchant-auth";
import { ApiError } from "../utils/request";
import { merchantSession } from "../utils/session";

class MerchantStore {
  current: CurrentMerchant | null = null;
  initialized = false;
  private restoring: Promise<CurrentMerchant | null> | null = null;

  async login(phone: string, code: string): Promise<CurrentMerchant> {
    const token = await loginMerchant(phone, code);
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
    this.current = null;
    this.initialized = true;
    merchantSession.clear();
  }
}

export const merchantStore = new MerchantStore();
