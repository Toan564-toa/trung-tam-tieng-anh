import {
  Award,
  BookOpenCheck,
  CalendarCheck,
  Gamepad2,
  HeartHandshake,
  LineChart,
  type LucideIcon,
  MessagesSquare,
  ShieldCheck,
  Smile,
  Sparkles,
  Users,
} from "lucide-react"
import { unsplash } from "@/lib/images"

export type Stat = { label: string; value: number; suffix: string; icon: LucideIcon }

export const STATS: Stat[] = [
  { label: "Học viên đã theo học", value: 3500, suffix: "+", icon: Users },
  { label: "Giáo viên tận tâm", value: 45, suffix: "+", icon: Award },
  { label: "Năm hoạt động", value: 10, suffix: "", icon: CalendarCheck },
  { label: "Tỷ lệ hài lòng", value: 98, suffix: "%", icon: Smile },
]

export const ABOUT_PHOTOS = [
  { src: unsplash("photo-1509062522246-3755977927d7", 700), alt: "Lớp học sinh động" },
  { src: unsplash("photo-1503676260728-1c00da094a0b", 700), alt: "Học viên nhỏ tuổi trong lớp" },
  { src: unsplash("photo-1522202176988-66273c2fd55f", 700), alt: "Nhóm học viên thảo luận" },
  { src: unsplash("photo-1524178232363-1fb2b075b655", 700), alt: "Phòng học hiện đại" },
]

export type Course = {
  id: string
  name: string
  level: string
  levelTone: "brand" | "info" | "success" | "warning"
  audience: string
  lessons: number
  months: number
  perWeek: number
  tuition: number
  schedule: string[]
  highlights: string[]
  featured?: boolean
}

export const COURSES: Course[] = [
  {
    id: "starter",
    name: "Tiếng Anh Khởi Đầu",
    level: "Starter · Pre A1",
    levelTone: "success",
    audience: "Thiếu nhi 6–10 tuổi",
    lessons: 64,
    months: 8,
    perWeek: 2,
    tuition: 12_800_000,
    schedule: ["Thứ 2 & Thứ 4 · 17:30 – 19:00", "Thứ 7 & CN · 08:00 – 09:30"],
    highlights: ["Phát âm chuẩn", "Học qua trò chơi", "Lớp tối đa 12 bạn"],
  },
  {
    id: "a1",
    name: "Tiếng Anh Sơ Cấp",
    level: "A1 · Beginner",
    levelTone: "info",
    audience: "Thiếu niên & người mới bắt đầu",
    lessons: 64,
    months: 8,
    perWeek: 2,
    tuition: 14_400_000,
    schedule: ["Thứ 3 & Thứ 5 · 18:00 – 19:30", "Thứ 7 & CN · 14:00 – 15:30"],
    highlights: ["Ngữ pháp nền tảng", "1.000+ từ vựng", "Giao tiếp cơ bản"],
  },
  {
    id: "a2",
    name: "Tiếng Anh Tiền Trung Cấp",
    level: "A2 · Elementary",
    levelTone: "brand",
    audience: "Học sinh THCS – THPT",
    lessons: 64,
    months: 8,
    perWeek: 2,
    tuition: 15_200_000,
    schedule: ["Thứ 2 & Thứ 6 · 19:00 – 20:30", "Thứ 7 & CN · 09:45 – 11:15"],
    highlights: ["4 kỹ năng toàn diện", "Luyện đề Cambridge", "Dự án thuyết trình"],
    featured: true,
  },
  {
    id: "b1",
    name: "Tiếng Anh Trung Cấp",
    level: "B1 · Intermediate",
    levelTone: "warning",
    audience: "Học sinh, sinh viên, người đi làm",
    lessons: 64,
    months: 8,
    perWeek: 2,
    tuition: 16_800_000,
    schedule: ["Thứ 3 & Thứ 5 · 19:45 – 21:15", "Thứ 7 & CN · 16:00 – 17:30"],
    highlights: ["Phản xạ giao tiếp", "Viết luận học thuật", "Định hướng IELTS"],
  },
]

export const LEARNING_PATH = [
  { month: 1, title: "Làm quen & đánh giá", desc: "Kiểm tra đầu vào, xây dựng thói quen học và phát âm chuẩn." },
  { month: 2, title: "Nền tảng từ vựng", desc: "Chủ đề quen thuộc, mẫu câu cơ bản qua trò chơi tương tác." },
  { month: 3, title: "Ngữ pháp cốt lõi", desc: "Các thì cơ bản, cấu trúc câu, luyện tập theo tình huống." },
  { month: 4, title: "Kiểm tra giữa khóa", desc: "Đánh giá tiến độ, gửi báo cáo chi tiết cho phụ huynh." },
  { month: 5, title: "Nghe – Nói phản xạ", desc: "Thảo luận nhóm, đóng vai, luyện nghe với người bản xứ." },
  { month: 6, title: "Đọc – Viết ứng dụng", desc: "Đọc hiểu đoạn văn, viết email, đoạn văn ngắn." },
  { month: 7, title: "Dự án thực tế", desc: "Thuyết trình, làm video, áp dụng kiến thức vào dự án nhóm." },
  { month: 8, title: "Tổng kết & chứng nhận", desc: "Thi cuối khóa, trao chứng nhận và tư vấn lộ trình tiếp theo." },
]

export type Feature = { title: string; desc: string; icon: LucideIcon; color: string }

export const FEATURES: Feature[] = [
  { title: "Giáo viên chuẩn quốc tế", desc: "100% giáo viên có chứng chỉ IELTS 7.5+ hoặc TESOL/CELTA, giàu kinh nghiệm.", icon: Award, color: "bg-brand-soft text-amber-700" },
  { title: "Lộ trình cá nhân hóa", desc: "Kiểm tra đầu vào miễn phí, xếp lớp đúng trình độ và mục tiêu của từng học viên.", icon: LineChart, color: "bg-sky-100 text-sky-700" },
  { title: "Lớp học sĩ số nhỏ", desc: "Tối đa 12 học viên/lớp để giáo viên quan tâm sát sao từng bạn.", icon: Users, color: "bg-green-100 text-success" },
  { title: "Học mà chơi", desc: "Phương pháp gamification, hoạt động nhóm giúp học viên hứng thú mỗi buổi học.", icon: Gamepad2, color: "bg-orange-100 text-warning" },
  { title: "Báo cáo tiến độ minh bạch", desc: "Phụ huynh theo dõi điểm danh, bài tập và nhận xét sau mỗi buổi học.", icon: BookOpenCheck, color: "bg-violet-100 text-violet-700" },
  { title: "Cam kết đầu ra", desc: "Học lại miễn phí nếu không đạt mục tiêu đã cam kết khi hoàn thành khóa học.", icon: ShieldCheck, color: "bg-rose-100 text-rose-600" },
]

export type Teacher = { name: string; specialty: string; certificate: string; experience: string; photo: string }

export const TEACHERS: Teacher[] = [
  { name: "Cô Nguyễn Minh Anh", specialty: "Tiếng Anh thiếu nhi", certificate: "IELTS 8.0 · TESOL", experience: "8 năm kinh nghiệm", photo: unsplash("photo-1573496359142-b8d87734a5a2", 500) },
  { name: "Thầy Trần Quốc Bảo", specialty: "Luyện thi IELTS", certificate: "IELTS 8.5 · CELTA", experience: "10 năm kinh nghiệm", photo: unsplash("photo-1507003211169-0a1dd7228f2d", 500) },
  { name: "Cô Lê Thu Hà", specialty: "Giao tiếp phản xạ", certificate: "IELTS 7.5 · TKT", experience: "6 năm kinh nghiệm", photo: unsplash("photo-1544005313-94ddf0286df2", 500) },
  { name: "Thầy Phạm Đức Huy", specialty: "Ngữ pháp & Viết", certificate: "Thạc sĩ TESOL", experience: "12 năm kinh nghiệm", photo: unsplash("photo-1500648767791-00dcc994a43e", 500) },
  { name: "Cô Võ Ngọc Lan", specialty: "Cambridge YLE", certificate: "IELTS 8.0 · CELTA", experience: "7 năm kinh nghiệm", photo: unsplash("photo-1438761681033-6461ffad8d80", 500) },
  { name: "Thầy Đặng Minh Khoa", specialty: "Phát âm chuẩn", certificate: "IELTS 8.0 · TESOL", experience: "5 năm kinh nghiệm", photo: unsplash("photo-1472099645785-5658abf4ff4e", 500) },
]

export type Testimonial = { name: string; role: string; quote: string; rating: number; avatar: string }

export const TESTIMONIALS: Testimonial[] = [
  { name: "Chị Hoàng Thảo", role: "Phụ huynh bé Minh Khang (8 tuổi)", quote: "Sau 8 tháng, bé tự tin giới thiệu bản thân bằng tiếng Anh và rất mong chờ mỗi buổi học. Thầy cô theo sát và báo cáo rất chi tiết.", rating: 5, avatar: unsplash("photo-1494790108377-be9c29b29330", 200) },
  { name: "Nguyễn Gia Huy", role: "Học viên lớp B1", quote: "Lớp ít người nên mình được nói rất nhiều. Phản xạ giao tiếp cải thiện rõ rệt, giờ mình đã sẵn sàng học lên IELTS.", rating: 5, avatar: unsplash("photo-1500648767791-00dcc994a43e", 200) },
  { name: "Trần Mai Phương", role: "Sinh viên năm 2", quote: "Lịch học linh hoạt, giáo viên nhiệt tình, tài liệu dễ hiểu. Mình rất thích các buổi dự án thuyết trình cuối tháng.", rating: 5, avatar: unsplash("photo-1531123897727-8f129e1688ce", 200) },
  { name: "Anh Lê Văn Tâm", role: "Phụ huynh bé Bảo Ngọc (12 tuổi)", quote: "Trung tâm chuyên nghiệp, cơ sở vật chất sạch đẹp. Con tôi đạt chứng chỉ Cambridge Flyers với điểm tối đa.", rating: 5, avatar: unsplash("photo-1507003211169-0a1dd7228f2d", 200) },
]


export const GALLERY = [
  { src: unsplash("photo-1588072432836-e10032774350", 900), alt: "Giờ học nhóm" },
  { src: unsplash("photo-1577896851231-70ef18881754", 700), alt: "Hoạt động trên lớp" },
  { src: unsplash("photo-1546410531-bb4caa6b424d", 700), alt: "Học viên đọc sách" },
  { src: unsplash("photo-1606761568499-6d2451b23c66", 700), alt: "Học viên làm bài" },
  { src: unsplash("photo-1571260899304-425eee4c7efc", 700), alt: "Ngày hội học tập" },
  { src: unsplash("photo-1596495577886-d920f1fb7238", 900), alt: "Lớp học thiếu nhi" },
]

export const HERO_IMAGE = unsplash("photo-1544717305-2782549b5136", 900)

export const ABOUT_VALUES = [
  { icon: Sparkles, title: "Sứ mệnh", desc: "Giúp mỗi học viên Việt Nam tự tin sử dụng ngoại ngữ để học tập, làm việc và hội nhập." },
  { icon: HeartHandshake, title: "Giá trị cốt lõi", desc: "Tận tâm – Sáng tạo – Trách nhiệm. Lấy học viên làm trung tâm trong mọi hoạt động." },
  { icon: MessagesSquare, title: "Phương pháp", desc: "Học qua trải nghiệm, giao tiếp thực tế và phản hồi liên tục sau từng buổi học." },
]
