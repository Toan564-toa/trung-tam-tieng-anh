
// Dữ liệu demo bám theo mock của frontend (`frontend/src/data/*.ts`) để khi nối API
// các màn hiện ra dữ liệu tương tự. Toàn bộ là dữ liệu GIẢ, không có thông tin thật.
//
// "Ngày hôm nay" của dữ liệu mock là 02/10/2026 nên mọi mốc thời gian neo quanh
// tháng 9–10/2026. Công nợ quá hạn được tính theo CURRENT_DATE của database.

export const DEMO_TODAY = new Date('2026-10-02T08:00:00Z');

const DAY = 86_400_000;

function day(offset: number): Date {
  return new Date(DEMO_TODAY.getTime() + offset * DAY);
}

// Số ngẫu nhiên có th�� lặp lại: cùng seed cho cùng dữ liệu, tiện cho việc đối chiếu.
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!;
}

// ---------------------------------------------------------------------------
// Danh mục
// ---------------------------------------------------------------------------

export const SETTINGS: Array<{ key: string; value: unknown; description: string }> = [
  { key: 'name', value: 'TRUNG TÂM', description: 'Tên hiển thị trên phiếu thu' },
  { key: 'address', value: '128 Lê Lợi, Quận 1, TP. Hồ Chí Minh', description: 'Địa chỉ trung tâm' },
  { key: 'phone', value: '0909 123 456', description: 'Số điện thoại trung tâm' },
  { key: 'email', value: 'lienhe@ttnn.edu.vn', description: 'Email liên hệ' },
  { key: 'tax_code', value: '0314782916', description: 'Mã số thuế' },
  { key: 'academic_year', value: '2026 – 2027', description: 'Năm học đang hiệu lực' },
  { key: 'academic_start', value: '01/09/2026', description: 'Ngày bắt đầu năm học' },
  { key: 'academic_end', value: '31/08/2027', description: 'Ngày kết thúc năm học' },
  { key: 'attendance_lock_days', value: 7, description: 'Số ngày sau khi lưu thì khoá điểm danh' },
  { key: 'receipt_header', value: 'PHIẾU THU HỌC PHÍ', description: 'Tiêu đề phiếu thu' },
  {
    key: 'receipt_footer',
    value: 'Phiếu thu này có giá trị giải trừ khi đã có dấu của Trung tâm.',
    description: 'Chân phiếu thu',
  },
  { key: 'allow_self_enroll', value: false, description: 'Cho phép học viên tự ghi danh' },
  { key: 'require_password_change', value: true, description: 'Bắt buộc đổi mật khẩu lần đầu' },
  { key: 'notify_parent_on_payment', value: true, description: 'Thông báo phụ huynh khi thu tiền' },
];

export const TIME_SLOTS = [
  { code: 'CA1', label: 'Ca 1', startTime: '06:30', endTime: '08:00', sortOrder: 1 },
  { code: 'CA2', label: 'Ca 2', startTime: '08:15', endTime: '09:45', sortOrder: 2 },
  { code: 'CA3', label: 'Ca 3', startTime: '10:00', endTime: '11:30', sortOrder: 3 },
  { code: 'CA4', label: 'Ca 4', startTime: '13:30', endTime: '15:00', sortOrder: 4 },
  { code: 'CA5', label: 'Ca 5', startTime: '15:15', endTime: '16:45', sortOrder: 5 },
  { code: 'CA6', label: 'Ca 6', startTime: '17:00', endTime: '18:30', sortOrder: 6 },
  { code: 'CA7', label: 'Ca 7', startTime: '19:00', endTime: '20:30', sortOrder: 7 },
  // Ca 8 của giao diện (19:45–21:15) chồng Ca 7 — xem [CẦN XÁC NHẬN] Q6 trong DECISIONS.md
  { code: 'CA8', label: 'Ca 8', startTime: '19:45', endTime: '21:15', sortOrder: 8 },
];

export const BRANCH = {
  name: 'TRUNG TÂM NGOẠI NGỮ',
  address: '128 Lê Lợi, Quận 1, TP. Hồ Chí Minh',
  phone: '0909 123 456',
};

export const ROOMS = [
  { name: 'Phòng 103', capacity: 18, floor: 1, equipment: ['Máy chiếu', 'Loa'] },
  { name: 'Phòng 204', capacity: 20, floor: 2, equipment: ['Máy chiếu', 'Loa', 'Bảng trắng'] },
  { name: 'Phòng 301', capacity: 16, floor: 3, equipment: ['TV 55 inch', 'Loa'] },
  { name: 'Phòng 401', capacity: 12, floor: 4, equipment: ['Máy tính cá nhân', 'Tai nghe'] },
];

export const COURSES = [
  {
    code: 'KHOA-STARTER',
    slug: 'tieng-anh-khoi-dau',
    name: 'Tiếng Anh Khởi Đầu',
    level: 'Starter · Pre A1',
    levelTone: 'success',
    audience: 'Thiếu nhi 6–10 tuổi',
    listPrice: 12_800_000,
    minAge: 6,
    maxAge: 10,
    schedule: ['Thứ 2 & Thứ 4 · 17:30 – 19:00', 'Thứ 7 & CN · 08:00 – 09:30'],
    highlights: ['Phát âm chuẩn', 'Học qua trò chơi', 'Lớp tối đa 12 bạn'],
    featured: false,
    targetStudents: 40,
  },
  {
    code: 'KHOA-A1',
    slug: 'tieng-anh-so-cap',
    name: 'Tiếng Anh Sơ Cấp',
    level: 'A1 · Beginner',
    levelTone: 'info',
    audience: 'Thiếu niên & người mới bắt đầu',
    listPrice: 14_400_000,
    minAge: 10,
    maxAge: 99,
    schedule: ['Thứ 3 & Thứ 5 · 18:00 – 19:30', 'Thứ 7 & CN · 14:00 – 15:30'],
    highlights: ['Ngữ pháp nền tảng', '1.000+ từ vựng', 'Giao tiếp cơ bản'],
    featured: false,
    targetStudents: 60,
  },
  {
    code: 'KHOA-A2',
    slug: 'tieng-anh-tien-trung-cap',
    name: 'Tiếng Anh Tiền Trung Cấp',
    level: 'A2 · Elementary',
    levelTone: 'brand',
    audience: 'Học sinh THCS – THPT',
    listPrice: 15_200_000,
    minAge: 11,
    maxAge: 99,
    schedule: ['Thứ 2 & Thứ 6 · 19:00 – 20:30', 'Thứ 7 & CN · 09:45 – 11:15'],
    highlights: ['4 kỹ năng toàn diện', 'Luyện đề Cambridge', 'Dự án thuyết trình'],
    featured: true,
    targetStudents: 80,
  },
  {
    code: 'KHOA-B1',
    slug: 'tieng-anh-trung-cap',
    name: 'Tiếng Anh Trung Cấp',
    level: 'B1 · Intermediate',
    levelTone: 'warning',
    audience: 'Học sinh, sinh viên, người đi làm',
    listPrice: 16_800_000,
    minAge: 13,
    maxAge: 99,
    schedule: ['Thứ 3 & Thứ 5 · 19:45 – 21:15', 'Thứ 7 & CN · 16:00 – 17:30'],
    highlights: ['Phản xạ giao tiếp', 'Viết luận học thuật', 'Định hướng IELTS'],
    featured: false,
    targetStudents: 70,
  },
];

export const TEACHERS = [
  {
    code: 'GV0012',
    fullName: 'Nguyễn Minh Anh',
    email: 'minhanh.nguyen@trungtam.edu.vn',
    phone: '0908 224 118',
    specialty: 'Tiếng Anh thiếu nhi & A2',
    certificate: 'IELTS 8.0 · TESOL',
    experience: '8 năm',
    education: 'Thạc sĩ Ngôn ngữ học ứng dụng – ĐH Sư phạm TP.HCM',
    bio: '8 năm giảng dạy tiếng Anh cho học sinh THCS và thiếu nhi. Chuyên phương pháp giao tiếp tự nhiên, đồng thời là huấn luyện viên phòng thi Cambridge YLE của trung tâm.',
    startDate: '15/09/2021',
    showOnWebsite: true,
  },
  {
    code: 'GV0002',
    fullName: 'Trần Quốc Bảo',
    email: 'quocbao.tran@trungtam.edu.vn',
    phone: '0912 445 118',
    specialty: 'Luyện thi IELTS',
    certificate: 'IELTS 8.5 · CELTA',
    experience: '10 năm',
    education: 'Thạc sĩ Giáo dục – ĐH Quốc gia TP.HCM',
    bio: '10 năm luyện thi IELTS, đồng hành cùng hơn 300 học viên đạt band 6.5 trở lên.',
    startDate: '02/09/2019',
    showOnWebsite: true,
  },
  {
    code: 'GV0003',
    fullName: 'Lê Thu Hà',
    email: 'thuha.le@trungtam.edu.vn',
    phone: '0907 812 336',
    specialty: 'Giao tiếp phản xạ',
    certificate: 'IELTS 7.5 · TKT',
    experience: '6 năm',
    education: 'Cử nhân Sư phạm Tiếng Anh – ĐH Sư phạm TP.HCM',
    bio: 'Chuyên lớp giao tiếp phản xạ, phương pháp học bằng hoạt động và tình huống thực tế.',
    startDate: '10/01/2022',
    showOnWebsite: true,
  },
  {
    code: 'GV0004',
    fullName: 'Phạm Đức Huy',
    email: 'duchuy.pham@trungtam.edu.vn',
    phone: '0987 331 205',
    specialty: 'Ngữ pháp & Viết',
    certificate: 'Thạc sĩ TESOL',
    experience: '12 năm',
    education: 'Tiến sĩ Ngôn ngữ học – ĐH Quốc gia TP.HCM',
    bio: '12 năm dạy ngữ pháp và kỹ năng viết học thuật cho lớp trung cấp.',
    startDate: '05/09/2017',
    showOnWebsite: true,
  },
  {
    code: 'GV0005',
    fullName: 'Võ Ngọc Lan',
    email: 'ngoclan.vo@trungtam.edu.vn',
    phone: '0966 540 771',
    specialty: 'Cambridge YLE',
    certificate: 'IELTS 8.0 · CELTA',
    experience: '7 năm',
    education: 'Thạc sĩ Giáo dục trẻ em – ĐH Sư phạm TP.HCM',
    bio: 'Chuyên luyện Cambridge YLE cho thiếu nhi 6–12 tuổi, tỷ lệ đỗ cao.',
    startDate: '18/02/2021',
    showOnWebsite: true,
  },
  {
    code: 'GV0006',
    fullName: 'Đặng Minh Khoa',
    email: 'minhkhoa.dang@trungtam.edu.vn',
    phone: '0932 118 640',
    specialty: 'Phát âm chuẩn',
    certificate: 'IELTS 8.0 · TESOL',
    experience: '5 năm',
    education: 'Cử nhân Sư phạm Tiếng Anh – ĐH Bách Khoa TP.HCM',
    bio: '5 năm dạy phát âm và giao tiếp cơ bản cho lớp khởi đầu.',
    startDate: '07/03/2023',
    showOnWebsite: false,
  },
];

export const STAFF = [
  {
    code: 'NV0007',
    fullName: 'Trần Thị Hồng Nhung',
    email: 'hongnhung.tran@trungtam.edu.vn',
    phone: '0903 118 224',
    position: 'Nhân viên tư vấn & đào tạo',
    department: 'Phòng Tư vấn – Đào tạo',
    education: 'Thạc sĩ Quản trị Giáo dục – ĐH Sư phạm TP.HCM',
    bio: '4 năm kinh nghiệm tư vấn khóa học và đồng hành cùng phụ huynh trong suốt hành trình học tiếng Anh của con em.',
    startDate: '03/08/2022',
  },
  {
    code: 'NV0002',
    fullName: 'Lê Quốc Bảo',
    email: 'quocbao.le@trungtam.edu.vn',
    phone: '0912 445 118',
    position: 'Trưởng nhóm tư vấn',
    department: 'Phòng Tư vấn – Đào tạo',
    education: 'Cử nhân Marketing – ĐH Kinh tế TP.HCM',
    bio: 'Phụ trách nhóm tư vấn và đào tạo nhân sự tư vấn.',
    startDate: '11/01/2021',
  },
  {
    code: 'NV0003',
    fullName: 'Phạm Thùy Linh',
    email: 'thuylinh.pham@trungtam.edu.vn',
    phone: '0938 220 907',
    position: 'Đào tạo & chăm sóc học viên',
    department: 'Phòng Tư vấn – Đào tạo',
    education: 'Cử nhân Sư phạm Tiếng Anh – ĐH Sư phạm TP.HCM',
    bio: 'Theo dõi học viên trong suốt khoá học và phối hợp phụ huynh.',
    startDate: '20/09/2022',
  },
  {
    code: 'NV0004',
    fullName: 'Đỗ Anh Tuấn',
    email: 'anhtuan.do@trungtam.edu.vn',
    phone: '0975 663 204',
    position: 'Thu học & hồ sơ',
    department: 'Phòng Hành chính',
    education: 'Thạc sĩ Quản trị – ĐH Hàng Khánh',
    bio: 'Phụ trách thu học, hồ sơ học viên và đối soát tiền mặt cuối ngày.',
    startDate: '15/05/2020',
  },
  {
    code: 'NV0005',
    fullName: 'Vũ Khánh Chi',
    email: 'khanchi.vu@trungtam.edu.vn',
    phone: '0907 812 336',
    position: 'Tư vấn khóa thi',
    department: 'Phòng Tư vấn – Đào tạo',
    education: 'Cử nhân Toán – ĐH Bách Khoa TP.HCM',
    bio: 'Tư vấn các khóa thi Cambridge và lộ trình thi chứng chỉ cho học viên.',
    startDate: '06/11/2023',
  },
];

export const LEAD_SOURCES = ['Facebook', 'Website', 'Zalo', 'Giới thiệu', 'Khách vãng lai'];

export const EVENT_TYPES = [
  { name: 'Buổi học', color: 'brand' },
  { name: 'Kỳ thi', color: 'warning' },
  { name: 'Nghỉ lễ', color: 'danger' },
  { name: 'Sự kiện', color: 'success' },
  { name: 'Tập huấn', color: 'info' },
];

export const POST_CATEGORIES = [
  { name: 'Sự kiện', slug: 'su-kien' },
  { name: 'Hoạt động', slug: 'hoat-dong' },
  { name: 'Thành tích', slug: 'thanh-tich' },
  { name: 'Thông báo', slug: 'thong-bao' },
  { name: 'Khoá học', slug: 'khoa-hoc' },
];

export const TESTIMONIALS = [
  {
    name: 'Chị Hoàng Thảo',
    role: 'Phụ huynh bé Minh Khang (8 tuổi)',
    quote: 'Sau 8 tháng, bé tự tin giới thiệu bản thân bằng tiếng Anh và rất mong chờ mỗi buổi học. Thầy cô theo sát và báo cáo rất chi tiết.',
    rating: 5,
  },
  {
    name: 'Nguyễn Gia Huy',
    role: 'Học viên lớp B1',
    quote: 'Lớp ít người nên mình được nói rất nhiều. Phản xạ giao tiếp cải thiện rõ rệt, giờ mình đã sẵn sàng học lên IELTS.',
    rating: 5,
  },
  {
    name: 'Trần Mai Phương',
    role: 'Sinh viên năm 2',
    quote: 'Lịch học linh hoạt, giáo viên nhiệt tình, tài liệu dễ hiểu. Mình rất thích các buổi dự án thuyết trình cuối tháng.',
    rating: 5,
  },
  {
    name: 'Anh Lê Văn Tâm',
    role: 'Phụ huynh bé Bảo Ngọc (12 tuổi)',
    quote: 'Trung tâm chuyên nghiệp, cơ sở vật chất sạch đẹp. Con tôi đạt chứng chỉ Cambridge Flyers với điểm tối đa.',
    rating: 5,
  },
];

export const SITE_BANNERS = [
  {
    title: 'Nâng tầm tiếng Anh cùng giáo viên bản ngữ',
    subtitle: 'Khóa học A1 – C1, lớp nhỏ tối đa 20 học viên, học thật trong lớp.',
    cta: 'Xem khóa học',
    link: '/khoa-hoc',
  },
  {
    title: 'Ưu đãi khai giảng mùa Thu 2026',
    subtitle: 'Giảm 20% học phí khóa đầu tiên cho học viên đăng ký trong tháng 10.',
    cta: 'Nhận ưu đãi',
    link: '/lien-he',
  },
  {
    title: 'Lớp cuối khóa B1 khai giảng 15/10',
    subtitle: 'Còn 4 chỗ, ưu tiên học viên đã học tại trung tâm.',
    cta: 'Đăng ký ngay',
    link: '/lien-he',
  },
];

export const POSTS = [
  {
    title: 'Khai giảng khóa Tiếng Anh Tiền Trung Cấp (A2)',
    slug: 'khai-giang-khoa-a2',
    excerpt: 'Ngày 05/10/2026, khóa A2 buổi tối chính thức khai giảng tại phòng 204 với 18 học viên.',
    content:
      'Ngày 05/10/2026, khóa Tiếng Anh Tiền Trung Cấp (A2) chính thức khai giảng. Lớp học 2 buổi/tuần trong 8 tháng, tổng 64 buổi.\n\nCô Nguyễn Minh Anh phụ trách chuyên môn, lớp tối đa 20 học viên nhằm đảm bảo mỗi người đều được nói nhiều.\n\nPhụ huynh theo dõi học kỳ qua báo cáo tiến độ trên hệ thống sau mỗi buổi học.',
    category: 'Sự kiện',
    status: 'PUBLISHED' as const,
    offsetDays: -3,
  },
  {
    title: 'Kết quả Cambridge YLE học kỳ vừa qua',
    slug: 'ket-qua-cambridge-yle',
    excerpt: '24/28 học viên đạt chứng chỉ Starters, trong đó có 6 học viên đạt điểm tuyệt đối 9/9 hạng.',
    content:
      'Học kỳ vừa qua, 24 trong 28 học viên lớp Cambridge YLE đã đạt chứng chỉ Starters.\n\nChúng tôi chúc mừng các em và phụ huynh. Kết quả này đến từ sự đều đặn chuyên cần của các em và sự đồng hành của phụ huynh.',
    category: 'Thành tích',
    status: 'PUBLISHED' as const,
    offsetDays: -12,
  },
  {
    title: 'Thông báo nghỉ lễ Quốc khánh 01/09',
    slug: 'thong-bao-nghi-le-quoc-khanh',
    excerpt: 'Trung tâm nghỉ ngày 01/09/2026. Các lớp học chuyển sang học bù vào cuối tuần kế tiếp.',
    content:
      'Nhân dịp Quốc khánh 01/09/2026, Trung tâm nghỉ một ngày.\n\nCác buổi học bị ảnh hưởng sẽ được chuyển sang học bù vào cuối tuần kế tiếp. Phụ huynh sẽ nhận thông báo cụ thể qua tin nhắn của giáo viên phụ trách.',
    category: 'Thông báo',
    status: 'PUBLISHED' as const,
    offsetDays: -32,
  },
  {
    title: 'Mở lớp B1 buổi tối tháng 10',
    slug: 'mo-lop-b1-buoi-toi',
    excerpt: 'Lớp B1 buổi tối dự kiến khai giảng 15/10/2026, còn 4 chỗ.',
    content: 'Lớp B1 buổi tối dự kiến khai giảng 15/10/2026 với tối đa 16 học viên. Học 2 buổi/tuần, 64 buổi trong 8 tháng.',
    category: 'Khoá học',
    status: 'PENDING' as const,
    offsetDays: -1,
  },
  {
    title: 'Ngày hội giao tiếp tiếng Anh lần thứ 8',
    slug: 'ngay-hoi-giao-tiep-lan-8',
    excerpt: 'Ngày hội sẽ diễn ra ngày 20/12/2026 tại hội trường trung tâm.',
    content: 'Ngày hội giao tiếp tiếng Anh lần thứ 8 dự kiến tổ chức ngày 20/12/2026 tại hội trường Trung tâm.',
    category: 'Hoạt động',
    status: 'DRAFT' as const,
    offsetDays: 0,
  },
];

// ---------------------------------------------------------------------------
// Lớp học, học viên và dữ liệu vận hành
// ---------------------------------------------------------------------------

export const CLASSES = [
  {
    classCode: 'A2T01',
    name: 'A2 Buổi Tối 01',
    courseCode: 'KHOA-A2',
    teacherCode: 'GV0012',
    staffCode: 'NV0007',
    roomName: 'Phòng 204',
    weekdays: [1, 4],
    timeSlotCode: 'CA7',
    startTime: '19:00',
    endTime: '20:30',
    studentCount: 18,
    maxStudents: 20,
    startDate: '06/07/2026',
    endDate: '24/02/2027',
    doneLessons: 24,
    status: 'ACTIVE' as const,
  },
  {
    classCode: 'B1T02',
    name: 'B1 Buổi Tối 02',
    courseCode: 'KHOA-B1',
    teacherCode: 'GV0002',
    staffCode: 'NV0003',
    roomName: 'Phòng 301',
    weekdays: [2, 5],
    timeSlotCode: 'CA8',
    startTime: '19:45',
    endTime: '21:15',
    studentCount: 14,
    maxStudents: 16,
    startDate: '11/05/2026',
    endDate: '17/12/2026',
    doneLessons: 31,
    status: 'ACTIVE' as const,
  },
  {
    classCode: 'Y3SAT',
    name: 'Thiếu nhi Y3 Sabato',
    courseCode: 'KHOA-STARTER',
    teacherCode: 'GV0005',
    staffCode: 'NV0007',
    roomName: 'Phòng 103',
    weekdays: [6, 0],
    timeSlotCode: 'CA2',
    startTime: '08:15',
    endTime: '09:45',
    studentCount: 12,
    maxStudents: 14,
    startDate: '14/06/2026',
    endDate: '13/12/2026',
    doneLessons: 28,
    status: 'ACTIVE' as const,
  },
  {
    classCode: 'A1E03',
    name: 'A1 Buổi Sáng 03',
    courseCode: 'KHOA-A1',
    teacherCode: 'GV0003',
    staffCode: 'NV0004',
    roomName: 'Phòng 103',
    weekdays: [2, 6],
    timeSlotCode: 'CA2',
    startTime: '08:15',
    endTime: '09:45',
    studentCount: 14,
    maxStudents: 18,
    startDate: '12/01/2026',
    endDate: '05/12/2026',
    doneLessons: 21,
    status: 'ACTIVE' as const,
  },
  {
    classCode: 'C1T01',
    name: 'C1 Buổi Tối 01',
    courseCode: 'KHOA-B1',
    teacherCode: 'GV0004',
    staffCode: 'NV0005',
    roomName: 'Phòng 401',
    weekdays: [3, 6],
    timeSlotCode: 'CA7',
    startTime: '19:00',
    endTime: '20:45',
    studentCount: 8,
    maxStudents: 12,
    startDate: '01/09/2026',
    endDate: '20/03/2027',
    doneLessons: 5,
    status: 'ACTIVE' as const,
  },
  {
    classCode: 'A1S11',
    name: 'A1 Buổi Sáng 11',
    courseCode: 'KHOA-A1',
    teacherCode: 'GV0006',
    staffCode: 'NV0003',
    roomName: 'Phòng 103',
    weekdays: [1, 3],
    timeSlotCode: 'CA1',
    startTime: '06:30',
    endTime: '08:00',
    studentCount: 0,
    maxStudents: 16,
    startDate: '12/10/2026',
    endDate: '05/07/2027',
    doneLessons: 0,
    status: 'PLANNED' as const,
  },
];

const MALE_NAMES = [
  'Nguyễn Văn An', 'Trần Quốc Bảo', 'Lê Hoàng Mỹ Duyên', 'Phạm Quỳnh Anh', 'Huỳnh Đức Cường',
  'Võ Thành Đạt', 'Đặng Minh Đức', 'Bùi Gia Hân', 'Đỗ Tuấn Hiệp', 'Ngô Trung Kiên',
  'Dương Đình Khoa', 'Lý Quang Minh',
];

const FEMALE_NAMES = [
  'Nguyễn Thị Hồng Nhung', 'Trần Ngọc Bích Châu', 'Lê Hoàng Mỹ Duyên', 'Phạm Quỳnh Anh',
  'Huỳnh Thị Thu Hà', 'Võ Ngọc Khánh Linh', 'Đặng Thùy Nhung', 'Bùi Kim Yến', 'Đỗ Khánh Linh',
  'Vũ Hoàng Mỹ', 'Nguyễn Thanh Như', 'Phan Ngọc Yến',
];

const GUARDIAN_NAMES: Array<[string, string]> = [
  ['Nguyễn Văn Hùng', 'Bố'],
  ['Trần Thị Mai', 'Mẹ'],
  ['Lê Quang Vinh', 'Bố'],
  ['Phạm Thị Hồng', 'Mẹ'],
  ['Huỳnh Ngọc Tuấn', 'Bố'],
  ['Võ Thị Lan', 'Mẹ'],
];

const OCCUPATIONS = ['Học sinh', 'Sinh viên', 'Giáo viên', 'Kỹ sư', 'Nhân viên văn phòng'];
const STREETS = [
  '12 Nguyễn Huệ, Q.1',
  '45 Lê Lợi, Q.1',
  '88 Hai Bà Trưng, Q.3',
  '210 Điện Biên Phủ, Q.7',
  '35 Cách Mạng Tháng Tám, Q.10',
];

const ATTENDANCE_RATES = [96, 92, 100, 88, 84, 96, 78, 92, 88, 100, 92, 84];
const AVERAGE_SCORES = [8.8, 9.1, 8.4, 7.9, 7.2, 8.6, 6.8, 8.2, 7.5, 9.3];
const PAYMENT_METHODS = ['CASH', 'TRANSFER', 'CARD', 'EWALLET'] as const;

export interface DemoStudent {
  studentCode: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  identityNo: string;
  occupation: string;
  guardian: { fullName: string; relation: string; phone: string; email: string };
  classCode: string;
  level: string;
  paidRatio: number;
  dueOffsetDays: number;
}

/** Sinh danh sách học viên demo theo sĩ số từng lớp. */
export function buildDemoStudents(): DemoStudent[] {
  const rand = makeRandom(20261002);
  const list: DemoStudent[] = [];
  let index = 0;

  for (const cls of CLASSES) {
    for (let i = 0; i < cls.studentCount; i += 1) {
      const isMale = index % 2 === 0;
      const pool = isMale ? MALE_NAMES : FEMALE_NAMES;
      const fullName = pool[index % pool.length]!;
      const [guardianName, relation] = GUARDIAN_NAMES[index % GUARDIAN_NAMES.length]!;
      const course = COURSES.find((c) => c.code === cls.courseCode)!;
      const level = course.level.split(' · ')[0]!;
      // 60% đã đóng đủ, 25% đóng một phần, 15% chưa đóng gì -> có cả công nợ quá hạn.
      const roll = rand();
      const paidRatio = roll < 0.6 ? 1 : roll < 0.85 ? 0.5 : 0;

      list.push({
        studentCode: `HV${cls.startDate.slice(6)}-${String(300 + index).padStart(4, '0')}`,
        fullName,
        gender: isMale ? 'MALE' : 'FEMALE',
        birthDate: `${String(2 + ((index * 3) % 26)).padStart(2, '0')}/${String(1 + ((index * 5) % 12)).padStart(2, '0')}/${2016 + (index % 4)}`,
        phone: `09${String(10 + (index % 80)).padStart(2, '0')} ${String(100 + index * 31).padStart(3, '0')} ${String(200 + index * 47).padStart(3, '0')}`,
        email: `${fullName.toLowerCase().replace(/ /g, '.')}@student.edu.vn`,
        address: STREETS[index % STREETS.length]!,
        identityNo: `0${(index % 9) + 1}${String(200000000 + index * 6151).slice(0, 9)}`,
        occupation: OCCUPATIONS[index % OCCUPATIONS.length]!,
        guardian: {
          fullName: guardianName,
          relation,
          phone: `09${String(30 + (index % 60)).padStart(2, '0')} ${String(400 + index * 29).padStart(3, '0')} ${String(500 + index * 43).padStart(3, '0')}`,
          email: `${guardianName.toLowerCase().replace(/ /g, '.')}@gmail.com`,
        },
        classCode: cls.classCode,
        level,
        paidRatio,
        dueOffsetDays: 15 - (index % 75),
      });
      index += 1;
    }
  }

  return list;
}

export const LEADS = [
  { fullName: 'Nguyễn Thu Trang', phone: '0903 221 145', age: 34, source: 'Facebook', status: 'NEW' as const, courseCode: 'KHOA-A1', nextFollowUpOffset: 1, expectedFee: 14_400_000 },
  { fullName: 'Trương Minh Khôi', phone: '0917 884 302', age: 41, source: 'Website', status: 'CONTACTED' as const, courseCode: 'KHOA-B1', nextFollowUpOffset: 2, expectedFee: 16_800_000 },
  { fullName: 'Lê Bảo Châu', phone: '0938 112 776', age: 28, source: 'Zalo', status: 'TRIAL' as const, courseCode: 'KHOA-A2', nextFollowUpOffset: 0, expectedFee: 15_200_000 },
  { fullName: 'Phạm Gia Linh', phone: '0965 440 118', age: 37, source: 'Giới thiệu', status: 'WON' as const, courseCode: 'KHOA-A1', nextFollowUpOffset: -3, expectedFee: 14_400_000 },
  { fullName: 'Hoàng Thị Mỹ Dung', phone: '0908 773 210', age: 45, source: 'Facebook', status: 'LOST' as const, courseCode: 'KHOA-STARTER', nextFollowUpOffset: -8, expectedFee: 12_800_000 },
  { fullName: 'Đỗ Quang Huy', phone: '0971 209 884', age: 31, source: 'Khách vãng lai', status: 'NEW' as const, courseCode: 'KHOA-A2', nextFollowUpOffset: 3, expectedFee: 15_200_000 },
  { fullName: 'Vũ Khánh Vy', phone: '0925 663 501', age: 26, source: 'Website', status: 'CONTACTED' as const, courseCode: 'KHOA-B1', nextFollowUpOffset: 1, expectedFee: 16_800_000 },
  { fullName: 'Cao Thị Mai Anh', phone: '0983 117 640', age: 39, source: 'Zalo', status: 'TRIAL' as const, courseCode: 'KHOA-A1', nextFollowUpOffset: 0, expectedFee: 14_400_000 },
];

export const ASSESSMENT_KINDS = ['UNIT', 'MID', 'QUIZ', 'FINAL'] as const;

export function randomIndex(count: number): number {
  return Math.floor(makeRandom(count * 7919)() * count);
}

export { day, makeRandom, pick, PAYMENT_METHODS, ATTENDANCE_RATES, AVERAGE_SCORES };
