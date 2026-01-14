import {describe, expect, it} from 'vitest'
import {
	conditionSchema,
	delaySchema,
	httpRequestSchema,
	manualTriggerSchema,
	sendEmailSchema,
	sendSmsSchema,
	transformSchema,
	webhookTriggerSchema,
} from './nodeSchemas'

describe('nodeSchemas', () => {
	describe('manualTriggerSchema', () => {
		it('accepts valid data', () => {
			const result = manualTriggerSchema.safeParse({name: 'My Trigger'})
			expect(result.success).toBe(true)
		})

		it('rejects empty name', () => {
			const result = manualTriggerSchema.safeParse({name: ''})
			expect(result.success).toBe(false)
		})

		it('rejects missing name', () => {
			const result = manualTriggerSchema.safeParse({})
			expect(result.success).toBe(false)
		})
	})

	describe('webhookTriggerSchema', () => {
		it('accepts valid GET webhook', () => {
			const result = webhookTriggerSchema.safeParse({
				url: 'https://example.com/webhook',
				method: 'GET',
			})
			expect(result.success).toBe(true)
		})

		it('accepts valid POST webhook with headers', () => {
			const result = webhookTriggerSchema.safeParse({
				url: 'https://example.com/webhook',
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
			})
			expect(result.success).toBe(true)
		})

		it('rejects invalid URL', () => {
			const result = webhookTriggerSchema.safeParse({
				url: 'not-a-url',
				method: 'GET',
			})
			expect(result.success).toBe(false)
		})

		it('rejects invalid method', () => {
			const result = webhookTriggerSchema.safeParse({
				url: 'https://example.com/webhook',
				method: 'DELETE',
			})
			expect(result.success).toBe(false)
		})

		it('rejects missing url', () => {
			const result = webhookTriggerSchema.safeParse({
				method: 'GET',
			})
			expect(result.success).toBe(false)
		})
	})

	describe('httpRequestSchema', () => {
		it('accepts valid GET request', () => {
			const result = httpRequestSchema.safeParse({
				url: 'https://api.example.com/data',
				method: 'GET',
			})
			expect(result.success).toBe(true)
		})

		it('accepts valid POST request with body', () => {
			const result = httpRequestSchema.safeParse({
				url: 'https://api.example.com/data',
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: '{"key": "value"}',
				timeout: 5000,
			})
			expect(result.success).toBe(true)
		})

		it('accepts all valid HTTP methods', () => {
			const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
			methods.forEach((method) => {
				const result = httpRequestSchema.safeParse({
					url: 'https://api.example.com/data',
					method,
				})
				expect(result.success).toBe(true)
			})
		})

		it('rejects invalid URL', () => {
			const result = httpRequestSchema.safeParse({
				url: 'invalid-url',
				method: 'GET',
			})
			expect(result.success).toBe(false)
		})

		it('rejects invalid HTTP method', () => {
			const result = httpRequestSchema.safeParse({
				url: 'https://api.example.com/data',
				method: 'INVALID',
			})
			expect(result.success).toBe(false)
		})

		it('rejects negative timeout', () => {
			const result = httpRequestSchema.safeParse({
				url: 'https://api.example.com/data',
				method: 'GET',
				timeout: -1,
			})
			expect(result.success).toBe(false)
		})

		it('rejects non-integer timeout', () => {
			const result = httpRequestSchema.safeParse({
				url: 'https://api.example.com/data',
				method: 'GET',
				timeout: 5.5,
			})
			expect(result.success).toBe(false)
		})
	})

	describe('sendEmailSchema', () => {
		it('accepts valid email config', () => {
			const result = sendEmailSchema.safeParse({
				to: 'user@example.com',
				subject: 'Test Subject',
				body: 'Test body content',
			})
			expect(result.success).toBe(true)
		})

		it('accepts valid email with cc', () => {
			const result = sendEmailSchema.safeParse({
				to: 'user@example.com',
				subject: 'Test Subject',
				body: 'Test body content',
				cc: 'cc@example.com',
			})
			expect(result.success).toBe(true)
		})

		it('accepts empty cc string', () => {
			const result = sendEmailSchema.safeParse({
				to: 'user@example.com',
				subject: 'Test Subject',
				body: 'Test body content',
				cc: '',
			})
			expect(result.success).toBe(true)
		})

		it('rejects invalid to email', () => {
			const result = sendEmailSchema.safeParse({
				to: 'not-an-email',
				subject: 'Test Subject',
				body: 'Test body content',
			})
			expect(result.success).toBe(false)
		})

		it('rejects invalid cc email', () => {
			const result = sendEmailSchema.safeParse({
				to: 'user@example.com',
				subject: 'Test Subject',
				body: 'Test body content',
				cc: 'not-an-email',
			})
			expect(result.success).toBe(false)
		})

		it('rejects empty subject', () => {
			const result = sendEmailSchema.safeParse({
				to: 'user@example.com',
				subject: '',
				body: 'Test body content',
			})
			expect(result.success).toBe(false)
		})

		it('rejects empty body', () => {
			const result = sendEmailSchema.safeParse({
				to: 'user@example.com',
				subject: 'Test Subject',
				body: '',
			})
			expect(result.success).toBe(false)
		})
	})

	describe('sendSmsSchema', () => {
		it('accepts valid SMS config', () => {
			const result = sendSmsSchema.safeParse({
				phoneNumber: '+1234567890',
				message: 'Test message',
			})
			expect(result.success).toBe(true)
		})

		it('rejects empty phone number', () => {
			const result = sendSmsSchema.safeParse({
				phoneNumber: '',
				message: 'Test message',
			})
			expect(result.success).toBe(false)
		})

		it('rejects empty message', () => {
			const result = sendSmsSchema.safeParse({
				phoneNumber: '+1234567890',
				message: '',
			})
			expect(result.success).toBe(false)
		})

		it('rejects missing fields', () => {
			const result = sendSmsSchema.safeParse({})
			expect(result.success).toBe(false)
		})
	})

	describe('delaySchema', () => {
		it('accepts valid delay in seconds', () => {
			const result = delaySchema.safeParse({
				duration: 30,
				unit: 'seconds',
			})
			expect(result.success).toBe(true)
		})

		it('accepts valid delay in minutes', () => {
			const result = delaySchema.safeParse({
				duration: 5,
				unit: 'minutes',
			})
			expect(result.success).toBe(true)
		})

		it('accepts valid delay in hours', () => {
			const result = delaySchema.safeParse({
				duration: 2,
				unit: 'hours',
			})
			expect(result.success).toBe(true)
		})

		it('rejects zero duration', () => {
			const result = delaySchema.safeParse({
				duration: 0,
				unit: 'seconds',
			})
			expect(result.success).toBe(false)
		})

		it('rejects negative duration', () => {
			const result = delaySchema.safeParse({
				duration: -5,
				unit: 'seconds',
			})
			expect(result.success).toBe(false)
		})

		it('rejects non-integer duration', () => {
			const result = delaySchema.safeParse({
				duration: 2.5,
				unit: 'seconds',
			})
			expect(result.success).toBe(false)
		})

		it('rejects invalid unit', () => {
			const result = delaySchema.safeParse({
				duration: 5,
				unit: 'days',
			})
			expect(result.success).toBe(false)
		})
	})

	describe('conditionSchema', () => {
		it('accepts valid condition with equals operator', () => {
			const result = conditionSchema.safeParse({
				expression: 'status',
				operator: 'equals',
				value: 'active',
			})
			expect(result.success).toBe(true)
		})

		it('accepts all standard operators', () => {
			const operators = [
				'equals',
				'not_equals',
				'contains',
				'not_contains',
				'greater_than',
				'less_than',
				'greater_than_or_equal',
				'less_than_or_equal',
				'starts_with',
				'ends_with',
				'is_empty',
				'is_not_empty',
			]
			operators.forEach((operator) => {
				const result = conditionSchema.safeParse({
					expression: 'field',
					operator,
					value: 'test',
				})
				expect(result.success).toBe(true)
			})
		})

		it('accepts custom operators', () => {
			const result = conditionSchema.safeParse({
				expression: 'field',
				operator: 'custom_operator',
				value: 'test',
			})
			expect(result.success).toBe(true)
		})

		it('accepts numeric values', () => {
			const result = conditionSchema.safeParse({
				expression: 'count',
				operator: 'greater_than',
				value: 100,
			})
			expect(result.success).toBe(true)
		})

		it('accepts boolean values', () => {
			const result = conditionSchema.safeParse({
				expression: 'isActive',
				operator: 'equals',
				value: true,
			})
			expect(result.success).toBe(true)
		})

		it('rejects empty expression', () => {
			const result = conditionSchema.safeParse({
				expression: '',
				operator: 'equals',
				value: 'test',
			})
			expect(result.success).toBe(false)
		})

		it('rejects empty operator', () => {
			const result = conditionSchema.safeParse({
				expression: 'field',
				operator: '',
				value: 'test',
			})
			expect(result.success).toBe(false)
		})
	})

	describe('transformSchema', () => {
		it('accepts valid transformation with set operation', () => {
			const result = transformSchema.safeParse({
				transformations: [
					{field: 'name', operation: 'set', value: 'New Name'},
				],
			})
			expect(result.success).toBe(true)
		})

		it('accepts multiple transformations', () => {
			const result = transformSchema.safeParse({
				transformations: [
					{field: 'name', operation: 'uppercase'},
					{field: 'email', operation: 'lowercase'},
					{field: 'description', operation: 'trim'},
				],
			})
			expect(result.success).toBe(true)
		})

		it('accepts all standard operations', () => {
			const operations = [
				'set',
				'delete',
				'rename',
				'uppercase',
				'lowercase',
				'trim',
				'concat',
				'split',
				'replace',
				'increment',
				'decrement',
				'multiply',
				'divide',
			]
			operations.forEach((operation) => {
				const result = transformSchema.safeParse({
					transformations: [{field: 'test', operation}],
				})
				expect(result.success).toBe(true)
			})
		})

		it('accepts custom operations', () => {
			const result = transformSchema.safeParse({
				transformations: [
					{field: 'test', operation: 'custom_op', value: 'data'},
				],
			})
			expect(result.success).toBe(true)
		})

		it('accepts empty transformations array', () => {
			const result = transformSchema.safeParse({
				transformations: [],
			})
			expect(result.success).toBe(true)
		})

		it('rejects transformation with empty field', () => {
			const result = transformSchema.safeParse({
				transformations: [{field: '', operation: 'set', value: 'test'}],
			})
			expect(result.success).toBe(false)
		})

		it('rejects transformation with empty operation', () => {
			const result = transformSchema.safeParse({
				transformations: [{field: 'name', operation: '', value: 'test'}],
			})
			expect(result.success).toBe(false)
		})
	})
})
