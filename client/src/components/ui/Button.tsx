import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-ai/60 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-good text-[#04110d] hover:bg-good/90",
        variant === "ghost" && "text-secondary hover:bg-elevated hover:text-primary",
        variant === "outline" && "border border-line bg-transparent text-primary hover:border-lineAccent hover:bg-elevated",
        className
      )}
      {...props}
    />
  );
}
