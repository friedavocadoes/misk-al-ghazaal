import Link from "next/link";
import Form from "next/form";
import { redirect } from "next/navigation";
import { Mail, Search, ArrowUpRight, Inbox } from "lucide-react";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/service";
import { AdminNav } from "@/components/admin/admin-nav";
import { AttentionReadState } from "@/components/admin/notifications";
import { adminDate } from "@/lib/admin-customer";
import { INBOX_TOPICS, type InboxMessageRow } from "@/lib/contact-inbox";
export default async function ContactInbox({
  searchParams,
}: {
  searchParams: Promise<{
    topic?: string;
    state?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const staff = await getAdminSession();
  if (!staff) redirect("/admin/login");
  const params = await searchParams;
  const topic =
      params.topic && params.topic in INBOX_TOPICS ? params.topic : "",
    state = ["all", "read", "unread"].includes(params.state ?? "")
      ? params.state!
      : "all",
    q = (params.q ?? "").trim().slice(0, 150),
    page = Math.max(1, Math.min(100000, parseInt(params.page ?? "1", 10) || 1));
  const { data, error } = await createAdminClient().rpc("admin_contact_inbox", {
    p_actor: staff.userId,
    p_topic: topic,
    p_state: state,
    p_query: q,
    p_page: page,
  });
  const rows = (data?.rows ?? []) as InboxMessageRow[];
  const href = (patch: Record<string, string>) =>
    `/admin/inbox?${new URLSearchParams({ topic, state, q, ...patch })}`;
  return (
    <>
      <AdminNav email={staff.email} role={staff.role} />
      <main className="admin-workspace admin-inbox-workspace">
        <div className="admin-workspace-header">
          <div>
            <p className="eyebrow">Client care</p>
            <h1>The correspondence desk</h1>
            <p>Enquiries, feedback and the conversations that matter.</p>
          </div>
          {!error && (
            <span className="admin-inbox-unread">
              <Mail size={15} />
              {data.unread} unread for you
            </span>
          )}
        </div>
        {error ? (
          <div role="alert" className="admin-panel text-sm">
            Inbox unavailable. Apply migration_admin_attention.sql after the
            contact inbox migration, then retry.
          </div>
        ) : (
          <>
            <nav className="admin-inbox-topics" aria-label="Message types">
              <Link
                href={href({ topic: "", page: "1" })}
                aria-current={!topic ? "page" : undefined}
              >
                All messages<span>{data.all_count}</span>
              </Link>
              {Object.entries(INBOX_TOPICS).map(([key, value]) => (
                <Link
                  key={key}
                  href={href({ topic: key, page: "1" })}
                  className={`is-${key}`}
                  aria-current={topic === key ? "page" : undefined}
                >
                  <i />
                  {value.label}
                  <span>{data.topic_counts[key]}</span>
                </Link>
              ))}
            </nav>
            <div className="admin-inbox-toolbar">
              <Form action="/admin/inbox" className="admin-inbox-search">
                <Search size={15} />
                <input type="hidden" name="topic" value={topic} />
                <input type="hidden" name="state" value={state} />
                <input
                  name="q"
                  aria-label="Search messages"
                  defaultValue={q}
                  placeholder="Search a name, reference or conversation…"
                />
                <button type="submit">Search</button>
              </Form>
              <div
                className="admin-inbox-state"
                role="group"
                aria-label="Read status"
              >
                {["all", "unread", "read"].map((value) => (
                  <Link
                    key={value}
                    href={href({ state: value, page: "1" })}
                    aria-current={state === value ? "page" : undefined}
                  >
                    {value === "all"
                      ? "All"
                      : value === "unread"
                        ? "Unread"
                        : "Read"}
                  </Link>
                ))}
              </div>
            </div>
            <div className="admin-message-stack">
              {rows.map((message) => (
                <article
                  key={message.id}
                  className={`admin-message-row ${message.is_read ? "is-read" : "is-unread"}`}
                >
                  <Link
                    href={`/admin/inbox/${message.id}`}
                    className="admin-message-main"
                  >
                    <span className="admin-message-avatar">
                      {(message.name || message.email)
                        .slice(0, 1)
                        .toUpperCase()}
                      {!message.is_read && <i />}
                    </span>
                    <span className="admin-message-content">
                      <span className="admin-message-topline">
                        <strong>{message.name || message.email}</strong>
                        <span
                          className={`admin-message-topic is-${message.topic}`}
                        >
                          {INBOX_TOPICS[message.topic].label}
                        </span>
                        <time dateTime={message.created_at}>
                          {adminDate(message.created_at)}
                        </time>
                      </span>
                      <span className="admin-message-preview">
                        {message.preview || "Open this message"}
                      </span>
                      <span className="admin-message-reference">
                        {message.reference} · {message.email}
                      </span>
                    </span>
                    <ArrowUpRight className="admin-message-arrow" size={16} />
                  </Link>
                  <div className="admin-message-action">
                    <AttentionReadState
                      key={`${message.id}:${message.is_read}`}
                      kind="contact"
                      id={message.id}
                      initialRead={message.is_read}
                      autoRead={false}
                      refreshPage
                    />
                  </div>
                </article>
              ))}
              {!rows.length && (
                <div className="admin-inbox-empty">
                  <Inbox size={30} strokeWidth={1} />
                  <h2>No messages here.</h2>
                  <p>
                    {q || topic || state !== "all"
                      ? "Try another filter or search."
                      : "Customer conversations will appear here."}
                  </p>
                  <Link href="/admin/inbox" className="admin-action">
                    Reset filters
                  </Link>
                </div>
              )}
            </div>
            <div className="mt-6 flex items-center justify-between text-xs text-fog">
              <p>
                {data.total} matching messages · Page {page}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={href({ page: String(page - 1) })}
                    className="admin-action"
                  >
                    Previous
                  </Link>
                )}
                {page * 30 < Number(data.total) && (
                  <Link
                    href={href({ page: String(page + 1) })}
                    className="admin-action"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
