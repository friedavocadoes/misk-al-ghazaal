import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Mail, ArrowLeft, ArrowUpRight } from "lucide-react";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/service";
import { uuid } from "@/lib/analytics/shared";
import { adminDate } from "@/lib/admin-customer";
import {
  INBOX_TOPICS,
  INBOX_FIELD_LABELS,
  type InboxTopic,
} from "@/lib/contact-inbox";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminPanel } from "@/components/admin/workspace";
import { AttentionReadState } from "@/components/admin/notifications";
export default async function ContactMessage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await getAdminSession();
  if (!staff) redirect("/admin/login");
  const { id } = await params;
  if (!uuid(id)) notFound();
  const db = createAdminClient();
  const [{ data: message, error }, { data: receipt }] = await Promise.all([
    db
      .from("contact_messages")
      .select("id,reference,topic,email,data,created_at")
      .eq("id", id)
      .maybeSingle(),
    db
      .from("admin_attention_reads")
      .select("read_at")
      .eq("staff_id", staff.userId)
      .eq("kind", "contact")
      .eq("entity_id", id)
      .maybeSingle(),
  ]);
  if (error) throw new Error("This message could not load.");
  if (!message) notFound();
  const topic = INBOX_TOPICS[message.topic as InboxTopic];
  return (
    <>
      <AdminNav email={staff.email} role={staff.role} />
      <main className="admin-workspace">
        <Link
          href="/admin/inbox"
          className="inline-flex items-center gap-2 text-xs text-fog"
        >
          <ArrowLeft size={14} />
          All conversations
        </Link>
        <div className="admin-workspace-header mt-6">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className={`admin-message-topic is-${message.topic}`}>
                {topic.label}
              </span>
              <span className="text-xs text-fog">{message.reference}</span>
            </div>
            <h1>
              {message.data.title ||
                `A message from ${message.data.name || "a customer"}`}
            </h1>
            <p>{adminDate(message.created_at)} · Dubai time</p>
          </div>
          <AttentionReadState kind="contact" id={id} initialRead={!!receipt} />
        </div>
        <div className="admin-workspace-grid">
          <AdminPanel title="The message">
            <p className="whitespace-pre-wrap text-sm leading-8">
              {message.data.message}
            </p>
            <a
              href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.reference} · Misk Al Ghazaal`)}`}
              className="admin-action mt-8"
            >
              <Mail size={14} />
              Reply by email
              <ArrowUpRight size={13} />
            </a>
          </AdminPanel>
          <aside className="admin-stack">
            <AdminPanel title="From">
              <dl className="admin-facts">
                <div>
                  <dt>Customer</dt>
                  <dd>{message.data.name}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${message.email}`}>{message.email}</a>
                  </dd>
                </div>
                {message.data.phone && (
                  <div>
                    <dt>Phone</dt>
                    <dd>
                      <a href={`tel:${message.data.phone}`}>
                        {message.data.phone}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </AdminPanel>
            <AdminPanel title="Enquiry details">
              <dl className="admin-facts">
                {Object.entries(INBOX_FIELD_LABELS)
                  .filter(
                    ([key]) =>
                      !["phone", "title"].includes(key) &&
                      message.data[key] !== null &&
                      message.data[key] !== undefined &&
                      message.data[key] !== "",
                  )
                  .map(([key, label]) => (
                    <div key={key}>
                      <dt>{label}</dt>
                      <dd>
                        {key === "rating"
                          ? `${message.data[key]} / 5`
                          : String(message.data[key])}
                      </dd>
                    </div>
                  ))}
              </dl>
              {message.topic === "review" && (
                <p className="mt-5 text-xs leading-6 text-fog">
                  This is contact feedback, separate from moderated product
                  reviews.
                </p>
              )}
            </AdminPanel>
          </aside>
        </div>
      </main>
    </>
  );
}
