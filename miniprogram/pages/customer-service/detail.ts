import {
  downloadMerchantCustomerServiceAttachment,
  getMerchantCustomerServiceTicket,
  listMerchantCustomerServiceMessages,
  replyMerchantCustomerServiceTicket,
  uploadMerchantCustomerServiceAttachment,
  type CustomerServiceMessage,
  type CustomerServiceTicket,
} from "../../api/customer-service";

type ViewMessage = CustomerServiceMessage & {
  mine: boolean;
  timeText: string;
  attachments: Array<
    CustomerServiceMessage["attachments"][number] & { localPath?: string }
  >;
};
const labels: Record<string, string> = {
  OPEN: "待平台认领",
  CLAIMED: "处理中",
  WAITING_MERCHANT: "等待我回复",
  WAITING_CUSTOMER: "平台处理中",
  WAITING_INTERNAL: "平台处理中",
  RESOLVED: "已解决",
  CLOSED: "已关闭",
};
Page({
  data: {
    ticket: null as CustomerServiceTicket | null,
    messages: [] as ViewMessage[],
    loading: true,
    error: "",
    statusText: "",
    draft: "",
    sending: false,
    uploading: false,
    pendingAttachmentIds: [] as string[],
    pendingAttachmentNames: [] as string[],
    hasMore: false,
    oldestMessageId: "",
  },
  onLoad(options: Record<string, string | undefined>) {
    this.ticketId = String(options.id || "");
  },
  onShow() {
    void this.load();
  },
  async load() {
    if (!this.ticketId)
      return this.setData({ loading: false, error: "缺少工单编号" });
    this.setData({ loading: true, error: "" });
    try {
      const [ticketResult, messageResult] = await Promise.all([
        getMerchantCustomerServiceTicket(this.ticketId),
        listMerchantCustomerServiceMessages(this.ticketId),
      ]);
      if (!ticketResult.data || !messageResult.data)
        throw new Error("工单数据不完整");
      const messages = this.mapMessages(messageResult.data.items);
      this.setData({
        ticket: ticketResult.data,
        messages,
        statusText:
          labels[ticketResult.data.status] || ticketResult.data.status,
        hasMore: messageResult.data.hasMore,
        oldestMessageId: messageResult.data.oldestMessageId || "",
        loading: false,
      });
      void this.hydrate(messages);
    } catch (error) {
      this.setData({
        loading: false,
        error: error instanceof Error ? error.message : "工单加载失败",
      });
    }
  },
  mapMessages(items: CustomerServiceMessage[]): ViewMessage[] {
    return items.map((item) => ({
      ...item,
      mine: item.senderType === "MERCHANT",
      timeText: (item.createTime || "").replace("T", " ").slice(5, 16),
      attachments: item.attachments.map((file) => ({ ...file })),
    }));
  },
  async hydrate(messages: ViewMessage[]) {
    for (const message of messages)
      for (const file of message.attachments) {
        try {
          file.localPath = await downloadMerchantCustomerServiceAttachment(
            this.ticketId,
            file.id,
          );
          this.setData({ messages });
        } catch {
          // 私有附件失败不阻断会话正文。
        }
      }
  },
  inputDraft(event: WechatMiniprogram.Input) {
    this.setData({ draft: String(event.detail.value || "") });
  },
  async chooseImage() {
    if (this.data.pendingAttachmentIds.length >= 9) return;
    try {
      const selected = await wx.chooseMedia({
        count: 9 - this.data.pendingAttachmentIds.length,
        mediaType: ["image"],
        sourceType: ["album", "camera"] as never,
      });
      this.setData({ uploading: true });
      for (const file of selected.tempFiles) {
        const uploaded = await uploadMerchantCustomerServiceAttachment(
          this.ticketId,
          file.tempFilePath,
        );
        this.setData({
          pendingAttachmentIds: [
            ...this.data.pendingAttachmentIds,
            uploaded.id,
          ],
          pendingAttachmentNames: [
            ...this.data.pendingAttachmentNames,
            uploaded.originalFilename,
          ],
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("cancel"))
        wx.showToast({ title: message || "图片上传失败", icon: "none" });
    } finally {
      this.setData({ uploading: false });
    }
  },
  async send() {
    const content = this.data.draft.trim();
    if (!content || this.data.sending) return;
    this.setData({ sending: true });
    try {
      await replyMerchantCustomerServiceTicket(
        this.ticketId,
        content,
        this.data.pendingAttachmentIds,
      );
      this.setData({
        draft: "",
        pendingAttachmentIds: [],
        pendingAttachmentNames: [],
      });
      await this.load();
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "消息发送失败",
        icon: "none",
      });
    } finally {
      this.setData({ sending: false });
    }
  },
  preview(event: WechatMiniprogram.TouchEvent) {
    const current = String(event.currentTarget.dataset.path || "");
    const urls = this.data.messages
      .flatMap((item) => item.attachments)
      .map((item) => item.localPath)
      .filter((item): item is string => Boolean(item));
    if (current) wx.previewImage({ current, urls });
  },
  async loadEarlier() {
    if (!this.data.hasMore || !this.data.oldestMessageId) return;
    const result = await listMerchantCustomerServiceMessages(
      this.ticketId,
      this.data.oldestMessageId,
    );
    if (!result.data) return;
    const incoming = this.mapMessages(result.data.items);
    const messages = [...incoming, ...this.data.messages];
    this.setData({
      messages,
      hasMore: result.data.hasMore,
      oldestMessageId: result.data.oldestMessageId || "",
    });
    void this.hydrate(messages);
  },
  retry() {
    void this.load();
  },
  ticketId: "",
});
