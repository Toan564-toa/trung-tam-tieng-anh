import type { Request, Response } from 'express';
import { parseId } from '../../utils/params';
import { markAttendanceSchema } from './attendance.schema';
import * as service from './attendance.service';

export async function getBySession(req: Request, res: Response) {
  const data = await service.getSessionAttendance(parseId(req.params.sessionId, 'sessionId'), req.user!);
  res.json({ data });
}

export async function mark(req: Request, res: Response) {
  const input = markAttendanceSchema.parse(req.body);
  const data = await service.markAttendance(parseId(req.params.sessionId, 'sessionId'), input, req.user!, req.ip);
  res.json({ data });
}
