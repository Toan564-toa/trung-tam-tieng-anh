import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

interface AuditInput {
  userId?: number | null;
  action: string; // create | update | delete | login ...
  tableName: string;
  recordId?: string | number | null;
  oldData?: unknown;
  newData?: unknown;
  ip?: string | null;
}

// Ghi nhật ký thao tác. Truyền `tx` để ghi trong cùng transaction với thao tác chính.
export async function writeAudit(input: AuditInput, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  await tx.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      tableName: input.tableName,
      recordId: input.recordId != null ? String(input.recordId) : null,
      oldData: (input.oldData ?? undefined) as Prisma.InputJsonValue | undefined,
      newData: (input.newData ?? undefined) as Prisma.InputJsonValue | undefined,
      ip: input.ip ?? null,
    },
  });
}
