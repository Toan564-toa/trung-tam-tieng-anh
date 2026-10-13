// Lõi gọi API: gửi cookie, chuẩn hóa lỗi theo envelope { data } / { error }.
// Gặp 401: thử làm mới refresh token đúng một lần, rồi mới báo hết phiên.

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

// AuthProvider đăng ký handler này: gọi khi phiên hết hạn (401 sau khi làm mới thất bại).
let sessionExpiredHandler: (() => void) | null = null;

export function onSessionExpired(handler: () => void): void {
  sessionExpiredHandler = handler;
}

// Endpoint công khai: 401 ở đây là lỗi nghiệp vụ (sai mật khẩu, token reset
// không hợp lệ), KHÔNG phải hết phiên — trả lỗi thẳng, không thử làm mới token.
const PUBLIC_AUTH_PATHS = [
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

function isPublicAuthPath(path: string): boolean {
  return PUBLIC_AUTH_PATHS.some((prefix) => path.startsWith(prefix));
}

// Đảm bảo chỉ một request làm mới token tại một thời điểm; các request 401
// khác chờ kết quả chung thay vì gọi /auth/refresh nhiều lần.
let refreshing: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

// Thông báo tiếng Việt cho các mã lỗi nghiệp vụ (backend cũng trả message,
// nhưng client giữ bản dịch riêng để giao diện nhất quán).
const CODE_MESSAGES: Record<string, string> = {
  PASSWORD_CHANGE_REQUIRED: "Bạn cần đổi mật khẩu trước khi tiếp tục.",
  ACCOUNT_LOCKED: "Tài khoản đang bị khóa, vui lòng liên hệ quản trị viên.",
  INVALID_CREDENTIALS: "Sai tên đăng nhập hoặc mật khẩu.",
  TOKEN_USED: "Liên kết đã được sử dụng.",
  TOKEN_EXPIRED: "Liên kết đã hết hạn.",
  HAS_ERROR_ROWS: "File còn dòng lỗi, cần sửa trước khi xác nhận.",
  ALREADY_CONFIRMED: "Lô nhập này đã được xác nhận rồi.",
};

function defaultMessage(status: number): string {
  switch (status) {
    case 400:
      return "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin.";
    case 401:
      return "Phiên đăng nhập đã hết hạn.";
    case 403:
      return "Bạn không có quyền thực hiện thao tác này.";
    case 404:
      return "Không tìm thấy dữ liệu.";
    case 409:
      return "Dữ liệu bị trùng hoặc xung đột.";
    case 423:
      return "Dữ liệu đang bị khóa, không thể sửa.";
    case 429:
      return "Thao tác quá nhiều lần. Vui lòng thử lại sau.";
    case 500:
      return "Lỗi hệ thống. Vui lòng thử lại sau.";
    default:
      return "Đã xảy ra lỗi. Vui lòng thử lại sau.";
  }
}

function buildRequest(path: string, options: RequestOptions): Request {
  const headers: Record<string, string> = { ...options.headers };
  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (options.body instanceof FormData) {
      // Browser tự đặt Content-Type kèm boundary cho multipart.
      body = options.body;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }
  }
  return new Request(path, {
    method: options.method ?? "GET",
    credentials: "include",
    headers,
    body,
    signal: options.signal,
  });
}

async function parseError(res: Response): Promise<ApiError> {
  let code = `HTTP_${res.status}`;
  let message = defaultMessage(res.status);
  let details: unknown;
  try {
    const payload = (await res.json()) as { error?: { code?: string; message?: string; details?: unknown } };
    if (payload.error) {
      code = payload.error.code ?? code;
      message = payload.error.message ?? message;
      details = payload.error.details;
    }
  } catch {
    /* body không phải JSON */
  }
  if (CODE_MESSAGES[code]) message = CODE_MESSAGES[code];
  return new ApiError(res.status, code, message, details);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await fetch(buildRequest(path, options));
  if (res.status === 401 && !isPublicAuthPath(path)) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await fetch(buildRequest(path, options));
    } else {
      sessionExpiredHandler?.();
      throw new ApiError(401, "UNAUTHORIZED", "Phiên đăng nhập đã hết hạn");
    }
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  const payload = (await res.json()) as { data?: T };
  return payload.data as T;
}

// Tải file (Excel xuất, Excel tài khoản) — trả Blob thô, không parse JSON.
export async function apiBlob(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined>;
  } = {},
): Promise<Blob> {
  const suffix = options.query ? toQuery(options.query) : "";
  const makeRequest = () =>
    fetch(buildRequest(`${path}${suffix}`, { method: options.method ?? "GET", body: options.body }));
  let res = await makeRequest();
  if (res.status === 401 && !isPublicAuthPath(path)) {
    const refreshed = await tryRefresh();
    if (refreshed) res = await makeRequest();
    else {
      sessionExpiredHandler?.();
      throw new ApiError(401, "UNAUTHORIZED", "Phiên đăng nhập đã hết hạn");
    }
  }
  if (!res.ok) throw await parseError(res);
  return res.blob();
}

// Build query string, bỏ tham số undefined.
export function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const result = search.toString();
  return result ? `?${result}` : "";
}
