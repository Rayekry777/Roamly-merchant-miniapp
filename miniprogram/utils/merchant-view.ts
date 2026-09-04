import type {
  CurrentMerchant,
  MerchantAccountStatus,
} from "../types/merchant-auth";

const statusGuidance: Record<MerchantAccountStatus, string> = {
  NOT_APPLIED: "完成商户入驻后，即可使用经营、订单与核销功能。",
  PENDING: "入驻资料正在审核，请留意后续状态变化。",
  ACTIVE: "账号与门店已激活，可以开始经营。",
  REJECTED: "入驻资料需要修改，请根据审核意见重新提交。",
  DISABLED: "账号已停用，经营功能和已有会话将被限制。",
};

const statusTone: Record<MerchantAccountStatus, string> = {
  NOT_APPLIED: "neutral",
  PENDING: "pending",
  ACTIVE: "active",
  REJECTED: "warning",
  DISABLED: "disabled",
};

export function merchantProfileView(current: CurrentMerchant): {
  guidance: string;
  tone: string;
  canOperate: boolean;
  avatarText: string;
} {
  return {
    guidance: statusGuidance[current.status],
    tone: statusTone[current.status],
    canOperate: current.status === "ACTIVE",
    avatarText: current.nickname.slice(0, 1) || "商",
  };
}
