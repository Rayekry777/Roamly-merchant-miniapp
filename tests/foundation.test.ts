import { describe, expect, it } from "vitest";

import { roamlyTheme } from "../miniprogram/config/theme";
import { merchantTabRoutes } from "../miniprogram/utils/routes";

describe("阶段 15 商户小程序基线", () => {
  it("使用冻结的 Roamly 视觉令牌", () => {
    expect(roamlyTheme).toEqual({
      primary: "#ff5f57",
      accent: "#8275ff",
      text: "#242331",
      muted: "#8f8d99",
      background: "#f4f5fb",
      surface: "#ffffff",
      border: "#ececf3",
    });
  });

  it("固定四个商户主入口", () => {
    expect(merchantTabRoutes).toEqual([
      "/pages/workbench/index",
      "/pages/orders/index",
      "/pages/verification/index",
      "/pages/me/index",
    ]);
  });
});
