import { loadFinanceSummary, type FinanceSummary } from "../../api/finance";
import { merchantStore } from "../../store/merchant";
import type { CurrentMerchant } from "../../types/merchant-auth";
import {
  consumePendingAction,
  type AuthIntent,
} from "../../utils/auth-navigation";
import { formatFen } from "../../utils/format";
import {
  guardActiveMerchant,
  guardAuthenticated,
  guardMerchantPermission,
} from "../../utils/merchant-guard";
import { connectMerchantRealtime } from "../../utils/realtime";
import { syncMerchantTabBar } from "../../utils/routes";

type FinanceView = FinanceSummary & {
  frozenAmountText: string;
  recognizedAmountText: string;
  commissionAmountText: string;
  netAmountText: string;
};

const HOME_ROUTE = "/pages/workbench/index";

const emptySummary = (): FinanceView => ({
  frozenAmount: 0,
  recognizedAmount: 0,
  commissionAmount: 0,
  netAmount: 0,
  frozenAmountText: "--",
  recognizedAmountText: "--",
  commissionAmountText: "--",
  netAmountText: "--",
});

Page({
  data: {
    statusBarHeight: 24,
    capsuleInset: 96,
    current: null as CurrentMerchant | null,
    shopName: "Roamly 商户",
    summary: emptySummary(),
    loading: true,
    error: "",
    financeError: "",
    financeExpanded: true,
    financeFlash: false,
    canFinance: false,
  },
  onLoad() {
    const windowInfo = wx.getWindowInfo();
    let capsuleInset = 96;
    try {
      const capsule = wx.getMenuButtonBoundingClientRect();
      capsuleInset = Math.max(96, windowInfo.windowWidth - capsule.left + 8);
    } catch {
      // 基础库不支持胶囊信息时使用标准右侧留白。
    }
    this.setData({
      statusBarHeight: windowInfo.statusBarHeight || 24,
      capsuleInset,
    });
  },
  onShow() {
    syncMerchantTabBar(this);
    void this.activate();
  },
  onHide() {
    this.stopRealtime?.();
    this.stopRealtime = undefined;
    if (this.flashTimer) clearTimeout(this.flashTimer);
  },
  onUnload() {
    this.stopRealtime?.();
    if (this.flashTimer) clearTimeout(this.flashTimer);
  },
  async activate() {
    try {
      if (
        !(await guardAuthenticated(
          { route: HOME_ROUTE },
          { replace: true },
        ))
      )
        return;
      await this.load(false);
      const action = consumePendingAction(HOME_ROUTE);
      if (action === "scan") void this.scan();
      this.stopRealtime?.();
      if (merchantStore.current?.status === "ACTIVE") {
        this.stopRealtime = connectMerchantRealtime((event) => {
          if (
            [
              "PAYMENT_UPDATED",
              "REFUND_UPDATED",
              "VOUCHER_REDEEMED",
              "REDEMPTION_REVERSED",
              "SETTLEMENT_UPDATED",
            ].includes(event.type)
          )
            void this.loadFinance(true);
        });
      }
    } catch (error) {
      this.setData({
        loading: false,
        error: error instanceof Error ? error.message : "首页加载失败",
      });
    }
  },
  async load(force: boolean) {
    this.setData({ loading: true, error: "" });
    try {
      const current = await merchantStore.restore(force);
      if (!current) return;
      const canFinance =
        current.status === "ACTIVE" &&
        current.permissions.includes("merchant:finance:read");
      this.setData({
        current,
        shopName: current.shop?.name || current.nickname || "Roamly 商户",
        canFinance,
      });
      if (canFinance) await this.loadFinance(false);
    } catch (error) {
      this.setData({
        error: error instanceof Error ? error.message : "首页加载失败",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  async loadFinance(flash: boolean) {
    if (!this.data.canFinance) return;
    try {
      const result = await loadFinanceSummary();
      if (!result.data) throw new Error("经营资金响应格式异常");
      const value = result.data;
      this.setData({
        summary: {
          ...value,
          frozenAmountText: formatFen(value.frozenAmount),
          recognizedAmountText: formatFen(value.recognizedAmount),
          commissionAmountText: formatFen(value.commissionAmount),
          netAmountText: formatFen(value.netAmount),
        },
        financeError: "",
        financeFlash: flash,
      });
      if (flash) {
        if (this.flashTimer) clearTimeout(this.flashTimer);
        this.flashTimer = setTimeout(
          () => this.setData({ financeFlash: false }),
          700,
        );
      }
    } catch (error) {
      this.setData({
        financeError:
          error instanceof Error ? error.message : "经营资金加载失败",
      });
    }
  },
  retry() {
    void this.activate();
  },
  refreshFinance() {
    if (this.data.canFinance) void this.loadFinance(true);
    else
      void this.requireCapability(
        "merchant:finance:read",
        "当前账号暂不能查看经营资金",
        { route: "/pages/settlements/index" },
      );
  },
  toggleFinance() {
    this.setData({ financeExpanded: !this.data.financeExpanded });
  },
  async scan() {
    if (
      !(await this.requireCapability(
        "merchant:redemption:manage",
        "当前账号暂不能核销",
        { route: HOME_ROUTE, action: "scan" },
      ))
    )
      return;
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ["qrCode"],
      success: ({ result }) => {
        wx.navigateTo({
          url: `/pages/verification/index?token=${encodeURIComponent(result)}`,
        });
      },
      fail: (error) => {
        if (!error.errMsg?.includes("cancel")) {
          wx.showToast({ title: "无法使用相机扫码", icon: "none" });
        }
      },
    });
  },
  async manual() {
    const intent = {
      route: "/pages/verification/index",
      query: { mode: "manual" },
    };
    if (
      !(await this.requireCapability(
        "merchant:redemption:manage",
        "当前账号暂不能核销",
        intent,
      ))
    )
      return;
    wx.navigateTo({ url: "/pages/verification/index?mode=manual" });
  },
  async openRedemptions() {
    const intent = { route: "/pages/redemptions/index" };
    if (
      await this.requireCapability(
        "merchant:redemption:manage",
        "当前账号暂不能查看核销明细",
        intent,
      )
    )
      wx.navigateTo({ url: intent.route });
  },
  async openManagement() {
    const intent = { route: "/pages/operations/index" };
    if (await guardActiveMerchant(intent)) wx.navigateTo({ url: intent.route });
  },
  async openSettlements() {
    const intent = { route: "/pages/settlements/index" };
    if (
      await this.requireCapability(
        "merchant:finance:read",
        "当前账号暂不能查看结算",
        intent,
      )
    )
      wx.navigateTo({ url: intent.route });
  },
  unavailable(event: WechatMiniprogram.TouchEvent) {
    const label = String(event.currentTarget.dataset.label || "该功能");
    wx.showToast({ title: `${label}暂未开放`, icon: "none" });
  },
  goToMe() {
    wx.switchTab({ url: "/pages/me/index" });
  },
  async requireCapability(
    permission: string,
    message: string,
    intent: AuthIntent,
  ) {
    return guardMerchantPermission(permission, message, intent);
  },
  stopRealtime: undefined as (() => void) | undefined,
  flashTimer: undefined as ReturnType<typeof setTimeout> | undefined,
});
