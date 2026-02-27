import { randomUUID } from 'node:crypto';

export { randomUUID };

// Minimal in-memory store — no external deps needed to run the starter app.
// Replace with Drizzle, Prisma, etc. in a real project.

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
};

export type FarmRecord = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
};

export const db = {
  users: new Map<string, UserRecord>(),
  farms: new Map<string, FarmRecord>(),
};