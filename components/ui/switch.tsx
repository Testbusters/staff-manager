"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full",
        "border border-border/60 transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // checked = dark mode active → use a recognisable blue
        // unchecked = light mode → muted track with visible border
        "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-500",
        "data-[state=unchecked]:bg-muted-foreground/20 data-[state=unchecked]:border-border",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          // Always white thumb — visible on both dark (blue) and light (gray) tracks
          "pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow ring-0 transition-transform duration-200",
          "data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
