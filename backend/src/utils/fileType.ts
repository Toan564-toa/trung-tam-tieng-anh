// Nhận dạng loại tệp theo nội dung (magic bytes), không tin header Content-Type
// hay phần mở rộng tên file — hai thứ này dễ bị giả mạo khi upload.
// Chỉ chấp nhận ảnh (PNG/JPEG/GIF/WEBP) và PDF.

export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
] as const;

export type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPEG = [0xff, 0xd8, 0xff];
const GIF = [0x47, 0x49, 0x46];

function startsWith(buffer: Buffer, prefix: number[]): boolean {
  if (buffer.length < prefix.length) return false;
  return prefix.every((byte, index) => buffer[index] === byte);
}

// Trả về MIME chuẩn xác theo nội dung, hoặc null khi không nhận ra.
export function detectMimeType(buffer: Buffer): string | null {
  if (startsWith(buffer, PNG)) return 'image/png';
  if (startsWith(buffer, JPEG)) return 'image/jpeg';
  if (startsWith(buffer, GIF)) return 'image/gif';
  // WEBP: "RIFF"....+"WEBP" tại offset 8
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('latin1') === '%PDF') {
    return 'application/pdf';
  }
  return null;
}

// Phần mở rộng lưu trên đĩa khớp với MIME thật, tránh lưu tên lạ.
export function extensionOf(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    case 'application/pdf':
      return 'pdf';
    default:
      return 'bin';
  }
}
