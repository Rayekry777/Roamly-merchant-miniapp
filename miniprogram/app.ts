import { merchantStore } from "./store/merchant";

interface IAppOption {
  globalData: Record<string, never>;
}

App<IAppOption>({
  globalData: {},
  onLaunch() {
    void merchantStore.restore().catch(() => undefined);
  },
});
