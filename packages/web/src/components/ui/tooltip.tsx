import {
  Tooltip as TooltipPrimitive,
} from "@base-ui/react/tooltip"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  className?: string
}

function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger render={<span />} className="inline-flex">
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner side="top" alignment="center" sideOffset={6}>
            <TooltipPrimitive.Popup
              className={cn(
                "z-50 rounded-md bg-ink px-2.5 py-1.5 text-[11px] leading-snug text-white shadow-md",
                "origin-[var(--transform-origin)] transition-[transform,scale,opacity]",
                "data-[starting-style]:scale-90 data-[starting-style]:opacity-0",
                "data-[ending-style]:scale-90 data-[ending-style]:opacity-0",
                className
              )}
            >
              {content}
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

export { Tooltip }
