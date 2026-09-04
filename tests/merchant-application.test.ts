import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getMerchantApplication,
  parseApplication,
  submitMerchantApplication,
  uploadBusinessImage,
} from "../miniprogram/api/merchant-application";
import {
  draftFromApplication,
  emptyDraft,
  toSaveRequest,
} from "../miniprogram/store/onboarding";

const media = {
  id: "9007199254740995",
  purpose: "LICENSE",
  purposeLabel: "营业执照",
  originalFilename: "license.png",
  mimeType: "image/png",
  byteSize: 4096,
  width: 800,
  height: 600,
  contentPath: "/v1/merchant/business-media/images/9007199254740995/content",
  expiresAt: "2026-09-05T12:00:00",
} as const;

const application = {
  id: "9007199254740993",
  status: "DRAFT",
  statusLabel: "草稿",
  shopName: "漫游测试门店",
  businessHours: [
    {
      dayOfWeek: "MONDAY",
      closed: false,
      periods: [{ open: "09:00", close: "21:00" }],
    },
  ],
  licenseMedia: media,
  galleryMedia: [],
  settlementBankName: "Roamly Mock 银行",
  version: 3,
};

describe("阶段 18 商户入驻契约", () => {
  beforeEach(() => {
    vi.stubGlobal("wx", {
      getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
      getStorageSync: () => "merchant-token",
      removeStorageSync: vi.fn(),
      showToast: vi.fn(),
      request: vi.fn(),
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
    });
  });

  it("接受尚无申请时带 data null 的真实 Result", async () => {
    vi.mocked(wx.request).mockImplementation((options) => {
      options.success?.({
        statusCode: 200,
        data: { code: "OK", message: "操作成功", data: null },
      } as never);
      return {} as WechatMiniprogram.RequestTask;
    });

    await expect(getMerchantApplication()).resolves.toBeNull();
  });

  it("解析入驻状态、私有媒体与大字符串 ID", () => {
    const parsed = parseApplication(application);

    expect(parsed.id).toBe("9007199254740993");
    expect(parsed.licenseMedia?.id).toBe("9007199254740995");
    expect(parsed.businessHours[0]?.dayOfWeek).toBe("MONDAY");
  });

  it("拒绝未知状态和数字业务 ID", () => {
    expect(() =>
      parseApplication({ ...application, status: "UNKNOWN" }),
    ).toThrowError(
      expect.objectContaining({ code: "RESPONSE_CONTRACT_INVALID" }),
    );
    expect(() => parseApplication({ ...application, id: 9 })).toThrowError(
      expect.objectContaining({ code: "RESPONSE_CONTRACT_INVALID" }),
    );
  });

  it("提交时携带并保留调用方幂等键", async () => {
    vi.mocked(wx.request).mockImplementation((options) => {
      options.success?.({
        statusCode: 200,
        data: {
          code: "OK",
          message: "操作成功",
          data: { ...application, status: "PENDING", statusLabel: "审核中" },
        },
      } as never);
      return {} as WechatMiniprogram.RequestTask;
    });

    await submitMerchantApplication("merchant-onboarding-fixed-key");

    expect(vi.mocked(wx.request).mock.calls[0]?.[0]).toMatchObject({
      url: "http://127.0.0.1:8081/v1/merchant/application/submission",
      method: "POST",
      header: {
        Authorization: "Bearer merchant-token",
        "Idempotency-Key": "merchant-onboarding-fixed-key",
      },
    });
  });

  it("经营图片通过微信上传接口发送 Bearer 与用途", async () => {
    vi.mocked(wx.uploadFile).mockImplementation((options) => {
      options.success?.({
        statusCode: 201,
        data: JSON.stringify({ code: "OK", message: "操作成功", data: media }),
      } as never);
      return {} as WechatMiniprogram.UploadTask;
    });

    const uploaded = await uploadBusinessImage(
      "wxfile://license.png",
      "LICENSE",
    );

    expect(uploaded.localPath).toBe("wxfile://license.png");
    expect(vi.mocked(wx.uploadFile).mock.calls[0]?.[0]).toMatchObject({
      filePath: "wxfile://license.png",
      name: "file",
      formData: { purpose: "LICENSE" },
      header: { Authorization: "Bearer merchant-token" },
    });
  });

  it("草稿映射不持久化空字符串并保留七日默认营业时间", () => {
    const draft = emptyDraft();
    draft.licenseMedia = media;
    draft.shopName = "  测试门店  ";
    const request = toSaveRequest(draft);

    expect(request.shopName).toBe("测试门店");
    expect(request.contactName).toBeUndefined();
    expect(request.licenseMediaId).toBe("9007199254740995");
    expect(request.businessHours).toHaveLength(7);
    expect(request.businessHours[6]).toMatchObject({
      dayOfWeek: "SUNDAY",
      closed: true,
      periods: [],
    });
  });

  it("服务端申请可恢复为可编辑草稿且不会丢失媒体", () => {
    const draft = draftFromApplication(
      parseApplication({ ...application, version: 7 }),
    );

    expect(draft.version).toBe(7);
    expect(draft.licenseMedia?.purpose).toBe("LICENSE");
    expect(draft.businessHours[0]?.periods[0]?.open).toBe("09:00");
  });
});
