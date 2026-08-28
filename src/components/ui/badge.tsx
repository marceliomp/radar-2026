import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "outline" | "lula" | "flavio" | "muted" | "online";
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        variant === "default" &&
          "bg-primary text-primary-fg ring-1 ring-primary/40",
        variant === "outline" &&
          "border border-border bg-surface-2 text-fg/90",
        variant === "lula" && "bg-lula/20 text-lula ring-1 ring-lula/35",
        variant === "flavio" &&
          "bg-flavio/20 text-flavio ring-1 ring-flavio/35",
        variant === "muted" && "bg-surface-2 text-fg/85 ring-1 ring-border",
        variant === "online" &&
          "bg-renan/20 text-renan ring-1 ring-renan/35",
        className,
      )}
      {...props}
    />
  );
}
