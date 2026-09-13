import { describe, expect, it } from "vitest";

import { merchantTabRoutes } from "../miniprogram/utils/routes";

describe("阶段 15 商户小程序基线", () => {
  it("固定三个商户主入口", () => {
    expect(merchantTabRoutes).toEqual([
      "/pages/workbench/index",
      "/pages/messages/index",
      "/pages/me/index",
    ]);
  });
});
