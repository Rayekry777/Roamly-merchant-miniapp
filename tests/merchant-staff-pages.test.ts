import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "miniprogram");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("商户员工短时邀请页面", () => {
  it("签发页展示六位凭证和60秒倒计时且不加载二维码", () => {
    const script = source("pages/staff/index.ts");
    const template = source("pages/staff/index.wxml");
    const config = source("pages/staff/index.json");

    expect(script).toContain("credentialCountdown");
    expect(script).toContain("revokeStaffInvitation");
    expect(template).toContain("验证并生成60秒凭证");
    expect(template).toContain("复制凭证");
    expect(template).not.toContain("t-qrcode");
    expect(config).not.toContain("qrcode");
  });

  it("接受页只允许输入六位数字凭证且不再扫码", () => {
    const script = source("pages/staff/acceptance/index.ts");
    const template = source("pages/staff/acceptance/index.wxml");

    expect(script).toContain("/^\\d{6}$/");
    expect(script).not.toContain("scanCode");
    expect(template).toContain('maxlength="6"');
    expect(template).not.toContain("扫描邀请二维码");
  });
});
