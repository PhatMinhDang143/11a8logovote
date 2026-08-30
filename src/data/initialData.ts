import { Exhibit } from '../types';

export const ADMIN_PASSWORD = 'bgk2026';

/**
 * Đường link Google Apps Script Web App mặc định (https://script.google.com/macros/s/.../exec)
 * Khi điền vào đây, mọi thiết bị, trình duyệt (Chrome, Cốc Cốc, điện thoại 45 học sinh)
 * đều sẽ tự động kết nối và đồng bộ chung 1 Google Sheet mà không cần cấu hình thủ công từng máy!
 */
export const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbyAA7Y1hLantgIWcUWMe7zNiDYVjhWkC8qDDAInrpvlLZPI9g0GqIMxgocbwmE9-GQ/exec';

export const GROUPS = [
  { id: 1, name: 'Tổ 1', label: 'Tổ 1' },
  { id: 2, name: 'Tổ 2', label: 'Tổ 2' },
  { id: 3, name: 'Tổ 3', label: 'Tổ 3' },
  { id: 4, name: 'Tổ 4', label: 'Tổ 4' },
];

/**
 * Utility to convert Google Drive sharing links to direct embed image URLs
 */
export const formatImageUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();

  // If it's a data URL or blob, return as is
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Google Drive format 1: /file/d/FILE_ID/...
  // Google Drive format 2: id=FILE_ID
  // Google Drive format 3: /d/FILE_ID
  // Google Drive format 4: drive.google.com/open?id=FILE_ID
  // Google Drive format 5: drive.google.com/uc?id=FILE_ID
  const driveMatch =
    trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/drive\.google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/);

  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    // Google Drive direct image CDN link (w1600 provides crisp high-resolution without login required)
    return `https://lh3.googleusercontent.com/d/${fileId}=w1600`;
  }

  return trimmed;
};

export const DEFAULT_EXHIBITS: Exhibit[] = [
  {
    id: 1,
    groupNumber: 1,
    title: 'Tác phẩm Tổ 1',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 2,
    groupNumber: 2,
    title: 'Tác phẩm Tổ 2',
    url: 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 3,
    groupNumber: 3,
    title: 'Tác phẩm Tổ 3',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 4,
    groupNumber: 4,
    title: 'Tác phẩm Tổ 4',
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80',
  },
];

export interface StudentProfile {
  name: string;
  birthDate: string; // DD/MM/YYYY
  pin: string; // 4 digits: DDMM
}

/**
 * Danh sách 45 học sinh cùng ngày tháng năm sinh & mã PIN 4 số (ngày + tháng)
 */
export const STUDENTS_DATA: StudentProfile[] = [
  { name: "VÕ TRƯỜNG DUY BẢO", birthDate: "19/10/2010", pin: "1910" },
  { name: "NGUYỄN HOÀNG BẢO CHÂU", birthDate: "8/2/2010", pin: "0802" },
  { name: "NGÔ VĂN CHÍ CÔNG", birthDate: "15/01/2010", pin: "1501" },
  { name: "HỨA HUYỀN DIỆU", birthDate: "23/08/2010", pin: "2308" },
  { name: "ĐỖ HOÀNG NHẬT DUY", birthDate: "5/3/2010", pin: "0503" },
  { name: "LÊ NGUYỄN THÙY DƯƠNG", birthDate: "17/04/2010", pin: "1704" },
  { name: "NGUYỄN PHÚ HÀO", birthDate: "30/07/2010", pin: "3007" },
  { name: "NGUYỄN THỊ NGỌC HIỀN", birthDate: "12/4/2010", pin: "1204" },
  { name: "NGUYỄN KIM HIẾU", birthDate: "4/6/2010", pin: "0406" },
  { name: "PHẠM HOÀNG HOA", birthDate: "24/06/2010", pin: "2406" },
  { name: "LÊ MINH HUY", birthDate: "11/4/2010", pin: "1104" },
  { name: "PHẠM VĂN KHA", birthDate: "11/3/2010", pin: "1103" },
  { name: "NHUYỄN ANH KHOA", birthDate: "10/1/2010", pin: "1001" },
  { name: "PHẠM ĐĂNG KHOA", birthDate: "5/3/2010", pin: "0503" },
  { name: "PHAN NGUYỄN NGUYÊN KHOA", birthDate: "24/7/2010", pin: "2407" },
  { name: "LÊ MINH KHÔI", birthDate: "5/2/2010", pin: "0502" },
  { name: "NGUYỄN HUỲNH MỸ KIM", birthDate: "6/9/2010", pin: "0609" },
  { name: "NGUYỄN HOÀNG TRÚC LAM", birthDate: "8/5/2010", pin: "0805" },
  { name: "HỒ ÁNH MY", birthDate: "7/12/2010", pin: "0712" },
  { name: "NGUYỄN KIM NGÂN", birthDate: "18/03/2010", pin: "1803" },
  { name: "TRẦN HIẾU NGHĨA", birthDate: "9/5/2010", pin: "0905" },
  { name: "BÙI TRUNG NGHĨA", birthDate: "24/08/2010", pin: "2408" },
  { name: "LÊ PHƯỢNG NGUYÊN", birthDate: "27/12/2010", pin: "2712" },
  { name: "VÕ THANH NHÀN", birthDate: "13/02/2010", pin: "1302" },
  { name: "TTRẦN ĐỨC NHÂN", birthDate: "9/5/2010", pin: "0905" },
  { name: "PHAN THANH NHIỀU", birthDate: "27/04/2010", pin: "2704" },
  { name: "VÕ NGUYỄN LONG NHỰT", birthDate: "18/02/2010", pin: "1802" },
  { name: "NGUYỄN HỮU PHÚC", birthDate: "12/5/2010", pin: "1205" },
  { name: "TRẦN MINH QUÂN", birthDate: "18/05/2010", pin: "1805" },
  { name: "NGUYỄN HỮU TÀI", birthDate: "24/11/2010", pin: "2411" },
  { name: "HUỲNH QUỐC THÁI", birthDate: "4/11/2010", pin: "0411" },
  { name: "LÊ THỊ PHƯƠNG THANH THẢO", birthDate: "8/9/2010", pin: "0809" },
  { name: "LÊ PhƯỚC THỊNH", birthDate: "6/1/2010", pin: "0601" },
  { name: "NGUYỄN MINH THUẬN", birthDate: "27/04/2010", pin: "2704" },
  { name: "NGUYỄN HỒ HUYỀN TRANG", birthDate: "25/01/2010", pin: "2501" },
  { name: "PHẠM THỊ THUỲ TRANG", birthDate: "10/1/2010", pin: "1001" },
  { name: "LÊ THỊ THANH TRÚC", birthDate: "5/4/2010", pin: "0504" },
  { name: "HUỲNH NGUYỄN QUỐC TRƯỜNG", birthDate: "7/6/2010", pin: "0706" },
  { name: "NGUYỄN NGỌC KHÁNH VY", birthDate: "27/02/2010", pin: "2702" },
  { name: "TRẦN NGUYỄN KHÁNH VY", birthDate: "28/04/2010", pin: "2804" },
  { name: "LÊ NGUYỄN TƯỜNG VY", birthDate: "12/6/2010", pin: "1206" },
  { name: "PHẠM THẢO VY", birthDate: "7/9/2010", pin: "0709" },
  { name: "NGUYỄN THỊ NHƯ Ý", birthDate: "27/04/2010", pin: "2704" },
  { name: "PHẠM THỊ NHƯ Ý", birthDate: "6/6/2010", pin: "0606" },
  { name: "NGUYỄN TRẦN CHÍ NAM", birthDate: "10/5/2010", pin: "1005" }
];

export const RAW_MEMBERS: string[] = STUDENTS_DATA.map((s) => s.name);

export const normalizeString = (str: string): string => {
  return str.trim().toUpperCase().replace(/\s+/g, ' ');
};

export const toTitleCase = (str: string): string => {
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

export const getStudentProfile = (name: string): StudentProfile | undefined => {
  const norm = normalizeString(name);
  return STUDENTS_DATA.find((s) => normalizeString(s.name) === norm);
};

export const validateStudentPin = (name: string, pinInput: string): boolean => {
  const student = getStudentProfile(name);
  if (!student) return false;
  const cleanPin = pinInput.trim().replace(/\D/g, '');
  return student.pin === cleanPin;
};
