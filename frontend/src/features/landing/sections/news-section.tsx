import { ArrowRight, CalendarDays } from "lucide-react"
import { SmartImage } from "@/components/common/smart-image"
import { FacebookIcon } from "@/components/icons/social"
import { Stagger, StaggerItem } from "@/components/motion/reveal"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SectionTitle } from "@/components/ui/section-title"
import { usePublishedPosts } from "@/data/posts"

export function NewsSection() {
  const posts = usePublishedPosts()

  return (
    <section id="tin-tuc" className="section">
      <div className="container-page">
        <SectionTitle eyebrow="Tin tức & sự kiện" title="Có gì mới tại trung tâm?" description="Cập nhật lịch khai giảng, hoạt động ngoại khóa và thành tích nổi bật của học viên." />
        <Stagger className="grid gap-6 md:grid-cols-3">
          {posts.map((post) => (
            <StaggerItem key={post.id} className="h-full">
              <Card hoverable className="group h-full">
                <div className="relative">
                  <SmartImage src={post.cover} alt={post.title} className="aspect-[16/10]" imgClassName="transition-transform duration-700 group-hover:scale-105" />
                  <Badge variant="brand" className="absolute top-4 left-4 bg-brand text-ink">{post.category}</Badge>
                </div>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-ink-soft"><CalendarDays className="size-3.5" />{post.date}</p>
                  <h3 className="line-clamp-2 text-lg leading-snug font-bold">{post.title}</h3>
                  <p className="line-clamp-3 text-sm leading-relaxed text-ink-soft">{post.excerpt}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
                    <a href="#tin-tuc" className="inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-amber-600">
                      Đọc tiếp <ArrowRight className="size-4" />
                    </a>
                    {post.facebookUrl && (
                      <a
                        href={post.facebookUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonVariants({ variant: "outline", size: "sm", className: "ml-auto border-[#1877F2]/30 text-[#1877F2] hover:border-[#1877F2] hover:bg-[#1877F2]/5" })}
                      >
                        <FacebookIcon className="size-4" /> Xem trên Facebook
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
