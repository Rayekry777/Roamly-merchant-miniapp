import { merchantStore } from "../store/merchant";
import { ApiError } from "./request";
import { routeToLogin, type AuthIntent } from "./auth-navigation";

export async function guardAuthenticated(
  intent?: AuthIntent,
  options: { replace?: boolean } = {},
): Promise<boolean> {
  try {
    const current = await merchantStore.restore();
    if (current) return true;
    routeToLogin(intent, options);
    return false;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      routeToLogin(intent, options);
      return false;
    }
    throw error;
  }
}

export async function guardActiveMerchant(
  intent?: AuthIntent,
): Promise<boolean> {
  if (!(await guardAuthenticated(intent))) return false;
  const current = merchantStore.current;
  if (current?.status === "ACTIVE") return true;
  wx.showModal({
    title: `当前状态：${current?.statusLabel || "暂不可用"}`,
    content: "该功能需要门店激活后使用，可前往“我的”查看或处理账号状态。",
    confirmText: "前往我的",
    cancelText: "暂不处理",
    confirmColor: "#ff5f57",
    success: (result) => {
      if (result.confirm) wx.switchTab({ url: "/pages/me/index" });
    },
  });
  return false;
}

export async function guardVoucherManager(
  intent?: AuthIntent,
): Promise<boolean> {
  return guardMerchantPermission(
    "merchant:voucher:manage",
    "当前角色无权管理团购券",
    intent,
  );
}

export async function guardMerchantPermission(
  permission: string,
  message = "当前角色无权访问",
  intent?: AuthIntent,
): Promise<boolean> {
  if (!(await guardActiveMerchant(intent))) return false;
  if (merchantStore.current?.permissions.includes(permission)) return true;
  wx.showToast({ title: message, icon: "none" });
  return false;
}
