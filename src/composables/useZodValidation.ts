import { ref } from 'vue'
import type { z,  ZodError } from 'zod'

/**
 * Composable for Zod schema validation
 * Provides reactive error tracking and validation utilities
 */
export function useZodValidation<T>(schema: z.ZodType<T>) {
  const errors = ref<Record<string, string>>({})

  /**
   * Validate data against the schema
   * @param data Data to validate
   * @returns Object with success status and either parsed data or errors
   */
  function validate(
    data: unknown
  ): { success: true; data: T } | { success: false; errors: Record<string, string> } {
    const result = schema.safeParse(data)

    if (result.success) {
      errors.value = {}
      return { success: true, data: result.data }
    }

    const errorMap = formatZodErrors(result.error)
    errors.value = errorMap
    return { success: false, errors: errorMap }
  }

  /**
   * Format Zod errors into a flat record of field paths to error messages
   */
  function formatZodErrors(error: ZodError): Record<string, string> {
    const formatted: Record<string, string> = {}
    for (const issue of error.issues) {
      const path = issue.path.join('.')
      // Only keep first error per field
      if (!formatted[path]) {
        formatted[path] = issue.message
      }
    }
    return formatted
  }

  /**
   * Clear all validation errors
   */
  function clearErrors() {
    errors.value = {}
  }

  /**
   * Set a specific field error manually
   */
  function setError(field: string, message: string) {
    errors.value = { ...errors.value, [field]: message }
  }

  /**
   * Clear error for a specific field
   */
  function clearError(field: string) {
    const newErrors = { ...errors.value }
    delete newErrors[field]
    errors.value = newErrors
  }

  /**
   * Check if a specific field has an error
   */
  function hasError(field: string): boolean {
    return !!errors.value[field]
  }

  /**
   * Get error message for a specific field
   */
  function getError(field: string): string | undefined {
    return errors.value[field]
  }

  return {
    errors,
    validate,
    clearErrors,
    setError,
    clearError,
    hasError,
    getError,
  }
}
