import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
    let params = new HttpParams();
    if (goal) {
      params = params.set('goal', goal);
    }
    return this.http.get<ExercisesByCategory>(
      `${environment.apiUrl}/api/accounts/exercises-by-location/${location}/`,
      { params }
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
    return this.http.get<Exercise[]>(
      `${environment.apiUrl}/api/accounts/exercises/`,
      { params }
    );
  }

  getSessions(location?: string) {
    let params = new HttpParams();
    if (location) {
      params = params.set('location', location);
    }
    return this.http.get<ExerciseSession[]>(
      `${environment.apiUrl}/api/accounts/sessions/`,
      { params }
    );
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
