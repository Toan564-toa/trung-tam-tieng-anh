import type { Request, Response } from 'express';
import { parseId } from '../../utils/params';
import * as service from './enrollments.service';
import {
  createEnrollmentSchema,
  enrollmentStatusSchema,
  freezeEnrollmentSchema,
  listEnrollmentsQuery,
  makeupSessionSchema,
  transferClassSchema,
  unfreezeEnrollmentSchema,
  updateEnrollmentSchema,
} from './enrollments.schema';

export async function list(req: Request, res: Response) {
  res.json({ data: await service.listEnrollments(listEnrollmentsQuery.parse(req.query), req.user!) });
}

export async function get(req: Request, res: Response) {
  const id = parseId(req.params.enrollmentId, 'enrollmentId');
  res.json({ data: await service.getEnrollment(id, req.user!) });
}

export async function create(req: Request, res: Response) {
  const enrollment = await service.createEnrollment(req.user!.id, createEnrollmentSchema.parse(req.body), req.ip);
  res.status(201).json({ data: enrollment });
}

export async function update(req: Request, res: Response) {
  const id = parseId(req.params.enrollmentId, 'enrollmentId');
  const enrollment = await service.updateEnrollment(id, updateEnrollmentSchema.parse(req.body), req.user!.id, req.ip);
  res.json({ data: enrollment });
}

export async function setStatus(req: Request, res: Response) {
  const id = parseId(req.params.enrollmentId, 'enrollmentId');
  const result = await service.setEnrollmentStatus(id, enrollmentStatusSchema.parse(req.body), req.user!.id, req.ip);
  res.json({ data: result });
}

export async function transfer(req: Request, res: Response) {
  const id = parseId(req.params.enrollmentId, 'enrollmentId');
  const result = await service.transferClass(id, transferClassSchema.parse(req.body), req.user!.id, req.ip);
  res.json({ data: result });
}

export async function freeze(req: Request, res: Response) {
  const id = parseId(req.params.enrollmentId, 'enrollmentId');
  const enrollment = await service.freezeEnrollment(id, freezeEnrollmentSchema.parse(req.body), req.user!.id, req.ip);
  res.json({ data: enrollment });
}

export async function unfreeze(req: Request, res: Response) {
  const id = parseId(req.params.enrollmentId, 'enrollmentId');
  const enrollment = await service.unfreezeEnrollment(id, unfreezeEnrollmentSchema.parse(req.body), req.user!.id, req.ip);
  res.json({ data: enrollment });
}

export async function createMakeup(req: Request, res: Response) {
  const id = parseId(req.params.enrollmentId, 'enrollmentId');
  const makeup = await service.createMakeupSession(id, makeupSessionSchema.parse(req.body), req.user!.id, req.ip);
  res.status(201).json({ data: makeup });
}