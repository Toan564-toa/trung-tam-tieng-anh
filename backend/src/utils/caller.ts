// Thông tin người gọi đã xác thực (từ token), dùng để kiểm tra
// quyền theo dữ liệu (giáo viên chỉ thấy lớp mình, học viên chỉ thấy mình).
export interface Caller {
  id: number;
  roles: string[];
}
