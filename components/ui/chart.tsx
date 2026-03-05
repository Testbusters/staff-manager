"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"
import { cn } from "@/lib/utils"

// Chart config type for color/label mapping
export type ChartConfig = Record<
  string,
  { label?: React.ReactNode; color?: string }
>

interface ChartContextProps {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) throw new Error("useChart must be used within a ChartContainer")
  return context
}

// ------------------------------------------------------------------
// ChartContainer — wraps recharts with a CSS variable color system
// ------------------------------------------------------------------
function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
          "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
          "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border",
          "[&_.recharts-radial-bar-background-sector]:fill-muted",
          "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted",
          "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border",
          "flex aspect-video justify-center text-xs",
          className
        )}
        style={
          Object.entries(config).reduce(
            (acc, [key, value]) => {
              if (value.color) acc[`--color-${key}`] = value.color
              return acc
            },
            {} as Record<string, string>
          )
        }
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

// ------------------------------------------------------------------
// ChartTooltip
// ------------------------------------------------------------------
const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  formatter,
  hideLabel = false,
  hideIndicator = false,
  indicator = "dot",
  nameKey,
  labelKey,
}: React.ComponentProps<"div"> & {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: string
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: "line" | "dot" | "dashed"
  nameKey?: string
  labelKey?: string
  formatter?: (value: number, name: string) => React.ReactNode
}) {
  const { config } = useChart()

  if (!active || !payload?.length) return null

  return (
    <div
      className={cn(
        "border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      {!hideLabel && label && (
        <p className="font-medium">{labelKey ? (payload[0]?.payload?.[labelKey] ?? label) : label}</p>
      )}
      <div className="grid gap-1.5">
        {payload.map((item) => {
          const key = nameKey ?? item.dataKey?.toString() ?? item.name ?? "value"
          const itemConfig = config[key] ?? {}
          const color = item.color ?? itemConfig.color
          const displayName = itemConfig.label ?? item.name ?? key
          const displayValue = formatter
            ? formatter(item.value as number, key)
            : item.value

          return (
            <div key={item.dataKey?.toString()} className="flex items-center gap-2">
              {!hideIndicator && (
                <span
                  className={cn("shrink-0 rounded-[2px]", {
                    "h-2.5 w-2.5": indicator === "dot",
                    "w-1 h-full": indicator === "line",
                    "w-0 border-[1.5px] border-dashed bg-transparent h-full": indicator === "dashed",
                  })}
                  style={{ background: color, borderColor: color }}
                />
              )}
              <span className="text-muted-foreground">{displayName}</span>
              <span className="ml-auto font-mono font-medium tabular-nums">{displayValue}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// ChartLegend
// ------------------------------------------------------------------
const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({
  className,
  payload,
  nameKey,
}: React.ComponentProps<"div"> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  nameKey?: string
}) {
  const { config } = useChart()

  if (!payload?.length) return null

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-4 text-xs", className)}>
      {payload.map((item) => {
        const key = nameKey ?? item.dataKey?.toString() ?? item.value ?? "value"
        const itemConfig = config[key] ?? {}
        const displayName = itemConfig.label ?? item.value

        return (
          <div key={item.value} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ background: item.color ?? itemConfig.color }}
            />
            {displayName}
          </div>
        )
      })}
    </div>
  )
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  useChart,
}
