import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "miniprogram");

describe("小程序页面注册", () => {
  it("app.json 中的页面均具备完整页面文件", () => {
    const app = JSON.parse(readFileSync(resolve(root, "app.json"), "utf8")) as {
      pages: string[];
    };
    const missingFiles = app.pages.flatMap((page) =>
      [".json", ".ts", ".wxml", ".wxss"]
        .map((extension) => `${page}${extension}`)
        .filter((file) => !existsSync(resolve(root, file))),
    );

    expect(missingFiles).toEqual([]);
  });

  it("员工邀请入口跳转到已注册页面", () => {
    const page = readFileSync(resolve(root, "pages/me/index.ts"), "utf8");

    expect(page).toContain("/pages/staff/acceptance/index");
  });
});
