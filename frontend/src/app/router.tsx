import { Suspense, lazy } from "react"
import { createBrowserRouter, Outlet } from "react-router-dom"
import { RequireRole } from "@/app/require-role"
import { RootLayout } from "@/layouts/root-layout"
import { PublicLayout } from "@/layouts/public-layout"
import { ClientLayout } from "@/layouts/client-layout"
import { AdminLayout } from "@/layouts/admin-layout"
import { LandingPage } from "@/pages/public/landing-page"
import { NotFoundPage } from "@/pages/public/not-found-page"
import { ForbiddenPage } from "@/pages/public/forbidden-page"
import { LoginPage } from "@/pages/auth/login-page"
import { AdminLoginPage } from "@/pages/auth/admin-login-page"
import { ChangePasswordPage } from "@/pages/auth/change-password-page"
import { AreaChooserPage } from "@/pages/auth/area-chooser-page"
import { ResetPasswordPage } from "@/pages/auth/reset-password-page"
import { StudentOverviewPage } from "@/pages/client/student/student-overview-page"
import { StudentSchedulePage } from "@/pages/client/student/student-schedule-page"
import { StudentGradesPage } from "@/pages/client/student/student-grades-page"
import { StudentAssignmentsPage } from "@/pages/client/student/student-assignments-page"
import { StudentTuitionPage } from "@/pages/client/student/student-tuition-page"
import { StudentAttendancePage } from "@/pages/client/student/student-attendance-page"
import { StudentProfilePage } from "@/pages/client/student/student-profile-page"
import { TeacherOverviewPage } from "@/pages/client/teacher/teacher-overview-page"
import { TeacherClassesPage } from "@/pages/client/teacher/teacher-classes-page"
import { TeacherClassDetailPage } from "@/pages/client/teacher/teacher-class-detail-page"
import { TeacherStudentsPage } from "@/pages/client/teacher/teacher-students-page"
import { TeacherStudentDetailPage } from "@/pages/client/teacher/teacher-student-detail-page"
import { TeacherAttendancePage } from "@/pages/client/teacher/teacher-attendance-page"
import { TeacherScoresPage } from "@/pages/client/teacher/teacher-scores-page"
import { TeacherSchedulePage } from "@/pages/client/teacher/teacher-schedule-page"
import { TeacherAssignmentsPage } from "@/pages/client/teacher/teacher-assignments-page"
import { TeacherPayrollPage } from "@/pages/client/teacher/teacher-payroll-page"
import { TeacherProfilePage } from "@/pages/client/teacher/teacher-profile-page"
import { StaffOverviewPage } from "@/pages/client/staff/staff-overview-page"
import { StaffStudentsPage } from "@/pages/client/staff/staff-students-page"
import { StaffStudentDetailPage } from "@/pages/client/staff/staff-student-detail-page"
import { StaffEnrollPage } from "@/pages/client/staff/staff-enroll-page"
import { StaffTuitionPage } from "@/pages/client/staff/staff-tuition-page"
import { StaffLeadsPage } from "@/pages/client/staff/staff-leads-page"
import { StaffSchedulePage } from "@/pages/client/staff/staff-schedule-page"
import { StaffPostsPage } from "@/pages/client/staff/staff-posts-page"
import { StaffPayrollPage } from "@/pages/client/staff/staff-payroll-page"
import { StaffProfilePage } from "@/pages/client/staff/staff-profile-page"
const AdminDashboardPage = lazy(() => import("@/pages/admin/admin-dashboard-page").then((m) => ({ default: m.AdminDashboardPage })))
const AdminAccountsPage = lazy(() => import("@/pages/admin/admin-accounts-page").then((m) => ({ default: m.AdminAccountsPage })))
const AdminStudentsPage = lazy(() => import("@/pages/admin/admin-students-page").then((m) => ({ default: m.AdminStudentsPage })))
const AdminTeachersPage = lazy(() => import("@/pages/admin/admin-teachers-page").then((m) => ({ default: m.AdminTeachersPage })))
const AdminStaffPage = lazy(() => import("@/pages/admin/admin-staff-page").then((m) => ({ default: m.AdminStaffPage })))
const AdminImportPage = lazy(() => import("@/pages/admin/admin-import-page").then((m) => ({ default: m.AdminImportPage })))
const AdminCoursesPage = lazy(() => import("@/pages/admin/admin-courses-page").then((m) => ({ default: m.AdminCoursesPage })))
const AdminClassesPage = lazy(() => import("@/pages/admin/admin-classes-page").then((m) => ({ default: m.AdminClassesPage })))
const AdminRoomsPage = lazy(() => import("@/pages/admin/admin-rooms-page").then((m) => ({ default: m.AdminRoomsPage })))
const AdminTimetablePage = lazy(() => import("@/pages/admin/admin-timetable-page").then((m) => ({ default: m.AdminTimetablePage })))
const AdminAttendancePage = lazy(() => import("@/pages/admin/admin-attendance-page").then((m) => ({ default: m.AdminAttendancePage })))
const AdminEventsPage = lazy(() => import("@/pages/admin/admin-events-page").then((m) => ({ default: m.AdminEventsPage })))
const AdminTuitionPage = lazy(() => import("@/pages/admin/admin-tuition-page").then((m) => ({ default: m.AdminTuitionPage })))
const AdminPayrollPage = lazy(() => import("@/pages/admin/admin-payroll-page").then((m) => ({ default: m.AdminPayrollPage })))
const AdminContentPage = lazy(() => import("@/pages/admin/admin-content-page").then((m) => ({ default: m.AdminContentPage })))
const AdminReportsPage = lazy(() => import("@/pages/admin/admin-reports-page").then((m) => ({ default: m.AdminReportsPage })))
const AdminAuditLogPage = lazy(() => import("@/pages/admin/admin-audit-log-page").then((m) => ({ default: m.AdminAuditLogPage })))
const AdminSettingsPage = lazy(() => import("@/pages/admin/admin-settings-page").then((m) => ({ default: m.AdminSettingsPage })))

/** Skeleton trong lúc nạp chunk của khu vực quản trị. */
function AdminFallback() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <div className="h-9 w-64 animate-pulse rounded-xl bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-white" />
    </div>
  )
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public site
      {
        element: <PublicLayout />,
        children: [{ index: true, element: <LandingPage /> }],
      },

      // Authentication
      { path: "dang-nhap", element: <LoginPage /> },
      { path: "doi-mat-khau", element: <ChangePasswordPage /> },
      { path: "dat-lai-mat-khau", element: <ResetPasswordPage /> },
      { path: "chon-khu-vuc", element: <AreaChooserPage /> },
      { path: "admin/dang-nhap", element: <AdminLoginPage /> },

      // Client app (student / teacher / staff)
      {
        element: (
          <RequireRole roles={["student", "teacher", "staff"]}>
            <ClientLayout />
          </RequireRole>
        ),
        children: [
          {
            element: <RequireRole roles={["student"]} />,
            children: [
              { path: "hoc-vien", element: <StudentOverviewPage /> },
              { path: "hoc-vien/lich-trinh", element: <StudentSchedulePage /> },
              { path: "hoc-vien/bang-diem", element: <StudentGradesPage /> },
              { path: "hoc-vien/bai-tap", element: <StudentAssignmentsPage /> },
              { path: "hoc-vien/hoc-phi", element: <StudentTuitionPage /> },
              { path: "hoc-vien/thoi-gian-hoc", element: <StudentAttendancePage /> },
              { path: "hoc-vien/thong-tin-ca-nhan", element: <StudentProfilePage /> },
            ],
          },
          {
            element: <RequireRole roles={["teacher"]} />,
            children: [
              { path: "giao-vien", element: <TeacherOverviewPage /> },
              { path: "giao-vien/lop-hoc", element: <TeacherClassesPage /> },
              { path: "giao-vien/lop-hoc/:classId", element: <TeacherClassDetailPage /> },
              { path: "giao-vien/hoc-vien", element: <TeacherStudentsPage /> },
              { path: "giao-vien/hoc-vien/:studentId", element: <TeacherStudentDetailPage /> },
              { path: "giao-vien/diem-danh", element: <TeacherAttendancePage /> },
              { path: "giao-vien/nhap-diem", element: <TeacherScoresPage /> },
              { path: "giao-vien/lich-trinh", element: <TeacherSchedulePage /> },
              { path: "giao-vien/bai-tap", element: <TeacherAssignmentsPage /> },
              { path: "giao-vien/bang-luong", element: <TeacherPayrollPage /> },
              { path: "giao-vien/thong-tin-ca-nhan", element: <TeacherProfilePage /> },
            ],
          },
          {
            element: <RequireRole roles={["staff"]} />,
            children: [
              { path: "nhan-vien", element: <StaffOverviewPage /> },
              { path: "nhan-vien/hoc-vien", element: <StaffStudentsPage /> },
              { path: "nhan-vien/hoc-vien/:studentId", element: <StaffStudentDetailPage /> },
              { path: "nhan-vien/ghi-danh", element: <StaffEnrollPage /> },
              { path: "nhan-vien/hoc-phi", element: <StaffTuitionPage /> },
              { path: "nhan-vien/khach-tiem-nang", element: <StaffLeadsPage /> },
              { path: "nhan-vien/lich-trinh", element: <StaffSchedulePage /> },
              { path: "nhan-vien/bai-dang", element: <StaffPostsPage /> },
              { path: "nhan-vien/bang-luong", element: <StaffPayrollPage /> },
              { path: "nhan-vien/thong-tin-ca-nhan", element: <StaffProfilePage /> },
            ],
          },
        ],
      },

      // Admin app
      {
        path: "admin",
        element: (
          <RequireRole roles={["admin"]}>
            <AdminLayout />
          </RequireRole>
        ),
        children: [
          {
            element: (
              <Suspense fallback={<AdminFallback />}>
                <Outlet />
              </Suspense>
            ),
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: "tai-khoan", element: <AdminAccountsPage /> },
              { path: "hoc-vien", element: <AdminStudentsPage /> },
              { path: "giao-vien", element: <AdminTeachersPage /> },
              { path: "nhan-vien", element: <AdminStaffPage /> },
              { path: "import", element: <AdminImportPage /> },
              { path: "khoa-hoc", element: <AdminCoursesPage /> },
              { path: "lop-hoc", element: <AdminClassesPage /> },
              { path: "phong-hoc", element: <AdminRoomsPage /> },
              { path: "thoi-khoa-bieu", element: <AdminTimetablePage /> },
              { path: "diem-danh", element: <AdminAttendancePage /> },
              { path: "lich-trinh", element: <AdminEventsPage /> },
              { path: "hoc-phi", element: <AdminTuitionPage /> },
              { path: "bang-luong", element: <AdminPayrollPage /> },
              { path: "noi-dung", element: <AdminContentPage /> },
              { path: "bao-cao", element: <AdminReportsPage /> },
              { path: "nhat-ky", element: <AdminAuditLogPage /> },
              { path: "cai-dat", element: <AdminSettingsPage /> },
            ],
          },
        ],
      },

      { path: "403", element: <ForbiddenPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])