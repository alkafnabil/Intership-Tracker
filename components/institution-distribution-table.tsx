"use client"

import { memo, useCallback, useMemo, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileDown } from "lucide-react"
import { exportElementToPdf } from "@/lib/export-to-pdf"

interface InstitutionDistributionTableProps {
  data: { name: string; value: number }[]
  title?: string
}

const InstitutionDistributionTable = memo(function InstitutionDistributionTable({
  data,
  title = "Distribusi Institusi",
}: InstitutionDistributionTableProps) {
  const exportRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const rows = useMemo(() => {
    if (!data || data.length === 0) return []

    const total = data.reduce((sum, item) => sum + item.value, 0)
    return [...data]
      .map((item) => ({
        name: item.name || "Tidak diketahui",
        value: item.value,
        percentage: total > 0 ? (item.value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [data])

  const handleExport = useCallback(async () => {
    if (!exportRef.current) return
    setIsExporting(true)
    try {
      await exportElementToPdf(exportRef.current, title)
    } catch (error) {
      console.error("Failed to export institution distribution", error)
    } finally {
      setIsExporting(false)
    }
  }, [title])

  if (rows.length === 0) {
    return null
  }

  return (
    <Card className="p-6 no-print">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 no-print"
          onClick={handleExport}
          disabled={isExporting}
          aria-label="Cetak distribusi institusi ke PDF"
        >
          <FileDown className="h-4 w-4" />
          {isExporting ? "Menyiapkan..." : "Cetak PDF"}
        </Button>
      </div>
      <div ref={exportRef} className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">#</TableHead>
              <TableHead>Institusi</TableHead>
              <TableHead className="text-right">Jumlah Peserta</TableHead>
              <TableHead className="text-right">% dari Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.name}>
                <TableCell className="text-center font-medium">{index + 1}</TableCell>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-right">{row.value}</TableCell>
                <TableCell className="text-right">{row.percentage.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
})

export default InstitutionDistributionTable
