import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { HttpError } from '../../utils/httpError';
import { writeAudit } from '../../utils/audit';
import type {
  CreateTimeSlotInput,
  UpdateTimeSlotInput,
} from './time-slots.schema';

const slotSelect = {
  id: true,
  code: true,
  label: true,
  startTime: true,
  endTime: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TimeSlotSelect;

type _SlotRecord = Prisma.TimeSlotGetPayload<{ select: typeof slotSelect }>;

export async function listTimeSlots() {
  const slots = await prisma.timeSlot.findMany({
    select: slotSelect,
    orderBy: [{ sortOrder: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
  });
  return slots;
}

export async function createTimeSlot(actorId: number, input: CreateTimeSlotInput, ip?: string) {
  const created = await prisma.$transaction(async (tx) => {
    const slot = await tx.timeSlot.create({ data: input, select: slotSelect });
    await writeAudit(
      { userId: actorId, action: 'create', tableName: 'time_slots', recordId: slot.id, newData: slot, ip },
      tx,
    );
    return slot;
  });
  return created;
}

export async function updateTimeSlot(actorId: number, slotId: number, input: UpdateTimeSlotInput, ip?: string) {
  const old = await prisma.timeSlot.findUnique({ where: { id: slotId }, select: slotSelect });
  if (!old) throw HttpError.notFound('Không tìm thấy ca học');
  const updated = await prisma.$transaction(async (tx) => {
    const slot = await tx.timeSlot.update({ where: { id: slotId }, data: input, select: slotSelect });
    await writeAudit(
      {
        userId: actorId,
        action: 'update',
        tableName: 'time_slots',
        recordId: slotId,
        oldData: old,
        newData: slot,
        ip,
      },
      tx,
    );
    return slot;
  });
  return updated;
}

export async function deleteTimeSlot(actorId: number, slotId: number, ip?: string) {
  const old = await prisma.timeSlot.findUnique({ where: { id: slotId }, select: slotSelect });
  if (!old) throw HttpError.notFound('Không tìm thấy ca học');
  // Ca đang được lớp nào dùng thì không xoá (lịch sử lớp phải giữ nguyên).
  const used = await prisma.classSchedule.findFirst({
    where: { timeSlotId: slotId },
    select: { id: true },
  });
  if (used) throw HttpError.conflict('Ca học đang được sử dụng bởi lịch lớp, không thể xoá', 'TIME_SLOT_IN_USE');
  await prisma.$transaction(async (tx) => {
    await tx.timeSlot.delete({ where: { id: slotId } });
    await writeAudit(
      { userId: actorId, action: 'delete', tableName: 'time_slots', recordId: slotId, oldData: old, ip },
      tx,
    );
  });
}
