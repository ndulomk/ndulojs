import { db, randomUUID } from '../../../../db.js';
import type { IUserRepository } from '../../application/ports/user.port.js';

export const createUserRepository = (): IUserRepository => ({
  async findByEmail(email) {
    for (const u of db.users.values()) {
      if (u.email === email) return u;
    }
    return null;
  },

  async findById(id) {
    const u = db.users.get(id);
    if (!u) return null;
    return { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt };
  },

  async create({ email, name, passwordHash }) {
    const user = { id: randomUUID(), email, name, passwordHash, createdAt: new Date() };
    db.users.set(user.id, user);
    return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
  },
});