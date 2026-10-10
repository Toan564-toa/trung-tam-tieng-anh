import ExcelJS from 'exceljs';

// Xuất danh sách ra Excel theo cột đã định. Dùng chung cho học viên/giáo viên/nhân viên.
// Trả Buffer để controller tự đặt header Content-Type/Content-Disposition.
export async function buildExcelBuffer(
  sheetName: string,
  columns: string[],
  rows: Array<Array<string | number | null | undefined>>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((header) => ({
    header,
    width: Math.max(14, [...header].length + 10),
  }));
  for (const row of rows) sheet.addRow(row);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function excelResponseHeaders(filename: string): Record<string, string> {
  return {
    'Content-Type':
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8',
    'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    'Cache-Control': 'no-store',
  };
}
