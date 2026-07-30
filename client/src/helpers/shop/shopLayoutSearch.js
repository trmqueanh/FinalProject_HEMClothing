// Chuẩn hóa nội dung tìm kiếm để header và controller dùng cùng một quy tắc.
export const normalizeSearchText = value =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
