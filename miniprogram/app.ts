interface IAppOption {
  globalData: Record<string, never>;
}

App<IAppOption>({
  globalData: {},
});
