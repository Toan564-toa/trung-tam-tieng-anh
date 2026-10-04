import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, Check, Download, Eye, EyeOff, Images, Newspaper, Pencil, Trash2, Users } from "lucide-react"
import { cn } from "cn"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { TableEmpty, TableToolbar, ToolbarSelect } from "@/components/admin/table-toolbar"
import { SmartImage } from "@/components/common/smart-image"
import { StatCard } from "@/components/common/stat-card"
import { PageHeader } from "@/components/layout/page-header"
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { fieldBase, Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import {
  LANDING_BANNERS,
  LANDING_TEACHERS,
  PUBLISH_STATUS_META,
  type LandingBanner,
  type LandingTeacher,
  type PublishStatus,
} from "@/data/admin"
import { POST_STATUS_META, removePost, upsertPost, useAllPosts, type Post } from "@/data/posts"
import { exportAdminTable } from "@/lib/admin-excel"
import { unsplash } from "@/lib/images"

const TABS = [
  { value: "posts", label: "Bài đăng", icon: Newspaper },
  { value: "banners", label: "Banner", icon: Images },
  { value: "teachers", label: "Giáo viên nổi bật", icon: Users },
] as const

type TabValue = (typeof TABS)[number]["value"]

type PostFilter = "all" | Post["status"]
type BannerForm = { id: string; title: string; subtitle: string; cta: string; status: PublishStatus }
type BannerErrors = { title?: string; subtitle?: string; cta?: string }

const PUBLISH_OPTIONS: PublishStatus[] = ["published", "pending", "draft"]

function byDateDesc(a: Post, b: Post) {
  const [dayA, monthA, yearA] = a.date.split("/").map(Number)
  const [dayB, monthB, yearB] = b.date.split("/").map(Number)
  return new Date(yearB, monthB - 1, dayB).getTime() - new Date(yearA, monthA - 1, dayA).getTime()
}

export function AdminContentPage() {
  const posts = useAllPosts()
  const [tab, setTab] = useState<TabValue>("posts")

  const [postQuery, setPostQuery] = useState("")
  const [postFilter, setPostFilter] = useState<PostFilter>("all")
  const [pendingPost, setPendingPost] = useState<Post | null>(null)

  const [banners, setBanners] = useState<LandingBanner[]>(LANDING_BANNERS)
  const [bannerForm, setBannerForm] = useState<BannerForm | null>(null)
  const [bannerErrors, setBannerErrors] = useState<BannerErrors>({})
  const [pendingBanner, setPendingBanner] = useState<LandingBanner | null>(null)

  const [teachers, setTeachers] = useState<LandingTeacher[]>(LANDING_TEACHERS)
  const [pendingTeacher, setPendingTeacher] = useState<LandingTeacher | null>(null)

  const stats = useMemo(() => {
    return {
      posts: posts.length,
      publishedPosts: posts.filter((post) => post.status === "published").length,
      bannerPublished: banners.filter((banner) => banner.status === "published").length,
      teacherPublished: teachers.filter((teacher) => teacher.status === "published").length,
    }
  }, [posts, banners, teachers])

  const filteredPosts = useMemo(() => {
    const needle = postQuery.trim().toLowerCase()
    return posts
      .filter((post) => (postFilter === "all" ? true : post.status === postFilter))
      .filter((post) =>
        needle
          ? post.title.toLowerCase().includes(needle) ||
            post.category.toLowerCase().includes(needle) ||
            post.author.toLowerCase().includes(needle)
          : true,
      )
      .sort(byDateDesc)
  }, [posts, postQuery, postFilter])

  const publishPost = (post: Post, status: Post["status"]) => {
    upsertPost({ ...post, status })
    toast.success(status === "published" ? "Đã duyệt bài đăng" : "Đã ẩn bài đăng", { description: post.title })
  }

  const confirmDeletePost = () => {
    if (!pendingPost) return
    removePost(pendingPost.id)
    toast.success("Đã xoá bài đăng", { description: pendingPost.title })
    setPendingPost(null)
  }

  const openBanner = (banner: LandingBanner) => {
    setBannerForm({ id: banner.id, title: banner.title, subtitle: banner.subtitle, cta: banner.cta, status: banner.status })
    setBannerErrors({})
  }

  const submitBanner = () => {
    if (!bannerForm) return
    const nextErrors: BannerErrors = {}
    if (bannerForm.title.trim().length < 10) nextErrors.title = "Tiêu đề banner cần ít nhất 10 ký tự."
    if (bannerForm.subtitle.trim().length < 20) nextErrors.subtitle = "Mô tả cần ít nhất 20 ký tự."
    if (!bannerForm.cta.trim()) nextErrors.cta = "Vui lòng nhập nhãn nút kêu gọi."
    setBannerErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin banner")
      return
    }
    setBanners((prev) =>
      prev.map((banner) =>
        banner.id === bannerForm.id
          ? {
              ...banner,
              title: bannerForm.title.trim(),
              subtitle: bannerForm.subtitle.trim(),
              cta: bannerForm.cta.trim(),
              status: bannerForm.status,
              updatedAt: banner.updatedAt,
            }
          : banner,
      ),
    )
    toast.success("Đã cập nhật banner", { description: bannerForm.title.trim() })
    setBannerForm(null)
  }

  const setBannerStatus = (banner: LandingBanner, status: PublishStatus) => {
    setBanners((prev) => prev.map((item) => (item.id === banner.id ? { ...item, status } : item)))
    toast.success(status === "published" ? "Đã duyệt banner" : "Đã ẩn banner", { description: banner.title })
  }

  const confirmDeleteBanner = () => {
    if (!pendingBanner) return
    setBanners((prev) => prev.filter((item) => item.id !== pendingBanner.id))
    toast.success("Đã xoá banner", { description: pendingBanner.title })
    setPendingBanner(null)
  }

  const setTeacherStatus = (teacher: LandingTeacher, status: PublishStatus) => {
    setTeachers((prev) => prev.map((item) => (item.id === teacher.id ? { ...item, status } : item)))
    toast.success(status === "published" ? "Đã duyệt giáo viên" : "Đã ẩn giáo viên", { description: teacher.name })
  }

  const moveTeacher = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= teachers.length) return
    setTeachers((prev) => {
      const next = [...prev]
      const current = next[index]
      const swapped = next[target]
      if (!current || !swapped) return prev
      next[index] = swapped
      next[target] = current
      return next
    })
    const moved = teachers[target]
    toast.success(direction === -1 ? "Đã đưa lên trên" : "Đã đưa xuống dưới", { description: moved?.name })
  }

  const confirmDeleteTeacher = () => {
    if (!pendingTeacher) return
    setTeachers((prev) => prev.filter((item) => item.id !== pendingTeacher.id))
    toast.success("Đã xoá giáo viên nổi bật", { description: pendingTeacher.name })
    setPendingTeacher(null)
  }

  const exportBanners = () => {
    void exportAdminTable(
      "Banner-landing-page",
      "Banner",
      ["Mã", "Tiêu đề", "Mô tả", "Nút CTA", "Ảnh", "Trạng thái", "Cập nhật"],
      banners.map((banner) => [
        banner.id,
        banner.title,
        banner.subtitle,
        banner.cta,
        banner.image,
        PUBLISH_STATUS_META[banner.status].label,
        banner.updatedAt,
      ]),
    ).then(() => toast.success("Đã xuất Excel danh sách banner"))
  }

  const exportTeachers = () => {
    void exportAdminTable(
      "Giao-vien-noi-bat",
      "Giáo viên",
      ["Thứ tự", "Tên", "Chuyên môn", "Chứng chỉ", "Kinh nghiệm", "Trạng thái"],
      teachers.map((teacher, index) => [
        index + 1,
        teacher.name,
        teacher.specialty,
        teacher.certificate,
        teacher.experience,
        PUBLISH_STATUS_META[teacher.status].label,
      ]),
    ).then(() => toast.success("Đã xuất Excel danh sách giáo viên"))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Nội dung website"
        title="Nội dung website"
        description="Duyệt bài đăng, banner và giáo viên nổi bật trước khi hiển thị lên trang chủ."
        actions={
          tab === "banners" ? (
            <Button variant="outline" onClick={exportBanners}>
              <Download /> Xuất Excel
            </Button>
          ) : tab === "teachers" ? (
            <Button variant="outline" onClick={exportTeachers}>
              <Download /> Xuất Excel
            </Button>
          ) : null
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem>
          <StatCard label="Bài đăng" value={String(stats.posts)} icon={Newspaper} trend={{ text: `${stats.publishedPosts} đang hiển thị`, tone: "info" }} />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Banner đang chạy"
            value={String(stats.bannerPublished)}
            icon={Images}
            iconClass="bg-sky-100 text-sky-700"
            trend={{ text: `${banners.length} banner trong kho`, tone: "success" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Giáo viên nổi bật"
            value={String(stats.teacherPublished)}
            icon={Users}
            iconClass="bg-green-100 text-success"
            trend={{ text: `${teachers.length} giáo viên`, tone: "success" }}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            label="Chờ duyệt"
            value={String(
              banners.filter((banner) => banner.status === "pending").length +
                teachers.filter((teacher) => teacher.status === "pending").length,
            )}
            icon={Eye}
            iconClass="bg-orange-100 text-warning"
            trend={{ text: "Banner & giáo viên", tone: "warning" }}
          />
        </StaggerItem>
      </Stagger>

      <Reveal delay={0.05}>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={cn(
                "flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
                tab === item.value ? "bg-brand text-ink shadow-glow" : "bg-white text-ink-soft hover:bg-cream",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </div>
      </Reveal>

      {tab === "posts" && (
        <Reveal>
          <Card>
            <CardHeader>
              <CardTitle>Duyệt bài đăng</CardTitle>
              <CardDescription>
                Bài đã duyệt sẽ hiển thị ở mục Tin tức & sự kiện trên trang chủ, cùng kho với khu vực nhân viên.
              </CardDescription>
            </CardHeader>
            <TableToolbar
              query={postQuery}
              onQueryChange={setPostQuery}
              searchPlaceholder="Tìm tiêu đề, chuyên mục, tác giả…"
            >
              <ToolbarSelect
                id="post-status-filter"
                label="Lọc trạng thái bài"
                value={postFilter}
                onChange={(value) => setPostFilter(value as PostFilter)}
                options={[
                  { value: "all", label: "Tất cả bài" },
                  { value: "published", label: POST_STATUS_META.published.label },
                  { value: "draft", label: POST_STATUS_META.draft.label },
                ]}
              />
            </TableToolbar>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">Ảnh bìa</th>
                      <th scope="col" className="px-3 py-2.5">Tiêu đề</th>
                      <th scope="col" className="px-3 py-2.5">Chuyên mục</th>
                      <th scope="col" className="px-3 py-2.5">Ngày đăng</th>
                      <th scope="col" className="px-3 py-2.5">Tác giả</th>
                      <th scope="col" className="px-3 py-2.5">Trạng thái</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPosts.map((post) => (
                      <tr key={post.id} className="transition-colors hover:bg-surface">
                        <td className="px-4 py-3">
                          <SmartImage src={post.cover} alt={post.title} className="h-12 w-20 rounded-lg" />
                        </td>
                        <td className="max-w-96 px-3 py-3">
                          <span className="block truncate font-semibold text-ink">{post.title}</span>
                          <span className="block truncate text-xs text-ink-soft">{post.excerpt}</span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{post.category}</td>
                        <td className="px-3 py-3 whitespace-nowrap tabular-nums text-ink-soft">{post.date}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{post.author}</td>
                        <td className="px-3 py-3">
                          <Badge variant={POST_STATUS_META[post.status].badge}>{POST_STATUS_META[post.status].label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={post.status === "published"}
                              onClick={() => publishPost(post, "published")}
                            >
                              <Check /> Duyệt
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={post.status === "draft"}
                              onClick={() => publishPost(post, "draft")}
                            >
                              <EyeOff /> Ẩn
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-danger hover:bg-red-50"
                              onClick={() => setPendingPost(post)}
                            >
                              <Trash2 /> Xoá
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredPosts.length === 0 && <TableEmpty colSpan={7} />}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      )}

      {tab === "banners" && (
        <Reveal>
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Banner trang chủ</CardTitle>
                <CardDescription>Sửa tiêu đề, mô tả, nút kêu gọi và trạng thái hiển thị của từng banner</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportBanners}>
                <Download /> Xuất Excel
              </Button>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">Ảnh</th>
                      <th scope="col" className="px-3 py-2.5">Tiêu đề</th>
                      <th scope="col" className="px-3 py-2.5">Mô tả</th>
                      <th scope="col" className="px-3 py-2.5">Nút CTA</th>
                      <th scope="col" className="px-3 py-2.5">Cập nhật</th>
                      <th scope="col" className="px-3 py-2.5">Trạng thái</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {banners.map((banner) => (
                      <tr key={banner.id} className="transition-colors hover:bg-surface">
                        <td className="px-4 py-3">
                          <SmartImage src={unsplash(banner.image, 400)} alt={banner.title} className="h-12 w-24 rounded-lg" />
                        </td>
                        <td className="max-w-64 px-3 py-3 font-semibold text-ink">{banner.title}</td>
                        <td className="max-w-72 px-3 py-3 text-ink-soft">{banner.subtitle}</td>
                        <td className="px-3 py-3">
                          <Badge variant="brand">{banner.cta}</Badge>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap tabular-nums text-ink-soft">{banner.updatedAt}</td>
                        <td className="px-3 py-3">
                          <Badge variant={PUBLISH_STATUS_META[banner.status].badge}>
                            {PUBLISH_STATUS_META[banner.status].label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openBanner(banner)}>
                              <Pencil /> Sửa
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={banner.status === "published"}
                              onClick={() => setBannerStatus(banner, "published")}
                            >
                              <Check /> Duyệt
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={banner.status === "draft"}
                              onClick={() => setBannerStatus(banner, "draft")}
                            >
                              <EyeOff /> Ẩn
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-danger hover:bg-red-50"
                              onClick={() => setPendingBanner(banner)}
                            >
                              <Trash2 /> Xoá
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {banners.length === 0 && <TableEmpty colSpan={7} />}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      )}

      {tab === "teachers" && (
        <Reveal>
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Giáo viên nổi bật</CardTitle>
                <CardDescription>Thứ tự trong bảng chính là thứ tự hiển thị trên trang chủ</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportTeachers}>
                <Download /> Xuất Excel
              </Button>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-surface text-xs font-semibold tracking-wide text-ink-soft uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-right">TT</th>
                      <th scope="col" className="px-3 py-2.5">Ảnh</th>
                      <th scope="col" className="px-3 py-2.5">Họ tên</th>
                      <th scope="col" className="px-3 py-2.5">Chuyên môn</th>
                      <th scope="col" className="px-3 py-2.5">Kinh nghiệm</th>
                      <th scope="col" className="px-3 py-2.5">Trạng thái</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teachers.map((teacher, index) => (
                      <tr key={teacher.id} className="transition-colors hover:bg-surface">
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-soft">{index + 1}</td>
                        <td className="px-3 py-3">
                          <SmartImage src={teacher.photo} alt={teacher.name} className="size-12 rounded-full" />
                        </td>
                        <td className="px-3 py-3">
                          <span className="block font-semibold whitespace-nowrap text-ink">{teacher.name}</span>
                          <span className="block text-xs whitespace-nowrap text-ink-soft">{teacher.certificate}</span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{teacher.specialty}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{teacher.experience}</td>
                        <td className="px-3 py-3">
                          <Badge variant={PUBLISH_STATUS_META[teacher.status].badge}>
                            {PUBLISH_STATUS_META[teacher.status].label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={index === 0}
                              onClick={() => moveTeacher(index, -1)}
                              aria-label={`Đưa ${teacher.name} lên trên`}
                            >
                              <ArrowUp /> Lên
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={index === teachers.length - 1}
                              onClick={() => moveTeacher(index, 1)}
                              aria-label={`Đưa ${teacher.name} xuống dưới`}
                            >
                              <ArrowDown /> Xuống
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={teacher.status === "published"}
                              onClick={() => setTeacherStatus(teacher, "published")}
                            >
                              <Check /> Duyệt
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={teacher.status === "draft"}
                              onClick={() => setTeacherStatus(teacher, "draft")}
                            >
                              <EyeOff /> Ẩn
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-danger hover:bg-red-50"
                              onClick={() => setPendingTeacher(teacher)}
                            >
                              <Trash2 /> Xoá khỏi trang chủ
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {teachers.length === 0 && <TableEmpty colSpan={7} />}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      )}

      <Modal
        open={Boolean(bannerForm)}
        onOpenChange={(open) => !open && setBannerForm(null)}
        title="Sửa banner"
        description={bannerForm?.title}
        icon={<Pencil className="size-6" />}
        className="sm:max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setBannerForm(null)}>
              Huỷ
            </Button>
            <Button onClick={submitBanner}>
              <Check /> Lưu banner
            </Button>
          </>
        }
      >
        {bannerForm && (
          <div className="flex flex-col gap-4">
            <FormField id="banner-title" label="Tiêu đề" required error={bannerErrors.title}>
              <Input
                id="banner-title"
                value={bannerForm.title}
                onChange={(e) => {
                  setBannerForm({ ...bannerForm, title: e.target.value })
                  setBannerErrors((prev) => ({ ...prev, title: undefined }))
                }}
                className="font-heading font-bold"
                aria-invalid={Boolean(bannerErrors.title) || undefined}
                aria-describedby={bannerErrors.title ? "banner-title-error" : undefined}
              />
            </FormField>

            <FormField id="banner-subtitle" label="Mô tả ngắn" required error={bannerErrors.subtitle}>
              <Textarea
                id="banner-subtitle"
                rows={3}
                min-h-0
                value={bannerForm.subtitle}
                onChange={(e) => {
                  setBannerForm({ ...bannerForm, subtitle: e.target.value })
                  setBannerErrors((prev) => ({ ...prev, subtitle: undefined }))
                }}
                aria-invalid={Boolean(bannerErrors.subtitle) || undefined}
                aria-describedby={bannerErrors.subtitle ? "banner-subtitle-error" : undefined}
              />
            </FormField>

            <FormField id="banner-cta" label="Nhãn nút kêu gọi" required error={bannerErrors.cta}>
              <Input
                id="banner-cta"
                value={bannerForm.cta}
                onChange={(e) => {
                  setBannerForm({ ...bannerForm, cta: e.target.value })
                  setBannerErrors((prev) => ({ ...prev, cta: undefined }))
                }}
                placeholder="Xem khóa học"
                aria-invalid={Boolean(bannerErrors.cta) || undefined}
                aria-describedby={bannerErrors.cta ? "banner-cta-error" : undefined}
              />
            </FormField>

            <FormField id="banner-status" label="Trạng thái hiển thị">
              <select
                id="banner-status"
                value={bannerForm.status}
                onChange={(e) => setBannerForm({ ...bannerForm, status: e.target.value as PublishStatus })}
                className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
              >
                {PUBLISH_OPTIONS.map((key) => (
                  <option key={key} value={key}>
                    {PUBLISH_STATUS_META[key].label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingPost)}
        onOpenChange={(open) => !open && setPendingPost(null)}
        title="Xoá bài đăng?"
        description={pendingPost?.title}
        detail="Bài đăng sẽ bị xoá khỏi kho và không còn hiển thị ở mục Tin tức & sự kiện. Thao tác này không thể hoàn tác."
        confirmLabel="Xoá bài"
        onConfirm={confirmDeletePost}
      />

      <ConfirmDialog
        open={Boolean(pendingBanner)}
        onOpenChange={(open) => !open && setPendingBanner(null)}
        title="Xoá banner?"
        description={pendingBanner?.title}
        detail="Banner sẽ bị gỡ khỏi trang chủ. Bạn vẫn có thể tạo lại banner mới sau đó."
        confirmLabel="Xoá banner"
        onConfirm={confirmDeleteBanner}
      />

      <ConfirmDialog
        open={Boolean(pendingTeacher)}
        onOpenChange={(open) => !open && setPendingTeacher(null)}
        title="Xoá giáo viên nổi bật?"
        description={pendingTeacher?.name}
        detail={`Giáo viên ${pendingTeacher?.name ?? ""} sẽ bị gỡ khỏi mục Giáo viên nổi bật trên trang chủ. Hồ sơ giảng dạy vẫn được giữ nguyên trong hệ thống.`}
        confirmLabel="Xoá"
        onConfirm={confirmDeleteTeacher}
      />
    </div>
  )
}
