import type { ReactNode } from "react";
export function AdminPanel({
  title,
  detail,
  children,
  className = "",
}: {
  title: string;
  detail?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`admin-panel ${className}`}>
      <div className="admin-panel-heading">
        <h2>{title}</h2>
        {detail && <p>{detail}</p>}
      </div>
      {children}
    </section>
  );
}
export function AdminMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
}) {
  return (
    <div className="admin-metric">
      <p>{label}</p>
      <strong>{value}</strong>
      {detail && <span>{detail}</span>}
    </div>
  );
}
