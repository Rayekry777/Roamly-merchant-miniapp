export function formatFen(value?: number | null): string {
  const amount = Number.isSafeInteger(value) ? Number(value) : 0;
  return (amount / 100).toFixed(2);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "--";
  const normalized = value.replace("T", " ");
  return normalized.length >= 16 ? normalized.slice(0, 16) : normalized;
}

export function formatDate(value?: string | null): string {
  if (!value) return "--";
  return value.slice(0, 10);
}

export function maskBusinessId(value?: string | null): string {
  if (!value) return "--";
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

export function settlementStatus(status: string): {
  text: string;
  tone: string;
} {
  const statuses: Record<string, { text: string; tone: string }> = {
    PENDING: { text: "待处理", tone: "pending" },
    PROCESSING: { text: "处理中", tone: "pending" },
    SUCCEEDED: { text: "已结算", tone: "success" },
    FAILED: { text: "处理失败", tone: "danger" },
  };
  return statuses[status] || { text: status || "未知状态", tone: "muted" };
}
