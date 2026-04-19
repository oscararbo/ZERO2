import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environments';

export type FitnessGoal = 'bulk' | 'cut' | 'maintain';

export type Profile = {
  full_name: string;
  weekly_goal: number;
  fitness_goal: FitnessGoal;
  weight: number;
  height: number;
  macro_calories_target: number;
  macro_protein_target: number;
  macro_carbs_target: number;
  macro_fat_target: number;
  sport: boolean;
  food: boolean;
  mindset: boolean;
  growth: boolean;
  challenges: boolean;
};

export type ProfileInsightMetric = {
  label: string;
  value: number;
  unit: string;
  percent: number;
};

export type ProfileInterestInsight = {
  key: 'sport' | 'food' | 'mindset' | 'growth' | 'challenges';
  title: string;
  subtitle: string;
  metrics: ProfileInsightMetric[];
  highlights: string[];
};

export type ProfileInsightsResponse = {
  cards: ProfileInterestInsight[];
  generated_at: string;
};

type CachedProfile = {
  updatedAt: number;
  data: Profile;
};

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly storageKey = 'zero_profile_data';

  constructor(private http: HttpClient) {}

  getLocal(maxAgeMs?: number): Profile | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as Profile | CachedProfile;

      if (this.isCachedProfile(parsed)) {
        if (typeof maxAgeMs === 'number' && maxAgeMs >= 0) {
          const age = Date.now() - parsed.updatedAt;
          if (age > maxAgeMs) return null;
        }
        return parsed.data;
      }

      return parsed as Profile;
    } catch {
      return null;
    }
  }

  setLocal(p: Profile) {
    const payload: CachedProfile = {
      updatedAt: Date.now(),
      data: p,
    };
    localStorage.setItem(this.storageKey, JSON.stringify(payload));
  }

  getProfile() {
    return this.http.get<Profile>(`${environment.apiUrl}/api/profile/`);
  }

  getProfileInsights() {
    return this.http.get<ProfileInsightsResponse>(`${environment.apiUrl}/api/profile/insights/`);
  }

  saveProfile(p: Profile) {
    return this.http.put<Profile>(`${environment.apiUrl}/api/profile/`, p);
  }

  private isCachedProfile(value: Profile | CachedProfile): value is CachedProfile {
    return typeof (value as CachedProfile).updatedAt === 'number' && !!(value as CachedProfile).data;
  }
}
