"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Card } from "@/components/ui/card"
import FileUploadArea from "@/components/file-upload-area"
import FilterPanel from "@/components/filter-panel"
import ChartDisplay from "@/components/chart-display"
import InstitutionDistributionTable from "@/components/institution-distribution-table"
import SummaryTable from "@/components/summary-table"
import { parseExcelFile, calculateActiveInterns } from "@/lib/data-processor"
import type { InternshipRecord } from "@/lib/types"

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

function recordMatchesYear(record: InternshipRecord, year: number): boolean {
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31)

  const startDate = new Date(record.tanggalMulai)
  const endDate = record.tanggalSelesai ? new Date(record.tanggalSelesai) : new Date()

  return startDate <= yearEnd && endDate >= yearStart
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

function recordOverlapsRange(record: InternshipRecord, start: Date, end: Date): boolean {
  const recordStart = new Date(record.tanggalMulai)
  const recordEnd = record.tanggalSelesai ? new Date(record.tanggalSelesai) : new Date()
  return recordStart <= end && recordEnd >= start
}

function getSemesterRange(year: number, semester: 1 | 2) {
  const startMonth = semester === 1 ? 0 : 6
  const endMonth = semester === 1 ? 5 : 11
  const start = new Date(year, startMonth, 1)
  const end = new Date(year, endMonth + 1, 0)
  return { start, end }
}

function parseSemesterValue(value: string): { year: number; semester: 1 | 2 } {
  const [yearPart, semesterPart] = value.split("-S")
  const year = Number.parseInt(yearPart, 10)
  const semester = semesterPart === "2" ? 2 : 1
  return { year, semester }
}

export default function Home() {
  const [records, setRecords] = useState<RecordWithLevel[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [chartType, setChartType] = useState<"line" | "bar">("line")
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const levelOptions = useMemo(() => {
    const levelSet = new Set<string>()

    records.forEach((record) => {
      if (record.computedLevel) {
        levelSet.add(record.computedLevel)
      }
    })

    if (levelSet.size === 0) return []

    return sortLevels(Array.from(levelSet))
  }, [records])

  const levelFilteredRecords = useMemo(() => {
    if (!selectedLevel) return records
    return records.filter((record) => record.computedLevel === selectedLevel)
  }, [records, selectedLevel])

  const recordsForView = useMemo(() => {
    let filtered = levelFilteredRecords

    if (selectedYear) {
      filtered = filtered.filter((record) => recordMatchesYear(record, selectedYear))
    }

    if (selectedSemester) {
      const { year, semester } = parseSemesterValue(selectedSemester)
      const { start, end } = getSemesterRange(year, semester)
      filtered = filtered.filter((record) => recordOverlapsRange(record, start, end))
    }

    return filtered
  }, [levelFilteredRecords, selectedYear, selectedSemester])

  const monthlyData = useMemo(() => {
    if (levelFilteredRecords.length === 0) return []
    return calculateActiveInterns(levelFilteredRecords)
  }, [levelFilteredRecords])

  const years = useMemo(() => {
    return Array.from(new Set(monthlyData.map((m) => Number.parseInt(m.month.split("-")[0])))).sort((a, b) => a - b)
  }, [monthlyData])

  const semesterOptions = useMemo(() => {
    const byYear = new Map<number, Set<1 | 2>>()

    monthlyData.forEach((entry) => {
      const [yearStr, monthStr] = entry.month.split("-")
      const year = Number.parseInt(yearStr, 10)
      const month = Number.parseInt(monthStr, 10)
      if (!byYear.has(year)) {
        byYear.set(year, new Set())
      }
      const semester = month <= 6 ? 1 : 2
      byYear.get(year)?.add(semester as 1 | 2)
    })

    const sortedYears = Array.from(byYear.keys()).sort((a, b) => a - b)
    const options: { value: string; label: string }[] = []
    sortedYears.forEach((year) => {
      const semesters = Array.from(byYear.get(year) ?? []).sort()
      semesters.forEach((semester) => {
        const monthRange = semester === 1 ? "Jan - Jun" : "Jul - Des"
        options.push({
          value: `${year}-S${semester}`,
          label: `Semester ${semester} ${year} (${monthRange})`,
        })
      })
    })

    return options
  }, [monthlyData])

  useEffect(() => {
    if (selectedYear && !years.includes(selectedYear)) {
      setSelectedYear(null)
    }
  }, [years, selectedYear])

  useEffect(() => {
    if (!selectedSemester) return
    const { year } = parseSemesterValue(selectedSemester)
    if (!selectedYear || year !== selectedYear) {
      setSelectedSemester(null)
    }
  }, [selectedYear, selectedSemester])

  useEffect(() => {
    if (selectedSemester && !semesterOptions.some((option) => option.value === selectedSemester)) {
      setSelectedSemester(null)
    }
  }, [semesterOptions, selectedSemester])

  const filteredData = useMemo(() => {
    let data = monthlyData

    if (selectedYear) {
      data = data.filter((m) => Number.parseInt(m.month.split("-")[0]) === selectedYear)
    }

    if (selectedSemester) {
      const { year, semester } = parseSemesterValue(selectedSemester)
      const months = semester === 1 ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12]
      data = data.filter((m) => {
        const [yearStr, monthStr] = m.month.split("-")
        const monthYear = Number.parseInt(yearStr, 10)
        const monthNumber = Number.parseInt(monthStr, 10)
        return monthYear === year && months.includes(monthNumber)
      })
    }

    return data
  }, [monthlyData, selectedYear, selectedSemester])

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
      const enrichedRecords: RecordWithLevel[] = parsedRecords.map((record) => ({
        ...record,
        computedLevel: determineLevel(record),
      }))
      setRecords(enrichedRecords)

      // Calculate monthly data
      const monthly = calculateActiveInterns(enrichedRecords)

      // Set default year to first year
      const uniqueYears = Array.from(new Set(monthly.map((m) => Number.parseInt(m.month.split("-")[0])))).sort(
        (a, b) => a - b,
      )
      if (uniqueYears.length > 0) {
        setSelectedYear(uniqueYears[0])
      } else {
        setSelectedYear(null)
      }

      setSelectedLevel(null)
      setSelectedSemester(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error parsing file")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleYearChange = useCallback((year: number | null) => {
    setSelectedYear(year)
  }, [])

  const handleSemesterChange = useCallback((semester: string | null) => {
    setSelectedSemester(semester)
    if (semester) {
      const { year } = parseSemesterValue(semester)
      setSelectedYear(year)
    }
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
    setSelectedSemester(null)
    setSelectedLevel(null)
    setError("")
  }, [])

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Internship Tracker</h1>
          <p className="text-muted-foreground">Upload Excel files to analyze active internships per month</p>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 p-4 bg-destructive/10 border-destructive/20">
            <p className="text-destructive text-sm">{error}</p>
          </Card>
        )}

        {/* Upload Section */}
        {records.length === 0 ? (
          <FileUploadArea onFileUpload={handleFileUpload} loading={loading} />
        ) : (
          <div className="space-y-6">
            {/* Filters */}
            <FilterPanel
              years={years}
              selectedYear={selectedYear}
              onYearChange={handleYearChange}
              semesters={semesterOptions}
              selectedSemester={selectedSemester}
              onSemesterChange={handleSemesterChange}
              selectedLevel={selectedLevel}
              levelOptions={levelOptions}
              onLevelChange={handleLevelChange}
              chartType={chartType}
              onChartTypeChange={handleChartTypeChange}
              recordCount={recordsForView.length}
              onReset={handleReset}
            />

            {/* Chart */}
            {filteredData.length > 0 && (
              <ChartDisplay data={filteredData} chartType={chartType} title="Jumlah Magang Aktif per Bulan" />
            )}

            {/* Institution Donut */}
            {institutionChartData.length > 0 && (
              <InstitutionDistributionTable data={institutionChartData} title="Distribusi Institusi" />
            )}

            {/* Summary Table */}
            {filteredData.length > 0 && <SummaryTable data={filteredData} records={recordsForView} />}
          </div>
        )}
      </div>
    </main>
  )
}
