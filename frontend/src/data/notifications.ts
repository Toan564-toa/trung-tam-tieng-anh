import { CalendarDays, CreditCard, FileText, Megaphone, UserCheck, type LucideIcon } from "lucide-react"
import type { Role } from "@/lib/auth/types"

export type NotificationTone = "info" | "success" | "warning" | "danger"

export type AppNotification = {
  id: string
  title: string
  description: string
  time: string
  tone: NotificationTone
  unread: boolean
  icon: LucideIcon
  href: string
}

export const NOTIFICATION_TONE: Record<NotificationTone, { badge: "info" | "success" | "warning" | "danger"; iconClass: string }> = {
  info: { badge: "info", iconClass: "bg-sky-100 text-sky-700" },
  success: { badge: "success", iconClass: "bg-green-100 text-success" },
  warning: { badge: "warning", iconClass: "bg-orange-100 text-warning" },
  danger: { badge: "danger", iconClass: "bg-red-100 text-danger" },
}

/** Thông báo mẫu theo từng vai trò, hiển thị trong menu chuông. */
export const NOTIFICATIONS_BY_ROLE: Record<Role, AppNotification[]> = {
  student: [
    { id: "sn1", title: "Nhắc lịch kiểm tra giữa khóa", description: "Kỳ thi giữa khóa A2 diễn ra ngày 28/11 lúc 19:00.", time: "30 phút trước", tone: "warning", unread: true, icon: CalendarDays, href: "/hoc-vien/lich-hoc" },
    { id: "sn2", title: "Bài tập sắp đến hạn", description: "Bài tập Unit 6 hạn nộp trong 2 ngày tới.", time: "2 giờ trước", tone: "danger", unread: true, icon: FileText, href: "/hoc-vien/bai-tap" },
    { id: "sn3", title: "Điểm kiểm tra giữa khóa đã công bố", description: "Bạn đạt 8.8/10. Giáo viên đã gửi nhận xét.", time: "Hôm qua", tone: "success", unread: false, icon: FileText, href: "/hoc-vien/bang-diem" },
    { id: "sn4", title: "Thông báo English Day 2026", description: "Đăng ký tham dự trước 25/10 tại sân trường.", time: "2 ngày trước", tone: "info", unread: false, icon: Megaphone, href: "/hoc-vien/lich-hoc" },
    { id: "sn5", title: "Đến hạn đóng học phí kỳ 2", description: "Vui lòng hoàn tất thanh toán trước 10/11.", time: "3 ngày trước", tone: "warning", unread: false, icon: CreditCard, href: "/hoc-vien/hoc-phi" },
  ],
  teacher: [
    { id: "tn1", title: "5 học viên chưa nộp bài tập", description: "Lớp A2 Buổi Tối 01 cần bạn chấm trước thứ Bảy.", time: "1 giờ trước", tone: "warning", unread: true, icon: FileText, href: "/giao-vien/bai-tap" },
    { id: "tn2", title: "Điểm danh lớp 19:00 tối nay", description: "Lớp B1 Buổi Tối 02 bắt đầu sau 20 phút.", time: "3 giờ trước", tone: "info", unread: true, icon: UserCheck, href: "/giao-vien/diem-danh?lop=B1T02" },
    { id: "tn3", title: "Buổi A2 Buổi Tối 01 chưa điểm danh", description: "Đã 30 phút kể từ giờ bắt đầu.", time: "30 phút trước", tone: "danger", unread: true, icon: CalendarDays, href: "/giao-vien/diem-danh?lop=A2T01" },
    { id: "tn4", title: "Bảng lương tháng 9 đã được duyệt", description: "Xem chi tiết từng lớp và khoản điều chỉnh.", time: "Hôm qua", tone: "success", unread: false, icon: CreditCard, href: "/giao-vien/bang-luong" },
    { id: "tn5", title: "Đã nhận báo cáo tiến độ học kỳ I", description: "Ban chuyên môn gửi kèm file tổng hợp điểm.", time: "Hôm qua", tone: "info", unread: false, icon: Megaphone, href: "/giao-vien/lop-hoc" },
  ],
  staff: [
    { id: "en1", title: "12 khách cần tư vấn", description: "5 khách mới đăng ký từ sáng nay.", time: "30 phút trước", tone: "warning", unread: true, icon: UserCheck, href: "/nhan-vien/khach-tiem-nang" },
    { id: "en2", title: "8 học phí chờ thu", description: "3 hồ sơ quá hạn quá 7 ngày.", time: "4 giờ trước", tone: "danger", unread: true, icon: CreditCard, href: "/nhan-vien/hoc-phi" },
    { id: "en3", title: "Lớp A2 Buổi Tối 01 sắp khai giảng", description: "Cần chuẩn bị 18 học viên và tài liệu.", time: "Hôm qua", tone: "info", unread: false, icon: CalendarDays, href: "/nhan-vien/lich-trinh" },
    { id: "en4", title: "3 hồ sơ học viên thiếu giấy tờ", description: "Cần bổ sung CCCD và ảnh thẻ trước khi khai giảng.", time: "Hôm qua", tone: "warning", unread: false, icon: FileText, href: "/nhan-vien/hoc-vien" },
  ],
  admin: [
    { id: "an1", title: "56 học viên mới trong tháng", description: "Tỷ lệ chuyển đổi tăng 12% so với tháng trước.", time: "1 giờ trước", tone: "success", unread: true, icon: UserCheck, href: "/admin" },
    { id: "an2", title: "4 lớp sắp khai giảng", description: "Kiểm tra giáo viên và phòng học trước tuần sau.", time: "5 giờ trước", tone: "warning", unread: true, icon: CalendarDays, href: "/admin/lop-hoc" },
    { id: "an3", title: "Doanh thu tháng giảm 3%", description: "So với tháng trước, do tuyển mới giảm.", time: "Hôm qua", tone: "danger", unread: false, icon: CreditCard, href: "/admin/bao-cao" },
    { id: "an4", title: "3 phiếu giảm giá chờ duyệt", description: "Nhân viên gửi xin duyệt trong ngày 02/10.", time: "2 giờ trước", tone: "info", unread: true, icon: FileText, href: "/admin/hoc-phi" },
    { id: "an5", title: "Bảng lương tháng 10 chờ chốt", description: "Còn 3 nhân sự chưa được chốt lương.", time: "Hôm nay", tone: "warning", unread: true, icon: Megaphone, href: "/admin/bang-luong" },
  ],
}