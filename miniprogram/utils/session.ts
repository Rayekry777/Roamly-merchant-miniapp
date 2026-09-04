const TOKEN_KEY = "roamly_merchant_satoken_v1";

export const merchantSession = {
  getToken(): string {
    return wx.getStorageSync(TOKEN_KEY) || "";
  },
  setToken(token: string): void {
    wx.setStorageSync(TOKEN_KEY, token);
  },
  clear(): void {
    wx.removeStorageSync(TOKEN_KEY);
  },
};
