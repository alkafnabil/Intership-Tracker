export interface ExportToPdfOptions {
  filename?: string
}

function createFilename(rawTitle: string | undefined): string {
  const base = rawTitle?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "diagram"
  return `${base}.pdf`
}

export async function exportElementToPdf(element: HTMLElement, title?: string) {
  const html2canvas = (await import("html2canvas")).default
  const { jsPDF } = await import("jspdf")

  const scale = Math.max(window.devicePixelRatio ?? 1, 2)
  const background =
    getComputedStyle(document.documentElement).getPropertyValue("--background")?.trim() || "#ffffff"

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    backgroundColor: background,
    logging: false,
  })

  const imgData = canvas.toDataURL("image/png")
  const orientation = canvas.width >= canvas.height ? "landscape" : "portrait"
  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: "a4",
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height)
  const imgWidth = canvas.width * ratio
  const imgHeight = canvas.height * ratio
  const x = (pageWidth - imgWidth) / 2
  const y = (pageHeight - imgHeight) / 2

  pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight)
  pdf.save(createFilename(title))
}
