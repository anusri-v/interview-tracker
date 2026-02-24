import { Prisma } from "@prisma/client";
import { prisma } from "./db";

export function auditLog(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({ data: params });
}
