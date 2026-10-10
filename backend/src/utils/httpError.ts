// Lỗi có mã HTTP, ném ra từ service/controller để errorHandler trả về đúng.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }

  static badRequest(msg = 'Dữ liệu không hợp lệ', code = 'BAD_REQUEST') {
    return new HttpError(400, msg, code);
  }
  static unauthorized(msg = 'Chưa đăng nhập hoặc phiên đã hết hạn') {
    return new HttpError(401, msg, 'UNAUTHORIZED');
  }
  static forbidden(msg = 'Bạn không có quyền thực hiện thao tác này') {
    return new HttpError(403, msg, 'FORBIDDEN');
  }
  static notFound(msg = 'Không tìm thấy dữ liệu') {
    return new HttpError(404, msg, 'NOT_FOUND');
  }
  static conflict(msg = 'Dữ liệu bị trùng') {
    return new HttpError(409, msg, 'CONFLICT');
  }
  static locked(msg = 'Dữ liệu đã bị khóa, không thể sửa') {
    return new HttpError(423, msg, 'LOCKED');
  }
  static passwordChangeRequired(msg = 'Phải đổi mật khẩu trước khi sử dụng') {
    return new HttpError(403, msg, 'PASSWORD_CHANGE_REQUIRED');
  }
}