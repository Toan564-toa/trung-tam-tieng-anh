import type { Request, Response } from 'express';
import * as service from './accounts.service';
import {
  accountIdSchema,
  accountStatusSchema,
  createAccountSchema,
  listAccountsSchema,
  loginHistorySchema,
  updateAccountSchema,
} from './accounts.schema';

export async function list(req: Request, res: Response) {
  res.json({ data: await service.listAccounts(listAccountsSchema.parse(req.query)) });
}

export async function create(req: Request, res: Response) {
  const result = await service.createAccount(req.user!.id, createAccountSchema.parse(req.body), req.ip);
  res.status(201).json({ data: result });
}

export async function update(req: Request, res: Response) {
  const { id } = accountIdSchema.parse(req.params);
  res.json({ data: await service.updateAccount(req.user!.id, id, updateAccountSchema.parse(req.body), req.ip) });
}

export async function setStatus(req: Request, res: Response) {
  const { id } = accountIdSchema.parse(req.params);
  res.json({ data: await service.setAccountStatus(req.user!.id, id, accountStatusSchema.parse(req.body), req.ip) });
}

export async function resetPassword(req: Request, res: Response) {
  const { id } = accountIdSchema.parse(req.params);
  res.json({ data: await service.resetAccountPassword(req.user!.id, id, req.ip) });
}

export async function loginHistory(req: Request, res: Response) {
  const { id } = accountIdSchema.parse(req.params);
  const { page, pageSize } = loginHistorySchema.parse(req.query);
  res.json({ data: await service.accountLoginHistory(id, page, pageSize) });
}

export async function remove(req: Request, res: Response) {
  const { id } = accountIdSchema.parse(req.params);
  await service.deleteAccount(req.user!.id, id, req.ip);
  res.status(204).send();
}

export async function restore(req: Request, res: Response) {
  const { id } = accountIdSchema.parse(req.params);
  res.json({ data: await service.restoreAccount(req.user!.id, id, req.ip) });
}
