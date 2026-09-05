export const merchantTabRoutes = Object.freeze([
  "/pages/workbench/index",
  "/pages/messages/index",
  "/pages/me/index",
]);

type TabAwarePage = {
  route?: string;
  getTabBar?: () => { setData(data: { value: string }): void } | undefined;
};

export function syncMerchantTabBar(page: TabAwarePage): void {
  const route = `/${page.route || ""}`;
  const tabBar = page.getTabBar?.();
  if (tabBar && merchantTabRoutes.includes(route as never)) {
    tabBar.setData({ value: route });
  }
}
