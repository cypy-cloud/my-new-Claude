export function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  return [headers.map(escape), ...rows.map(r => r.map(escape))].map(r => r.join(',')).join('\n')
}
