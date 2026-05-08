import { NextResponse } from "next/server"

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    init
  )
}

export function apiError(message: string, status = 500, extras?: Record<string, unknown>) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(extras || {}),
    },
    { status }
  )
}
