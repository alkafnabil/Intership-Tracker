"use client"

import { memo, type ChangeEvent } from "react"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface MonthOption {
  value: string
  label: string
  count: number
}

interface SampleRow {
  name: string
  institution: string
  start: string
  end: string
}

interface SampleRowsTableProps {
  monthOptions: MonthOption[]
  selectedMonth: string | null
  onMonthChange: (month: string | null) => void
  rows: SampleRow[]
  activeCount: number
  emptyMessage: string
}

const SampleRowsTable = memo(function SampleRowsTable({
  monthOptions,
  selectedMonth,
  onMonthChange,
  rows,
  activeCount,
  emptyMessage,
}: SampleRowsTableProps) {
  if (monthOptions.length === 0) {
    return null
  }

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    onMonthChange(value ? value : null)
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Sample Rows Causing Count</h2>
          <p className="text-sm text-muted-foreground">
            Showing up to 10 records that overlap with the selected month.
          </p>
        </div>
        <div className="w-full md:w-72">
          <label className="block text-sm font-medium text-foreground mb-2">Month</label>
          <select
            value={selectedMonth ?? ""}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="text-sm text-muted-foreground mb-4">Total overlapping rows: {activeCount}</div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-muted-foreground italic">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Instansi</TableHead>
                <TableHead>Mulai</TableHead>
                <TableHead>Selesai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={`${row.name}-${row.institution}-${index}`}>
                  <TableCell className="whitespace-nowrap">{row.name}</TableCell>
                  <TableCell>{row.institution}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.start}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.end}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
})

export default SampleRowsTable
