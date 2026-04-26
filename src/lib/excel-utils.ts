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
  // Read with cellDates: true to handle dates as Date objects
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

  // Helper to convert Excel serial date to YYYY-MM-DD
  const formatDate = (val: any): string => {
    if (!val) return '';
    if (val instanceof Date) {
      return val.toISOString().split('T')[0];
    }
    if (typeof val === 'number') {
      // Excel serial date to JS Date
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    // If it's already a string like "2026-04-26"
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    
    // Try to parse as date string
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    
    return str;
  };

  return jsonData.map((row, index) => {
    const findKey = (obj: any, target: string) => {
      const keys = Object.keys(obj);
      return keys.find(k => k.toLowerCase().replace(/\s/g, '') === target.toLowerCase().replace(/\s/g, ''));
    };

    const linkKey = findKey(row, 'VideoLink') || 'Video Link';
    const visKey = findKey(row, 'VisibilityType') || 'Visibility Type';
    const dateKey = findKey(row, 'ScheduleDate') || 'Schedule Date';
    const timeKey = findKey(row, 'ScheduleTime') || 'Schedule Time';
    const srKey = findKey(row, 'SrNo') || 'Sr No';

    return {
      srNo: row[srKey] || index + 1,
      videoLink: row[linkKey] || '',
      visibilityType: String(row[visKey]).trim() === 'Schedule' ? 'Schedule' : 'Publish',
      scheduleDate: formatDate(row[dateKey]),
      scheduleTime: row[timeKey] ? String(row[timeKey]).trim() : '',
      videoStatus: 'idle',
      titleStatus: 'idle',
      descriptionStatus: 'idle',
      uploadStatus: 'idle'
    };
  });
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
