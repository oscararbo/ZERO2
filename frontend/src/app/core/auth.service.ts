import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environments';

type LoginDTO = { username: string; password: string };
type RegisterDTO = Record<string, unknown>;
type LoginResponse = { access: string; refresh?: string; token?: string };
type RegisterResponse = { access: string; refresh: string; username: string };
type AvailabilityResponse = { available: boolean; reason?: string };

type JwtPayload = {
  exp?: number;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly accessTokenKey = 'zero_auth_token';
  private readonly refreshTokenKey = 'zero_refresh_token';
  private readonly userKey = 'zero_auth_user';

  constructor(private http: HttpClient) {}

  get token(): string | null {
    const access = this.accessToken;
    if (!access) return null;
    if (this.isTokenExpired(access)) return null;
    return access;
  }

  get accessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  get refreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  get currentUsername(): string | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw)?.username ?? null;
    } catch {
      return null;
    }
  }

  isLogged(): boolean {
    const access = this.accessToken;
    if (access && !this.isTokenExpired(access)) return true;

    const refresh = this.refreshToken;
    return !!(refresh && !this.isTokenExpired(refresh));
  }

  register(dto: RegisterDTO) {
    return this.http.post<RegisterResponse>(`${environment.apiUrl}/api/register/`, dto);
  }

  login(dto: LoginDTO) {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/api/login/`, dto);
  }

  checkUsername(username: string) {
    return this.http.get<AvailabilityResponse>(`${environment.apiUrl}/api/check-username/`, { params: { username } });
  }

  checkEmail(email: string) {
    return this.http.get<AvailabilityResponse>(`${environment.apiUrl}/api/check-email/`, { params: { email } });
  }

  setSession(accessToken: string, refreshToken: string | null, username: string) {
    localStorage.setItem(this.accessTokenKey, accessToken);
    if (refreshToken) {
      localStorage.setItem(this.refreshTokenKey, refreshToken);
    }
    localStorage.setItem(this.userKey, JSON.stringify({ username }));
  }

  setToken(token: string, username: string) {
    this.setSession(token, this.refreshToken, username);
  }

  canRefreshToken(): boolean {
    const refresh = this.refreshToken;
    return !!(refresh && !this.isTokenExpired(refresh));
  }

  refreshAccessToken(): Observable<string> {
    const refresh = this.refreshToken;
    if (!refresh || this.isTokenExpired(refresh)) {
      return throwError(() => new Error('Refresh token unavailable or expired'));
    }

    return this.http.post<{ access: string }>(
      `${environment.apiUrl}/api/token/refresh/`,
      { refresh }
    ).pipe(
      map((res) => {
        if (!res?.access) {
          throw new Error('Refresh response missing access token');
        }
        localStorage.setItem(this.accessTokenKey, res.access);
        return res.access;
      })
    );
  }

  logout() {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem('zero_profile_data');
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodeTokenPayload(token);
    if (!payload?.exp) return false;

    const nowSeconds = Math.floor(Date.now() / 1000);
    return payload.exp <= (nowSeconds + 10);
  }

  private decodeTokenPayload(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const decoded = atob(parts[1]);
      return JSON.parse(decoded) as JwtPayload;
    } catch {
      return null;
    }
  }
}
