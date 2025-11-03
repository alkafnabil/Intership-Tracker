"use client"

import { memo, useCallback, useRef, useState } from "react"
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

const ChartDisplay = memo(function ChartDisplay({ data, chartType, title }: ChartDisplayProps) {
  const chartData = data.map((item) => ({
    month: item.month,
    active: item.activeCount,
  }))
  const exportRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = useCallback(async () => {
    if (!exportRef.current) return
    setIsExporting(true)
    try {
      await exportElementToPdf(exportRef.current, title)
    } catch (error) {
      console.error("Failed to export chart", error)
    } finally {
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
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
                <YAxis stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
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
                >
                  <LabelList
                    dataKey="active"
                    position="top"
                    formatter={(value: number) => value.toString()}
                    fill="var(--muted-foreground)"
                    fontSize={12}
                  />
                </Line>
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
                <YAxis stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                  formatter={(value) => [`${value} interns`, "Active"]}
                />
                <Legend />
                <Bar dataKey="active" fill={CHART_COLOR} name="Active Interns" radius={[8, 8, 0, 0]}>
                  <LabelList
                    dataKey="active"
                    position="top"
                    formatter={(value: number) => value.toString()}
                    fill="var(--muted-foreground)"
                    fontSize={12}
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
                <TableRow key={item.month}>
                  <TableCell>{item.month}</TableCell>
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
