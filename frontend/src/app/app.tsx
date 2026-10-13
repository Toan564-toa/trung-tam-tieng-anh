import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { Toaster } from "@/components/ui/toast";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ErrorBoundary } from "@/app/error-boundary";
import { router } from "@/app/router";

// Truy vấn chung: thử lại 1 lần khi lỗi mạng, không cache phiên.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ErrorBoundary>
            <RouterProvider router={router} />
          </ErrorBoundary>
          <Toaster richColors={false} />
        </AuthProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
}
