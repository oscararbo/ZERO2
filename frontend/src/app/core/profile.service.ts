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
  sport: boolean;
  food: boolean;
  mindset: boolean;
  growth: boolean;
  challenges: boolean;
};

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly storageKey = 'zero_profile_data';

  constructor(private http: HttpClient) {}

  getLocal(): Profile | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Profile;
    } catch {
      return null;
    }
  }

  setLocal(p: Profile) {
    localStorage.setItem(this.storageKey, JSON.stringify(p));
  }

  getProfile() {
    return this.http.get<Profile>(`${environment.apiUrl}/api/accounts/profile/`);
  }

  saveProfile(p: Profile) {
    return this.http.put<Profile>(`${environment.apiUrl}/api/accounts/profile/`, p);
  }
}
