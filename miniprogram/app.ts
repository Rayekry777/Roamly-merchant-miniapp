import { merchantStore } from "./store/merchant";
import { routeToLogin } from "./utils/auth-navigation";
import { ApiError } from "./utils/request";

interface IAppOption {
  globalData: { motionEnabled: boolean };
}

App<IAppOption>({
  globalData: { motionEnabled: true },
  onLaunch() {
    const benchmarkLevel = wx.getDeviceInfo().benchmarkLevel;
    this.globalData.motionEnabled =
      benchmarkLevel === undefined ||
      benchmarkLevel < 0 ||
      benchmarkLevel >= 10;
    void merchantStore
      .bootstrap()
      .then((current) => {
        if (!current) routeToLogin(undefined, { replace: true });
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.statusCode === 401) {
          routeToLogin(undefined, { replace: true });
        }
      });
  },
});
