export const INBOX_TOPICS = {
  meeting: { label: "Private label", className: "meeting" },
  review: { label: "Feedback", className: "review" },
  complaint: { label: "Client care", className: "complaint" },
} as const;
export type InboxTopic = keyof typeof INBOX_TOPICS;
export interface InboxMessageRow {
  id: string;
  reference: string;
  topic: InboxTopic;
  email: string;
  name: string;
  preview: string;
  created_at: string;
  is_read: boolean;
}
export const INBOX_FIELD_LABELS: Record<string, string> = {
  phone: "Phone",
  company: "Company / brand",
  category: "Product category",
  quantity: "Estimated quantity",
  date: "Preferred date",
  product: "Product",
  rating: "Rating",
  title: "Subject",
  orderNo: "Order number",
  complaintType: "Issue type",
};
