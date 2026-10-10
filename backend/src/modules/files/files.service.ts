import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { HttpError } from '../../utils/httpError';
import {
  ALLOWED_MIME_TYPES,
  detectMimeType,
  extensionOf,
} from '../../utils/fileType';
import { writeAudit } from '../../utils/audit';
import type { UploadFileInput } from './files.schema';

// Lớp trừu tượng lưu trữ: mặc định là đĩa cục bộ.
// Muốn đổi sang S3/MinIO thì viết lớp khác cùng interface và đổi ở dưới —
// controller/service không cần sửa.
export interface FileStorage {
  save(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

export class LocalFileStorage implements FileStorage {
  constructor(private readonly root: string) {}

  async save(key: string, data: Buffer): Promise<void> {
    const path = join(this.root, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  async read(key: string): Promise<Buffer> {
    return readFile(join(this.root, key));
  }

  async remove(key: string): Promise<void> {
    await unlink(join(this.root, key)).catch(() => undefined);
  }
}

export const fileStorage: FileStorage = new LocalFileStorage(env.FILE_STORAGE_DIR);

const fileSelect = {
  id: true,
  storageKey: true,
  originalName: true,
  mimeType: true,
  size: true,
  checksum: true,
  ownerType: true,
  ownerId: true,
  uploadedBy: true,
  createdAt: true,
} satisfies Prisma.FileSelect;

type FileRecord = Prisma.FileGetPayload<{ select: typeof fileSelect }>;

export function toFileDto(file: FileRecord) {
  return {
    id: file.id,
    // URL tương đối để frontend ghép với origin của API
    url: `/api/files/${file.id}`,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    checksum: file.checksum,
    ownerType: file.ownerType,
    ownerId: file.ownerId,
    createdAt: file.createdAt,
  };
}

interface Caller {
  id: number;
  roles: string[];
}

interface UploadInput extends UploadFileInput {
  buffer: Buffer;
}

// Kiểm tra người gọi được phép gắn tệp vào đối tượng sở hữu hay không.
// Không tin ownerType/ownerId từ client cho phép truy cập.
async function assertCanOwn(
  input: UploadFileInput,
  caller: Caller,
): Promise<void> {
  const { ownerType, ownerId } = input;
  if (!ownerType || !ownerId) {
    if (!caller.roles.includes('admin') && !caller.roles.includes('staff')) {
      throw HttpError.forbidden('Chỉ admin và nhân viên được upload tệp chung');
    }
    return;
  }
  const isAdmin = caller.roles.includes('admin');
  const isStaff = caller.roles.includes('staff');
  switch (ownerType) {
    case 'student': {
      if (isAdmin || isStaff) return;
      if (caller.roles.includes('student')) {
        const student = await prisma.student.findUnique({
          where: { id: ownerId },
          select: { userId: true },
        });
        if (student?.userId === caller.id) return;
      }
      throw HttpError.forbidden('Không được phép upload ảnh cho học viên này');
    }
    case 'teacher': {
      if (isAdmin) return;
      if (caller.roles.includes('teacher')) {
        const teacher = await prisma.teacher.findUnique({
          where: { id: ownerId },
          select: { userId: true },
        });
        if (teacher?.userId === caller.id) return;
      }
      throw HttpError.forbidden('Không được phép upload ảnh cho giáo viên này');
    }
    case 'staff': {
      if (isAdmin) return;
      if (caller.roles.includes('staff')) {
        const staff = await prisma.staff.findUnique({
          where: { id: ownerId },
          select: { userId: true },
        });
        if (staff?.userId === caller.id) return;
      }
      throw HttpError.forbidden('Không được phép upload ảnh cho nhân viên này');
    }
    case 'user': {
      if (isAdmin || ownerId === caller.id) return;
      throw HttpError.forbidden('Không được phép upload ảnh đại diện cho người dùng khác');
    }
    default:
      throw HttpError.badRequest('Loại đối tượng sở hữu tệp không hợp lệ');
  }
}

export async function uploadFile(input: UploadInput, caller: Caller) {
  // Kiểm tra loại theo nội dung thật (magic bytes), không tin header hay đuôi tên file.
  const detected = detectMimeType(input.buffer);
  if (!detected || !ALLOWED_MIME_TYPES.includes(detected as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw HttpError.badRequest(
      'Loại tệp không được phép. Chỉ chấp nhận PNG, JPEG, GIF, WEBP và PDF',
      'FILE_TYPE_NOT_ALLOWED',
    );
  }
  if (detected !== input.declaredMimeType) {
    throw HttpError.badRequest(
      'Nội dung tệp không khớp với loại khai báo',
      'FILE_TYPE_MISMATCH',
    );
  }
  if (input.buffer.length > env.FILE_MAX_SIZE_MB * 1024 * 1024) {
    throw HttpError.badRequest(
      `Tệp vượt quá dung lượng cho phép (${env.FILE_MAX_SIZE_MB} MB)`,
      'FILE_TOO_LARGE',
    );
  }
  await assertCanOwn(input, caller);

  // Đổi tên ngẫu nhiên, tách theo tháng để không dồn nhiều file trong một thư mục.
  const now = new Date();
  const key = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${extensionOf(detected)}`;
  const checksum = createHash('sha256').update(input.buffer).digest('hex');

  await fileStorage.save(key, input.buffer);
  const created = await prisma.file.create({
    data: {
      storageKey: key,
      originalName: input.originalName,
      mimeType: detected,
      size: input.buffer.length,
      checksum,
      uploadedBy: caller.id,
      ownerType: input.ownerType ?? null,
      ownerId: input.ownerId ?? null,
    },
    select: fileSelect,
  });
  await writeAudit({
    userId: caller.id,
    action: 'upload',
    tableName: 'files',
    recordId: created.id,
    newData: { originalName: created.originalName, mimeType: created.mimeType, size: created.size, ownerType: created.ownerType, ownerId: created.ownerId },
  });
  return toFileDto(created);
}

// Ảnh học viên KHÔNG công khai: chỉ admin, nhân viên, chính học viên,
// hoặc giáo viên đang dạy lớp có học viên đó.
async function canAccessOwnedFile(file: FileRecord, caller: Caller): Promise<boolean> {
  const isAdmin = caller.roles.includes('admin');
  const isStaff = caller.roles.includes('staff');
  switch (file.ownerType) {
    case 'student': {
      if (isAdmin || isStaff) return true;
      if (caller.roles.includes('student')) {
        const student = await prisma.student.findUnique({
          where: { id: file.ownerId ?? -1 },
          select: { userId: true },
        });
        if (student?.userId === caller.id) return true;
      }
      if (caller.roles.includes('teacher')) {
        const teacher = await prisma.teacher.findFirst({
          where: { userId: caller.id, deletedAt: null },
          select: { id: true },
        });
        if (!teacher) return false;
        // Học viên có thể ghi danh nhiều lớp: giáo viên được xem nếu dạy
        // ít nhất một lớp mà học viên đang ghi danh.
        const teaches = await prisma.enrollment.findFirst({
          where: {
            studentId: file.ownerId ?? -1,
            OR: [
              { class: { teacherId: teacher.id } },
              { class: { teachers: { some: { teacherId: teacher.id } } } },
            ],
          },
          select: { id: true },
        });
        return !!teaches;
      }
      return false;
    }
    case 'teacher': {
      if (isAdmin || isStaff) return true;
      if (caller.roles.includes('teacher')) {
        const teacher = await prisma.teacher.findUnique({
          where: { id: file.ownerId ?? -1 },
          select: { userId: true },
        });
        return teacher?.userId === caller.id;
      }
      return false;
    }
    case 'staff': {
      if (isAdmin) return true;
      if (caller.roles.includes('staff')) {
        const staff = await prisma.staff.findUnique({
          where: { id: file.ownerId ?? -1 },
          select: { userId: true },
        });
        return staff?.userId === caller.id;
      }
      return false;
    }
    case 'user': {
      if (isAdmin || file.ownerId === caller.id) return true;
      return false;
    }
    default:
      // Tệp không gắn đối tượng: nội bộ, admin và nhân viên được xem.
      return isAdmin || isStaff;
  }
}

export async function getFile(fileId: number, caller: Caller) {
  const file = await prisma.file.findUnique({ where: { id: fileId }, select: fileSelect });
  if (!file) throw HttpError.notFound('Không tìm thấy tệp');
  if (!(await canAccessOwnedFile(file, caller))) {
    throw HttpError.forbidden('Không được phép xem tệp này');
  }
  const data = await fileStorage.read(file.storageKey);
  return { file, data };
}

// Endpoint công khai chỉ phục vụ ảnh giáo viên đang bật hiển thị trên website.
// Mọi loại tệp khác trả 404 để không lộ sự tồn tại của tệp.
export async function getPublicFile(fileId: number) {
  const file = await prisma.file.findUnique({ where: { id: fileId }, select: fileSelect });
  if (!file || file.ownerType !== 'teacher') throw HttpError.notFound('Không tìm thấy tệp');
  const teacher = await prisma.teacher.findFirst({
    where: { photoFileId: file.id, deletedAt: null },
    select: { showOnWebsite: true },
  });
  if (!teacher || !teacher.showOnWebsite) throw HttpError.notFound('Không tìm thấy tệp');
  const data = await fileStorage.read(file.storageKey);
  return { file, data };
}
