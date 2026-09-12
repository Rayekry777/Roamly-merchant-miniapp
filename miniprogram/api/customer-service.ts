import type { PageResult } from "../types/http";
import { downloadPrivateFile, request, uploadFile } from "../utils/request";

export type CustomerServiceAttachment = {
  id: string;
  ticketId: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
};
export type CustomerServiceMessage = {
  id: string;
  ticketId: string;
  senderType: string;
  messageType: string;
  content?: string;
  createTime?: string;
  attachments: CustomerServiceAttachment[];
};
export type CustomerServiceMessagePage = {
  items: CustomerServiceMessage[];
  oldestMessageId?: string;
  newestMessageId?: string;
  hasMore: boolean;
};
export type CustomerServiceTicket = {
  id: string;
  ticketNo: string;
  type: string;
  status: string;
  priority: string;
  subject: string;
  description?: string;
  orderId?: string;
  voucherId?: string;
  refundId?: string;
  redemptionId?: string;
  unreadCount: number;
  lastMessageTime?: string;
  createTime?: string;
};
export type CustomerServiceInput = {
  type: "REFUND" | "REDEMPTION" | "ORDER" | "SETTLEMENT" | "GENERAL";
  subject: string;
  description?: string;
  orderId?: string;
  voucherId?: string;
  refundId?: string;
  redemptionId?: string;
};

export const listMerchantCustomerServiceTickets = (page = 1, size = 50) =>
  request<PageResult<CustomerServiceTicket>>(
    "/v1/merchant/customer-service/tickets?page=" + page + "&size=" + size,
    { showError: false },
  );
export const createMerchantCustomerServiceTicket = (
  data: CustomerServiceInput,
) =>
  request<CustomerServiceTicket>("/v1/merchant/customer-service/tickets", {
    method: "POST",
    data,
    showError: false,
  });
export const getMerchantCustomerServiceTicket = (id: string) =>
  request<CustomerServiceTicket>(
    "/v1/merchant/customer-service/tickets/" + id,
    {
      showError: false,
    },
  );
export const listMerchantCustomerServiceMessages = (
  id: string,
  beforeMessageId?: string,
) =>
  request<CustomerServiceMessagePage>(
    "/v1/merchant/customer-service/tickets/" +
      id +
      "/messages?limit=30" +
      (beforeMessageId
        ? "&before_message_id=" + encodeURIComponent(beforeMessageId)
        : ""),
    { showError: false },
  );
export const replyMerchantCustomerServiceTicket = (
  id: string,
  content: string,
  attachmentIds: string[] = [],
) =>
  request<CustomerServiceTicket>(
    "/v1/merchant/customer-service/tickets/" + id + "/messages",
    {
      method: "POST",
      data: {
        content,
        messageType: attachmentIds.length ? "IMAGE" : "TEXT",
        attachmentIds,
      },
      showError: false,
    },
  );
export const uploadMerchantCustomerServiceAttachment = (
  ticketId: string,
  filePath: string,
) =>
  uploadFile<CustomerServiceAttachment>(
    "/v1/merchant/customer-service/tickets/" + ticketId + "/attachments",
    filePath,
    {},
  );
export const downloadMerchantCustomerServiceAttachment = (
  ticketId: string,
  attachmentId: string,
) =>
  downloadPrivateFile(
    "/v1/merchant/customer-service/tickets/" +
      ticketId +
      "/attachments/" +
      attachmentId +
      "/content",
  );
