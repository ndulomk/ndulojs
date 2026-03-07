import { logger } from '../logger/logger'
import { Ok, Err } from 'ndulojs'
import { ErrorFactory } from 'ndulojs'

export interface ParsedFile {
  fieldname: string
  filename: string
  mimetype: string
  buffer: Buffer
  size: number
}

export interface ParsedMultipart {
  files: ParsedFile[]
  fields: Record<string, string>
}

export async function parseMultipart(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''

  if (!contentType.includes('multipart/form-data')) {
    return Err(
      ErrorFactory.validation(
        'Content-Type deve ser multipart/form-data',
        [{ field: 'content-type', message: 'multipart/form-data required' }],
        'MultipartParser'
      )
    )
  }

  try {
    const formData = await request.formData()
    const files: ParsedFile[] = []
    const fields: Record<string, string> = {}

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const buffer = Buffer.from(await value.arrayBuffer())
        files.push({
          fieldname: key,
          filename: value.name,
          mimetype: value.type || 'application/octet-stream',
          buffer,
          size: buffer.length,
        })
        logger.debug({ fieldname: key, filename: value.name, size: buffer.length }, 'File parsed')
      } else {
        if (typeof value === 'string') {
          fields[key] = value
        }
      }
    }

    logger.info({ filesCount: files.length, fieldKeys: Object.keys(fields) }, 'Multipart parsed')
    return Ok({ files, fields })
  } catch (err) {
    logger.error(err, 'Failed to parse multipart')
    return Err(ErrorFactory.internal('Erro ao processar formulário', err, 'MultipartParser'))
  }
}

export function parseNumericField(
  fields: Record<string, string>,
  key: string,
  defaultValue?: number
): number | null {
  const value = fields[key]
  if (value === undefined || value === null || value === '') return defaultValue ?? null
  const parsed = Number(value)
  return isNaN(parsed) ? (defaultValue ?? null) : parsed
}

export function parseBooleanField(
  fields: Record<string, string>,
  key: string,
  defaultValue = false
): boolean {
  const value = fields[key]
  if (value === undefined || value === null) return defaultValue
  const str = String(value).toLowerCase()
  return str === 'true' || str === '1' || str === 'yes'
}

export function parseJsonField<T = unknown>(
  fields: Record<string, string>,
  key: string,
  defaultValue?: T
): T | null {
  const value = fields[key]
  if (!value) return defaultValue ?? null
  try {
    return JSON.parse(value) as T
  } catch {
    logger.warn({ key, value }, 'Failed to parse JSON field')
    return defaultValue ?? null
  }
}