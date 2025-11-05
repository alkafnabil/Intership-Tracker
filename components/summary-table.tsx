"use client"

import { memo, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Download } from "lucide-react"
import type { MonthlyData, InternshipRecord } from "@/lib/types"

interface SummaryTableProps {
  data: MonthlyData[]
  records: InternshipRecord[]
}

const SummaryTable = memo(function SummaryTable({ data, records }: SummaryTableProps) {
  const handleDownloadCSV = () => {
    const headers = ["Bulan (YYYY-MM)", "Jumlah_Aktif"]
    const rows = data.map((item) => [item.month, item.activeCount])

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `internship-data-${new Date().toISOString().split("T")[0]}.csv`)
    link.click()
  }

  const summaryStats = useMemo(() => {
    const totalRecords = records.length
    let minDate = null
    let maxDate = null

    if (records.length > 0) {
      const dates = records.map((r) => new Date(r.tanggalMulai).getTime())
      const endDates = records.map((r) => {
        const endDate = r.tanggalSelesai ? new Date(r.tanggalSelesai) : new Date()
        return endDate.getTime()
      })

      minDate = new Date(Math.min(...dates))
      maxDate = new Date(Math.max(...endDates))
    }

    return { totalRecords, minDate, maxDate }
  }, [records])

  return (
    <Card className="p-6 no-print">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Summary</h2>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Total Records: {summaryStats.totalRecords}</p>
            {summaryStats.minDate && summaryStats.maxDate && (
              <p>
                Date Range: {summaryStats.minDate.toLocaleDateString("id-ID")} to{" "}
                {summaryStats.maxDate.toLocaleDateString("id-ID")}
              </p>
            )}
          </div>
        </div>
        <Button onClick={handleDownloadCSV} className="gap-2 no-print">
          <Download className="w-4 h-4" />
          Download CSV
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-foreground">Bulan (YYYY-MM)</th>
              <th className="text-right py-3 px-4 font-semibold text-foreground">Jumlah_Aktif</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx} className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className="py-3 px-4 text-foreground">{item.month}</td>
                <td className="py-3 px-4 text-right text-foreground font-medium">{item.activeCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
})

export default SummaryTable
