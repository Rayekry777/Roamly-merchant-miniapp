import { guardActiveMerchant } from "../../utils/merchant-guard";
import { loadFinanceSummary, type FinanceSummary } from "../../api/finance";

Page({
  data: { summary: null as FinanceSummary | null, loading: true },
  onShow() {
    void guardActiveMerchant();
    void this.loadSummary();
  },
  async loadSummary(){try{const r=await loadFinanceSummary();this.setData({summary:r.data});}finally{this.setData({loading:false});}},
});
