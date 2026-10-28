import { cn } from "@/lib/utils";
export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn("input", className)} {...props} />;
}
export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return <textarea className={cn("input textarea", className)} {...props} />;
}
export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("card", className)} {...props} />;
}
export function Badge({
  children,
  className,
  ...props
}: React.ComponentProps<"span">) {
  const s = String(children);
  const tone =
    /Active|Live|Connected|Done|Resolved|Approved|Verified|Closed/.test(s)
      ? "green"
      : /Urgent|Rejected|Aborted/.test(s)
        ? "red"
        : /High|Hold|Waiting|Review|Pending/.test(s)
          ? "amber"
          : /New|Open|Progress|Onboarding|Negotiation/.test(s)
            ? "purple"
            : "gray";
  return (
    <span className={cn("badge", tone, className)} {...props}>
      <i />
      {children}
    </span>
  );
}
export function Select({
  options,
  label,
  ...props
}: React.ComponentProps<"select"> & { options: string[]; label?: string }) {
  return (
    <select className="input select" aria-label={label} {...props}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
