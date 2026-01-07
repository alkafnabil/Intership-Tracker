export interface InternshipRecord {
  nama?: string
  instansi?: string
  penempatan?: string
  jenjang?: string
  tanggalMulai: string
  tanggalSelesai?: string
  errors?: string[]
}

export interface MonthlyData {
  month: string
  activeCount: number
}
