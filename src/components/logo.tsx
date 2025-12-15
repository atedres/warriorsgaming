import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 140 20"
      className={cn("h-8 w-auto", className)}
    >
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: "hsl(var(--primary))", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "hsl(var(--accent))", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <path
        fill="url(#grad1)"
        d="M0 0 L10 10 L0 20 Z M12 5 L17 0 L22 5 L17 10 Z M12 15 L17 10 L22 15 L17 20 Z"
      />
      <text
        x="28"
        y="15"
        fontFamily="var(--font-headline)"
        fontSize="14"
        fontWeight="bold"
        fill="hsl(var(--foreground))"
      >
        Warriors Gaming
      </text>
    </svg>
  );
}
