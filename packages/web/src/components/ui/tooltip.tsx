import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  className?: string
}

function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span className="relative inline-flex group/tooltip">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5",
          "-translate-x-1/2 w-max max-w-[200px]",
          "rounded-md bg-ink px-2.5 py-1.5 text-[11px] leading-snug text-white shadow-md",
          "opacity-0 transition-opacity group-hover/tooltip:opacity-100",
          "whitespace-pre-line",
          className
        )}
      >
        {content}
      </span>
    </span>
  )
}

export { Tooltip }
