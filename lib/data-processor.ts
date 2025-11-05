import * as XLSX from "xlsx"
import type { InternshipRecord, MonthlyData } from "./types"

// Helper function to format date as YYYY-MM-DD in UTC to avoid timezone drift
function formatDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Helper function to format date as YYYY-MM in UTC to avoid timezone drift
function formatYearMonth(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

// Helper function to parse Excel serial date
function excelDateToJSDate(excelDate: number): Date {
  // Excel epoch is 1899-12-30
  const excelEpoch = Date.UTC(1899, 11, 30)
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  return new Date(excelEpoch + excelDate * millisecondsPerDay)
}

function getFirstTruthyValue(row: any, keys: string[]): any {
  for (const key of keys) {
    if (key in row && row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key]
    }
  }
  return ""
}

function normaliseString(value: any): string {
  if (value === undefined || value === null) return ""
  return value.toString().trim()
}

export async function parseExcelFile(file: File): Promise<InternshipRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: "array" })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(worksheet)

        const records: InternshipRecord[] = rows.map((row: any, idx: number) => {
          const errors: string[] = []

          // Parse dates
          let tanggalMulai = ""
          let tanggalSelesai = ""

          const startRaw = getFirstTruthyValue(row, ["Tanggal_Mulai", "Tanggal Mulai", "Mulai", "Start Date"])
          const endRaw = getFirstTruthyValue(row, ["Tanggal_Selesai", "Tanggal Selesai", "Selesai", "End Date"])

          if (startRaw) {
            const parsed = parseDate(startRaw)
            if (parsed) {
              tanggalMulai = parsed
            } else {
              errors.push(`Invalid start date: ${startRaw}`)
            }
          } else {
            errors.push("Missing start date")
          }

          if (endRaw) {
            const parsed = parseDate(endRaw)
            if (parsed) {
              tanggalSelesai = parsed
            } else {
              errors.push(`Invalid end date: ${endRaw}`)
            }
          }

          const nama = normaliseString(
            getFirstTruthyValue(row, [
              "Nama",
              "Nama Mahasiswa",
              "Nama Mahasiswa/i",
              "Nama Siswa",
              "Nama Peserta",
              "Student Name",
              "Nama_Mahasiswa",
              "Nama_Mahasiswa/i",
            ]),
          )

          const instansi = normaliseString(
            getFirstTruthyValue(row, [
              "Instansi",
              "Nama Instansi",
              "Nama Institusi",
              "Institusi",
              "Sekolah",
              "Sekolah/Universitas",
              "Company",
              "Perusahaan",
              "Nama Sekolah",
              "Nama_Perusahaan",
            ]),
          )

          const jenjang = normaliseString(
            getFirstTruthyValue(row, [
              "Jenjang",
              "Tingkat Pendidikan",
              "Tingkat_Pendidikan",
              "Level Pendidikan",
              "Jenjang Pendidikan",
              "Pendidikan",
              "Level",
            ]),
          )

          return {
            nama,
            instansi,
            jenjang,
            tanggalMulai,
            tanggalSelesai,
            errors: errors.length > 0 ? errors : undefined,
          }
        })

        // Filter out records with errors
        const validRecords = records.filter((r) => !r.errors)

        if (validRecords.length === 0) {
          reject(new Error("No valid records found in the file"))
        }

        resolve(validRecords)
      } catch (err) {
        reject(new Error(`Failed to parse Excel file: ${err instanceof Error ? err.message : "Unknown error"}`))
      }
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }

    reader.readAsArrayBuffer(file)
  })
}

function parseDate(dateValue: any): string | null {
  if (!dateValue) return null

  // If it's already a string in YYYY-MM-DD format
  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue
  }

  // If it's a number (Excel serial date)
  if (typeof dateValue === "number") {
    const date = excelDateToJSDate(dateValue)
    return formatDate(date)
  }

  // Try to parse as string
  if (typeof dateValue === "string") {
    const date = new Date(dateValue)
    if (!isNaN(date.getTime())) {
      return formatDate(date)
    }
  }

  return null
}

export function generateMonthList(startDate: string, endDate: string): string[] {
  const months: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)

  let current = new Date(start.getFullYear(), start.getMonth(), 1)

  while (current <= end) {
    months.push(formatYearMonth(current))
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1)
  }

  return months
}

export function calculateActiveInterns(records: InternshipRecord[]): MonthlyData[] {
  if (records.length === 0) return []

  const monthCounts = new Map<string, number>()
  let overallStart: Date | null = null
  let overallEnd: Date | null = null

  records.forEach((record) => {
    const startDate = new Date(record.tanggalMulai)
    if (Number.isNaN(startDate.getTime())) return

    const hasEndDate = typeof record.tanggalSelesai === "string" && record.tanggalSelesai.trim() !== ""
    const rawEndDate = hasEndDate ? new Date(record.tanggalSelesai!) : new Date()
    if (Number.isNaN(rawEndDate.getTime())) return

    const [rangeStart, rangeEnd] =
      rawEndDate >= startDate ? [startDate, rawEndDate] : [rawEndDate, startDate]

    const monthKeys = generateMonthList(formatDate(rangeStart), formatDate(rangeEnd))
    monthKeys.forEach((monthKey) => {
      monthCounts.set(monthKey, (monthCounts.get(monthKey) ?? 0) + 1)
    })

    if (!overallStart || rangeStart < overallStart) {
      overallStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
    }
    if (!overallEnd || rangeEnd > overallEnd) {
      overallEnd = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1)
    }
  })

  if (!overallStart || !overallEnd) return []

  const months = generateMonthList(formatDate(overallStart), formatDate(overallEnd))
  return months.map((month) => ({
    month,
    activeCount: monthCounts.get(month) ?? 0,
  }))
}
