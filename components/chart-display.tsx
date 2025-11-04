"use client"

import { memo, useCallback, useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts"
import type { MonthlyData } from "@/lib/types"
import { exportElementToPdf } from "@/lib/export-to-pdf"

interface ChartDisplayProps {
  data: MonthlyData[]
  chartType: "line" | "bar"
  title: string
}

const CHART_COLOR = "hsl(217 91% 60%)"
const monthFormatter = new Intl.DateTimeFormat("id-ID", { month: "long" })
const DEFAULT_LABEL_COLOR = "#64748b"

function formatMonthLabel(month: string): string {
  if (!month) return month
  const matches = month.match(/^(\d{4})-(\d{2})/)
  if (!matches) return month

  const [, year, monthPart] = matches
  const parsed = new Date(Number(year), Number(monthPart) - 1, 1)
  if (Number.isNaN(parsed.getTime())) return month

  const monthName = monthFormatter.format(parsed)
  return `${parsed.getFullYear()} ${monthName}`
}

const ChartDisplay = memo(function ChartDisplay({ data, chartType, title }: ChartDisplayProps) {
  const [labelColor, setLabelColor] = useState(DEFAULT_LABEL_COLOR)

  useEffect(() => {
    const root = document.documentElement
    const cssValue = getComputedStyle(root).getPropertyValue("--muted-foreground").trim()
    if (cssValue) {
      setLabelColor(cssValue)
    }
  }, [])

  const chartData = data.map((item) => ({
    monthKey: item.month,
    monthLabel: formatMonthLabel(item.month),
    active: item.activeCount,
  }))
  const exportRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const renderValueLabel = useCallback(
    (props: { x?: number; y?: number; value?: number | string }) => {
      const { x, y, value } = props
      if (x == null || y == null || value == null) return null

      const text = typeof value === "number" ? value.toString() : value

      return (
        <text
          x={x}
          y={y - 10}
          fill={labelColor}
          fontSize={12}
          textAnchor="middle"
          fontWeight={500}
        >
          {text}
        </text>
      )
    },
    [labelColor],
  )

  const handleExport = useCallback(async () => {
    if (!exportRef.current) return
    const restoreFns: Array<() => void> = []

    const hideInteractiveStates = () => {
      const container = exportRef.current
      if (!container) return

      container.querySelectorAll<HTMLElement>(".recharts-wrapper").forEach((chart) => {
        chart.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }))
      })

      container.querySelectorAll<HTMLElement>(".recharts-tooltip-wrapper").forEach((el) => {
        const previous = el.style.visibility
        restoreFns.push(() => {
          el.style.visibility = previous
        })
        el.style.visibility = "hidden"
      })

      container.querySelectorAll<HTMLElement>(".recharts-tooltip-cursor").forEach((el) => {
        const previous = el.style.display
        restoreFns.push(() => {
          el.style.display = previous
        })
        el.style.display = "none"
      })
    }

    hideInteractiveStates()

    setIsExporting(true)
    try {
      await exportElementToPdf(exportRef.current, title)
    } catch (error) {
      console.error("Failed to export chart", error)
    } finally {
      restoreFns.forEach((restore) => restore())
      setIsExporting(false)
    }
  }, [title])

  if (chartData.length === 0) {
    return null
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleExport}
          disabled={isExporting}
          aria-label="Cetak diagram ke PDF"
        >
          <FileDown className="h-4 w-4" />
          {isExporting ? "Menyiapkan..." : "Cetak PDF"}
        </Button>
      </div>
      <div ref={exportRef} className="space-y-6">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "line" ? (
              <LineChart data={chartData} margin={{ top: 32, right: 24, left: 16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="monthKey"
                  stroke="var(--muted-foreground)"
                  style={{ fontSize: "12px" }}
                  tickFormatter={formatMonthLabel}
                />
                <YAxis stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                  labelFormatter={(label) => formatMonthLabel(label as string)}
                  formatter={(value) => [`${value} interns`, "Active"]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="active"
                  stroke={CHART_COLOR}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLOR, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Active Interns"
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="active"
                    position="top"
                    content={renderValueLabel}
                    clip={false}
                    isAnimationActive={false}
                  />
                </Line>
              </LineChart>
            ) : (
              <BarChart
                data={chartData}
                margin={{ top: 32, right: 24, left: 16, bottom: 0 }}
                barCategoryGap={24}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="monthKey"
                  stroke="var(--muted-foreground)"
                  style={{ fontSize: "12px" }}
                  tickFormatter={formatMonthLabel}
                />
                <YAxis stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                  labelFormatter={(label) => formatMonthLabel(label as string)}
                  formatter={(value) => [`${value} interns`, "Active"]}
                />
                <Legend />
                <Bar
                  dataKey="active"
                  fill={CHART_COLOR}
                  name="Active Interns"
                  radius={[8, 8, 0, 0]}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="active"
                    position="top"
                    content={renderValueLabel}
                    clip={false}
                    isAnimationActive={false}
                  />
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bulan</TableHead>
                <TableHead className="text-right">Jumlah Aktif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chartData.map((item) => (
                <TableRow key={item.monthKey}>
                  <TableCell>{item.monthLabel}</TableCell>
                  <TableCell className="text-right font-medium">{item.active}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  )
})

export default ChartDisplay
