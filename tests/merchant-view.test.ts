import { describe, expect, it } from "vitest";

import type { CurrentMerchant } from "../miniprogram/types/merchant-auth";
import { merchantAccountStatuses } from "../miniprogram/types/merchant-auth";
import { merchantProfileView } from "../miniprogram/utils/merchant-view";

describe("商户我的状态展示", () => {
  it.each(merchantAccountStatuses)("为 %s 提供稳定中文引导", (status) => {
    const view = merchantProfileView({
      id: "1",
      maskedPhone: "139****0001",
      nickname: "测试商户",
      role: "VISITOR",
      roleLabel: "游客",
      status,
      statusLabel: "状态",
      canAcceptStaffInvitation: status === "NOT_APPLIED",
      permissions: ["merchant:profile:read"],
    } satisfies CurrentMerchant);

    expect(view.guidance.length).toBeGreaterThan(8);
    expect(view.canOperate).toBe(status === "ACTIVE");
    expect(view.avatarText).toBe("测");
  });
});
