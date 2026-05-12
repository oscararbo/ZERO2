import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environments';

export type WeeklyPlanItem = {
  id: number;
  date: string;
  focus_area: string;
  planned_workout: string;
  planned_meal_focus: string;
  mindset_task: string;
  growth_task: string;
  weekly_goal_target: number;
  completed: boolean;
};

export type WeeklyPlanResponse = {
  start_date: string;
  end_date: string;
  weekly_goal_target: number;
  completed_items: number;
  items: WeeklyPlanItem[];
};

export type CoachBrief = {
  priority: 'activation' | 'consistency' | 'recovery' | 'mindset';
  message: string;
  sessions_last_7_days: number;
  avg_mood_last_7_days: number | null;
  latest_recovery_score: number | null;
  actions: string[];
};

export type NutritionPlusResponse = {
  goal: 'bulk' | 'cut' | 'maintain';
  weekly_plan: Array<{ day: string; meals: any[] }>;
  shopping_list: Array<{ name: string; unit: string; amount: number }>;
};

export type RecoveryLog = {
  id: number;
  date: string;
  sleep_hours: number;
  stress_level: number;
  soreness_level: number;
  resting_heart_rate: number | null;
  steps: number | null;
  recovery_score: number;
};

export type WearableSnapshot = {
  id: number;
  provider: string;
  source: string;
  date: string;
  steps: number | null;
  active_minutes: number | null;
  calories_burned: number | null;
  avg_heart_rate: number | null;
};

export type FeatureFlag = {
  key: string;
  enabled: boolean;
  description: string;
  updated_at: string;
};

export type AsyncJob = {
  id: number;
  job_type: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  error: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  constructor(private http: HttpClient) {}

  getWeeklyPlan() {
    return this.http.get<WeeklyPlanResponse>(`${environment.apiUrl}/api/performance/planner/`);
  }

  setPlanItemCompleted(item_id: number, completed: boolean) {
    return this.http.post<WeeklyPlanItem>(`${environment.apiUrl}/api/performance/planner/`, { item_id, completed });
  }

  getCoachBrief() {
    return this.http.get<CoachBrief>(`${environment.apiUrl}/api/performance/coach/`);
  }

  getNutritionPlus() {
    return this.http.get<NutritionPlusResponse>(`${environment.apiUrl}/api/performance/nutrition/`);
  }

  getRecoveryLogs() {
    return this.http.get<RecoveryLog[]>(`${environment.apiUrl}/api/performance/recovery/`);
  }

  saveRecoveryLog(payload: {
    date?: string;
    sleep_hours: number;
    stress_level: number;
    soreness_level: number;
    resting_heart_rate?: number | null;
    steps?: number | null;
  }) {
    return this.http.post<RecoveryLog>(`${environment.apiUrl}/api/performance/recovery/`, payload);
  }

  getWearables() {
    return this.http.get<WearableSnapshot[]>(`${environment.apiUrl}/api/performance/wearables/`);
  }

  ingestWearables(payload: {
    provider: 'samsung_health' | 'manual';
    source?: string;
    entries: Array<{
      date: string;
      steps?: number | null;
      active_minutes?: number | null;
      calories_burned?: number | null;
      avg_heart_rate?: number | null;
    }>;
  }) {
    return this.http.post<{ processed: number; created: number; updated: number }>(
      `${environment.apiUrl}/api/performance/wearables/`,
      payload
    );
  }

  getFeatureFlags() {
    return this.http.get<FeatureFlag[]>(`${environment.apiUrl}/api/performance/feature-flags/`);
  }

  getJobs() {
    return this.http.get<AsyncJob[]>(`${environment.apiUrl}/api/performance/jobs/`);
  }

  enqueueVideoSync(force = false) {
    return this.http.post<AsyncJob>(`${environment.apiUrl}/api/performance/jobs/`, {
      job_type: 'sync_exercise_videos',
      payload: { force, limit: 60 },
    });
  }
}
