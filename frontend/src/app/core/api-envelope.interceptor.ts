import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';

import { normalizeApiErrorResponse, unwrapHttpEventEnvelope } from './api-envelope';


@Injectable()
export class ApiEnvelopeInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      map((event) => unwrapHttpEventEnvelope(event)),
      catchError((error) => throwError(() => normalizeApiErrorResponse(error)))
    );
  }
}
