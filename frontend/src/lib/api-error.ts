// Trích thông báo lỗi từ ApiError / Error thường.
// ApiError.message đã là thông báo tiếng Việt do api client chuẩn hóa.
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}
