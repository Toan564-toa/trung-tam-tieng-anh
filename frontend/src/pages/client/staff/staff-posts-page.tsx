import { useMemo, useState, type FormEvent } from "react"
import { CalendarDays, ExternalLink, FileText, Newspaper, Pencil, Save, Send, Trash2, User, type LucideIcon } from "lucide-react"
import { cn } from "cn"
import { PageHeader } from "@/components/layout/page-header"
import { SmartImage } from "@/components/common/smart-image"
import { StatCard } from "@/components/common/stat-card"
import { FacebookIcon } from "@/components/icons/social"
import { Reveal } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { fieldBase, Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { formatDate, toDateKey } from "@/lib/date"
import { unsplash } from "@/lib/images"
import {
  POST_CATEGORIES,
  POST_STATUS_META,
  nextPostId,
  removePost,
  upsertPost,
  useAllPosts,
  type Post,
  type PostCategory,
  type PostStatus,
} from "@/data/posts"
import { STAFF_PROFILE } from "@/data/staff"

type FormErrors = Partial<Record<"title" | "excerpt" | "content" | "cover" | "facebookUrl", string>>
type FilterKey = "all" | PostStatus

const COVER_PICKS = [
  "photo-1523240795612-9a054b0db644",
  "photo-1529390079861-591de354faf5",
  "photo-1427504494785-3a9ca7044f45",
  "photo-1524178232363-1fb2b075b655",
  "photo-1503676260728-1c00da094a0b",
  "photo-1522202176988-66273c2fd55f",
  "photo-1544717305-2782549b5136",
  "photo-1513258496099-48168024aec0",
]

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "published", label: "Đã đăng" },
  { key: "draft", label: "Bản nháp" },
]

const DEFAULT_COVER = unsplash("photo-1523240795612-9a054b0db644", 700)

function blankPost(): Post {
  return {
    id: nextPostId(),
    title: "",
    excerpt: "",
    content: "",
    cover: DEFAULT_COVER,
    category: "Sự kiện",
    date: "02/10/2026",
    status: "draft",
    author: STAFF_PROFILE.fullName,
  }
}

function toDateInput(value: string) {
  const [day, month, year] = value.split("/").map(Number)
  if (!day || !month || !year) return ""
  return toDateKey(new Date(year, month - 1, day))
}

function fromDateInput(value: string) {
  if (!value) return ""
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return ""
  return formatDate(new Date(year, month - 1, day))
}

function validate(form: Post): FormErrors {
  const errors: FormErrors = {}
  if (form.title.trim().length < 10) errors.title = "Tiêu đề cần ít nhất 10 ký tự."
  const excerptLength = form.excerpt.trim().length
  if (excerptLength < 30) errors.excerpt = "Tóm tắt cần ít nhất 30 ký tự."
  else if (excerptLength > 200) errors.excerpt = "Tóm tắt không được vượt quá 200 ký tự."
  if (form.content.trim().length < 50) errors.content = "Nội dung cần ít nhất 50 ký tự."
  if (!form.cover.trim()) errors.cover = "Vui lòng nhập đường dẫn ảnh bìa."
  else if (!form.cover.trim().startsWith("http")) errors.cover = "Đường dẫn ảnh phải bắt đầu bằng http."
  const facebook = form.facebookUrl?.trim()
  if (facebook && !facebook.startsWith("https://facebook.com/")) {
    errors.facebookUrl = "Link phải bắt đầu bằng https://facebook.com/"
  }
  return errors
}

export function StaffPostsPage() {
  const posts = useAllPosts()
  const [form, setForm] = useState<Post>(blankPost)
  const [errors, setErrors] = useState<FormErrors>({})
  const [filter, setFilter] = useState<FilterKey>("all")
  const [pendingDelete, setPendingDelete] = useState<Post | null>(null)

  const stats = useMemo(() => {
    const published = posts.filter((post) => post.status === "published")
    const drafts = posts.filter((post) => post.status === "draft")
    return { total: posts.length, published: published.length, drafts: drafts.length }
  }, [posts])

  const visible = useMemo(() => {
    const list = filter === "all" ? posts : posts.filter((post) => post.status === filter)
    return [...list].sort((a, b) => {
      const [dayA, monthA, yearA] = a.date.split("/").map(Number)
      const [dayB, monthB, yearB] = b.date.split("/").map(Number)
      return new Date(yearB, monthB - 1, dayB).getTime() - new Date(yearA, monthA - 1, dayA).getTime()
    })
  }, [posts, filter])

  const isEditing = posts.some((post) => post.id === form.id)
  const savedPost = isEditing ? posts.find((post) => post.id === form.id) ?? null : null

  const update = <K extends keyof Post>(key: K) => (value: Post[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key as keyof FormErrors] ? { ...prev, [key]: undefined } : prev))
  }

  const resetForm = () => {
    setForm(blankPost())
    setErrors({})
  }

  const loadPost = (post: Post) => {
    setForm({ ...post })
    setErrors({})
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin", { description: "Một số trường chưa hợp lệ." })
      return
    }
    const saved: Post = {
      ...form,
      title: form.title.trim(),
      excerpt: form.excerpt.trim(),
      content: form.content.trim(),
      cover: form.cover.trim(),
      facebookUrl: form.facebookUrl?.trim() ? form.facebookUrl.trim() : undefined,
    }
    upsertPost(saved)
    setForm(saved)
    toast.success(form.status === "published" ? "Đã đăng bài lên trang chủ" : "Đã lưu bản nháp", {
      description:
        form.status === "published"
          ? "Bài đăng sẽ hiển thị ở mục Tin tức & sự kiện."
          : "Bản nháp chỉ mình bạn nhìn thấy.",
    })
  }

  const toggleStatus = (post: Post) => {
    const next: PostStatus = post.status === "published" ? "draft" : "published"
    upsertPost({ ...post, status: next })
    toast.success(next === "published" ? "Đã đăng bài" : "Đã chuyển về bản nháp", {
      description: next === "published" ? `${post.title} xuất hiện ở Tin tức & sự kiện.` : post.title,
    })
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    removePost(pendingDelete.id)
    toast.success("Đã xoá bài đăng", { description: pendingDelete.title })
    if (form.id === pendingDelete.id) resetForm()
    setPendingDelete(null)
  }

  const invalid = (key: keyof FormErrors) => ({
    "aria-invalid": Boolean(errors[key]) || undefined,
    "aria-describedby": errors[key] ? `post-${key}-error` : undefined,
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${stats.total} bài trong kho`}
        title="Bài đăng"
        description="Soạn nội dung và quản lý trạng thái bài đăng. Bài đã đăng sẽ xuất hiện ngay trong mục Tin tức & sự kiện trên trang chủ."
        actions={
          <Button onClick={resetForm}>
            <FileText /> Tạo bài mới
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Reveal className="xl:sticky xl:top-24">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="truncate">
                    {isEditing && form.title ? `Đang sửa: ${form.title}` : "Soạn bài đăng mới"}
                  </CardTitle>
                  <CardDescription>
                    {isEditing ? "Cập nhật nội dung rồi lưu lại bài đăng." : "Điền đủ thông tin để lưu nháp hoặc đăng ngay."}
                  </CardDescription>
                </div>
                {isEditing && (
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    Huỷ chỉnh sửa
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <form id="post-editor" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                <FormField id="post-title" label="Tiêu đề" required error={errors.title}>
                  <Textarea
                    id="post-title"
                    rows={2}
                    min-h-0
                    value={form.title}
                    onChange={(e) => update("title")(e.target.value)}
                    placeholder="Khai giảng khóa học mùa Thu 2026"
                    {...invalid("title")}
                  />
                </FormField>

                <FormField
                  id="post-excerpt"
                  label="Tóm tắt (hiển thị ở trang chủ)"
                  required
                  error={errors.excerpt}
                  hint={<span className="text-xs tabular-nums text-ink-soft">{form.excerpt.length}/200</span>}
                >
                  <Textarea
                    id="post-excerpt"
                    rows={3}
                    min-h-0
                    value={form.excerpt}
                    onChange={(e) => update("excerpt")(e.target.value)}
                    placeholder="Tóm tắt ngắn gọn giúp học viên nắm được nội dung chính."
                    {...invalid("excerpt")}
                  />
                </FormField>

                <FormField
                  id="post-content"
                  label="Nội dung bài đăng"
                  required
                  error={errors.content}
                  hint={<span className="text-xs tabular-nums text-ink-soft">{form.content.length} ký tự</span>}
                >
                  <Textarea
                    id="post-content"
                    rows={8}
                    value={form.content}
                    onChange={(e) => update("content")(e.target.value)}
                    placeholder="Nội dung chi tiết của bài đăng. Để trống một dòng giữa các đoạn để tách đoạn."
                    {...invalid("content")}
                  />
                </FormField>

                <FormField
                  id="post-cover"
                  label="Ảnh bìa"
                  required
                  error={errors.cover}
                  hint={<span className="text-xs text-ink-soft">Dán URL ảnh hoặc chọn nhanh bên dưới</span>}
                >
                  <div className="flex flex-col gap-3">
                    <Input
                      id="post-cover"
                      value={form.cover}
                      onChange={(e) => update("cover")(e.target.value)}
                      placeholder={DEFAULT_COVER}
                      {...invalid("cover")}
                    />
                    <SmartImage src={form.cover} alt={form.title || "Ảnh bìa"} className="aspect-[16/9] w-full rounded-xl" />
                    <div className="grid grid-cols-4 gap-2">
                      {COVER_PICKS.map((id) => {
                        const url = unsplash(id, 700)
                        const active = form.cover === url
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => update("cover")(url)}
                            aria-label={`Chọn ảnh ${id}`}
                            className={cn(
                              "cursor-pointer overflow-hidden rounded-xl border-2 transition-colors",
                              active ? "border-brand shadow-glow" : "border-transparent hover:border-brand/40",
                            )}
                          >
                            <SmartImage src={url} alt={id} className="aspect-[16/9]" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </FormField>

                <FormField
                  id="post-facebook"
                  label="Link bài Facebook"
                  error={errors.facebookUrl}
                  hint={<span className="text-xs text-ink-soft">Tuỳ chọn</span>}
                >
                  <Input
                    id="post-facebook"
                    type="url"
                    value={form.facebookUrl ?? ""}
                    onChange={(e) => update("facebookUrl")(e.target.value)}
                    placeholder="https://facebook.com/..."
                    {...invalid("facebookUrl")}
                  />
                </FormField>
                <p className="-mt-2 text-xs leading-relaxed text-ink-soft">
                  Trường này không bắt buộc. Nếu có link, nút “Xem trên Facebook” sẽ xuất hiện cạnh bài đăng.
                </p>

                <FormField id="post-status" label="Trạng thái">
                  <div className="flex flex-wrap gap-2">
                    {(["draft", "published"] as const).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => update("status")(key)}
                        className={cn(
                          "min-h-10 cursor-pointer rounded-full px-4 text-sm font-semibold transition-colors",
                          form.status === key ? "bg-brand text-ink shadow-glow" : "bg-surface text-ink-soft hover:bg-cream",
                        )}
                      >
                        {key === "draft" ? "Nháp" : "Đã đăng"}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed text-ink-soft">{POST_STATUS_META[form.status].description}</p>
                </FormField>

                <FormField id="post-category" label="Chuyên mục">
                  <select
                    id="post-category"
                    value={form.category}
                    onChange={(e) => update("category")(e.target.value as PostCategory)}
                    className={cn(fieldBase, "h-12 cursor-pointer appearance-none pr-10")}
                  >
                    {POST_CATEGORIES.map((category) => (
                      <option key={category} value={category} className="text-ink">
                        {category}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField id="post-date" label="Ngày đăng" required>
                  <Input
                    id="post-date"
                    type="date"
                    value={toDateInput(form.date)}
                    onChange={(e) => update("date")(fromDateInput(e.target.value))}
                  />
                </FormField>
              </form>
            </CardContent>
            <CardFooter className="flex-wrap justify-end">
              {savedPost?.status === "published" && (
                <Button variant="ghost" size="sm" render={<a href="#tin-tuc" />}>
                  <ExternalLink /> Xem trên trang chủ
                </Button>
              )}
              <Button type="submit" form="post-editor">
                {form.status === "published" ? (
                  <>
                    <Send /> Lưu & đăng
                  </>
                ) : (
                  <>
                    <Save /> Lưu bản nháp
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </Reveal>

        <div className="flex flex-col gap-6">
          <Reveal delay={0.06}>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Tổng bài" value={String(stats.total)} icon={Newspaper} />
              <StatCard
                label="Đã đăng"
                value={String(stats.published)}
                icon={Send}
                iconClass="bg-green-100 text-success"
                trend={{ text: "Trên trang chủ", tone: "success" }}
              />
              <StatCard
                label="Bản nháp"
                value={String(stats.drafts)}
                icon={FileText}
                iconClass="bg-slate-100 text-ink-soft"
                trend={{ text: "Chưa công khai", tone: "warning" }}
              />
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <Card>
              <CardHeader>
                <CardTitle>Danh sách bài đăng</CardTitle>
                <CardDescription>Sắp xếp theo ngày đăng mới nhất</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {FILTERS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFilter(item.key)}
                      className={cn(
                        "min-h-10 cursor-pointer rounded-full px-4 text-sm font-semibold transition-colors",
                        filter === item.key ? "bg-brand text-ink shadow-glow" : "bg-surface text-ink-soft hover:bg-cream",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {visible.map((post) => (
                  <article key={post.id} className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 sm:flex-row">
                    <SmartImage
                      src={post.cover}
                      alt={post.title}
                      className="aspect-[16/9] w-full shrink-0 rounded-xl sm:w-32"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={POST_STATUS_META[post.status].badge}>{POST_STATUS_META[post.status].label}</Badge>
                        <Badge variant="neutral">{post.category}</Badge>
                        <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                          <CalendarDays className="size-3.5" />
                          {post.date}
                        </span>
                      </div>
                      <h3 className="mt-2 line-clamp-2 text-base leading-snug font-bold text-ink">{post.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-soft">{post.excerpt}</p>
                      <p className="mt-2 inline-flex items-center gap-1 text-xs text-ink-soft">
                        <User className="size-3.5" />
                        {post.author}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => loadPost(post)}>
                          <Pencil /> Sửa
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleStatus(post)}>
                          {post.status === "published" ? "Chuyển về nháp" : "Đăng"}
                        </Button>
                        {post.facebookUrl && (
                          <a
                            href={post.facebookUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={buttonVariants({
                              variant: "outline",
                              size: "sm",
                              className:
                                "border-[#1877F2]/30 text-[#1877F2] hover:border-[#1877F2] hover:bg-[#1877F2]/5",
                            })}
                          >
                            <FacebookIcon className="size-4" /> Xem trên Facebook
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto text-danger hover:bg-red-50"
                          onClick={() => setPendingDelete(post)}
                        >
                          <Trash2 /> Xoá
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}

                {visible.length === 0 && <EmptyState filter={filter} />}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>

      <Modal
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Xoá bài đăng?"
        description={pendingDelete?.title}
        icon={<Trash2 className="size-6" />}
        footer={
          <>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Giữ lại
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              <Trash2 /> Xoá
            </Button>
          </>
        }
      >
        <div className="rounded-2xl bg-red-50 p-4 text-sm leading-relaxed text-danger">
          Thao tác này không thể hoàn tác. Bài đăng sẽ bị xoá khỏi danh sách và không còn hiển thị ở mục Tin tức & sự kiện
          nếu đang được đăng.
        </div>
      </Modal>
    </div>
  )
}

function EmptyState({ filter }: { filter: FilterKey }) {
  const icon: LucideIcon = filter === "published" ? Send : filter === "draft" ? FileText : Newspaper
  const label = filter === "published" ? "Chưa có bài nào được đăng." : filter === "draft" ? "Không còn bản nháp nào." : "Chưa có bài đăng nào."
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-amber-700">
        {(() => {
          const Icon = icon
          return <Icon className="size-6" />
        })()}
      </span>
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="text-xs text-ink-soft">Soạn bài ở cột bên trái rồi lưu để bài xuất hiện trong danh sách này.</p>
    </div>
  )
}