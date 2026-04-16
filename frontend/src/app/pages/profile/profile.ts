import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProfileService, Profile } from '../../core/profile.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private profiles = inject(ProfileService);

  loadingProfile = signal(true);
  profile = signal<Profile | null>(null);

  readonly focusAreas = computed(() => {
    const profile = this.profile();
    if (!profile) return [];

    const mapping = [
      { key: 'sport', label: 'Sport' },
      { key: 'food', label: 'Food' },
      { key: 'mindset', label: 'Mindset' },
      { key: 'growth', label: 'Growth' },
      { key: 'challenges', label: 'Challenges' },
    ] as const;

    return mapping.filter((item) => profile[item.key]).map((item) => item.label);
  });

  readonly fitnessGoalLabel = computed(() => {
    const goal = this.profile()?.fitness_goal;
    if (goal === 'bulk') return 'Muscle Gain';
    if (goal === 'cut') return 'Definition';
    return 'Maintain';
  });

  readonly focusAreasText = computed(() => this.focusAreas().join(', '));

  readonly bmi = computed(() => {
    const profile = this.profile();
    if (!profile?.weight || !profile?.height) return '--';
    const meters = profile.height / 100;
    return (profile.weight / (meters * meters)).toFixed(1);
  });

  ngOnInit() {
    const local = this.profiles.getLocal();
    if (local) {
      this.profile.set(local);
    }

    this.profiles.getProfile().subscribe({
      next: (p) => {
        this.profile.set(p);
        this.profiles.setLocal(p);
        this.loadingProfile.set(false);
      },
      error: () => {
        this.loadingProfile.set(false);
      },
    });
  }

}
