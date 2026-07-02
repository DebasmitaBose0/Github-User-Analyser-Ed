import { z } from 'zod'

export const usernameSchema = z
  .string()
  .min(1, 'Username is required')
  .max(39, 'Username must be 39 characters or fewer')
  .regex(
    /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/,
    'Username may only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen'
  )

export const compareSchema = z.object({
  usernameA: usernameSchema,
  usernameB: usernameSchema,
})

export function validateUsername(username: string): { valid: true; sanitized: string } | { valid: false; error: string } {
  const result = usernameSchema.safeParse(username)
  if (!result.success) {
    return { valid: false, error: result.error.errors[0].message }
  }
  return { valid: true, sanitized: result.data.toLowerCase().trim() }
}

export function sanitizeInput(input: string): string {
  return input.replace(/[<>"'&]/g, '').trim()
}
