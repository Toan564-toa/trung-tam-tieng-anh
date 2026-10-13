import { Outlet, ScrollRestoration } from "react-router-dom"
import { SessionExpiryHandler } from "@/app/session-handler"

export function RootLayout() {
  return (
    <>
      {/* Theo dõi hết phiên (401 + làm mới token thất bại). */}
      <SessionExpiryHandler />
      <Outlet />
      <ScrollRestoration />
    </>
  )
}
