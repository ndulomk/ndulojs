import { z } from 'zod';
import { Err, ErrorFactory } from 'ndulojs';

/**
 * Validates `data` against a Zod schema.
 *
 * On success  → { success: true,  value: T }
 * On failure  → Err(ValidationError) — return directly from any handler.
 *
 * @param schema    - Zod schema to validate against
 * @param data      - Raw input (ctx.body, ctx.params, ctx.query, etc.)
 * @param component - Optional component name for error tracing (default: 'Validation')
 *
 * @example
 * const v = validateWithZod(createUserSchema, ctx.body, 'UserController');
 * if (!v.success) return v;
 * // v.value is fully typed
 */
export const validateWithZod = <T>(
  schema: z.ZodType<T>,
  data: unknown,
  component = 'Validation',
): { success: true; value: T } | ReturnType<typeof Err> => {
  const result = schema.safeParse(data);

  if (!result.success) {
    const issues = result.error.issues;

    const fieldErrors = issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      rule: e.code,
    }));

    return Err(
      ErrorFactory.validation(
        issues[0]?.message ?? 'Validation failed',
        fieldErrors,
        component,
      ),
    );
  }

  return { success: true, value: result.data };
};