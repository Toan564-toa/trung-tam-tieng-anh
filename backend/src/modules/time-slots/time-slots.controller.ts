import type { Request, Response } from 'express';
import * as service from './time-slots.service';
import {
  createTimeSlotSchema,
  timeSlotIdSchema,
  updateTimeSlotSchema,
} from './time-slots.schema';

export async function list(req: Request, res: Response) {
  res.json({ data: await service.listTimeSlots() });
}

export async function create(req: Request, res: Response) {
  const slot = await service.createTimeSlot(req.user!.id, createTimeSlotSchema.parse(req.body), req.ip);
  res.status(201).json({ data: slot });
}

export async function update(req: Request, res: Response) {
  const { id } = timeSlotIdSchema.parse(req.params);
  const slot = await service.updateTimeSlot(req.user!.id, id, updateTimeSlotSchema.parse(req.body), req.ip);
  res.json({ data: slot });
}

export async function remove(req: Request, res: Response) {
  const { id } = timeSlotIdSchema.parse(req.params);
  await service.deleteTimeSlot(req.user!.id, id, req.ip);
  res.status(204).send();
}
