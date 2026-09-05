const INTENT_KEY = "roamly_merchant_auth_intent_v1";
const INTENT_TTL = 10 * 60 * 1000;

export type AuthIntent = {
  route: string;
  query?: Record<string, string>;
  action?: string;
  createdAt?: number;
};

const tabRoutes = new Set([
  "/pages/workbench/index",
  "/pages/messages/index",
  "/pages/me/index",
]);

const allowedRoutes = new Set([
  ...tabRoutes,
  "/pages/operations/index",
  "/pages/orders/index",
  "/pages/verification/index",
  "/pages/redemptions/index",
  "/pages/settlements/index",
  "/pages/settlements/detail",
  "/pages/onboarding/index",
  "/pages/onboarding/preview",
  "/pages/vouchers/index",
  "/pages/vouchers/editor",
  "/pages/vouchers/preview",
  "/pages/staff/index",
  "/pages/staff/acceptance/index",
]);

let loginRouting = false;

function validIntent(
  value: unknown,
): value is Required<Pick<AuthIntent, "route">> &
  AuthIntent & { createdAt: number } {
  if (!value || typeof value !== "object") return false;
  const intent = value as AuthIntent;
  return (
    typeof intent.route === "string" &&
    allowedRoutes.has(intent.route) &&
    typeof intent.createdAt === "number" &&
    Date.now() - intent.createdAt <= INTENT_TTL
  );
}

function saveIntent(intent?: AuthIntent): void {
  if (!intent || !allowedRoutes.has(intent.route)) return;
  wx.setStorageSync(INTENT_KEY, { ...intent, createdAt: Date.now() });
}

function readIntent(): (AuthIntent & { createdAt: number }) | null {
  const value = wx.getStorageSync(INTENT_KEY) as unknown;
  if (!validIntent(value)) {
    wx.removeStorageSync(INTENT_KEY);
    return null;
  }
  return value;
}

function toUrl(intent: AuthIntent): string {
  const entries = Object.entries(intent.query || {});
  if (entries.length === 0) return intent.route;
  return `${intent.route}?${entries
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&")}`;
}

export function captureCurrentIntent(): AuthIntent | undefined {
  if (typeof getCurrentPages !== "function") return undefined;
  const pages = getCurrentPages();
  const page = pages[pages.length - 1];
  if (!page?.route) return undefined;
  const route = `/${page.route}`;
  if (!allowedRoutes.has(route) || route === "/pages/login/index")
    return undefined;
  return { route, query: page.options as Record<string, string> };
}

export function routeToLogin(
  intent?: AuthIntent,
  options: { replace?: boolean } = {},
): void {
  saveIntent(intent);
  if (loginRouting) return;
  if (
    (options.replace && typeof wx.reLaunch !== "function") ||
    (!options.replace && typeof wx.navigateTo !== "function")
  )
    return;
  if (typeof getCurrentPages !== "function") return;
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  if (current?.route === "pages/login/index") return;
  loginRouting = true;
  const navigationOptions = {
    url: `/pages/login/index?entry=${options.replace ? "startup" : "protected"}`,
    fail: () => {
      loginRouting = false;
    },
  };
  if (options.replace) wx.reLaunch(navigationOptions);
  else wx.navigateTo(navigationOptions);
}

export function markLoginPageReady(): void {
  loginRouting = false;
}

export function clearPendingAuthIntent(): void {
  wx.removeStorageSync(INTENT_KEY);
}

export function consumePendingAction(route: string): string {
  const intent = readIntent();
  if (!intent || intent.route !== route || !intent.action) return "";
  clearPendingAuthIntent();
  return intent.action;
}

export function resumeAfterLogin(): void {
  loginRouting = false;
  const intent = readIntent();
  if (!intent) {
    wx.switchTab({ url: "/pages/workbench/index" });
    return;
  }
  const url = toUrl(intent);
  if (!intent.action) clearPendingAuthIntent();
  if (tabRoutes.has(intent.route)) {
    wx.switchTab({ url: intent.route });
  } else {
    wx.redirectTo({ url });
  }
}
