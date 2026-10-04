import { Outlet } from "react-router-dom"
import { SiteHeader } from "@/features/landing/site-header"
import { SiteFooter } from "@/features/landing/site-footer"
import { FloatingContact } from "@/features/landing/floating-contact"

export function PublicLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-white">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <FloatingContact />
    </div>
  )
}
