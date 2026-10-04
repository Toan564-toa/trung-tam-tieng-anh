import { Link } from "react-router-dom"
import { Mail, MapPin, Phone } from "lucide-react"
import { Logo } from "@/components/common/logo"
import { FacebookIcon, InstagramIcon, TiktokIcon, YoutubeIcon } from "@/components/icons/social"
import { NAV_LINKS, SITE } from "@/config/site"
import { COURSES } from "@/data/landing"

const CURRENT_YEAR = new Date().getFullYear()

const SOCIALS = [
  { label: "Facebook", href: SITE.facebook, icon: FacebookIcon },
  { label: "YouTube", href: SITE.youtube, icon: YoutubeIcon },
  { label: "TikTok", href: SITE.tiktok, icon: TiktokIcon },
  { label: "Instagram", href: SITE.instagram, icon: InstagramIcon },
]

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-ink text-slate-300">
      <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-brand/10 blur-3xl" />
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-4">
          <Logo tone="dark" />
          <p className="max-w-sm text-sm leading-relaxed text-slate-400">
            {SITE.slogan}. Đồng hành cùng hàng nghìn học viên trên hành trình chinh phục ngoại ngữ.
          </p>
          <div className="flex gap-3">
            {SOCIALS.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:-translate-y-0.5 hover:bg-brand hover:text-ink"
              >
                <Icon className="size-4.5" />
              </a>
            ))}
          </div>
        </div>

        <FooterColumn title="Liên kết" className="lg:col-span-2">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="transition-colors hover:text-brand">{l.label}</a>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Khóa học" className="lg:col-span-3">
          {COURSES.map((c) => (
            <li key={c.id}>
              <a href="#khoa-hoc" className="transition-colors hover:text-brand">{c.name}</a>
            </li>
          ))}
          <li>
            <Link to="/dang-nhap" className="transition-colors hover:text-brand">Cổng học viên</Link>
          </li>
        </FooterColumn>

        <FooterColumn title="Liên hệ" className="lg:col-span-3">
          <li className="flex gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-brand" />{SITE.address}</li>
          <li className="flex gap-3"><Phone className="mt-0.5 size-4 shrink-0 text-brand" /><a href={SITE.phoneHref} className="hover:text-brand">{SITE.phone}</a></li>
          <li className="flex gap-3"><Mail className="mt-0.5 size-4 shrink-0 text-brand" /><a href={`mailto:${SITE.email}`} className="hover:text-brand">{SITE.email}</a></li>
        </FooterColumn>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-slate-500 sm:flex-row">
          <p>© {CURRENT_YEAR} {SITE.name}. Bảo lưu mọi quyền.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-brand">Chính sách bảo mật</a>
            <a href="#" className="hover:text-brand">Điều khoản sử dụng</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <h3 className="mb-4 text-sm font-bold tracking-wider text-white uppercase">{title}</h3>
      <ul className="flex flex-col gap-3 text-sm">{children}</ul>
    </div>
  )
}
