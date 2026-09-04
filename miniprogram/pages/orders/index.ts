import { guardActiveMerchant } from "../../utils/merchant-guard";

Page({
  onShow() {
    void guardActiveMerchant();
  },
});
