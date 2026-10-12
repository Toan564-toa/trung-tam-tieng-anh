import crypto from 'node:crypto';
import argon2 from 'argon2';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import type { ImportKind, ImportRowStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { HttpError } from '../../utils/httpError';
import { writeAudit } from '../../utils/audit';
import { buildExcelBuffer } from '../../utils/excel';

const MAX_IMPORT_ROWS = 1000;
const CREDENTIALS_TTL_MS = 15 * 60 * 1000;
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

const phoneRe = /^[0-9+\s.-]{8,15}$/;

// exceljs khai báo Buffer riêng (extends ArrayBuffer) không tương thích với
// Node Buffer. Lấy đúng loại tham số đầu tiên của xlsx.load để cast an toàn.
type ExcelLoadBuffer = Parameters<ExcelJS.Workbook['xlsx']['load']>[0];

interface ImportColumn {
  header: string;
  field: string;
  required?: boolean;
  example: string;
}

interface KindConfig {
  roleCode: string;
  tableName: string;
  codeField: string;
  columns: ImportColumn[];
  examples: string[][];
}

const KIND_CONFIG: Record<ImportKind, KindConfig> = {
  STUDENT: {
    roleCode: 'student',
    tableName: 'students',
    codeField: 'studentCode',
    columns: [
      { header: 'Mã học viên', field: 'studentCode', required: true, example: 'HV260001' },
      { header: 'Họ tên', field: 'fullName', required: true, example: 'Nguyễn Văn A' },
      { header: 'Ngày sinh', field: 'birthDate', example: '05/01/2010' },
      { header: 'Giới tính', field: 'gender', example: 'Nam' },
      { header: 'Số điện thoại', field: 'phone', example: '0912345678' },
      { header: 'Email', field: 'email', example: 'van.a@example.vn' },
      { header: 'Địa chỉ', field: 'address', example: 'Hà Nội' },
      { header: 'Trường', field: 'school', example: 'THCS A' },
      { header: 'Trình độ', field: 'level', example: 'Cơ bản' },
    ],
    examples: [
      ['HV260001', 'Nguyễn Văn A', '05/01/2010', 'Nam', '0912345678', 'van.a@example.vn', 'Hà Nội', 'THCS A', 'Cơ bản'],
      ['HV260002', 'Trần Thị B', '12/06/2011', 'Nữ', '0912345679', 'thi.b@example.vn', 'Hà Nội', 'THCS B', 'Nâng cao'],
    ],
  },
  TEACHER: {
    roleCode: 'teacher',
    tableName: 'teachers',
    codeField: 'teacherCode',
    columns: [
      { header: 'Mã giáo viên', field: 'teacherCode', required: true, example: 'GV260001' },
      { header: 'Họ tên', field: 'fullName', required: true, example: 'Lê Văn C' },
      { header: 'Số điện thoại', field: 'phone', example: '0912345680' },
      { header: 'Email', field: 'email', example: 'c@example.vn' },
      { header: 'Chuyên môn', field: 'specialty', example: 'Tiếng Anh' },
      { header: 'Ngày vào', field: 'startDate', example: '05/01/2026' },
      { header: 'Hiện website', field: 'showOnWebsite', example: 'true' },
    ],
    examples: [
      ['GV260001', 'Lê Văn C', '0912345680', 'c@example.vn', 'Tiếng Anh', '05/01/2026', 'true'],
      ['GV260002', 'Phạm Thị D', '0912345681', 'd@example.vn', 'Toán', '05/01/2026', 'false'],
    ],
  },
  STAFF: {
    roleCode: 'staff',
    tableName: 'staff',
    codeField: 'staffCode',
    columns: [
      { header: 'Mã nhân viên', field: 'staffCode', required: true, example: 'NV260001' },
      { header: 'Họ tên', field: 'fullName', required: true, example: 'Hoàng Văn E' },
      { header: 'Số điện thoại', field: 'phone', example: '0912345682' },
      { header: 'Email', field: 'email', example: 'e@example.vn' },
      { header: 'Chức vụ', field: 'position', example: 'Tư vấn' },
      { header: 'Phòng ban', field: 'department', example: 'Tuyển sinh' },
      { header: 'Ngày vào', field: 'startDate', example: '05/01/2026' },
    ],
    examples: [
      ['NV260001', 'Hoàng Văn E', '0912345682', 'e@example.vn', 'Tư vấn', 'Tuyển sinh', '05/01/2026'],
      ['NV260002', 'Đỗ Thị F', '0912345683', 'f@example.vn', 'Kế toán', 'Kế toán', '05/01/2026'],
    ],
  },
};

// --- Chuẩn hóa ---

function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return plus + trimmed.replace(/[^0-9]/g, '');
}

// Hỗ trợ dd/mm/yyyy, dd-mm-yyyy, dd/mm/yy và yyyy-mm-dd. Trả null khi rỗng.
// Dùng Date.UTC: cột date của Prisma lấy phần ngày theo UTC, nếu dùng giờ
// local (UTC+7) sẽ bị lùi một ngày khi lưu.
function parseImportDate(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  m = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += year > 50 ? 1900 : 2000;
    return new Date(Date.UTC(year, month - 1, day));
  }
  return null;
}

const GENDER_MAP: Record<string, 'MALE' | 'FEMALE' | 'OTHER'> = {
  nam: 'MALE',
  male: 'MALE',
  nữ: 'FEMALE',
  female: 'FEMALE',
  khác: 'OTHER',
  other: 'OTHER',
};

function unaccent(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function baseUsername(fullName: string): string {
  const base = unaccent(fullName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 30);
  return base || 'user';
}

function generateTempPassword(): string {
  const bytes = crypto.randomBytes(12);
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join('');
}

// --- Schema validate từng dòng (chạy sau chuẩn hóa) ---

const studentRowSchema = z.object({
  studentCode: z.string().min(1, 'Thiếu mã học viên').max(30, 'Mã học viên tối đa 30 ký tự'),
  fullName: z.string().min(1, 'Thiếu họ tên').max(150, 'Họ tên tối đa 150 ký tự'),
  birthDate: z.date().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable(),
  phone: z.string().regex(phoneRe, 'Số điện thoại không hợp lệ').nullable(),
  email: z.string().email('Email không hợp lệ').max(200, 'Email tối đa 200 ký tự').nullable(),
  address: z.string().max(300, 'Địa chỉ tối đa 300 ký tự').nullable(),
  school: z.string().max(200, 'Trường tối đa 200 ký tự').nullable(),
  level: z.string().max(100, 'Trình độ tối đa 100 ký tự').nullable(),
});

const teacherRowSchema = z.object({
  teacherCode: z.string().min(1, 'Thiếu mã giáo viên').max(30, 'Mã giáo viên tối đa 30 ký tự'),
  fullName: z.string().min(1, 'Thiếu họ tên').max(150, 'Họ tên tối đa 150 ký tự'),
  phone: z.string().regex(phoneRe, 'Số điện thoại không hợp lệ').nullable(),
  email: z.string().email('Email không hợp lệ').max(200, 'Email tối đa 200 ký tự').nullable(),
  specialty: z.string().max(200, 'Chuyên môn tối đa 200 ký tự').nullable(),
  startDate: z.date().nullable(),
  showOnWebsite: z.boolean(),
});

const staffRowSchema = z.object({
  staffCode: z.string().min(1, 'Thiếu mã nhân viên').max(30, 'Mã nhân viên tối đa 30 ký tự'),
  fullName: z.string().min(1, 'Thiếu họ tên').max(150, 'Họ tên tối đa 150 ký tự'),
  phone: z.string().regex(phoneRe, 'Số điện thoại không hợp lệ').nullable(),
  email: z.string().email('Email không hợp lệ').max(200, 'Email tối đa 200 ký tự').nullable(),
  position: z.string().max(150, 'Chức vụ tối đa 150 ký tự').nullable(),
  department: z.string().max(150, 'Phòng ban tối đa 150 ký tự').nullable(),
  startDate: z.date().nullable(),
});

type StudentRow = z.infer<typeof studentRowSchema>;
type TeacherRow = z.infer<typeof teacherRowSchema>;
type StaffRow = z.infer<typeof staffRowSchema>;
type NormalizedRow = StudentRow | TeacherRow | StaffRow;

// Chuẩn hóa dữ liệu thô từ Excel thành bản ghi sạch rồi kiểm tra bằng zod.
function normalizeRow(
  kind: ImportKind,
  raw: Record<string, string>,
): { data: NormalizedRow | null; errors: string[] } {
  const config = KIND_CONFIG[kind];
  const errors: string[] = [];
  const get = (field: string) => (raw[field] ?? '').trim();

  for (const col of config.columns) {
    if (col.required && !get(col.field)) errors.push(`Thiếu '${col.header}'`);
  }

  const dates: Record<string, Date | null> = {};
  for (const field of ['birthDate', 'startDate'] as const) {
    const rawDate = get(field);
    if (rawDate) {
      const parsed = parseImportDate(rawDate);
      if (!parsed) {
        errors.push(`'${field === 'birthDate' ? 'Ngày sinh' : 'Ngày vào'}' không hợp lệ (dd/mm/yyyy)`);
      }
      dates[field] = parsed;
    } else {
      dates[field] = null;
    }
  }

  let gender: 'MALE' | 'FEMALE' | 'OTHER' | null = null;
  if (kind === 'STUDENT') {
    const rawGender = get('gender');
    if (rawGender) {
      gender = GENDER_MAP[rawGender.toLowerCase()] ?? null;
      if (!gender) errors.push('Giới tính phải là Nam/Nữ/Khác');
    }
  }

  let showOnWebsite = false;
  if (kind === 'TEACHER') {
    const rawShow = get('showOnWebsite').toLowerCase();
    if (rawShow) {
      if (['true', '1', 'có', 'yes'].includes(rawShow)) showOnWebsite = true;
      else if (['false', '0', 'không', 'no'].includes(rawShow)) showOnWebsite = false;
      else errors.push("Cột 'Hiện website' phải là true/false");
    }
  }

  const phone = get('phone') ? normalizePhone(get('phone')) : null;
  const email = get('email') || null;
  const candidate: Record<string, unknown> = { phone, email, ...dates };

  if (kind === 'STUDENT') {
    candidate.studentCode = get('studentCode');
    candidate.fullName = get('fullName');
    candidate.gender = gender;
    candidate.address = get('address') || null;
    candidate.school = get('school') || null;
    candidate.level = get('level') || null;
    return finalize(studentRowSchema, candidate, errors);
  }
  if (kind === 'TEACHER') {
    candidate.teacherCode = get('teacherCode');
    candidate.fullName = get('fullName');
    candidate.specialty = get('specialty') || null;
    candidate.showOnWebsite = showOnWebsite;
    return finalize(teacherRowSchema, candidate, errors);
  }
  candidate.staffCode = get('staffCode');
  candidate.fullName = get('fullName');
  candidate.position = get('position') || null;
  candidate.department = get('department') || null;
  return finalize(staffRowSchema, candidate, errors);
}

function finalize<T>(schema: z.ZodType<T>, candidate: Record<string, unknown>, errors: string[]): { data: T | null; errors: string[] } {
  const result = schema.safeParse(candidate);
  if (!result.success) {
    for (const issue of result.error.issues) errors.push(issue.message);
    return { data: null, errors };
  }
  return { data: result.data, errors };
}

// --- Đọc file Excel ---

// Đọc hàng tiêu đề, ánh xạ tên cột tiếng Việt sang field; kiểm tra cột bắt buộc.
function mapHeaders(sheet: ExcelJS.Worksheet, config: KindConfig): (string | null)[] {
  const headerToField = new Map<string, string>();
  for (const col of config.columns) headerToField.set(col.header.trim().toLowerCase(), col.field);

  const colField: (string | null)[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const header = String(cell.value ?? '').trim().toLowerCase();
    colField[colNumber] = headerToField.get(header) ?? null;
  });

  const present = new Set(colField.filter((f): f is string => !!f));
  const missing = config.columns.filter((c) => c.required && !present.has(c.field));
  if (missing.length) {
    throw HttpError.badRequest(`Thiếu cột bắt buộc: ${missing.map((c) => c.header).join(', ')}`, 'MISSING_COLUMNS');
  }
  return colField;
}

function readRow(sheet: ExcelJS.Worksheet, rowNumber: number, colField: (string | null)[]): Record<string, string> {
  const raw: Record<string, string> = {};
  sheet.getRow(rowNumber).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const field = colField[colNumber];
    if (field) raw[field] = cell.value != null ? String(cell.value).trim() : '';
  });
  return raw;
}

function isEmptyRow(raw: Record<string, string>): boolean {
  return Object.values(raw).every((v) => !v);
}

// --- Tải trước mã và số điện thoại đã có trong DB ---

async function loadExisting(kind: ImportKind): Promise<{ codes: Set<string>; phones: Set<string> }> {
  if (kind === 'STUDENT') {
    const [codes, phones] = await Promise.all([
      prisma.student.findMany({ where: { deletedAt: null }, select: { studentCode: true } }),
      prisma.student.findMany({ where: { deletedAt: null, phone: { not: null } }, select: { phone: true } }),
    ]);
    return {
      codes: new Set(codes.map((r) => r.studentCode)),
      phones: new Set(phones.map((r) => normalizePhone(r.phone!))),
    };
  }
  if (kind === 'TEACHER') {
    const [codes, phones] = await Promise.all([
      prisma.teacher.findMany({ where: { deletedAt: null }, select: { teacherCode: true } }),
      prisma.teacher.findMany({ where: { deletedAt: null, phone: { not: null } }, select: { phone: true } }),
    ]);
    return {
      codes: new Set(codes.map((r) => r.teacherCode)),
      phones: new Set(phones.map((r) => normalizePhone(r.phone!))),
    };
  }
  const [codes, phones] = await Promise.all([
    prisma.staff.findMany({ where: { deletedAt: null }, select: { staffCode: true } }),
    prisma.staff.findMany({ where: { deletedAt: null, phone: { not: null } }, select: { phone: true } }),
  ]);
  return {
    codes: new Set(codes.map((r) => r.staffCode)),
    phones: new Set(phones.map((r) => normalizePhone(r.phone!))),
  };
}

// --- Service ---

export async function buildTemplate(kind: ImportKind): Promise<Buffer> {
  const config = KIND_CONFIG[kind];
  return buildExcelBuffer('Danh sach', config.columns.map((c) => c.header), config.examples);
}

export interface ImportResult {
  batchId: number;
  totalRows: number;
  validRows: number;
  errorRows: number;
}

export async function createImport(userId: number, kind: ImportKind, fileBuffer: Buffer): Promise<ImportResult> {
  const config = KIND_CONFIG[kind];
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(fileBuffer as unknown as ExcelLoadBuffer);
  } catch {
    throw HttpError.badRequest('File không phải Excel hợp lệ', 'INVALID_EXCEL');
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw HttpError.badRequest('File Excel không có dữ liệu', 'EMPTY_EXCEL');

  const colField = mapHeaders(sheet, config);
  if (sheet.rowCount - 1 > MAX_IMPORT_ROWS) {
    throw HttpError.badRequest(`File tối đa ${MAX_IMPORT_ROWS} dòng dữ liệu`, 'TOO_MANY_ROWS');
  }

  const existing = await loadExisting(kind);
  const seenCodes = new Set<string>();
  const seenPhones = new Set<string>();

  const rows: Array<{ rowNumber: number; rawData: Record<string, string>; status: ImportRowStatus; errorMessage: string | null }> = [];

  for (let i = 2; i <= sheet.rowCount; i++) {
    const raw = readRow(sheet, i, colField);
    if (isEmptyRow(raw)) continue;

    const rowNumber = rows.length + 1;
    const { data, errors } = normalizeRow(kind, raw);
    let status: ImportRowStatus = 'VALID';
    let errorMessage: string | null = null;

    if (errors.length > 0 || !data) {
      status = 'ERROR';
      errorMessage = errors.join('; ');
    } else {
      const code = String((data as Record<string, unknown>)[config.codeField]);
      const phone = (data as { phone: string | null }).phone;
      if (seenCodes.has(code)) {
        status = 'ERROR';
        errorMessage = 'Trùng mã trong file';
      } else if (existing.codes.has(code)) {
        status = 'ERROR';
        errorMessage = 'Mã đã tồn tại trong hệ thống';
      } else if (phone && seenPhones.has(phone)) {
        status = 'ERROR';
        errorMessage = 'Trùng số điện thoại trong file';
      } else if (phone && existing.phones.has(phone)) {
        status = 'ERROR';
        errorMessage = 'Số điện thoại đã tồn tại trong hệ thống';
      } else {
        seenCodes.add(code);
        if (phone) seenPhones.add(phone);
      }
    }

    rows.push({ rowNumber, rawData: raw, status, errorMessage });
  }

  const errorRows = rows.filter((r) => r.status === 'ERROR').length;
  const batch = await prisma.importBatch.create({
    data: {
      kind,
      createdBy: userId,
      totalRows: rows.length,
      errorRows,
      status: 'UPLOADED',
      rows: {
        create: rows.map((r) => ({
          rowNumber: r.rowNumber,
          rawData: r.rawData as Prisma.InputJsonValue,
          status: r.status,
          errorMessage: r.errorMessage,
        })),
      },
    },
  });

  return { batchId: batch.id, totalRows: rows.length, validRows: rows.length - errorRows, errorRows };
}

export interface PreviewRow {
  id: number;
  rowNumber: number;
  rawData: Record<string, unknown>;
  status: ImportRowStatus;
  errorMessage: string | null;
  recordId: number | null;
}

export interface PreviewResult {
  batchId: number;
  kind: ImportKind;
  status: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  createdRows: number;
  items: PreviewRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export async function getPreview(
  id: number,
  query: { page: number; pageSize: number; status?: ImportRowStatus },
): Promise<PreviewResult> {
  const batch = await prisma.importBatch.findUnique({ where: { id } });
  if (!batch) throw HttpError.notFound('Không tìm thấy lô nhập');
  const where = { batchId: id, ...(query.status ? { status: query.status } : {}) };
  const [total, items, validRows, createdRows] = await Promise.all([
    prisma.importRow.count({ where }),
    prisma.importRow.findMany({ where, orderBy: { rowNumber: 'asc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.importRow.count({ where: { batchId: id, status: 'VALID' } }),
    prisma.importRow.count({ where: { batchId: id, status: 'CREATED' } }),
  ]);
  return {
    batchId: batch.id,
    kind: batch.kind,
    status: batch.status,
    totalRows: batch.totalRows,
    validRows,
    errorRows: batch.errorRows,
    createdRows,
    items: items.map((r) => ({
      id: r.id,
      rowNumber: r.rowNumber,
      rawData: r.rawData as Record<string, unknown>,
      status: r.status,
      errorMessage: r.errorMessage,
      recordId: r.recordId,
    })),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  };
}

export interface ConfirmResult {
  batchId: number;
  created: number;
  skipped: number;
  credentialsToken: string;
  credentialsExpiresAt: string;
}

// Mật khẩu tạm chỉ lưu trong bộ nhớ (không vào DB/log/audit), khóa bằng token một lần.
interface PendingCredentials {
  batchId: number;
  credentials: Array<{ username: string; fullName: string; tempPassword: string }>;
  expiresAt: number;
  used: boolean;
}

const credentialStore = new Map<string, PendingCredentials>();

function sweepExpired(): void {
  const now = Date.now();
  for (const [token, entry] of credentialStore) {
    if (now > entry.expiresAt) credentialStore.delete(token);
  }
}

function storeCredentials(batchId: number, credentials: PendingCredentials['credentials']): { token: string; expiresAt: string } {
  sweepExpired();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + CREDENTIALS_TTL_MS;
  credentialStore.set(token, { batchId, credentials, expiresAt, used: false });
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

// Tạo User + vai trò. Tên đăng nhập sinh từ họ tên; trùng thì suffix 2, 3...
// Không dựa vào bắt P2002: trong transaction, một câu lệnh lỗi sẽ abort
// toàn bộ transaction (25P02) nên phải kiểm tra trước khi tạo.
async function createAccount(
  tx: Prisma.TransactionClient,
  data: NormalizedRow,
  roleId: number,
): Promise<{ userId: number; username: string; tempPassword: string }> {
  const fullName = String((data as Record<string, unknown>).fullName);
  const base = baseUsername(fullName);
  const tempPassword = generateTempPassword();
  const passwordHash = await argon2.hash(tempPassword);

  let username = base;
  let suffix = 1;
  for (;;) {
    const existing = await tx.user.findUnique({ where: { username }, select: { id: true } });
    if (!existing) break;
    suffix += 1;
    username = `${base}${suffix}`;
  }
  const user = await tx.user.create({
    data: {
      username,
      passwordHash,
      mustChangePassword: true,
      status: 'ACTIVE',
      roles: { create: { roleId } },
    },
  });
  return { userId: user.id, username, tempPassword };
}

// Tạo hồ sơ (Student/Teacher/Staff) gắn với User vừa tạo. Trả về id hồ sơ.
async function createProfile(tx: Prisma.TransactionClient, kind: ImportKind, userId: number, data: NormalizedRow): Promise<number> {
  const record = { ...(data as Record<string, unknown>), userId };
  if (kind === 'STUDENT') {
    const student = await tx.student.create({ data: record as unknown as Prisma.StudentCreateInput });
    return student.id;
  }
  if (kind === 'TEACHER') {
    const teacher = await tx.teacher.create({ data: record as unknown as Prisma.TeacherCreateInput });
    return teacher.id;
  }
  const staff = await tx.staff.create({ data: record as unknown as Prisma.StaffCreateInput });
  return staff.id;
}

export async function confirmImport(
  id: number,
  adminId: number,
  skipErrors: boolean,
  ip: string | null,
): Promise<ConfirmResult> {
  const batch = await prisma.importBatch.findUnique({ where: { id }, include: { rows: true } });
  if (!batch) throw HttpError.notFound('Không tìm thấy lô nhập');
  if (batch.status === 'CONFIRMED' || batch.status === 'COMPLETED') {
    throw HttpError.conflict('Lô nhập này đã được xác nhận rồi', 'ALREADY_CONFIRMED');
  }

  const errorRows = batch.rows.filter((r) => r.status === 'ERROR');
  if (errorRows.length > 0 && !skipErrors) {
    throw HttpError.conflict(`Còn ${errorRows.length} dòng lỗi. Sửa file hoặc xác nhận với skipErrors để bỏ qua`, 'HAS_ERROR_ROWS');
  }

  const validRows = batch.rows.filter((r) => r.status === 'VALID');
  const role = await prisma.role.findUniqueOrThrow({ where: { code: KIND_CONFIG[batch.kind].roleCode } });
  const credentials: PendingCredentials['credentials'] = [];

  // Mỗi dòng tạo user (argon2 ~100ms) + hồ sơ + cập nhật dòng.
  // Timeout tỉ lệ với số dòng để không hết hạn (P2028) trên DB từ xa.
  const timeoutMs = Math.min(600_000, 30_000 + validRows.length * 200);
  await prisma.$transaction(async (tx) => {
    for (const row of validRows) {
      const { data } = normalizeRow(batch.kind, row.rawData as Record<string, string>);
      if (!data) throw HttpError.badRequest(`Dòng ${row.rowNumber} không còn hợp lệ`, 'ROW_INVALID');

      const account = await createAccount(tx, data, role.id);
      const recordId = await createProfile(tx, batch.kind, account.userId, data);

      await tx.importRow.update({
        where: { id: row.id },
        data: { status: 'CREATED', recordId },
      });
      credentials.push({ username: account.username, fullName: String((data as Record<string, unknown>).fullName), tempPassword: account.tempPassword });
    }

    await tx.importBatch.update({ where: { id }, data: { status: 'COMPLETED' } });
    await writeAudit(
      {
        userId: adminId,
        action: 'import',
        tableName: KIND_CONFIG[batch.kind].tableName,
        recordId: batch.id,
        newData: { created: credentials.length, skipped: errorRows.length },
        ip,
      },
      tx,
    );
  }, { timeout: timeoutMs });

  const { token, expiresAt } = storeCredentials(batch.id, credentials);
  return { batchId: batch.id, created: credentials.length, skipped: errorRows.length, credentialsToken: token, credentialsExpiresAt: expiresAt };
}

export async function downloadCredentials(id: number, token: string): Promise<Buffer> {
  const entry = credentialStore.get(token);
  if (!entry || entry.batchId !== id) throw HttpError.notFound('Token không hợp lệ hoặc đã hết hạn', 'INVALID_TOKEN');
  if (entry.used) throw HttpError.conflict('Token đã được sử dụng', 'TOKEN_USED');
  if (Date.now() > entry.expiresAt) {
    credentialStore.delete(token);
    throw HttpError.gone('Token đã hết hạn', 'TOKEN_EXPIRED');
  }
  entry.used = true;
  return buildExcelBuffer(
    'Tai khoan',
    ['Tên đăng nhập', 'Họ tên', 'Mật khẩu tạm'],
    entry.credentials.map((c) => [c.username, c.fullName, c.tempPassword]),
  );
}
