import * as XLSX from 'xlsx';

export interface BulkVideoRow {
  srNo: number;
  videoLink: string;
  visibilityType: 'Publish' | 'Schedule';
  scheduleDate: string; // YYYY-MM-DD
  scheduleTime: string; // HH:MM
  // Result fields
  previewUrl?: string;
  title?: string;
  description?: string;
  videoStatus?: 'idle' | 'processing' | 'completed' | 'error';
  titleStatus?: 'idle' | 'processing' | 'completed' | 'error';
  descriptionStatus?: 'idle' | 'processing' | 'completed' | 'error';
  uploadStatus?: 'idle' | 'processing' | 'completed' | 'error';
  message?: string;
}

export function parseExcelFile(buffer: ArrayBuffer): BulkVideoRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

  return jsonData.map((row, index) => ({
    srNo: row['Sr No'] || index + 1,
    videoLink: row['Video Link'] || '',
    visibilityType: row['Visibility Type'] === 'Schedule' ? 'Schedule' : 'Publish',
    scheduleDate: row['Schedule Date'] || '',
    scheduleTime: row['Schedule Time'] || '',
    videoStatus: 'idle',
    titleStatus: 'idle',
    descriptionStatus: 'idle',
    uploadStatus: 'idle'
  }));
}

export function generateSampleExcel() {
  const data = [
    {
      'Sr No': 1,
      'Video Link': 'https://www.youtube.com/watch?v=...',
      'Visibility Type': 'Publish',
      'Schedule Date': '',
      'Schedule Time': ''
    },
    {
      'Sr No': 2,
      'Video Link': 'https://www.instagram.com/reel/...',
      'Visibility Type': 'Schedule',
      'Schedule Date': '2026-12-25',
      'Schedule Time': '18:00'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample');
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Sample_Bulk_Upload.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}
