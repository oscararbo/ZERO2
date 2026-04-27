import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';

export type TemplateKind = 'challenge' | 'growth';

export type UserTemplateVersion = {
  id: number;
  kind: TemplateKind;
  template_key: string;
  title: string;
  payload: Record<string, unknown>;
  version: number;
  is_active: boolean;
  created_at: string;
};

export type MoodEntry = {
  id: number;
  date: string;
  value: number;
  created_at: string;
  updated_at: string;
};

@Injectable({ providedIn: 'root' })
export class TemplateService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api`;

  getMoodEntries(days = 14): Observable<MoodEntry[]> {
    const params = new HttpParams().set('days', String(days));
    return this.http.get<MoodEntry[]>(`${this.base}/mood/`, { params });
  }

  saveMood(value: number, date?: string): Observable<MoodEntry> {
    return this.http.post<MoodEntry>(`${this.base}/mood/`, { value, date });
  }

  getTemplates(kind: TemplateKind): Observable<UserTemplateVersion[]> {
    const params = new HttpParams().set('kind', kind);
    return this.http.get<UserTemplateVersion[]>(`${this.base}/templates/`, { params });
  }

  saveTemplate(kind: TemplateKind, title: string, payload: Record<string, unknown>, templateKey?: string): Observable<UserTemplateVersion> {
    return this.http.post<UserTemplateVersion>(`${this.base}/templates/`, {
      kind,
      title,
      payload,
      template_key: templateKey,
    });
  }

  getTemplateHistory(kind: TemplateKind, templateKey: string): Observable<UserTemplateVersion[]> {
    return this.http.get<UserTemplateVersion[]>(`${this.base}/templates/${kind}/${templateKey}/`);
  }
}
