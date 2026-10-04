import { RouterProvider } from "react-router-dom"
import { MotionConfig } from "framer-motion"
import { Toaster } from "@/components/ui/toast"
import { AuthProvider } from "@/lib/auth/auth-context"
import { router } from "@/app/router"

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster richColors={false} />
      </AuthProvider>
    </MotionConfig>
  )
}
