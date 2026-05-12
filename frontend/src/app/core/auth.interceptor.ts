import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environments';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isLogin = req.url.includes('/login/');
    const isRegister = req.url.includes('/register/');
    const isRefresh = req.url.includes('/token/refresh/');

    if (isLogin || isRegister || isRefresh) {
      return next.handle(req);
    }

    if (!this.isApiRequest(req.url)) {
      return next.handle(req);
    }

    const accessToken = this.auth.token;
    if (accessToken) {
      const authReq = this.withAuth(req, accessToken);
      return this.handleWithRefreshFallback(authReq, req, next);
    }

    if (this.auth.canRefreshToken()) {
      return this.auth.refreshAccessToken().pipe(
        switchMap((newAccessToken) => next.handle(this.withAuth(req, newAccessToken))),
        catchError((err) => this.handleAuthFailure(err))
      );
    }

    return next.handle(req);
  }

  private withAuth(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private handleWithRefreshFallback(
    requestWithAuth: HttpRequest<any>,
    originalRequest: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(requestWithAuth).pipe(
      catchError((err) => {
        if (err?.status !== 401 || !this.auth.canRefreshToken()) {
          return throwError(() => err);
        }

        return this.auth.refreshAccessToken().pipe(
          switchMap((newAccessToken) => next.handle(this.withAuth(originalRequest, newAccessToken))),
          catchError((refreshErr) => this.handleAuthFailure(refreshErr))
        );
      })
    );
  }

  private handleAuthFailure(err: unknown): Observable<never> {
    this.auth.logout();
    this.router.navigateByUrl('/login');
    return throwError(() => err);
  }

  private isApiRequest(url: string): boolean {
    const apiUrl = (environment.apiUrl || '').trim();

    if (!apiUrl) {
      return url.startsWith('/api/') || (!url.startsWith('http://') && !url.startsWith('https://'));
    }

    return url.startsWith(apiUrl);
  }
}
