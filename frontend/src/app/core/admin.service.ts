import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';

import { environment } from '../../environments/environments';

export type DailyPoint = {
  day: string;
  value: number;
};

export type AdminStatsFilters = {
  days?: number;
  start?: string;
  end?: string;
  top?: number;
};

export type AdminUsersFilters = {
  search?: string;
  is_staff?: boolean;
  is_active?: boolean;
  page?: number;
  page_size?: number;
};

export type AdminChallengesFilters = {
  search?: string;
  category?: 'sport' | 'nutrition' | 'mindset' | 'growth' | 'general';
  page?: number;
  page_size?: number;
};

export type AdminPaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type AdminUserRecord = {
  id: number;
  username: string;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
  weekly_goal: number | null;
  fitness_goal: string | null;
  focus: {
    sport: boolean;
    food: boolean;
    mindset: boolean;
    growth: boolean;
    challenges: boolean;
  };
};

export type AdminChallengeRecord = {
  id: number;
  title: string;
  category: string;
  duration_days: number;
  target_count: number;
  creator_username: string;
  participant_count: number;
  updates_count: number;
  created_at: string;
  is_expired: boolean;
};

export type AdminTopUser = {
  user_id: number;
  username: string;
  sessions: number;
  completed_exercises: number;
  challenges_completed: number;
  journal_entries: number;
  score: number;
};

export type AdminAlert = {
  severity: 'info' | 'warning' | 'critical';
  type: string;
  message: string;
};

export type PersistedAlert = {
  id: number;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at: string | null;
};

export type ComparisonMetrics = {
  new_users: number;
  sessions: number;
  journal_entries: number;
  mood_entries: number;
  completed_exercises: number;
  challenge_participants: number;
  challenges_completed: number;
};

export type AdminComparison = {
  current: ComparisonMetrics;
  previous: ComparisonMetrics;
  delta_pct: { [K in keyof ComparisonMetrics]: number | null };
};

export type CohortMetrics = {
  count: number;
  sessions: number;
  journal_entries: number;
  mood_entries: number;
  interests: {
    sport: number;
    food: number;
    mindset: number;
    growth: number;
    challenges: number;
  };
};

export type AdminCohorts = {
  new: CohortMetrics;
  returning: CohortMetrics;
  summary: {
    total_active: number;
    new_count: number;
    returning_count: number;
    by_interest: {
      sport: number;
      food: number;
      mindset: number;
      growth: number;
      challenges: number;
    };
  };
};

export type AdminStatsResponse = {
  summary: {
    users_total: number;
    users_active: number;
    users_staff: number;
    users_last_7_days: number;
    users_last_30_days: number;
    users_in_selected_range: number;
    profiles_total: number;
    profile_completion_rate: number;
    exercise_catalog_total: number;
    exercise_sessions_total: number;
    completed_exercises_total: number;
    sessions_last_7_days: number;
    sessions_last_30_days: number;
    journal_entries_total: number;
    mood_entries_total: number;
    mood_average_last_30_days: number | null;
    challenges_total: number;
    challenge_participants_total: number;
    challenge_participants_completed: number;
    challenge_completion_rate: number;
    badges_total: number;
    reminders_total: number;
    reminders_unread_total: number;
  };
  distributions: {
    interests: {
      sport: number;
      food: number;
      mindset: number;
      growth: number;
      challenges: number;
    };
    fitness_goals: Array<{ fitness_goal: string; value: number }>;
  };
  trends: {
    new_users: DailyPoint[];
    sessions: DailyPoint[];
  };
  comparison: AdminComparison;
  cohorts: AdminCohorts;
  top_users: AdminTopUser[];
  alerts: AdminAlert[];
  meta: {
    range: {
      start: string;
      end: string;
      days: number;
    };
    prior_range: {
      start: string;
      end: string;
    };
    top_limit: number;
    trend_days: number;
  };
  generated_at: string;
};

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  hasAccess(): Observable<boolean> {
    return this.http.get<{ is_admin: boolean }>(`${environment.apiUrl}/api/admin/access/`).pipe(
      map((res) => !!res?.is_admin),
      catchError(() => of(false))
    );
  }

  getStats(filters: AdminStatsFilters = {}): Observable<AdminStatsResponse> {
    return this.http.get<AdminStatsResponse>(`${environment.apiUrl}/api/admin/stats/`, { params: this.toParams(filters) });
  }

  exportStatsCsv(filters: AdminStatsFilters = {}): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/api/admin/stats/export/`, {
      params: this.toParams(filters),
      responseType: 'blob',
    });
  }

  getAlerts(status?: 'open' | 'resolved'): Observable<{ alerts: PersistedAlert[]; total: number }> {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    return this.http.get<{ alerts: PersistedAlert[]; total: number }>(
      `${environment.apiUrl}/api/admin/alerts/`,
      { params },
    );
  }

  resolveAlert(id: number): Observable<{ message: string; id: number; resolved_at: string }> {
    return this.http.post<{ message: string; id: number; resolved_at: string }>(
      `${environment.apiUrl}/api/admin/alerts/${id}/resolve/`,
      {},
    );
  }

  reopenAlert(id: number): Observable<{ message: string; id: number; status: 'open'; resolved_at: null }> {
    return this.http.post<{ message: string; id: number; status: 'open'; resolved_at: null }>(
      `${environment.apiUrl}/api/admin/alerts/${id}/reopen/`,
      {},
    );
  }

  getUsers(filters: AdminUsersFilters = {}): Observable<AdminPaginatedResponse<AdminUserRecord>> {
    return this.http.get<AdminPaginatedResponse<AdminUserRecord>>(
      `${environment.apiUrl}/api/admin/users/`,
      { params: this.toParams(filters as Record<string, any>) },
    );
  }

  updateUser(userId: number, payload: { is_staff?: boolean; is_active?: boolean }): Observable<AdminUserRecord> {
    return this.http.patch<AdminUserRecord>(`${environment.apiUrl}/api/admin/users/${userId}/`, payload);
  }

  deleteUser(userId: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${environment.apiUrl}/api/admin/users/${userId}/`);
  }

  getChallenges(filters: AdminChallengesFilters = {}): Observable<AdminPaginatedResponse<AdminChallengeRecord>> {
    return this.http.get<AdminPaginatedResponse<AdminChallengeRecord>>(
      `${environment.apiUrl}/api/admin/challenges/`,
      { params: this.toParams(filters as Record<string, any>) },
    );
  }

  updateChallenge(
    challengeId: number,
    payload: { title?: string; category?: string; duration_days?: number; target_count?: number }
  ): Observable<AdminChallengeRecord> {
    return this.http.patch<AdminChallengeRecord>(`${environment.apiUrl}/api/admin/challenges/${challengeId}/`, payload);
  }

  deleteChallenge(challengeId: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${environment.apiUrl}/api/admin/challenges/${challengeId}/`);
  }

  private toParams(filters: Record<string, any>): Record<string, string> {
    const params: Record<string, string> = {};

    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') continue;
      params[key] = String(value);
    }

    return params;
  }
}


