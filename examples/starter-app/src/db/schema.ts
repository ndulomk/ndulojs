import {
  pgTable, uuid, varchar, text, timestamp, boolean, index, uniqueIndex
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v7()`),
  email: text("email").notNull(),
  emailHash: text("email_hash").notNull(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  avatar: text("avatar"),
  timezone: varchar("timezone", { length: 100 }),
  locale: varchar("locale", { length: 10 }).default("en"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  emailHashIdx: uniqueIndex("email_hash_unique").on(table.emailHash),
}));

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v7()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  refreshToken: text("refresh_token").unique(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  deviceType: text("device_type"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
}, (table) => ({
  userIdIdx: index("sessions_user_id_idx").on(table.userId),
  tokenIdx: index("sessions_token_idx").on(table.token),
  refreshTokenIdx: index("sessions_refresh_token_idx").on(table.refreshToken),
  expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
}));

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));
