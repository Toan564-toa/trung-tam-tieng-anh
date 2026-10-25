import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { HttpError } from '../../utils/httpError';
import { writeAudit } from '../../utils/audit';
import type {
  CreateRoomInput,
  ListRoomsQuery,
  UpdateRoomInput,
} from './rooms.schema';

const roomSelect = {
  id: true,
  branchId: true,
  name: true,
  capacity: true,
  floor: true,
  equipment: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.RoomSelect;

type RoomRecord = Prisma.RoomGetPayload<{ select: typeof roomSelect }>;

function toDto(room: RoomRecord) {
  return {
    ...room,
    deleted: room.deletedAt !== null,
  };
}

export async function listRooms(input: ListRoomsQuery) {
  const predicates: Prisma.Sql[] = [
    input.onlyDeleted === 'true'
      ? Prisma.sql`r.deleted_at IS NOT NULL`
      : Prisma.sql`r.deleted_at IS NULL`,
  ];
  if (input.status) predicates.push(Prisma.sql`r.status = ${input.status}::"RoomStatus"`);
  if (input.branchId) predicates.push(Prisma.sql`r.branch_id = ${input.branchId}`);
  if (input.query)
    predicates.push(Prisma.sql`ttnn_unaccent(lower(r.name))
      LIKE '%' || ttnn_unaccent(lower(${input.query})) || '%'`);
  const where = Prisma.join(predicates, ' AND ');
  const [ids, countRows] = await prisma.$transaction([
    prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT r.id FROM rooms r WHERE ${where}
      ORDER BY r.name ASC, r.id ASC LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize}`),
    prisma.$queryRaw<Array<{ total: bigint }>>(
      Prisma.sql`SELECT count(*)::bigint AS total FROM rooms r WHERE ${where}`,
    ),
  ]);
  const rooms = ids.length
    ? await prisma.room.findMany({
        where: { id: { in: ids.map(({ id }) => id) } },
        select: roomSelect,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      })
    : [];
  const byId = new Map(rooms.map((room) => [room.id, room]));
  const rows = ids.map(({ id }) => byId.get(id)).filter((room): room is RoomRecord => !!room);
  const total = Number(countRows[0]?.total ?? 0n);
  return {
    items: rows.map(toDto),
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.ceil(total / input.pageSize),
  };
}

export async function createRoom(actorId: number, input: CreateRoomInput, ip?: string) {
  const created = await prisma.$transaction(async (tx) => {
    const room = await tx.room.create({ data: input, select: roomSelect });
    await writeAudit(
      { userId: actorId, action: 'create', tableName: 'rooms', recordId: room.id, newData: toDto(room), ip },
      tx,
    );
    return room;
  });
  return toDto(created);
}

export async function updateRoom(actorId: number, roomId: number, input: UpdateRoomInput, ip?: string) {
  const old = await prisma.room.findUnique({ where: { id: roomId }, select: roomSelect });
  if (!old || old.deletedAt) throw HttpError.notFound('Không tìm thấy phòng học');
  const updated = await prisma.$transaction(async (tx) => {
    const room = await tx.room.update({ where: { id: roomId }, data: input, select: roomSelect });
    await writeAudit(
      {
        userId: actorId,
        action: 'update',
        tableName: 'rooms',
        recordId: roomId,
        oldData: toDto(old),
        newData: toDto(room),
        ip,
      },
      tx,
    );
    return room;
  });
  return toDto(updated);
}

export async function deleteRoom(actorId: number, roomId: number, ip?: string) {
  const old = await prisma.room.findUnique({ where: { id: roomId }, select: roomSelect });
  if (!old || old.deletedAt) throw HttpError.notFound('Không tìm thấy phòng học');
  await prisma.$transaction(async (tx) => {
    await tx.room.update({
      where: { id: roomId },
      data: { deletedAt: new Date() },
      select: roomSelect,
    });
    await writeAudit(
      { userId: actorId, action: 'delete', tableName: 'rooms', recordId: roomId, oldData: toDto(old), ip },
      tx,
    );
  });
}
