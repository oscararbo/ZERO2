import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProfileService, Profile, FitnessGoal, ProfileInterestInsight } from '../../core/profile.service';
import { PageTopHeaderComponent } from '../shared/components/page-top-header/page-top-header';
import { UiSelectComponent, UiSelectOption } from '../shared/components/ui-select/ui-select.component';

type InsightMetric = {
  label: string;
  value: number;
  unit?: string;
  percent: number;
};

type InterestInsight = {
  key: 'sport' | 'food' | 'mindset' | 'growth' | 'challenges';
  title: string;
  subtitle: string;
  sparklinePoints: string;
  metrics: InsightMetric[];
  highlights: string[];
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageTopHeaderComponent, UiSelectComponent],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private profiles = inject(ProfileService);
  private fb = inject(FormBuilder);
  private readonly advancedStorageKey = 'zero_profile_show_advanced';

  loadingProfile = signal(true);
  savingQuick = signal(false);
  profile = signal<Profile | null>(null);
  showAdvanced = signal(false);
  editingQuick = signal(false);
  message = signal('');
  private serverInterestAnalytics = signal<InterestInsight[] | null>(null);
  private initialSnapshot = signal<string | null>(null);

  quickForm = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    weekly_goal: [3, [Validators.required, Validators.min(1), Validators.max(14)]],
    fitness_goal: ['bulk' as FitnessGoal, [Validators.required]],
    weight: [70, [Validators.required, Validators.min(30), Validators.max(300)]],
    height: [170, [Validators.required, Validators.min(100), Validators.max(250)]],
  });

  readonly fitnessGoalOptions: UiSelectOption[] = [
    { value: 'bulk', label: 'Muscle gain' },
    { value: 'cut', label: 'Definition' },
    { value: 'maintain', label: 'Maintain' },
  ];

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
  readonly hasConfiguredInterests = computed(() => this.focusAreas().length > 0);

  readonly bmi = computed(() => {
    const profile = this.profile();
    if (!profile?.weight || !profile?.height) return '--';
    const meters = profile.height / 100;
    return (profile.weight / (meters * meters)).toFixed(1);
  });

  readonly profileCompletion = computed(() => {
    const p = this.profile();
    if (!p) return 0;
    let score = 0;
    if (p.full_name?.trim()) score += 20;
    if (p.weekly_goal > 0) score += 20;
    if (p.weight > 0) score += 20;
    if (p.height > 0) score += 20;
    if (this.focusAreas().length > 0) score += 20;
    return score;
  });

  readonly consistencyLevel = computed(() => {
    const weeklyGoal = this.profile()?.weekly_goal ?? 0;
    if (weeklyGoal <= 2) return 'Low';
    if (weeklyGoal <= 4) return 'Balanced';
    return 'High';
  });

  readonly advancedBars = computed(() => {
    const p = this.profile();
    if (!p || !this.hasConfiguredInterests()) return [];

    const base = Math.min(100, Math.max(0, p.weekly_goal * 14));
    const discipline = Math.min(100, Math.max(0, 45 + this.focusAreas().length * 11));
    const recovery = Math.min(100, Math.max(0, 76 - Math.abs(p.weekly_goal - 4) * 9));
    const profileQuality = Math.min(100, Math.max(0, this.profileCompletion()));

    return [
      { label: 'Consistency', value: base },
      { label: 'Discipline index', value: discipline },
      { label: 'Recovery balance', value: Number(recovery.toFixed(0)) },
      { label: 'Profile quality', value: profileQuality },
    ];
  });

  readonly advancedSparklinePoints = computed(() => {
    const bars = this.advancedBars();
    if (!bars.length) return '';

    return bars
      .map((metric, index) => {
        const x = index * 100;
        const y = Number((100 - metric.value).toFixed(2));
        return `${x},${y}`;
      })
      .join(' ');
  });

  readonly fallbackInterestAnalytics = computed<InterestInsight[]>(() => {
    const p = this.profile();
    if (!p || !this.hasConfiguredInterests()) return [];

    const cards: InterestInsight[] = [];
    const weeklyGoal = Math.max(1, p.weekly_goal || 3);
    const focusCount = this.focusAreas().length;

    if (p.sport) {
      const trainingLoad = this.clamp(weeklyGoal * 15, 20, 100);
      const intensityBalance = this.clamp(82 - Math.abs(weeklyGoal - 4) * 8, 35, 96);
      const progression = this.clamp(55 + weeklyGoal * 6 + focusCount * 4, 20, 98);
      const metrics: InsightMetric[] = [
        { label: 'Training load', value: trainingLoad, unit: '%', percent: trainingLoad },
        { label: 'Intensity balance', value: intensityBalance, unit: '%', percent: intensityBalance },
        { label: 'Progression score', value: progression, unit: '%', percent: progression },
      ];
      cards.push({
        key: 'sport',
        title: 'Sport performance',
        subtitle: 'Weekly structure and progression potential.',
        sparklinePoints: this.sparklineFromMetrics(metrics),
        metrics,
        highlights: [
          `Ideal training split: ${Math.max(2, Math.round(weeklyGoal * 0.6))} hard days + ${Math.max(1, Math.round(weeklyGoal * 0.4))} light days`,
          `Current weekly target: ${weeklyGoal} sessions`,
        ],
      });
    }

    if (p.food) {
      const calories = p.macro_calories_target > 0 ? p.macro_calories_target : this.defaultCaloriesForGoal(p.fitness_goal);
      const protein = p.macro_protein_target > 0 ? p.macro_protein_target : Math.round((p.weight || 70) * 1.8);
      const carbs = p.macro_carbs_target > 0 ? p.macro_carbs_target : Math.round((p.weight || 70) * 3.2);
      const fat = p.macro_fat_target > 0 ? p.macro_fat_target : Math.round((p.weight || 70) * 0.9);
      const macroBalance = this.clamp(52 + focusCount * 7 + (p.macro_protein_target > 0 ? 8 : 0), 35, 97);
      const calorieConsistency = this.clamp(58 + weeklyGoal * 6 + (p.fitness_goal === 'maintain' ? 8 : 0), 30, 96);
      const metrics: InsightMetric[] = [
        { label: 'Calories target', value: calories, unit: 'kcal', percent: this.clamp((calories / 3200) * 100, 20, 100) },
        { label: 'Macro balance', value: macroBalance, unit: '%', percent: macroBalance },
        { label: 'Calorie consistency', value: calorieConsistency, unit: '%', percent: calorieConsistency },
      ];
      cards.push({
        key: 'food',
        title: 'Nutrition alignment',
        subtitle: 'Targets adapted to your goal and body metrics.',
        sparklinePoints: this.sparklineFromMetrics(metrics),
        metrics,
        highlights: [
          `Macro targets: P ${protein}g | C ${carbs}g | F ${fat}g`,
          `Daily calorie objective: ${calories} kcal`,
        ],
      });
    }

    if (p.mindset) {
      const resilience = this.clamp(60 + focusCount * 6 + (weeklyGoal <= 5 ? 8 : -4), 30, 98);
      const stressBalance = this.clamp(74 - Math.abs(weeklyGoal - 4) * 8, 25, 95);
      const routineStability = this.clamp(50 + weeklyGoal * 7, 20, 97);
      const metrics: InsightMetric[] = [
        { label: 'Mental resilience', value: resilience, unit: '%', percent: resilience },
        { label: 'Stress balance', value: stressBalance, unit: '%', percent: stressBalance },
        { label: 'Routine stability', value: routineStability, unit: '%', percent: routineStability },
      ];
      cards.push({
        key: 'mindset',
        title: 'Mindset readiness',
        subtitle: 'Consistency and recovery pressure indicators.',
        sparklinePoints: this.sparklineFromMetrics(metrics),
        metrics,
        highlights: [
          `Weekly pressure index: ${this.clamp(weeklyGoal * 12, 20, 100)} / 100`,
          'Recommendation: keep 1 full recovery day each week',
        ],
      });
    }

    if (p.growth) {
      const learningMomentum = this.clamp(48 + focusCount * 10 + weeklyGoal * 4, 25, 99);
      const reflectionDepth = this.clamp(46 + this.profileCompletion() * 0.5, 20, 96);
      const habitCompounding = this.clamp(52 + weeklyGoal * 7, 25, 98);
      const metrics: InsightMetric[] = [
        { label: 'Learning momentum', value: learningMomentum, unit: '%', percent: learningMomentum },
        { label: 'Reflection depth', value: Math.round(reflectionDepth), unit: '%', percent: Math.round(reflectionDepth) },
        { label: 'Habit compounding', value: habitCompounding, unit: '%', percent: habitCompounding },
      ];
      cards.push({
        key: 'growth',
        title: 'Personal growth',
        subtitle: 'How fast your routines can compound over time.',
        sparklinePoints: this.sparklineFromMetrics(metrics),
        metrics,
        highlights: [
          `Projected weekly deep-work blocks: ${Math.max(2, Math.round(weeklyGoal * 1.5))}`,
          'Journal and review habits amplify your consistency trend',
        ],
      });
    }

    if (p.challenges) {
      const readiness = this.clamp(58 + weeklyGoal * 6 + focusCount * 4, 30, 98);
      const completionPotential = this.clamp(50 + this.profileCompletion() * 0.45, 25, 96);
      const loadTolerance = this.clamp(70 - Math.abs(weeklyGoal - 4) * 7, 20, 95);
      const metrics: InsightMetric[] = [
        { label: 'Challenge readiness', value: readiness, unit: '%', percent: readiness },
        { label: 'Completion potential', value: Math.round(completionPotential), unit: '%', percent: Math.round(completionPotential) },
        { label: 'Load tolerance', value: loadTolerance, unit: '%', percent: loadTolerance },
      ];
      cards.push({
        key: 'challenges',
        title: 'Challenge engine',
        subtitle: 'Execution capacity for short and medium challenges.',
        sparklinePoints: this.sparklineFromMetrics(metrics),
        metrics,
        highlights: [
          `Estimated 30-day completion rate: ${Math.round(completionPotential)}%`,
          `Recommended active challenges at once: ${weeklyGoal >= 5 ? 2 : 1}`,
        ],
      });
    }

    return cards;
  });

  readonly activeInterestAnalytics = computed<InterestInsight[]>(() => {
    return this.serverInterestAnalytics() ?? this.fallbackInterestAnalytics();
  });

  ngOnInit() {
    this.showAdvanced.set(localStorage.getItem(this.advancedStorageKey) === '1');

    const local = this.profiles.getLocal(10 * 60 * 1000);
    if (local) {
      this.profile.set(local);
      this.patchQuickForm(local);
      this.loadInterestAnalytics();
      this.loadingProfile.set(false);
      return;
    }

    this.profiles.getProfile().subscribe({
      next: (p) => {
        this.profile.set(p);
        this.patchQuickForm(p);
        this.profiles.setLocal(p);
        this.loadInterestAnalytics();
        this.loadingProfile.set(false);
      },
      error: () => {
        this.loadingProfile.set(false);
      },
    });
  }

  toggleAdvanced(): void {
    this.showAdvanced.update((current) => {
      const next = !current;
      localStorage.setItem(this.advancedStorageKey, next ? '1' : '0');
      return next;
    });
  }

  toggleQuickEdit(): void {
    this.message.set('');
    if (!this.editingQuick()) {
      const current = this.profile();
      if (current) this.patchQuickForm(current);
    }
    this.editingQuick.update((current) => !current);
  }

  cancelQuickEdit(): void {
    this.message.set('');
    const current = this.profile();
    if (current) this.patchQuickForm(current);
    this.editingQuick.set(false);
  }

  saveQuickEdit(): void {
    this.message.set('');
    if (this.quickForm.invalid) {
      this.quickForm.markAllAsTouched();
      this.message.set('Complete the required fields correctly.');
      return;
    }

    const current = this.profile();
    if (!current) return;

    const update: Profile = {
      ...current,
      ...this.quickForm.getRawValue(),
    };

    if (this.initialSnapshot() === JSON.stringify(update)) {
      this.message.set('No changes to save.');
      return;
    }

    this.savingQuick.set(true);
    this.profiles.saveProfile(update).subscribe({
      next: (saved) => {
        this.savingQuick.set(false);
        this.profile.set(saved);
        this.patchQuickForm(saved);
        this.profiles.setLocal(saved);
        this.loadInterestAnalytics();
        this.editingQuick.set(false);
        this.message.set('Profile updated.');
      },
      error: () => {
        this.savingQuick.set(false);
        this.message.set('Could not update profile. Try again.');
      },
    });
  }

  private patchQuickForm(p: Profile): void {
    this.quickForm.patchValue({
      full_name: p.full_name ?? '',
      weekly_goal: p.weekly_goal ?? 3,
      fitness_goal: (p.fitness_goal ?? 'maintain') as FitnessGoal,
      weight: p.weight ?? 70,
      height: p.height ?? 170,
    });
    this.initialSnapshot.set(JSON.stringify({ ...p, ...this.quickForm.getRawValue() }));
  }

  private loadInterestAnalytics(): void {
    this.profiles.getProfileInsights().subscribe({
      next: (payload) => {
        const cards = payload.cards.map((card) => this.mapServerInsight(card));
        this.serverInterestAnalytics.set(cards);
      },
      error: () => {
        this.serverInterestAnalytics.set(null);
      },
    });
  }

  private mapServerInsight(card: ProfileInterestInsight): InterestInsight {
    const metrics: InsightMetric[] = card.metrics.map((item) => ({
      label: item.label,
      value: item.value,
      unit: item.unit,
      percent: this.clamp(item.percent, 0, 100),
    }));

    return {
      key: card.key,
      title: card.title,
      subtitle: card.subtitle,
      metrics,
      highlights: card.highlights,
      sparklinePoints: this.sparklineFromMetrics(metrics),
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Math.round(value)));
  }

  private sparklineFromMetrics(metrics: InsightMetric[]): string {
    const points = metrics.map((m) => this.clamp(m.percent, 0, 100));
    return points
      .map((value, index) => {
        const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * 300;
        const y = 100 - value;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }

  private defaultCaloriesForGoal(goal: FitnessGoal): number {
    if (goal === 'bulk') return 2800;
    if (goal === 'cut') return 2100;
    return 2400;
  }

}
