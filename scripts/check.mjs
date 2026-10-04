import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const STEPS = ["typecheck", "lint", "test", "build"]

const targets = [
  { dir: "backend", label: "BACKEND" },
  { dir: "frontend", label: "FRONTEND" },
]

/**
 * Gọi `npm run <step>` trong một thư mục con mà không cần shell.
 * Khi script này được chạy qua `npm run check`, npm_execpath trỏ tới npm-cli.js nên
 * spawn bằng node là an toàn trên mọi nền tảng (không dùng shell: true).
 */
function runNpmScript(dir, step) {
  const execPath = process.env.npm_execpath

  if (execPath && existsSync(execPath)) {
    return spawnSync(process.execPath, [execPath, "run", step], { cwd: dir, stdio: "inherit" })
  }

  const npm = process.platform === "win32" ? "npm.cmd" : "npm"
  return spawnSync(npm, ["run", step], { cwd: dir, stdio: "inherit" })
}

const failures = []
const skipped = []

for (const target of targets) {
  const pkgPath = join(target.dir, "package.json")

  if (!existsSync(pkgPath)) {
    const message = `[${target.label}] chưa có ${target.dir}/package.json — BỎ QUA (KHÔNG phải đã xanh)`
    console.log(message)
    console.log(`             Cần: giải nén mã nguồn vào ${target.dir}/ rồi chạy lại npm run check.`)
    skipped.push(`${target.label}: chưa có ${target.dir}/package.json`)
    continue
  }

  const scripts = JSON.parse(readFileSync(pkgPath, "utf8")).scripts ?? {}

  for (const step of STEPS) {
    if (!scripts[step]) {
      const message = `[${target.label}] script "${step}" chưa cấu hình — BỎ QUA (KHÔNG phải đã xanh)`
      console.log(message)
      skipped.push(`${target.label}: thiếu script ${step}`)
      continue
    }

    console.log(`\n─── [${target.label}] npm run ${step} ───`)
    const result = runNpmScript(target.dir, step)

    if (result.status !== 0) {
      const reason = result.error ? ` (lỗi spawn: ${result.error.message})` : ""
      failures.push(`${target.label}: ${step} (mã ${result.status ?? "null"})${reason}`)
      console.log(`[${target.label}] ${step} THẤT BẠI — dừng.`)
      process.exit(result.status ?? 1)
    }
  }
}

console.log("")
if (skipped.length > 0) {
  console.log("Các bước CHƯA CẤU HÌNH (không tính là xanh):")
  for (const item of skipped) console.log(`  - ${item}`)
  console.log("")
}

if (failures.length > 0) {
  console.log("KIỂM TRA THẤT BẠI:")
  for (const item of failures) console.log(`  - ${item}`)
  process.exit(1)
}

console.log(skipped.length > 0 ? "Hoàn tất với các bước đã cấu hình. Xem phần CHƯA CẤU HÌNH ở trên." : "Toàn bộ kiểm tra đã cấu hình đều xanh.")