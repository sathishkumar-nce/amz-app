type ExportValue = string | number | boolean | null | undefined

export type ExportRow = Record<string, ExportValue>

const normalizeValue = (value: ExportValue) => {
  if (value == null) return ''
  return String(value)
}

const escapeCsvValue = (value: ExportValue) => {
  const normalized = normalizeValue(value)
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

const buildCsv = (rows: ExportRow[]) => {
  if (!rows.length) return ''

  const headers = Object.keys(rows[0] || {})
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(',')),
  ]
  return lines.join('\n')
}

const buildHtmlTable = (title: string, rows: ExportRow[]) => {
  const headers = Object.keys(rows[0] || {})
  const head = headers.map((header) => `<th>${header}</th>`).join('')
  const body = rows
    .map((row) => `<tr>${headers.map((header) => `<td>${normalizeValue(row[header])}</td>`).join('')}</tr>`)
    .join('')

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { margin: 0 0 16px; font-size: 24px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 12px; vertical-align: top; }
          th { background: #f8fafc; }
          tr:nth-child(even) td { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </body>
    </html>
  `
}

const downloadBlob = (fileName: string, blob: Blob) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const exportRowsAsCsv = (fileName: string, rows: ExportRow[]) => {
  const csv = buildCsv(rows)
  downloadBlob(fileName, new Blob([csv], { type: 'text/csv;charset=utf-8' }))
}

export const exportRowsAsExcel = (fileName: string, title: string, rows: ExportRow[]) => {
  const html = buildHtmlTable(title, rows)
  downloadBlob(fileName, new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' }))
}

export const exportRowsAsPdf = (title: string, rows: ExportRow[]) => {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=800')
  if (!printWindow) return

  printWindow.document.open()
  printWindow.document.write(buildHtmlTable(title, rows))
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}
