import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environments';

export type ChallengeCategory = 'sport' | 'nutrition' | 'mindset' | 'growth' | 'general';

export type MyParticipation = {
  id: number;
  username: string;
  joined_at: string;
  progress: number;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
};

export type Challenge = {
  id: number;
  title: string;
  description: string | null;
  category: ChallengeCategory;
  duration_days: number;
  target_count: number;
  creator_username: string;
  participant_count: number;
  completed_count: number;
  deadline_at: string;
  days_left: number;
  is_expired: boolean;
  created_at: string;
  my_participation: MyParticipation | null;
};

export type ChallengeUpdate = {
  id: number;
  username: string;
  content: string;
  created_at: string;
};

export type InAppReminder = {
  id: number;
  type: 'progress' | 'badge' | 'update';
  message: string;
  metadata: Record<string, any>;
  challenge: number | null;
  challenge_title: string | null;
  created_at: string;
  read_at: string | null;
  is_read: boolean;
};

export type ReminderResponse = {
  items: InAppReminder[];
  unread_count: number;
  page: number;
  page_size: number;
  total: number;
  has_next: boolean;
};

export type PaginatedUpdatesResponse = {
  items: ChallengeUpdate[];
  page: number;
  page_size: number;
  total: number;
  has_next: boolean;
};

export type PaginatedLeaderboardResponse = {
  items: MyParticipation[];
  page: number;
  page_size: number;
  total: number;
  has_next: boolean;
};

export type UserBadge = {
  id: number;
  code: string;
  title: string;
  description: string | null;
  awarded_at: string;
};

export type ChallengeCategoryAnalytics = {
  category: string;
  joined: number;
  completed: number;
  completion_rate: number;
};

export type ChallengeAnalytics = {
  total_joined: number;
  total_completed: number;
  completion_rate: number;
  average_progress: number;
  by_category: ChallengeCategoryAnalytics[];
};

export type CreateChallengeDTO = {
  title: string;
  description?: string;
  category: ChallengeCategory;
  duration_days: number;
  target_count: number;
};

@Injectable({ providedIn: 'root' })
export class ChallengeService {
  private readonly base = `${environment.apiUrl}/api/accounts/challenges`;
  private readonly cacheTtlMs = 30000;
  private readonly responseCache = new Map<string, { expiresAt: number; data: any }>();

  constructor(private http: HttpClient) {}

  getChallenges(category?: string, mine?: boolean): Observable<Challenge[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    if (mine) params = params.set('mine', 'true');
    return this.http.get<Challenge[]>(`${this.base}/`, { params });
  }

  getChallenge(id: number): Observable<Challenge> {
    return this.http.get<Challenge>(`${this.base}/${id}/`);
  }

  createChallenge(dto: CreateChallengeDTO): Observable<Challenge> {
    return this.http.post<Challenge>(`${this.base}/`, dto);
  }

  deleteChallenge(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/`);
  }

  joinChallenge(id: number): Observable<MyParticipation> {
    return this.http.post<MyParticipation>(`${this.base}/${id}/join/`, {}).pipe(
      tap(() => this.invalidateCachePrefix(`${this.base}/${id}/leaderboard/`))
    );
  }

  leaveChallenge(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/join/`).pipe(
      tap(() => this.invalidateCachePrefix(`${this.base}/${id}/leaderboard/`))
    );
  }

  updateProgress(id: number, progress: number, notes?: string): Observable<MyParticipation> {
    return this.http.put<MyParticipation>(`${this.base}/${id}/progress/`, { progress, notes }).pipe(
      tap(() => this.invalidateCachePrefix(`${this.base}/${id}/leaderboard/`))
    );
  }

  getLeaderboard(id: number): Observable<MyParticipation[]> {
    return this.getLeaderboardPaginated(id, 1).pipe(map((response) => response.items));
  }

  getLeaderboardPaginated(id: number, page = 1, pageSize = 10): Observable<PaginatedLeaderboardResponse> {
    const params = new HttpParams().set('page', String(page)).set('page_size', String(pageSize));
    const url = `${this.base}/${id}/leaderboard/`;
    const cacheKey = this.buildCacheKey(url, params);
    const cached = this.getFromCache<PaginatedLeaderboardResponse>(cacheKey);
    if (cached) return of(cached);

    return this.http.get<PaginatedLeaderboardResponse>(url, { params }).pipe(
      tap((data) => this.setCache(cacheKey, data))
    );
  }

  getUpdates(id: number): Observable<ChallengeUpdate[]> {
    return this.getUpdatesPaginated(id, 1).pipe(map((response) => response.items));
  }

  getUpdatesPaginated(id: number, page = 1, pageSize = 8): Observable<PaginatedUpdatesResponse> {
    let params = new HttpParams().set('page', String(page)).set('page_size', String(pageSize));
    const url = `${this.base}/${id}/updates/`;
    const cacheKey = this.buildCacheKey(url, params);
    const cached = this.getFromCache<PaginatedUpdatesResponse>(cacheKey);
    if (cached) return of(cached);

    return this.http.get<PaginatedUpdatesResponse>(url, { params }).pipe(
      tap((data) => this.setCache(cacheKey, data))
    );
  }

  postUpdate(id: number, content: string): Observable<ChallengeUpdate> {
    return this.http.post<ChallengeUpdate>(`${this.base}/${id}/updates/`, { content }).pipe(
      tap(() => this.invalidateCachePrefix(`${this.base}/${id}/updates/`))
    );
  }

  getReminders(unreadOnly = false, page = 1, pageSize = 12): Observable<ReminderResponse> {
    let params = new HttpParams();
    if (unreadOnly) params = params.set('unread', 'true');
    params = params.set('page', String(page)).set('page_size', String(pageSize));
    const url = `${environment.apiUrl}/api/accounts/reminders/`;
    const cacheKey = this.buildCacheKey(url, params);
    const cached = this.getFromCache<ReminderResponse>(cacheKey);
    if (cached) return of(cached);

    return this.http.get<ReminderResponse>(url, { params }).pipe(
      tap((data) => this.setCache(cacheKey, data))
    );
  }

  markReminderRead(reminderId: number): Observable<InAppReminder> {
    return this.http.post<InAppReminder>(`${environment.apiUrl}/api/accounts/reminders/${reminderId}/read/`, {}).pipe(
      tap(() => this.invalidateCachePrefix(`${environment.apiUrl}/api/accounts/reminders/`))
    );
  }

  markAllRemindersRead(): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(`${environment.apiUrl}/api/accounts/reminders/read-all/`, {}).pipe(
      tap(() => this.invalidateCachePrefix(`${environment.apiUrl}/api/accounts/reminders/`))
    );
  }

  getBadges(): Observable<UserBadge[]> {
    return this.http.get<UserBadge[]>(`${environment.apiUrl}/api/accounts/badges/`);
  }

  getAnalytics(): Observable<ChallengeAnalytics> {
    return this.http.get<ChallengeAnalytics>(`${this.base}/analytics/`);
  }

  private buildCacheKey(url: string, params: HttpParams): string {
    const serialized = params.keys().sort().map((key) => `${key}=${params.getAll(key)?.join(',') ?? ''}`).join('&');
    return `${url}?${serialized}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.responseCache.get(key);
    if (!cached) return null;
    if (cached.expiresAt < Date.now()) {
      this.responseCache.delete(key);
      return null;
    }
    return cached.data as T;
  }

  private setCache(key: string, data: any): void {
    this.responseCache.set(key, { expiresAt: Date.now() + this.cacheTtlMs, data });
  }

  private invalidateCachePrefix(prefix: string): void {
    const keys = Array.from(this.responseCache.keys());
    for (const key of keys) {
      if (key.startsWith(prefix)) {
        this.responseCache.delete(key);
      }
    }
  }
}
