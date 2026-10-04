import { useMemo, useSyncExternalStore } from "react"
import { unsplash } from "@/lib/images"

export type PostStatus = "draft" | "published"

export const POST_STATUS_META: Record<PostStatus, { label: string; badge: "neutral" | "success"; description: string }> = {
  draft: { label: "Bản nháp", badge: "neutral", description: "Chỉ mình bạn (và quản trị) nhìn thấy, chưa hiển thị trên website." },
  published: { label: "Đã đăng", badge: "success", description: "Đang hiển thị trong mục Tin tức & sự kiện trên trang chủ." },
}

export const POST_CATEGORIES = ["Sự kiện", "Hoạt động", "Thành tích", "Thông báo", "Khoá học"] as const

export type PostCategory = (typeof POST_CATEGORIES)[number]

export type Post = {
  id: string
  title: string
  /** Tóm tắt hiển thị ở landing page. */
  excerpt: string
  content: string
  /** Ảnh bìa. */
  cover: string
  category: PostCategory
  /** dd/MM/yyyy */
  date: string
  facebookUrl?: string
  status: PostStatus
  author: string
}

/** Nguồn dữ liệu dùng chung giữa trang quản lý bài đăng (khu vực nhân viên) và landing page. */
const SEED_POSTS: Post[] = [
  {
    id: "post1",
    title: "Khai giảng khóa học mùa Thu 2026 – Ưu đãi 20% học phí",
    excerpt: "Đăng ký trước 15/10 để nhận ưu đãi học phí cùng bộ giáo trình độc quyền và balo xinh xắn.",
    content:
      "Trung tâm trân trọng thông báo khai giảng các khóa học mùa Thu 2026. Học viên đăng ký trước 15/10/2026 được giảm 20% học phí khóa đầu tiên, tặng bộ giáo trình độc quyền và balo học tập.\n\nBuổi khai giảng diễn ra lúc 17:00 ngày 05/10/2026 tại hành lang tầng 1, phụ huynh học viên nhỏ tuổi có thể cùng tham dự. Vui lòng liên hệ phòng tư vấn để giữ chỗ.",
    cover: unsplash("photo-1427504494785-3a9ca7044f45", 700),
    category: "Sự kiện",
    date: "28/09/2026",
    facebookUrl: "https://facebook.com/",
    status: "published",
    author: "Trần Thị Hồng Nhung",
  },
  {
    id: "post2",
    title: "English Day 2026: Ngày hội tiếng Anh cho cả gia đình",
    excerpt: "Chuỗi trò chơi, thi hùng biện và workshop miễn phí dành cho học viên và phụ huynh.",
    content:
      "English Day 2026 sẽ diễn ra ngày 25/10/2026 tại sân trường với 4 khu trải nghiệm: sân khấu học thuật, gian hàng sách, workshop phát âm và góc tư vấn khóa học.\n\nHọc viên được tham gia miễn phí. Phụ huynh đăng ký trước sẽ nhận phiếu quà tặng dùng tại quầy sách.",
    cover: unsplash("photo-1529390079861-591de354faf5", 700),
    category: "Hoạt động",
    date: "20/09/2026",
    facebookUrl: "https://facebook.com/",
    status: "published",
    author: "Lê Quốc Bảo",
  },
  {
    id: "post3",
    title: "Chúc mừng 32 học viên đạt chứng chỉ Cambridge",
    excerpt: "Thành tích ấn tượng trong kỳ thi Cambridge YLE tháng 8 với nhiều bạn đạt tuyệt đối 15 khiên.",
    content:
      "Trong kỳ thi Cambridge YLE tháng 8 vừa qua, 32 học viên của trung tâm đã đạt chứng chỉ, trong đó có 11 bạn đạt tuyệt đối 15 khiên.\n\nChúng tôi cũng muốn cảm ơn phụ huynh đã đồng hành cùng các em trong suốt quá trình ôn tập.",
    cover: unsplash("photo-1523240795612-9a054b0db644", 700),
    category: "Thành tích",
    date: "05/09/2026",
    status: "published",
    author: "Phạm Thùy Linh",
  },
  {
    id: "post4",
    title: "Mở lớp C1 Buổi Tối 01 – dự kiến khai giảng 19/10",
    excerpt: "Lớp luyện thi nâng cao dành cho học viên đã đạt B2, sĩ lượng tối đa 14 em.",
    content:
      "Trung tâm dự kiến khai giảng lớp C1 Buổi Tối 01 vào 19/10/2026 tại phòng 401. Lớp dành cho học viên đã hoàn thành B2, tập trung kỹ năng nghe nói và luyện đề theo chuẩn.\n\nHọc viên đăng ký trước 12/10 được giữ chỗ và giảm 10% học phí.",
    cover: unsplash("photo-1524178232363-1fb2b075b655", 700),
    category: "Khoá học",
    date: "01/10/2026",
    status: "draft",
    author: "Vũ Khánh Chi",
  },
]

let posts: Post[] = SEED_POSTS
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

/** Đăng ký lắng nghe thay đổi (dùng kèm `useSyncExternalStore`). */
export function subscribePosts(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function byDateDesc(a: Post, b: Post) {
  const [dayA, monthA, yearA] = a.date.split("/").map(Number)
  const [dayB, monthB, yearB] = b.date.split("/").map(Number)
  return new Date(yearB, monthB - 1, dayB).getTime() - new Date(yearA, monthA - 1, dayA).getTime()
}

export function getPosts() {
  return posts
}

/** Bài đã đăng, mới nhất trước — đây là dữ liệu hiển thị trên landing page. */
export function getPublishedPosts() {
  return posts.filter((post) => post.status === "published").sort(byDateDesc)
}

export function getDraftPosts() {
  return posts.filter((post) => post.status === "draft").sort(byDateDesc)
}

export function upsertPost(post: Post) {
  const exists = posts.some((item) => item.id === post.id)
  posts = exists ? posts.map((item) => (item.id === post.id ? post : item)) : [post, ...posts]
  emit()
  return post
}

export function removePost(id: string) {
  posts = posts.filter((post) => post.id !== id)
  emit()
}

let postSeq = SEED_POSTS.length

export function nextPostId() {
  postSeq += 1
  return `post-${postSeq}`
}

/** Hook đồng bộ danh sách bài đã đăng giữa khu vực nhân viên và landing page. */
export function usePublishedPosts() {
  const allPosts = useSyncExternalStore(subscribePosts, getPosts, getPosts)

  return useMemo(
    () => allPosts.filter((post) => post.status === "published").sort(byDateDesc),
    [allPosts],
  )
}

export function useAllPosts() {
  return useSyncExternalStore(subscribePosts, getPosts, getPosts)
}
