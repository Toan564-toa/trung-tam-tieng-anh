import type { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { writeAudit } from '../../utils/audit';
import { parseId } from '../../utils/params';
import { createLeadSchema, listLeadsQuery, updateLeadSchema } from './leads.schema';

// Công khai: form đăng ký tư vấn trên landing page
export async function createPublic(req: Request, res: Response) {
  const { website, ...input } = createLeadSchema.parse(req.body);

  // Bot điền ô ẩn: trả thành công giả để bot không biết bị chặn
  if (website) return res.status(201).json({ data: { ok: true } });

  await prisma.lead.create({ data: { ...input, source: 'website' } });
  res.status(201).json({ data: { ok: true } });
}

export async function list(req: Request, res: Response) {
  const q = listLeadsQuery.parse(req.query);
  const where = q.status ? { status: q.status } : {};

  const [items, total] = await prisma.$transaction([
    prisma.lead.findMany({
      where,
      orderBy: { id: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { assignedTo: { select: { id: true, fullName: true } } },
    }),
    prisma.lead.count({ where }),
  ]);

  res.json({ data: { items, page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) } });
}

export async function update(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const input = updateLeadSchema.parse(req.body);

  const lead = await prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({ where: { id }, data: input });
    await writeAudit(
      { userId: req.user!.id, action: 'update', tableName: 'leads', recordId: id, newData: input, ip: req.ip },
      tx,
    );
    return updated;
  });

  res.json({ data: lead });
}
