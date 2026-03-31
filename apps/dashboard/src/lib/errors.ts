// ═══════════════════════════════════════════
// SPRINT 15: Centralized Error Handling
// Consistent error responses across all API routes
// ═══════════════════════════════════════════

import { NextResponse } from 'next/server';

// ── Error Types ──

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number = 60) {
    super(`Too many requests. Try again in ${retryAfterSeconds}s`, 429, 'RATE_LIMITED');
    this.name = 'RateLimitError';
  }
}

// ── Error Response Builder ──

interface ErrorResponseOptions {
  /** Include stack trace (only in development) */
  includeStack?: boolean;
}

/**
 * Create a consistent JSON error response
 */
export function errorResponse(
  error: unknown,
  options: ErrorResponseOptions = {}
): NextResponse {
  const isDev = process.env.NODE_ENV === 'development';

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(isDev && options.includeStack ? { stack: error.stack } : {}),
      },
      { status: error.statusCode }
    );
  }

  // Supabase specific errors
  if (isSupabaseError(error)) {
    const supaError = error as { code: string; message: string };

    // Table doesn't exist
    if (supaError.code === '42P01' || supaError.message?.includes('does not exist')) {
      return NextResponse.json(
        { error: 'Database table not configured', code: 'DB_NOT_READY' },
        { status: 503 }
      );
    }

    // Permission denied
    if (supaError.code === '42501') {
      return NextResponse.json(
        { error: 'Database permission denied', code: 'DB_PERMISSION' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Database error', code: 'DB_ERROR' },
      { status: 500 }
    );
  }

  // Groq specific errors
  if (isGroqError(error)) {
    const groqError = error as { status?: number; message: string };
    if (groqError.status === 429) {
      return NextResponse.json(
        { error: 'AI service rate limited', code: 'AI_RATE_LIMITED' },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: 'AI service error', code: 'AI_ERROR' },
      { status: 502 }
    );
  }

  // Generic error
  const message = error instanceof Error ? error.message : 'Internal server error';
  return NextResponse.json(
    {
      error: isDev ? message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

// ── Type Guards ──

function isSupabaseError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as Record<string, unknown>;
  return typeof e.code === 'string' && typeof e.message === 'string' && !('status' in e);
}

function isGroqError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as Record<string, unknown>;
  return 'status' in e && typeof e.message === 'string' && typeof e.status === 'number';
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}
