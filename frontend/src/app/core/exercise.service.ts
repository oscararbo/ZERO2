import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
};

@Injectable({ providedIn: 'root' })
export class ExerciseService {
  constructor(private http: HttpClient) {}

  getExercisesByLocation(location: 'home' | 'gym', goal?: 'bulk' | 'cut' | 'maintain') {
    let url = `${environment.apiUrl}/api/accounts/exercises-by-location/${location}/`;
    if (goal) {
      url += `?goal=${goal}`;
    }
    return this.http.get<ExercisesByCategory>(url);
  }

  getExercises(location?: string, category?: string) {
    let url = `${environment.apiUrl}/api/accounts/exercises/`;
    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (category) params.append('category', category);
    if (params.toString()) url += `?${params.toString()}`;
    return this.http.get<Exercise[]>(url);
  }

  getSessions(location?: string) {
    let url = `${environment.apiUrl}/api/accounts/sessions/`;
    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (params.toString()) url += `?${params.toString()}`;
    return this.http.get<ExerciseSession[]>(url);
  }

  getSession(sessionId: number) {
    return this.http.get<ExerciseSession>(
      `${environment.apiUrl}/api/accounts/sessions/${sessionId}/`
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
      `${environment.apiUrl}/api/accounts/sessions/`,
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
      `${environment.apiUrl}/api/accounts/completed/`,
      data
    );
  }

  getProgressStats(location?: string) {
    return this.http.get<{
      labels: string[];
      values: number[];
    }>(
      `${environment.apiUrl}/api/accounts/progress/`,
      { params: location ? { location } : {} }
    );
  }
}
