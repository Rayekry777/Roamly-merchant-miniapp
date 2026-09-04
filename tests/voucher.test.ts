import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  copyMerchantVoucherProduct,
  deleteMerchantVoucherProduct,
  parseVoucherPage,
  parseVoucherProduct,
  submitMerchantVoucherProduct,
  uploadVoucherImage,
} from "../miniprogram/api/merchant-voucher";
import {
  discountRateToBps,
  fenToYuan,
  formFromVoucher,
  toVoucherUpdateRequest,
  validateUsageRules,
  voucherDraftStore,
  yuanToFen,
} from "../miniprogram/store/voucher-draft";
import type {
  MerchantVoucherProduct,
  VoucherDraftForm,
  VoucherProductType,
} from "../miniprogram/types/voucher";

const cover = {
  id: "9007199254740995",
  purpose: "VOUCHER_COVER",
  purposeLabel: "券封面",
  originalFilename: "cover.png",
  mimeType: "image/png",
  byteSize: 4096,
  width: 1200,
  height: 675,
  contentPath: "/v1/merchant/business-media/images/9007199254740995/content",
} as const;

function product(
  productType: VoucherProductType = "PACKAGE",
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "9007199254740993",
    shopId: "9007199254740994",
    productType,
    productTypeLabel:
      productType === "PACKAGE"
        ? "套餐券"
        : productType === "CASH"
          ? "代金券"
          : productType === "DISCOUNT"
            ? "折扣券"
            : "次卡",
    title: "双人招牌套餐",
    coverMediaId: cover.id,
    coverMedia: cover,
    detailMediaIds: [],
    detailMedia: [],
    priceAmount: 12800,
    marketAmount: 16800,
    totalStock: 100,
    availableStock: 100,
    soldCount: 0,
    purchaseLimit: 2,
    saleBeginTime: "2026-09-05T10:00:00",
    saleEndTime: "2026-12-31T22:00:00",
    validityType: "DAYS_AFTER_PURCHASE",
    validityTypeLabel: "购买后若干天",
    validDays: 30,
    usageRules: [
      {
        dayOfWeek: "MONDAY",
        closed: false,
        periods: [{ open: "10:00", close: "22:00" }],
      },
    ],
    excludedDates: [],
    reservationRequired: false,
    stackable: false,
    refundAnytime: true,
    refundExpired: false,
    packageItems:
      productType === "PACKAGE" || productType === "MULTI_USE"
        ? [
            {
              id: "9007199254740996",
              name: "招牌主食",
              quantity: 2,
              unit: "份",
              unitPriceAmount: 6800,
              sortOrder: 0,
            },
          ]
        : [],
    reviewStatus: "DRAFT",
    reviewStatusLabel: "草稿",
    version: 3,
    updateTime: "2026-09-04T12:00:00",
    ...overrides,
  };
}

function ok(data: unknown) {
  return { code: "OK", message: "操作成功", data };
}

describe("阶段 20 商户团购券契约", () => {
  beforeEach(() => {
    voucherDraftStore.clear();
    vi.restoreAllMocks();
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

  it("严格解析四类券、私有媒体和大字符串 ID", () => {
    const parsed = parseVoucherProduct(product());
    const page = parseVoucherPage({
      items: [product("CASH")],
      page: 1,
      size: 20,
      total: 1,
    });

    expect(parsed.id).toBe("9007199254740993");
    expect(parsed.coverMedia?.id).toBe("9007199254740995");
    expect(parsed.packageItems[0]?.id).toBe("9007199254740996");
    expect(page.items[0]?.productType).toBe("CASH");
    expect(() =>
      parseVoucherProduct(product("PACKAGE", { id: 9 })),
    ).toThrowError(
      expect.objectContaining({ code: "RESPONSE_CONTRACT_INVALID" }),
    );
    expect(() =>
      parseVoucherProduct(
        product("PACKAGE", {
          usageRules: [{ dayOfWeek: "HOLIDAY", closed: true, periods: [] }],
        }),
      ),
    ).toThrowError(
      expect.objectContaining({ code: "RESPONSE_CONTRACT_INVALID" }),
    );
  });

  it("金额元分、折扣基点转换保持整数精度", () => {
    expect(yuanToFen("12.34", "售价")).toBe(1234);
    expect(fenToYuan(1234)).toBe("12.34");
    expect(discountRateToBps("8.5")).toBe(8500);
    expect(() => yuanToFen("12.345", "售价")).toThrowError(
      "售价最多保留两位小数",
    );
    expect(() => discountRateToBps("10")).toThrowError("折扣请输入0.1至9.9");
  });

  it("四类表单只提交各自专属字段", () => {
    const packageRequest = requestFor("PACKAGE");
    const cashRequest = requestFor("CASH", (draft) => {
      draft.faceValueYuan = "100";
      draft.minimumSpendYuan = "100";
    });
    const discountRequest = requestFor("DISCOUNT", (draft) => {
      draft.discountRate = "8.5";
      draft.minimumSpendYuan = "100";
      draft.maximumDiscountYuan = "50";
    });
    const multiUseRequest = requestFor("MULTI_USE", (draft) => {
      draft.totalUseCount = "5";
    });

    expect(packageRequest.packageItems).toHaveLength(1);
    expect(packageRequest.faceValueAmount).toBeUndefined();
    expect(cashRequest).toMatchObject({
      faceValueAmount: 10000,
      minimumSpendAmount: 10000,
      packageItems: [],
    });
    expect(cashRequest.discountRateBps).toBeUndefined();
    expect(discountRequest).toMatchObject({
      discountRateBps: 8500,
      minimumSpendAmount: 10000,
      maximumDiscountAmount: 5000,
      packageItems: [],
    });
    expect(multiUseRequest.totalUseCount).toBe(5);
    expect(multiUseRequest.packageItems).toHaveLength(1);
  });

  it("阻止倒置、重叠和休息日残留时段", () => {
    expect(() =>
      validateUsageRules([
        {
          dayOfWeek: "MONDAY",
          closed: false,
          periods: [
            { open: "10:00", close: "12:00" },
            { open: "11:00", close: "13:00" },
          ],
        },
      ]),
    ).toThrowError("同一天的使用时段不能重叠");
    expect(() =>
      validateUsageRules([
        {
          dayOfWeek: "TUESDAY",
          closed: true,
          periods: [{ open: "10:00", close: "09:00" }],
        },
      ]),
    ).toThrowError("休息日不能保留使用时段");
  });

  it("上传券封面时携带商户 Bearer 与媒体用途", async () => {
    vi.mocked(wx.uploadFile).mockImplementation((options) => {
      options.success?.({
        statusCode: 201,
        data: JSON.stringify(
          ok({ ...cover, expiresAt: "2026-09-05T12:00:00" }),
        ),
      } as never);
      return {} as WechatMiniprogram.UploadTask;
    });

    const uploaded = await uploadVoucherImage(
      "wxfile://voucher-cover.png",
      "VOUCHER_COVER",
    );

    expect(uploaded.localPath).toBe("wxfile://voucher-cover.png");
    expect(vi.mocked(wx.uploadFile).mock.calls[0]?.[0]).toMatchObject({
      filePath: "wxfile://voucher-cover.png",
      formData: { purpose: "VOUCHER_COVER" },
      header: { Authorization: "Bearer merchant-token" },
    });
  });

  it("复制、删除和提交使用冻结路由并携带幂等键", async () => {
    vi.mocked(wx.request).mockImplementation((options) => {
      options.success?.({
        statusCode: options.method === "DELETE" ? 204 : 200,
        data: options.method === "DELETE" ? undefined : ok(product()),
      } as never);
      return {} as WechatMiniprogram.RequestTask;
    });

    await copyMerchantVoucherProduct("9007199254740993");
    await deleteMerchantVoucherProduct("9007199254740993");
    await submitMerchantVoucherProduct(
      "9007199254740993",
      3,
      "voucher-fixed-key",
    );

    expect(
      vi.mocked(wx.request).mock.calls.map(([options]) => options.url),
    ).toEqual([
      "http://127.0.0.1:8081/v1/merchant/voucher-products/9007199254740993/copies",
      "http://127.0.0.1:8081/v1/merchant/voucher-products/9007199254740993",
      "http://127.0.0.1:8081/v1/merchant/voucher-products/9007199254740993/submission",
    ]);
    expect(vi.mocked(wx.request).mock.calls[2]?.[0].header).toMatchObject({
      "Idempotency-Key": "voucher-fixed-key",
    });
  });

  it("409 时保留本地副本并显式套用最新服务端版本", async () => {
    let getCount = 0;
    vi.mocked(wx.request).mockImplementation((options) => {
      if (options.method === "PUT") {
        options.success?.({
          statusCode: 409,
          data: {
            code: "VOUCHER_PRODUCT_VERSION_CONFLICT",
            message: "版本冲突",
          },
        } as never);
      } else {
        getCount += 1;
        options.success?.({
          statusCode: 200,
          data: ok(
            product("PACKAGE", {
              title: getCount === 1 ? "服务端旧标题" : "服务端新标题",
              version: getCount === 1 ? 3 : 4,
            }),
          ),
        } as never);
      }
      return {} as WechatMiniprogram.RequestTask;
    });

    const draft = await voucherDraftStore.load("9007199254740993");
    draft.title = "本地未提交标题";

    await expect(voucherDraftStore.save(draft)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(voucherDraftStore.formDraft?.title).toBe("服务端新标题");
    expect(voucherDraftStore.conflictDraft?.title).toBe("本地未提交标题");

    const reapplied = voucherDraftStore.reapplyConflict();
    expect(reapplied).toMatchObject({ title: "本地未提交标题", version: 4 });
  });

  it("提交网络失败后重试复用同一幂等键", async () => {
    const submissionKeys: string[] = [];
    let submitCount = 0;
    vi.mocked(wx.request).mockImplementation((options) => {
      if (options.url.endsWith("/submission")) {
        submissionKeys.push(String(options.header?.["Idempotency-Key"]));
        submitCount += 1;
        if (submitCount === 1)
          options.fail?.({ errMsg: "request:fail timeout" } as never);
        else {
          options.success?.({
            statusCode: 200,
            data: ok(
              product("PACKAGE", {
                reviewStatus: "PENDING",
                reviewStatusLabel: "审核中",
              }),
            ),
          } as never);
        }
      } else {
        options.success?.({ statusCode: 200, data: ok(product()) } as never);
      }
      return {} as WechatMiniprogram.RequestTask;
    });

    await voucherDraftStore.load("9007199254740993");
    await expect(voucherDraftStore.submit()).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
    await voucherDraftStore.submit();

    expect(submissionKeys).toHaveLength(2);
    expect(submissionKeys[0]).toBe(submissionKeys[1]);
  });
});

function requestFor(
  type: VoucherProductType,
  change?: (draft: VoucherDraftForm) => void,
) {
  const draft = formFromVoucher(
    parseVoucherProduct(product(type)) as MerchantVoucherProduct,
  );
  change?.(draft);
  return toVoucherUpdateRequest(draft);
}
