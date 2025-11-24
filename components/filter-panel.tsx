"use client"

import { memo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BarChart3, LineChartIcon, RotateCcw } from "lucide-react"

interface FilterPanelProps {
  years: number[]
  selectedYear: number | null
  onYearChange: (year: number | null) => void
  periodOptions: { value: string; label: string }[]
  selectedStartPeriod: string | null
  selectedEndPeriod: string | null
  onStartPeriodChange: (value: string | null) => void
  onEndPeriodChange: (value: string | null) => void
  selectedLevel: string | null
  levelOptions: string[]
  onLevelChange: (level: string | null) => void
  chartType: "line" | "bar"
  onChartTypeChange: (type: "line" | "bar") => void
  recordCount: number
  onReset: () => void
}

const FilterPanel = memo(function FilterPanel({
  years,
  selectedYear,
  onYearChange,
  periodOptions,
  selectedStartPeriod,
  selectedEndPeriod,
  onStartPeriodChange,
  onEndPeriodChange,
  selectedLevel,
  onLevelChange,
  chartType,
  onChartTypeChange,
  recordCount,
  onReset,
  levelOptions,
}: FilterPanelProps) {
  const options = levelOptions.length > 0 ? levelOptions : ["SMK", "Universitas"]

  return (
    <Card className="p-6 no-print">
      <div className="flex flex-col md:flex-row md:flex-wrap gap-6 items-start md:items-end">
        {/* Start Month Filter */}
        <div className="flex-1 min-w-[12rem]">
          <label className="block text-sm font-medium text-foreground mb-2">Bulan Awal</label>
          <select
            value={selectedStartPeriod ?? ""}
            onChange={(e) => onStartPeriodChange(e.target.value || null)}
            disabled={periodOptions.length === 0}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
          >
            <option value="" disabled>
              Pilih Bulan
            </option>
            {periodOptions.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>

        {/* End Month Filter */}
        <div className="flex-1 min-w-[12rem]">
          <label className="block text-sm font-medium text-foreground mb-2">Bulan Akhir</label>
          <select
            value={selectedEndPeriod ?? ""}
            onChange={(e) => onEndPeriodChange(e.target.value || null)}
            disabled={periodOptions.length === 0}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
          >
            <option value="" disabled>
              Pilih Bulan
            </option>
            {periodOptions.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>

        {/* Year Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-foreground mb-2">Year</label>
          <select
            value={selectedYear || ""}
            onChange={(e) => onYearChange(e.target.value ? Number.parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
          >
            <option value="">All Years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-foreground mb-2">Tingkat Pendidikan</label>
          <select
            value={selectedLevel || ""}
            onChange={(e) => onLevelChange(e.target.value || null)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
          >
            <option value="">All Levels</option>
            {options.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Chart Type Toggle */}
        <div className="flex gap-2">
          <Button
            variant={chartType === "line" ? "default" : "outline"}
            size="sm"
            onClick={() => onChartTypeChange("line")}
            className="gap-2"
          >
            <LineChartIcon className="w-4 h-4" />
            Line
          </Button>
          <Button
            variant={chartType === "bar" ? "default" : "outline"}
            size="sm"
            onClick={() => onChartTypeChange("bar")}
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Bar
          </Button>
        </div>

        {/* Reset Button */}
        <Button variant="outline" size="sm" onClick={onReset} className="gap-2 bg-transparent">
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </div>

      {/* Info */}
      <div className="mt-4 text-sm text-muted-foreground">Total records: {recordCount}</div>
    </Card>
  )
})

export default FilterPanel
