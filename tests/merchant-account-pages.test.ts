import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "miniprogram");

describe("商户个人信息页面", () => {
  it("登录页提供验证码、注册和密码三种模式并保留回跳", () => {
    const source = readFileSync(resolve(root, "pages/login/index.ts"), "utf8");
    expect(source).toContain(
      'type LoginMode = "SMS" | "REGISTRATION" | "PASSWORD"',
    );
    expect(source).toContain('this.data.mode === "REGISTRATION"');
    expect(source).toContain("merchantStore.loginByPassword");
    expect(source).toContain("resumeAfterLogin()");
  });

  it("注册个人信息与账号安全页面", () => {
    const app = JSON.parse(readFileSync(resolve(root, "app.json"), "utf8")) as {
      pages: string[];
    };
    expect(app.pages).toEqual(
      expect.arrayContaining([
        "pages/account/index",
        "pages/phone-change/index",
        "pages/password-change/index",
      ]),
    );
  });

  it("个人信息入口紧邻并位于进入管理版之前", () => {
    const page = readFileSync(resolve(root, "pages/me/index.wxml"), "utf8");
    const accountIndex = page.indexOf('bind:tap="openAccount"');
    const managementIndex = page.indexOf('bind:tap="openManagement"');
    expect(accountIndex).toBeGreaterThan(-1);
    expect(managementIndex).toBeGreaterThan(accountIndex);
    expect(page.slice(accountIndex + 1, managementIndex)).not.toContain(
      'bind:tap="',
    );
  });

  it("个人信息页提供原有确认式退出入口并统一卡片底色", () => {
    const script = readFileSync(
      resolve(root, "pages/account/index.ts"),
      "utf8",
    );
    const template = readFileSync(
      resolve(root, "pages/account/index.wxml"),
      "utf8",
    );
    const accountStyle = readFileSync(
      resolve(root, "pages/account/index.wxss"),
      "utf8",
    );
    expect(script).toContain('title: "退出登录"');
    expect(script).toContain("await merchantStore.logout()");
    expect(template).toContain("退出登录</t-button>");
    expect(accountStyle).toContain("background: var(--roamly-surface)");
    for (const route of ["phone-change", "password-change"]) {
      const style = readFileSync(
        resolve(root, `pages/${route}/index.wxss`),
        "utf8",
      );
      expect(style).toContain("background: var(--roamly-surface)");
      expect(style).toContain("--td-input-bg-color: transparent");
    }
  });

  it("换绑手机号和修改密码成功后清理会话并回到登录页", () => {
    for (const route of ["phone-change", "password-change"]) {
      const source = readFileSync(
        resolve(root, `pages/${route}/index.ts`),
        "utf8",
      );
      expect(source).toContain("merchantStore.clear()");
      expect(source).toContain('wx.reLaunch({ url: "/pages/login/index');
    }
  });
});
