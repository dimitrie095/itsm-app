import { z } from 'zod'

// User validation schemas
export const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'AGENT', 'END_USER']),
  department: z.string().optional(),
  isActive: z.boolean().default(true),
})

export const userCreateSchema = userSchema.extend({
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const userUpdateSchema = userSchema.partial()

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Ticket validation schemas
export const ticketSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  status: z.enum(['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).default('NEW'),
  category: z.string().min(1, 'Category is required').max(50),
  userId: z.string().uuid('Invalid user ID'),
  assignedToId: z.string().uuid('Invalid assignee ID').optional().nullable(),
  slaId: z.string().uuid('Invalid SLA ID').optional().nullable(),
})

export const ticketCreateSchema = ticketSchema.omit({ status: true }).extend({
  userId: z.string().uuid('Invalid user ID').optional(),
})

export const ticketUpdateSchema = ticketSchema.partial()

export const ticketCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000),
  ticketId: z.string().uuid('Invalid ticket ID'),
  userId: z.string().uuid('Invalid user ID'),
})

// Asset validation schemas
export const assetSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  type: z.enum(['HARDWARE', 'SOFTWARE', 'NETWORK', 'OTHER']),
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED']),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().datetime().optional(),
  warrantyExpiry: z.string().datetime().optional(),
  assignedToId: z.string().uuid('Invalid user ID').optional().nullable(),
  value: z.number().min(0, 'Value cannot be negative').optional(),
})

// Knowledge base article schemas
export const articleSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  content: z.string().min(50, 'Content must be at least 50 characters'),
  category: z.string().min(1, 'Category is required').max(50),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
  authorId: z.string().uuid('Invalid author ID'),
})

// Report validation schemas
export const reportSchema = z.object({
  name: z.string().min(5, 'Report name must be at least 5 characters').max(100),
  type: z.enum(['DASHBOARD', 'TICKETS', 'ASSETS', 'KNOWLEDGE', 'CUSTOM']),
  format: z.enum(['PDF', 'HTML', 'CSV', 'JSON']),
  description: z.string().max(500).optional(),
  filters: z.record(z.any()).optional(),
})

// Automation rule schemas
export const automationRuleSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().max(500).optional(),
  trigger: z.enum(['TICKET_CREATED', 'TICKET_UPDATED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'SCHEDULED']),
  conditions: z.array(z.record(z.any())),
  actions: z.array(z.record(z.any())),
  isActive: z.boolean().default(true),
})

// SLA validation schemas
export const slaSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().max(500).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  responseTime: z.number().min(1, 'Response time must be at least 1 minute'),
  resolutionTime: z.number().min(1, 'Resolution time must be at least 1 minute'),
  isActive: z.boolean().default(true),
})

// Search and filter schemas
export const searchSchema = z.object({
  query: z.string().max(200).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  filters: z.record(z.any()).optional(),
})

// API response schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  timestamp: z.string().datetime(),
})

// Validation middleware helper
export function validateSchema<T extends z.ZodType<any, any>>(schema: T) {
  return async (data: unknown): Promise<z.infer<T>> => {
    try {
      return await schema.parseAsync(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        }))
        throw new ValidationError('Validation failed', errors)
      }
      throw error
    }
  }
}

// Custom error class for validation errors
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Array<{ path: string; message: string }>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Helper function to format validation errors for API responses
export function formatValidationErrors(errors: Array<{ path: string; message: string }>) {
  return {
    success: false,
    error: 'Validation failed',
    details: errors,
    timestamp: new Date().toISOString(),
  }
}

// Type exports for convenience
export type User = z.infer<typeof userSchema>
export type Ticket = z.infer<typeof ticketSchema>
export type Asset = z.infer<typeof assetSchema>
export type Article = z.infer<typeof articleSchema>
export type Report = z.infer<typeof reportSchema>
export type AutomationRule = z.infer<typeof automationRuleSchema>
export type SLA = z.infer<typeof slaSchema>