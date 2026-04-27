import * as XLSX from 'xlsx';

export interface BulkVideoRow {
  srNo: number;
  videoLink: string;
  visibilityType: 'Public' | 'Schedule';
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

    let date: Date;
    if (val instanceof Date) {
      date = val;
    } else if (typeof val === 'number') {
      // Excel serial date to JS Date
      date = new Date(Math.round((val - 25569) * 86400 * 1000));
    } else {
      const str = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
      date = new Date(str);
    }

    if (isNaN(date.getTime())) return String(val).trim();

    // Avoid formatting time-only cells (Year 1899) as a date
    if (date.getFullYear() < 1970) return "";

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate() + 1).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatTime = (val: any): string => {
    if (!val) return '';

    // Handle Date objects from XLSX (often Dec 30 1899 for time-only cells)
    if (val instanceof Date) {
      const hh = String(val.getHours()).padStart(2, '0');
      const mm = String(val.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }

    if (typeof val === 'number') {
      // Excel stores time as a fraction of a 24h day (0.5 = 12:00 PM)
      const totalMinutes = Math.round(val * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    const str = String(val).trim();
    // Validate HH:MM or HH:MM:SS format
    if (/^\d{1,2}:\d{2}/.test(str)) {
      const parts = str.split(':');
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
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
      visibilityType: String(row[visKey]).trim() === 'Schedule' ? 'Schedule' : 'Public',
      scheduleDate: formatDate(row[dateKey]),
      scheduleTime: formatTime(row[timeKey]),
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
      'Visibility Type': 'Public',
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
