import { HttpErrorResponse, HttpEvent, HttpResponse } from '@angular/common/http';


export type ApiSuccessResponse<T> = {
  ok: true;
  data: T;
};


export type ApiErrorResponse = {
  ok: false;
  message: string;
  status_code?: number;
  errors?: Record<string, unknown>;
};


export function isApiSuccessResponse<T>(value: unknown): value is ApiSuccessResponse<T> {
  return !!value && typeof value === 'object' && (value as { ok?: unknown }).ok === true && 'data' in (value as object);
}


export function unwrapHttpEventEnvelope(event: HttpEvent<unknown>): HttpEvent<unknown> {
  if (!(event instanceof HttpResponse)) {
    return event;
  }

  if (!isApiSuccessResponse(event.body)) {
    return event;
  }

  return event.clone({ body: event.body.data });
}


export function normalizeApiErrorResponse(error: HttpErrorResponse): HttpErrorResponse {
  const payload = error.error;
  if (payload && typeof payload === 'object' && 'message' in payload) {
    return error;
  }

  const message = typeof payload?.detail === 'string'
    ? payload.detail
    : error.message || 'La solicitud no pudo procesarse.';

  const normalized: ApiErrorResponse = {
    ok: false,
    message,
    status_code: error.status,
  };

  if (payload && typeof payload === 'object') {
    const { detail, ...rest } = payload as Record<string, unknown>;
    if (Object.keys(rest).length > 0) {
      normalized.errors = rest;
    }
  }

  return new HttpErrorResponse({
    error: normalized,
    headers: error.headers,
    status: error.status,
    statusText: error.statusText,
    url: error.url ?? undefined,
  });
}


export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const payload = error.error as ApiErrorResponse | undefined;
    if (typeof payload?.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
  }
  return fallback;
}


export function extractApiFieldError(error: unknown, field: string): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }

  const payload = error.error as ApiErrorResponse | undefined;
  const value = payload?.errors?.[field];
  if (Array.isArray(value) && value.length > 0) {
    return String(value[0]);
  }
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return null;
}
