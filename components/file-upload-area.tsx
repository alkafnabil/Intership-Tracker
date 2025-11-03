"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload } from "lucide-react"

interface FileUploadAreaProps {
  onFileUpload: (file: File) => void
  loading: boolean
}

export default function FileUploadArea({ onFileUpload, loading }: FileUploadAreaProps) {
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      const file = files[0]
      if (
        file.name.endsWith(".xlsx") ||
        file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        onFileUpload(file)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      onFileUpload(files[0])
    }
  }

  return (
    <Card
      className={`border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
        dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        onChange={handleChange}
        className="hidden"
        disabled={loading}
      />

      <div className="flex flex-col items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Upload Excel File</h3>
          <p className="text-sm text-muted-foreground mb-4">Drag and drop your .xlsx file here or click to browse</p>
          <p className="text-xs text-muted-foreground mb-4">Required columns: Tanggal_Mulai, Tanggal_Selesai</p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} disabled={loading} className="mt-2">
          {loading ? "Processing..." : "Select File"}
        </Button>
      </div>
    </Card>
  )
}
