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
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // checked (dark mode on) → blue track
        "data-[state=checked]:bg-brand",
        // unchecked (light mode) → gray track
        "data-[state=unchecked]:bg-input",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        suppressHydrationWarning
        className={cn(
          "pointer-events-none block h-3.5 w-3.5 rounded-full shadow-md ring-0 transition-all duration-200",
          // unchecked (light mode): blue thumb on gray track → high contrast
          // checked (dark mode): white thumb on blue track → high contrast
          "data-[state=unchecked]:bg-brand",
          "data-[state=checked]:bg-white",
          "data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
