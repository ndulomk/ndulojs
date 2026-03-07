import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs/promises'
import { logger } from '@/shared/logger/logger'
import { Ok, Err } from 'ndulojs'
import { ErrorFactory } from 'ndulojs'
import { env } from '@/config/env'
import type { ParsedFile } from './multipart.parser'

export interface UploadedFileInfo {
  url: string
  filename: string
  originalFilename: string
  mimetype: string
  size: number
}

export interface UploadOptions {
  module: string                 
  allowedMimetypes?: string[]
  maxSizeBytes?: number
}

const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads')

const DEFAULTS = {
  allowedMimetypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  maxSizeBytes: 10 * 1024 * 1024,
}

export const createUploadService = (options: UploadOptions) => {
  const {
    module,
    allowedMimetypes = DEFAULTS.allowedMimetypes,
    maxSizeBytes = DEFAULTS.maxSizeBytes,
  } = options

  const uploadDir = path.join(UPLOADS_ROOT, module)

  const ensureDir = async () => fs.mkdir(uploadDir, { recursive: true })

  const buildUrl = (filename: string) => {
    const base = env.APP_URL.replace(/\/$/, '')
    return `${base}/uploads/${module}/${filename}`
  }

  const validate = (file: ParsedFile): string | null => {
    if (!allowedMimetypes.includes(file.mimetype)) {
      return `Tipo não permitido: ${file.mimetype}. Aceites: ${allowedMimetypes.join(', ')}`
    }
    if (file.size === 0) return `Ficheiro vazio: ${file.filename}`
    if (file.size > maxSizeBytes) {
      return `Ficheiro muito grande. Máximo: ${maxSizeBytes / 1024 / 1024}MB`
    }
    return null
  }

  return {
    async uploadOne(file: ParsedFile) {
      const error = validate(file)
      if (error) {
        return Err(ErrorFactory.validation(error, [{ field: file.fieldname, message: error }], 'UploadService'))
      }

      try {
        await ensureDir()

        const ext = path.extname(file.filename) || `.${file.mimetype.split('/')[1]}`
        const uniqueName = `${randomUUID()}${ext}`
        const dest = path.join(uploadDir, uniqueName)

        await fs.writeFile(dest, file.buffer)
        logger.info({ module, filename: uniqueName, size: file.size }, 'File uploaded')

        return Ok<UploadedFileInfo>({
          url: buildUrl(uniqueName),
          filename: uniqueName,
          originalFilename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
        })
      } catch (err) {
        logger.error(err, 'Failed to upload file')
        return Err(ErrorFactory.internal('Erro ao guardar ficheiro', err, 'UploadService'))
      }
    },

    async uploadMany(files: ParsedFile[]) {
      if (files.length === 0) {
        return Err(ErrorFactory.validation('Nenhum ficheiro enviado', [], 'UploadService'))
      }

      for (const file of files) {
        const error = validate(file)
        if (error) {
          return Err(ErrorFactory.validation(error, [{ field: file.fieldname, message: error }], 'UploadService'))
        }
      }

      try {
        await ensureDir()

        const uploaded: UploadedFileInfo[] = []

        for (const file of files) {
          const ext = path.extname(file.filename) || `.${file.mimetype.split('/')[1]}`
          const uniqueName = `${randomUUID()}${ext}`
          const dest = path.join(uploadDir, uniqueName)

          try {
            await fs.writeFile(dest, file.buffer)
            uploaded.push({
              url: buildUrl(uniqueName),
              filename: uniqueName,
              originalFilename: file.filename,
              mimetype: file.mimetype,
              size: file.size,
            })
          } catch (err) {
            await this.deleteMany(uploaded.map(u => u.filename))
            logger.error(err, `Failed to upload: ${file.filename}`)
            return Err(ErrorFactory.internal(`Erro ao guardar: ${file.filename}`, err, 'UploadService'))
          }
        }

        logger.info({ module, count: uploaded.length }, 'Files uploaded')
        return Ok(uploaded)
      } catch (err) {
        logger.error(err, 'Failed to upload files')
        return Err(ErrorFactory.internal('Erro ao guardar ficheiros', err, 'UploadService'))
      }
    },

    async deleteOne(filename: string) {
      const safe = path.basename(filename)
      if (!safe || safe.includes('..')) {
        return Err(ErrorFactory.validation('Nome de ficheiro inválido', [], 'UploadService'))
      }

      try {
        await fs.unlink(path.join(uploadDir, safe))
        logger.info({ module, filename: safe }, 'File deleted')
        return Ok(undefined)
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'ENOENT') {
          return Ok(undefined) 
        }
        logger.error(err, 'Failed to delete file')
        return Err(ErrorFactory.internal('Erro ao eliminar ficheiro', err, 'UploadService'))
      }
    },

    async deleteMany(filenames: string[]) {
      await Promise.allSettled(
        filenames.map(f => fs.unlink(path.join(uploadDir, path.basename(f))).catch(() => null))
      )
      return Ok(undefined)
    },
  }
}

export const userUpload = createUploadService({
  module: 'users',
  allowedMimetypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxSizeBytes: 5 * 1024 * 1024,
})

export const productUpload = createUploadService({
  module: 'products',
  allowedMimetypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxSizeBytes: 10 * 1024 * 1024,
})

export const paymentUpload = createUploadService({
  module: 'payments',
  allowedMimetypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  maxSizeBytes: 10 * 1024 * 1024,
})