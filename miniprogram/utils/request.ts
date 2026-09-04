import { getEnvironment } from "../config/env";
import type { ErrorResult, Result } from "../types/http";
import { merchantSession } from "./session";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 0,
    public readonly code = "NETWORK_ERROR",
    public readonly fieldErrors: ErrorResult["fieldErrors"] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type AuthMode = "public" | "required";

interface RequestOptions<TBody> {
  method?: HttpMethod;
  data?: TBody;
  auth?: AuthMode;
  showError?: boolean;
}

export function request<
  T,
  TBody extends WechatMiniprogram.IAnyObject = WechatMiniprogram.IAnyObject,
>(path: string, options: RequestOptions<TBody> = {}): Promise<Result<T>> {
  const auth = options.auth ?? "required";
  const token = auth === "required" ? merchantSession.getToken() : "";
  if (auth === "required" && !token) {
    return Promise.reject(new ApiError("请先登录", 401, "UNAUTHORIZED"));
  }

  return new Promise<Result<T>>((resolve, reject) => {
    wx.request<Result<T> | ErrorResult>({
      url: `${getEnvironment().apiBaseUrl}${path}`,
      method: options.method ?? "GET",
      data: options.data,
      timeout: 12000,
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success(response) {
        if (response.statusCode === 401) merchantSession.clear();
        if (response.statusCode === 204) {
          resolve({ code: "OK", message: "操作成功", data: null });
          return;
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const error = response.data as ErrorResult;
          reject(
            new ApiError(
              error?.message || `服务暂时不可用（${response.statusCode}）`,
              response.statusCode,
              error?.code,
              error?.fieldErrors,
            ),
          );
          return;
        }
        const result = response.data as Result<T>;
        if (!result || result.code !== "OK" || !("data" in result)) {
          reject(
            new ApiError(
              "响应格式异常",
              response.statusCode,
              "RESPONSE_CONTRACT_INVALID",
            ),
          );
          return;
        }
        resolve(result);
      },
      fail(error) {
        reject(
          new ApiError(
            error.errMsg.includes("timeout")
              ? "请求超时，请稍后重试"
              : "网络连接失败",
          ),
        );
      },
    });
  }).catch((error: ApiError) => {
    if (options.showError !== false && error.statusCode !== 401) {
      wx.showToast({ title: error.message, icon: "none" });
    }
    throw error;
  });
}
