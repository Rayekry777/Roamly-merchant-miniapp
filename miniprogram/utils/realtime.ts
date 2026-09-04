import { getEnvironment } from "../config/env";
import { merchantSession } from "./session";

export interface MerchantRealtimeEvent {
  eventId?: string;
  type: string;
  resourceId?: string;
  shopId?: string;
  occurredAt?: string;
}

type Listener = (event: MerchantRealtimeEvent) => void;

let socket: WechatMiniprogram.SocketTask | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
let retryCount = 0;
let stopped = true;
const listeners = new Set<Listener>();

export function connectMerchantRealtime(listener: Listener): () => void {
  listeners.add(listener);
  stopped = false;
  if (!socket) openSocket();
  return () => {
    listeners.delete(listener);
    if (!listeners.size) disconnectMerchantRealtime();
  };
}

export function disconnectMerchantRealtime(): void {
  stopped = true;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = undefined;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = undefined;
  retryCount = 0;
  socket?.close({ code: 1000, reason: "页面离开" });
  socket = undefined;
}

function openSocket(): void {
  if (stopped || socket) return;
  const token = merchantSession.getToken();
  if (!token) return;
  const base = getEnvironment().apiBaseUrl.replace(/^http/i, "ws");
  socket = wx.connectSocket({
    url: `${base}/v1/merchant/ws`,
    header: { Authorization: `Bearer ${token}` },
    timeout: 10_000,
  });
  socket.onOpen(() => {
    retryCount = 0;
    heartbeatTimer = setInterval(() => {
      try {
        socket?.send({ data: JSON.stringify({ type: "PING" }) });
      } catch {
        /* 连接关闭时由 close 回调重连 */
      }
    }, 15_000);
  });
  socket.onMessage((message) => {
    try {
      const payload = typeof message.data === "string" ? message.data : "";
      const event = JSON.parse(payload) as MerchantRealtimeEvent;
      if (event.type) listeners.forEach((listener) => listener(event));
    } catch {
      /* 非事件消息不影响当前页面 */
    }
  });
  socket.onClose(() => {
    socket = undefined;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
    if (!stopped) scheduleReconnect();
  });
  socket.onError(() => {
    /* close 回调统一处理重连 */
  });
}

function scheduleReconnect(): void {
  if (retryTimer || stopped) return;
  const delay = Math.min(30_000, 1_000 * 2 ** Math.min(retryCount++, 5));
  retryTimer = setTimeout(() => {
    retryTimer = undefined;
    openSocket();
  }, delay);
}
