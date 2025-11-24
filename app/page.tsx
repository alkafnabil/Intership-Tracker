"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import FileUploadArea from "@/components/file-upload-area"
import FilterPanel from "@/components/filter-panel"
import ChartDisplay from "@/components/chart-display"
import InstitutionDistributionTable from "@/components/institution-distribution-table"
import SummaryTable from "@/components/summary-table"
import SampleRowsTable from "@/components/sample-rows-table"
import { parseExcelFile } from "@/lib/data-processor"
import type { InternshipRecord } from "@/lib/types"
import { Printer } from "lucide-react"

const LEVEL_ORDER = ["SMK", "Universitas"] as const
const SMK_KEYWORDS = ["smk", "stm", "smkn", "smks", "sekolah menengah kejuruan", "vocational"]
const UNIVERSITY_KEYWORDS = [
  "universitas",
  "kampus",
  "kuliah",
  "perguruan tinggi",
  "politeknik",
  "akademi",
  "institut",
  "school of",
  "college",
  "d1",
  "d2",
  "d3",
  "d4",
  "s1",
  "s2",
  "s3",
  "sarjana",
  "magister",
  "bachelor",
  "master",
  "mahasiswa",
]

interface RecordWithLevel extends InternshipRecord {
  computedLevel: string
  normalizedLevel: string
  startDate: Date | null
  endDate: Date | null
}

function normalizeLevelValue(value?: string | null): string {
  if (!value) return ""
  return value.toString().trim().toUpperCase()
}

function categorizeByKeywords(value?: string | null): "SMK" | "Universitas" | "" {
  if (!value) return ""
  const normalized = value.toString().trim().toLowerCase()

  if (SMK_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "SMK"
  }

  if (UNIVERSITY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "Universitas"
  }

  return ""
}

function categorizeJenjang(value?: string | null): string {
  if (!value) return ""

  const keywordMatch = categorizeByKeywords(value)
  if (keywordMatch) return keywordMatch

  return value.toString().trim()
}

function determineLevel(record: InternshipRecord): string {
  const fromJenjang = categorizeJenjang(record.jenjang)
  if (fromJenjang) return fromJenjang

  return categorizeByKeywords(record.instansi) || ""
}

function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null
  const parts = value.split("-").map((part) => Number.parseInt(part, 10))
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null
  const [year, month, day] = parts
  return new Date(Date.UTC(year, month - 1, day))
}

function formatYearMonthUTC(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

function getMonthBounds(monthKey: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = monthKey.split("-")
  const year = Number.parseInt(yearStr, 10)
  const month = Number.parseInt(monthStr, 10)
  const start = new Date(Date.UTC(year, month - 1, 1))
  const nextMonthStart = new Date(Date.UTC(year, month, 1))
  const end = new Date(nextMonthStart.getTime() - 1)
  return { start, end }
}

function generateMonthKeysInRange(start: Date, end: Date): string[] {
  const months: string[] = []
  if (!start || !end) return months

  let current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  const lastMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))

  while (current <= lastMonth) {
    months.push(formatYearMonthUTC(current))
    current = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1))
  }

  return months
}

function isActiveInMonth(record: RecordWithLevel, monthStart: Date, monthEnd: Date): boolean {
  if (!record.startDate) return false
  const effectiveEnd = record.endDate ?? monthEnd
  return record.startDate <= monthEnd && effectiveEnd >= monthStart
}

const monthLabelFormatter = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" })
const dateDisplayFormatter = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" })
const printDateFormatter = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" })
const monthOnlyFormatter = new Intl.DateTimeFormat("id-ID", { month: "long" })

function formatMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split("-")
  const year = Number.parseInt(yearStr, 10)
  const month = Number.parseInt(monthStr, 10)
  if (Number.isNaN(year) || Number.isNaN(month)) return monthKey
  const date = new Date(Date.UTC(year, month - 1, 1))
  return monthLabelFormatter.format(date)
}

function formatDisplayDate(date?: Date | null, fallback?: string): string {
  if (date && !Number.isNaN(date.getTime())) {
    return dateDisplayFormatter.format(date)
  }
  if (fallback && fallback.trim() !== "") {
    return fallback
  }
  return "-"
}

function createMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

function compareMonthKeys(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

function formatRangeToID(start?: Date | null, end?: Date | null): string {
  if (!start || !end) {
    return "Rekap Periode Bulan"
  }

  const [earliest, latest] = start <= end ? [start, end] : [end, start]
  const startYear = earliest.getUTCFullYear()
  const endYear = latest.getUTCFullYear()
  const startHalfIndex = Math.floor(earliest.getUTCMonth() / 6)
  const endHalfIndex = Math.floor(latest.getUTCMonth() / 6)
  const startMonthKey = formatYearMonthUTC(earliest)
  const endMonthKey = formatYearMonthUTC(latest)
  const startLabel = formatMonthKey(startMonthKey)
  const endLabel = formatMonthKey(endMonthKey)
  const startMonthName = monthOnlyFormatter.format(new Date(Date.UTC(startYear, earliest.getUTCMonth(), 1)))
  const endMonthName = monthOnlyFormatter.format(new Date(Date.UTC(endYear, latest.getUTCMonth(), 1)))

  if (startYear === endYear && startHalfIndex === endHalfIndex) {
    const halfLabels =
      startHalfIndex === 0
        ? { start: "Januari", end: "Juni" }
        : { start: "Juli", end: "Desember" }
    return `Rekap Periode Bulan ${halfLabels.start} - ${halfLabels.end} ${startYear}`
  }

  if (startYear === endYear) {
    if (startMonthKey === endMonthKey) {
      return `Rekap Periode Bulan ${startLabel}`
    }
    return `Rekap Periode Bulan ${startMonthName} - ${endMonthName} ${startYear}`
  }

  return `Rekap Periode Bulan ${startLabel} - ${endLabel}`
}

function sortLevels(levels: string[]): string[] {
  return [...levels].sort((a, b) => {
    const indexA = LEVEL_ORDER.indexOf(a as (typeof LEVEL_ORDER)[number])
    const indexB = LEVEL_ORDER.indexOf(b as (typeof LEVEL_ORDER)[number])

    if (indexA === -1 && indexB === -1) {
      return a.localeCompare(b)
    }

    if (indexA === -1) return 1
    if (indexB === -1) return -1

    return indexA - indexB
  })
}

function getYearRange(year: number) {
  const start = new Date(Date.UTC(year, 0, 1))
  const nextYearStart = new Date(Date.UTC(year + 1, 0, 1))
  const end = new Date(nextYearStart.getTime() - 1)
  return { start, end }
}

function recordMatchesYear(record: RecordWithLevel, year: number): boolean {
  if (!record.startDate) return false
  const { start, end } = getYearRange(year)
  const effectiveEnd = record.endDate ?? end
  return record.startDate <= end && effectiveEnd >= start
}

function recordOverlapsRange(record: RecordWithLevel, start: Date, end: Date): boolean {
  if (!record.startDate) return false
  const effectiveEnd = record.endDate ?? end
  return record.startDate <= end && effectiveEnd >= start
}

export default function Home() {
  const [records, setRecords] = useState<RecordWithLevel[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [chartType, setChartType] = useState<"line" | "bar">("line")
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [selectedStartPeriod, setSelectedStartPeriod] = useState<string | null>(null)
  const [selectedEndPeriod, setSelectedEndPeriod] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const printDateLabel = useMemo(() => printDateFormatter.format(new Date()), [])
  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print()
    }
  }, [])

  const levelOptions = useMemo(() => {
    const levelLabels = new Map<string, string>()

    records.forEach((record) => {
      if (!record.normalizedLevel) return
      const display = record.computedLevel || record.normalizedLevel
      if (!levelLabels.has(record.normalizedLevel)) {
        levelLabels.set(record.normalizedLevel, display)
      }
    })

    if (levelLabels.size === 0) return []

    return sortLevels(Array.from(levelLabels.values()))
  }, [records])

  const levelFilteredRecords = useMemo(() => {
    if (!selectedLevel) return records
    const normalizedSelection = normalizeLevelValue(selectedLevel)
    return records.filter((record) => record.normalizedLevel === normalizedSelection)
  }, [records, selectedLevel])

  const recordsForView = useMemo(() => {
    let filtered = levelFilteredRecords

    if (selectedYear) {
      filtered = filtered.filter((record) => recordMatchesYear(record, selectedYear))
    }

    if (selectedStartPeriod && selectedEndPeriod) {
      const firstKey =
        compareMonthKeys(selectedStartPeriod, selectedEndPeriod) <= 0 ? selectedStartPeriod : selectedEndPeriod
      const lastKey =
        compareMonthKeys(selectedStartPeriod, selectedEndPeriod) <= 0 ? selectedEndPeriod : selectedStartPeriod
      const { start } = getMonthBounds(firstKey)
      const { end } = getMonthBounds(lastKey)
      filtered = filtered.filter((record) => recordOverlapsRange(record, start, end))
    }

    return filtered
  }, [levelFilteredRecords, selectedYear, selectedStartPeriod, selectedEndPeriod])

  const rangeExtents = useMemo(() => {
    if (levelFilteredRecords.length === 0) {
      return null
    }

    let minStart: Date | null = null
    let maxEnd: Date | null = null
    const now = new Date()

    levelFilteredRecords.forEach((record) => {
      if (!record.startDate) return
      if (!minStart || record.startDate < minStart) {
        minStart = record.startDate
      }
      const endReference = record.endDate ?? now
      if (!maxEnd || endReference > maxEnd) {
        maxEnd = endReference
      }
    })

    if (!minStart || !maxEnd) return null

    return { start: minStart, end: maxEnd }
  }, [levelFilteredRecords])

  const availablePeriodKeys = useMemo(() => {
    if (!rangeExtents) return []
    return generateMonthKeysInRange(rangeExtents.start, rangeExtents.end)
  }, [rangeExtents])

  const periodOptions = useMemo(() => {
    return availablePeriodKeys.map((key) => ({
      value: key,
      label: formatMonthKey(key),
    }))
  }, [availablePeriodKeys])

  useEffect(() => {
    if (availablePeriodKeys.length === 0) {
      setSelectedStartPeriod(null)
      setSelectedEndPeriod(null)
      return
    }

    setSelectedStartPeriod((previous) => {
      if (previous && availablePeriodKeys.includes(previous)) {
        return previous
      }
      return availablePeriodKeys[0]
    })

    setSelectedEndPeriod((previous) => {
      if (previous && availablePeriodKeys.includes(previous)) {
        return previous
      }
      return availablePeriodKeys[availablePeriodKeys.length - 1]
    })
  }, [availablePeriodKeys])

  const availableYears = useMemo(() => {
    const yearSet = new Set<number>()
    const now = new Date()

    levelFilteredRecords.forEach((record) => {
      if (!record.startDate) return
      const startYear = record.startDate.getUTCFullYear()
      const endReference = record.endDate ?? now
      const endYear = endReference.getUTCFullYear()
      for (let year = startYear; year <= endYear; year += 1) {
        yearSet.add(year)
      }
    })

    return Array.from(yearSet).sort((a, b) => a - b)
  }, [levelFilteredRecords])

  const years = availableYears

  const customRange = useMemo(() => {
    if (!selectedStartPeriod && !selectedEndPeriod) return null

    const startKey = selectedStartPeriod ?? selectedEndPeriod
    const endKey = selectedEndPeriod ?? selectedStartPeriod
    if (!startKey || !endKey) return null

    const firstKey = compareMonthKeys(startKey, endKey) <= 0 ? startKey : endKey
    const lastKey = compareMonthKeys(startKey, endKey) <= 0 ? endKey : startKey
    const { start } = getMonthBounds(firstKey)
    const { end } = getMonthBounds(lastKey)

    return { start, end, startKey: firstKey, endKey: lastKey }
  }, [selectedStartPeriod, selectedEndPeriod])

  const selectedRange = useMemo(() => {
    if (customRange) {
      return { start: customRange.start, end: customRange.end }
    }

    if (selectedYear) {
      return getYearRange(selectedYear)
    }

    return rangeExtents
  }, [customRange, selectedYear, rangeExtents])

  const monthKeys = useMemo(() => {
    if (!selectedRange) return []
    return generateMonthKeysInRange(selectedRange.start, selectedRange.end)
  }, [selectedRange])

  const recordsForCounting = useMemo(() => {
    if (selectedYear || (selectedStartPeriod && selectedEndPeriod)) {
      return recordsForView
    }
    return levelFilteredRecords
  }, [
    selectedYear,
    selectedStartPeriod,
    selectedEndPeriod,
    recordsForView,
    levelFilteredRecords,
  ])

  const monthlyData = useMemo(() => {
    if (monthKeys.length === 0) return []
    return monthKeys.map((monthKey) => {
      const { start, end } = getMonthBounds(monthKey)
      const activeCount = recordsForCounting.filter((record) => isActiveInMonth(record, start, end)).length
      return { month: monthKey, activeCount }
    })
  }, [monthKeys, recordsForCounting])

  useEffect(() => {
    if (monthlyData.length === 0) {
      setSelectedMonth(null)
      return
    }

    setSelectedMonth((previous) => {
      if (previous && monthlyData.some((entry) => entry.month === previous)) {
        return previous
      }
      return monthlyData[0].month
    })
  }, [monthlyData])

  const monthOptions = useMemo(() => {
    return monthlyData.map((entry) => ({
      value: entry.month,
      label: formatMonthKey(entry.month),
      count: entry.activeCount,
    }))
  }, [monthlyData])

  const reportTitle = useMemo(() => {
    const baseTitle =
      selectedYear != null
        ? `Rekap Periode Tahun ${selectedYear}`
        : formatRangeToID(selectedRange?.start, selectedRange?.end)

    if (selectedLevel) {
      return `${baseTitle} - Level ${selectedLevel}`
    }
    return baseTitle
  }, [selectedYear, customRange, selectedRange, selectedLevel])
  const reportSubheader = useMemo(
    () => `Tanggal cetak: ${printDateLabel} \u2022 Sumber: Internship Tracker.`,
    [printDateLabel]
  )

  const handleMonthSelection = useCallback((month: string | null) => {
    setSelectedMonth(month)
  }, [])

  const selectedMonthCount = useMemo(() => {
    if (!selectedMonth) return 0
    const match = monthlyData.find((entry) => entry.month === selectedMonth)
    return match?.activeCount ?? 0
  }, [monthlyData, selectedMonth])

  const sampleRows = useMemo(() => {
    if (!selectedMonth) return []
    const { start, end } = getMonthBounds(selectedMonth)
    return recordsForCounting
      .filter((record) => isActiveInMonth(record, start, end))
      .slice(0, 10)
      .map((record) => ({
        name: record.nama ?? "-",
        institution: record.instansi ?? "-",
        start: formatDisplayDate(record.startDate, record.tanggalMulai),
        end: formatDisplayDate(record.endDate, record.tanggalSelesai),
      }))
  }, [selectedMonth, recordsForCounting])

  const dateWindowLabel = useMemo(() => {
    if (!selectedRange) return ""

    if (selectedYear) {
      return `Periode dipilih: Januari - Desember ${selectedYear}`
    }

    if (customRange) {
      const startLabel = formatMonthKey(customRange.startKey)
      const endLabel = formatMonthKey(customRange.endKey)
      if (customRange.startKey === customRange.endKey) {
        return `Periode dipilih: ${startLabel}`
      }
      return `Periode dipilih: ${startLabel} - ${endLabel}`
    }

    return ""
  }, [selectedRange, selectedYear, customRange])

  const sampleEmptyMessage = useMemo(() => {
    if (selectedLevel && normalizeLevelValue(selectedLevel) === "SMK") {
      return "No SMK rows overlap this month"
    }
    return "No rows overlap this month"
  }, [selectedLevel])

  useEffect(() => {
    if (selectedYear && !years.includes(selectedYear)) {
      setSelectedYear(null)
    }
  }, [years, selectedYear])

  const institutionChartData = useMemo(() => {
    if (recordsForView.length === 0) return []

    const counts = new Map<string, number>()
    recordsForView.forEach((record) => {
      const key = record.instansi && record.instansi.trim() !== "" ? record.instansi.trim() : "Tidak diketahui"
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })

    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }))
  }, [recordsForView])

  const handleFileUpload = useCallback(async (file: File) => {
    setLoading(true)
    setError("")
    try {
      const parsedRecords = await parseExcelFile(file)
      const enrichedRecords: RecordWithLevel[] = parsedRecords.map((record) => {
        const computedLevel = determineLevel(record)
        const normalizedLevel =
          normalizeLevelValue(record.jenjang) || normalizeLevelValue(computedLevel) || ""
        const startDate = parseDateOnly(record.tanggalMulai)
        const endDate = parseDateOnly(record.tanggalSelesai)

        return {
          ...record,
          computedLevel,
          normalizedLevel,
          startDate,
          endDate,
        }
      })
      setRecords(enrichedRecords)

      // Determine default year based on enriched records
      const yearSet = new Set<number>()
      const now = new Date()
      enrichedRecords.forEach((record) => {
        if (!record.startDate) return
        const startYear = record.startDate.getUTCFullYear()
        const endReference = record.endDate ?? now
        const endYear = endReference.getUTCFullYear()
        for (let year = startYear; year <= endYear; year += 1) {
          yearSet.add(year)
        }
      })
      const sortedYears = Array.from(yearSet).sort((a, b) => a - b)
      setSelectedYear(sortedYears.length > 0 ? sortedYears[0] : null)

      setSelectedLevel(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error parsing file")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleYearChange = useCallback(
    (year: number | null) => {
      setSelectedYear(year)

      if (year == null) {
        return
      }

      const yearPrefix = `${year}-`
      const matchingKeys = availablePeriodKeys.filter((key) => key.startsWith(yearPrefix))

      if (matchingKeys.length > 0) {
        setSelectedStartPeriod(matchingKeys[0])
        setSelectedEndPeriod(matchingKeys[matchingKeys.length - 1])
      } else {
        setSelectedStartPeriod(createMonthKey(year, 1))
        setSelectedEndPeriod(createMonthKey(year, 12))
      }
    },
    [availablePeriodKeys]
  )

  const handleStartPeriodChange = useCallback((period: string | null) => {
    setSelectedYear(null)
    if (!period) {
      setSelectedStartPeriod(null)
      return
    }

    setSelectedStartPeriod(period)
    setSelectedEndPeriod((previous) => {
      if (!previous || compareMonthKeys(period, previous) > 0) {
        return period
      }
      return previous
    })
  }, [])

  const handleEndPeriodChange = useCallback((period: string | null) => {
    setSelectedYear(null)
    if (!period) {
      setSelectedEndPeriod(null)
      return
    }

    setSelectedEndPeriod(period)
    setSelectedStartPeriod((previous) => {
      if (!previous || compareMonthKeys(previous, period) > 0) {
        return period
      }
      return previous
    })
  }, [])

  const handleLevelChange = useCallback((level: string | null) => {
    setSelectedLevel(level)
  }, [])

  const handleChartTypeChange = useCallback((type: "line" | "bar") => {
    setChartType(type)
  }, [])

  const handleReset = useCallback(() => {
    setRecords([])
    setSelectedYear(null)
    setSelectedLevel(null)
    setSelectedStartPeriod(null)
    setSelectedEndPeriod(null)
    setSelectedMonth(null)
    setError("")
  }, [])

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto print-container">
        {/* Header */}
        <div className="mb-8">
          {records.length === 0 ? (
            <div className="screen-only">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Internship Tracker</h1>
              <p className="text-muted-foreground">Upload Excel files to analyze active internships per month</p>
            </div>
          ) : (
            <div className="screen-only flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">{reportTitle}</h1>
                  <p className="text-sm md:text-base text-muted-foreground">{reportSubheader}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrint}
                  className="no-print inline-flex items-center gap-2 self-start"
                >
                  <Printer className="h-4 w-4" />
                  Cetak PDF
                </Button>
              </div>
            </div>
          )}
        </div>

        {records.length > 0 && (
          <div className="print-only mb-8">
            <h1 className="print-title text-foreground">{reportTitle}</h1>
            <p className="print-subtitle text-foreground">{reportSubheader}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Card className="mb-6 p-4 bg-destructive/10 border-destructive/20">
            <p className="text-destructive text-sm">{error}</p>
          </Card>
        )}

        {/* Upload Section */}
        {records.length === 0 ? (
          <div className="no-print">
            <FileUploadArea onFileUpload={handleFileUpload} loading={loading} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filters */}
            <FilterPanel
              years={years}
              selectedYear={selectedYear}
              onYearChange={handleYearChange}
              periodOptions={periodOptions}
              selectedStartPeriod={selectedStartPeriod}
              selectedEndPeriod={selectedEndPeriod}
              onStartPeriodChange={handleStartPeriodChange}
              onEndPeriodChange={handleEndPeriodChange}
              selectedLevel={selectedLevel}
              levelOptions={levelOptions}
              onLevelChange={handleLevelChange}
              chartType={chartType}
              onChartTypeChange={handleChartTypeChange}
              recordCount={recordsForView.length}
              onReset={handleReset}
            />

            {dateWindowLabel && (
              <p className="text-sm text-muted-foreground">{dateWindowLabel}</p>
            )}

            {/* Chart */}
            {monthlyData.length > 0 && (
              <ChartDisplay
                data={monthlyData}
                chartType={chartType}
                title="Jumlah Magang Aktif per Bulan"
                exportHeading={reportTitle}
                exportSubheading={reportSubheader}
              />
            )}

            <SampleRowsTable
              monthOptions={monthOptions}
              selectedMonth={selectedMonth}
              onMonthChange={handleMonthSelection}
              rows={sampleRows}
              activeCount={selectedMonthCount}
              emptyMessage={sampleEmptyMessage}
            />

            {/* Institution Donut */}
            {institutionChartData.length > 0 && (
              <InstitutionDistributionTable data={institutionChartData} title="Distribusi Institusi" />
            )}

            {/* Summary Table */}
            {monthlyData.length > 0 && <SummaryTable data={monthlyData} records={recordsForView} />}
          </div>
        )}
      </div>
    </main>
  )
}
