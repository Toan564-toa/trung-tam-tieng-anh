import type { Request, Response } from 'express';
import * as service from './rooms.service';
import {
  createRoomSchema,
  listRoomsQuery,
  roomIdSchema,
  updateRoomSchema,
} from './rooms.schema';

export async function list(req: Request, res: Response) {
  res.json({ data: await service.listRooms(listRoomsQuery.parse(req.query)) });
}

export async function create(req: Request, res: Response) {
  const room = await service.createRoom(req.user!.id, createRoomSchema.parse(req.body), req.ip);
  res.status(201).json({ data: room });
}

export async function update(req: Request, res: Response) {
  const { id } = roomIdSchema.parse(req.params);
  const room = await service.updateRoom(req.user!.id, id, updateRoomSchema.parse(req.body), req.ip);
  res.json({ data: room });
}

export async function remove(req: Request, res: Response) {
  const { id } = roomIdSchema.parse(req.params);
  await service.deleteRoom(req.user!.id, id, req.ip);
  res.status(204).send();
}
