import { NextRequest, NextResponse } from 'next/server'
import { z, ZodType } from 'zod'
import { ValidationError, formatValidationErrors } from './schemas'

/**
 * Middleware factory for validating request data with Zod schemas
 */
export function validateRequest<T extends ZodType<any, any>>(schema: T) {
  return async (request: NextRequest) => {
    try {
      let data: unknown

      // Determine content type and parse accordingly
      const contentType = request.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        data = await request.json()
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData()
        data = Object.fromEntries(formData.entries())
      } else if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData()
        data = Object.fromEntries(formData.entries())
      } else {
        // Try to parse as JSON by default
        try {
          data = await request.json()
        } catch {
          data = {}
        }
      }

      // Validate the data
      const validatedData = await schema.parseAsync(data)
      
      // Return validated data
      return validatedData as z.infer<T>
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        }))
        
        throw new ValidationError('Request validation failed', errors)
      }
      throw error
    }
  }
}

/**
 * Middleware for validating query parameters
 */
export function validateQueryParams<T extends ZodType<any, any>>(schema: T) {
  return (request: NextRequest) => {
    try {
      const url = new URL(request.url)
      const params = Object.fromEntries(url.searchParams.entries())
      
      // Convert string values to appropriate types
      const processedParams: Record<string, any> = {}
      for (const [key, value] of Object.entries(params)) {
        // Try to parse as number
        if (!isNaN(Number(value)) && value.trim() !== '') {
          processedParams[key] = Number(value)
        } 
        // Try to parse as boolean
        else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
          processedParams[key] = value.toLowerCase() === 'true'
        }
        // Try to parse as JSON
        else if ((value.startsWith('{') && value.endsWith('}')) || 
                 (value.startsWith('[') && value.endsWith(']'))) {
          try {
            processedParams[key] = JSON.parse(value)
          } catch {
            processedParams[key] = value
          }
        }
        // Keep as string
        else {
          processedParams[key] = value
        }
      }
      
      const validatedParams = schema.parse(processedParams)
      return validatedParams as z.infer<T>
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        }))
        
        throw new ValidationError('Query parameter validation failed', errors)
      }
      throw error
    }
  }
}

/**
 * Error handler middleware for validation errors
 */
export function validationErrorHandler(error: unknown) {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      formatValidationErrors(error.errors),
      { status: 400 }
    )
  }
  
  // For other errors, return generic error
  return NextResponse.json(
    {
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  )
}

/**
 * Combined middleware for handling validation in API routes
 */
export function withValidation<T extends ZodType<any, any>>(
  schema: T,
  options: {
    validateBody?: boolean
    validateQuery?: boolean
  } = { validateBody: true, validateQuery: false }
) {
  return async (request: NextRequest) => {
    try {
      const validatedData: any = {}
      
      if (options.validateBody) {
        const bodyValidator = validateRequest(schema)
        validatedData.body = await bodyValidator(request)
      }
      
      if (options.validateQuery) {
        const queryValidator = validateQueryParams(schema)
        validatedData.query = queryValidator(request)
      }
      
      return validatedData
    } catch (error) {
      return validationErrorHandler(error)
    }
  }
}

/**
 * Helper function to create validated API handlers
 */
export function createValidatedHandler<T extends ZodType<any, any>>(
  schema: T,
  handler: (data: z.infer<T>, request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const validator = validateRequest(schema)
      const validatedData = await validator(request)
      return await handler(validatedData, request)
    } catch (error) {
      return validationErrorHandler(error)
    }
  }
}

/**
 * Helper for validating specific parts of a request
 */
export function validatePartial<T extends ZodType<any, any>>(
  schema: T,
  data: Partial<z.infer<T>>
) {
  try {
    return schema.partial().parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }))
      throw new ValidationError('Partial validation failed', errors)
    }
    throw error
  }
}