import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of, tap } from 'rxjs';
import { environment } from '../../environments/environments';

export type Exercise = {
  id: number;
  name: string;
  description: string;
  category: string;
  location: string;
  goal: string;
  default_sets: number;
  default_reps: number;
};

export type ExercisesByCategory = {
  [key: string]: {
    label: string;
    exercises: Exercise[];
  };
};

export type CompletedExercise = {
  id: number;
  exercise_id: number;
  exercise_name: string;
  sets_completed: number;
  reps_per_set: number;
  notes?: string;
};

export type ExerciseSession = {
  id: number;
  date: string;
  location: string;
  completed_exercises: number;
  exercises: CompletedExercise[];
  archived_at: string | null;
};

@Injectable({ providedIn: 'root' })
export class ExerciseService {
  private readonly cacheTtlMs = 60000;
  private readonly responseCache = new Map<string, { expiresAt: number; data: any }>();

  constructor(private http: HttpClient) {}

  getExercisesByLocation(location: 'home' | 'gym', goal?: 'bulk' | 'cut' | 'maintain') {
    let params = new HttpParams();
    if (goal) {
      params = params.set('goal', goal);
    }
    const url = `${environment.apiUrl}/api/exercises-by-location/${location}/`;
    const cacheKey = this.buildCacheKey(url, params);
    const cached = this.getFromCache<ExercisesByCategory>(cacheKey);
    if (cached) {
      return of(cached);
    }

    return this.http.get<ExercisesByCategory>(url, { params }).pipe(
      tap((data) => this.setCache(cacheKey, data))
    );
  }

  getExercises(location?: string, category?: string) {
    let params = new HttpParams();
    if (location) {
      params = params.set('location', location);
    }
    if (category) {
      params = params.set('category', category);
    }
    const url = `${environment.apiUrl}/api/exercises/`;
    const cacheKey = this.buildCacheKey(url, params);
    const cached = this.getFromCache<Exercise[]>(cacheKey);
    if (cached) {
      return of(cached);
    }

    return this.http.get<Exercise[]>(url, { params }).pipe(
      tap((data) => this.setCache(cacheKey, data))
    );
  }

  getSessions(location?: string, showArchived = false) {
    let params = new HttpParams();
    if (location) {
      params = params.set('location', location);
    }
    if (showArchived) {
      params = params.set('show_archived', 'true');
    }
    return this.http.get<ExerciseSession[]>(
      `${environment.apiUrl}/api/sessions/`,
      { params }
    );
  }

  getSession(sessionId: number) {
    return this.http.get<ExerciseSession>(
      `${environment.apiUrl}/api/sessions/${sessionId}/`
    );
  }

  createSession(data: {
    location: string;
    exercises: Array<{
      exercise_id: number;
      sets_completed: number;
      reps_per_set: number;
      notes?: string;
    }>;
  }) {
    return this.http.post<ExerciseSession>(
      `${environment.apiUrl}/api/sessions/`,
      data
    );
  }

  markExerciseCompleted(data: {
    session_id: number;
    exercise_id: number;
    sets_completed: number;
    reps_per_set: number;
  }) {
    return this.http.post<CompletedExercise>(
      `${environment.apiUrl}/api/completed/`,
      data
    );
  }

  getProgressStats(location?: string) {
    return this.http.get<{
      labels: string[];
      values: number[];
    }>(
      `${environment.apiUrl}/api/progress/`,
      { params: location ? { location } : {} }
    );
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
}
