import { guardActiveMerchant } from "../../utils/merchant-guard";
import { loadFinanceSummary, type FinanceSummary } from "../../api/finance";
import { connectMerchantRealtime } from "../../utils/realtime";

Page({
  data: { summary: null as FinanceSummary | null, loading: true },
  onShow() {
    void guardActiveMerchant();
    void this.loadSummary();
    this.stopRealtime = connectMerchantRealtime((event) => {
      if (["PAYMENT_UPDATED", "REFUND_UPDATED", "VOUCHER_REDEEMED", "REDEMPTION_REVERSED", "SETTLEMENT_UPDATED"].includes(event.type)) void this.loadSummary();
    });
  },
  onHide() { this.stopRealtime?.(); this.stopRealtime = undefined; },
  async loadSummary(){try{const r=await loadFinanceSummary();this.setData({summary:r.data});}finally{this.setData({loading:false});}},
  stopRealtime: undefined as (() => void) | undefined,
});
