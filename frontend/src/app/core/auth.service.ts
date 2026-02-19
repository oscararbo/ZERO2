import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environments';

type LoginDTO = { username: string; password: string };
type RegisterDTO = { username: string; email: string; password: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'zero_token';
  private userKey = 'zero_user';

  constructor(private http: HttpClient) {}

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
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
    return !!this.token;
  }

  register(dto: RegisterDTO) {
    return this.http.post(`${environment.apiUrl}/api/accounts/register/`, dto);
  }

  login(dto: LoginDTO) {
    return this.http.post<any>(`${environment.apiUrl}/api/accounts/login/`, dto);
  }

  setToken(token: string, username: string) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify({ username }));
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }
}
