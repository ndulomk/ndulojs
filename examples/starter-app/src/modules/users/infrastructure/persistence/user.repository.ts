import { eq, isNull, count, asc } from 'drizzle-orm'
import type { Database } from '@/db'
import { users } from '@/db/schema'
import type { IUserRepository } from '../../application/ports/user.port'
import { encryptFields, decryptFields, createCryptoConfig } from '@/shared/crypto/crypto-fields'
import { getEncryption } from '@/shared/crypto/encryption.service'
import { UserResponseDTO } from '../../application/dtos/user.dto'

const CRYPTO_CONFIG = createCryptoConfig(['email', 'name'])

export const createUserRepository = (
  db: Database,
): IUserRepository => {
  const encryption = getEncryption()

  return {
    async create(data) {
      return await db.transaction(async (tx) => {
        const encryptedData = encryptFields(data, CRYPTO_CONFIG)
        const emailHash = encryption.hash(data.email)

        const [user] = await tx
          .insert(users)
          .values({
            email: encryptedData.email as string,
            emailHash,
            name: encryptedData.name as string,
            passwordHash: data.passwordHash,
            timezone: data.timezone || null,
            locale: data.locale || 'en',
            avatar: null,
          })
          .returning()



        const decrypted = decryptFields(user, CRYPTO_CONFIG)

        return {
          id: decrypted.id as string,
          email: decrypted.email as string,
          name: decrypted.name as string,
          avatar: user.avatar,
          timezone: user.timezone,
          locale: user.locale,
          createdAt: decrypted.createdAt as Date,
          updatedAt: decrypted.updatedAt as Date,
        }
      })
    },

    async findById(id) {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)

      if (!user) {
        return null
      }

      const decrypted = decryptFields(user, CRYPTO_CONFIG)

      return {
        id: decrypted.id as string,
        email: decrypted.email as string,
        name: decrypted.name as string,
        avatar: user.avatar,
        timezone: user.timezone,
        locale: user.locale,
        createdAt: decrypted.createdAt as Date,
        updatedAt: decrypted.updatedAt as Date,
      }
    },

    async findByEmail(email): Promise<(UserResponseDTO & { passwordHash: string }) | null> {
      const emailHash = encryption.hash(email)

      const [user] = await db.select().from(users).where(eq(users.emailHash, emailHash)).limit(1)

      if (!user) {
        return null
      }

      const decryptedEmail = encryption.decrypt(user.email)
      const decryptedName = encryption.decrypt(user.name)

      return {
        id: user.id,
        email: decryptedEmail,
        name: decryptedName,
        avatar: user.avatar,
        timezone: user.timezone,
        locale: user.locale,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt as Date,
        updatedAt: user.updatedAt as Date,
      }
    },

    async list(page, perPage) {
      const offset = (page - 1) * perPage

      const [data, totalResult] = await Promise.all([
        db
          .select()
          .from(users)
          .where(isNull(users.deletedAt))
          .orderBy(asc(users.createdAt))
          .limit(perPage)
          .offset(offset),
        db.select({ count: count() }).from(users).where(isNull(users.deletedAt)),
      ])

      const mappedData = data.map((user) => {
        const decrypted = decryptFields(user, CRYPTO_CONFIG)
        return {
          id: decrypted.id as string,
          email: decrypted.email as string,
          name: decrypted.name as string,
          avatar: user.avatar,
          timezone: user.timezone,
          locale: user.locale,
          createdAt: decrypted.createdAt as Date,
          updatedAt: decrypted.updatedAt as Date,
        }
      })

      const totalItems = totalResult[0].count
      const totalPages = Math.ceil(totalItems / perPage)

      return {
        data: mappedData,
        pagination: {
          currentPage: page,
          perPage,
          totalItems,
          totalPages,
        },
      }
    },

    async update(id, data) {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      }

      if (data.email) {
        updateData.email = encryption.encrypt(data.email)
        updateData.emailHash = encryption.hash(data.email)
      }
      if (data.name) {
        updateData.name = encryption.encrypt(data.name)
      }
      if (data.passwordHash) {
        updateData.passwordHash = data.passwordHash
      }
      if (data.avatar !== undefined) {
        updateData.avatar = data.avatar
      }
      if (data.timezone !== undefined) {
        updateData.timezone = data.timezone
      }
      if (data.locale !== undefined) {
        updateData.locale = data.locale
      }

      const [user] = await db.update(users).set(updateData).where(eq(users.id, id)).returning()

      const decrypted = decryptFields(user, CRYPTO_CONFIG)

      return {
        id: decrypted.id as string,
        email: decrypted.email as string,
        name: decrypted.name as string,
        avatar: user.avatar,
        timezone: user.timezone,
        locale: user.locale,
        createdAt: decrypted.createdAt as Date,
        updatedAt: decrypted.updatedAt as Date,
      }
    },

    async softDelete(id) {
      await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id))
    },
  }
}
