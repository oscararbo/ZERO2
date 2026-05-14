import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FocusPageHeaderComponent } from '../../shared/components/focus-page-header/focus-page-header';
import {
  FeatureFlag,
  NutritionPlusResponse,
  PerformanceService,
  WeeklyPlanResponse,
} from '../../../core/performance.service';
import { WeeklyPlannerComponent } from './components/weekly-planner/weekly-planner.component';
import { RecoveryCardComponent } from './components/recovery-card/recovery-card.component';
import { WearablesCardComponent } from './components/wearables-card/wearables-card.component';

@Component({
  selector: 'app-performance',
  standalone: true,
  imports: [CommonModule, FormsModule, FocusPageHeaderComponent, WeeklyPlannerComponent, RecoveryCardComponent, WearablesCardComponent],
  templateUrl: './performance.html',
  styleUrls: ['./performance.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformanceComponent implements OnInit {
  private performanceService = inject(PerformanceService);

  loading = signal(true);
  toast = signal<string | null>(null);
  toastType = signal<'success' | 'error'>('success');

  weeklyPlan = signal<WeeklyPlanResponse | null>(null);
  coachBrief = signal<any | null>(null);
  nutrition = signal<NutritionPlusResponse | null>(null);
  flags = signal<FeatureFlag[]>([]);

  ngOnInit(): void {
    this.reloadAll();
  }

  reloadAll(): void {
    this.loading.set(true);
    this.performanceService.getWeeklyPlan().subscribe({
      next: (v) => this.weeklyPlan.set(v),
      error: () => { this.weeklyPlan.set(null); this.showToast('Weekly plan unavailable (service starting up).', 'error'); },
    });
    this.performanceService.getCoachBrief().subscribe({
      next: (v) => this.coachBrief.set(v),
      error: () => this.coachBrief.set(null),
    });
    this.performanceService.getNutritionPlus().subscribe({
      next: (v) => this.nutrition.set(v),
      error: () => this.nutrition.set(null),
    });
    this.performanceService.getFeatureFlags().subscribe({
      next: (v) => { this.flags.set(v); this.loading.set(false); },
      error: () => { this.flags.set([]); this.loading.set(false); },
    });
  }

  handleSubToast(event: { msg: string; type: 'success' | 'error' }): void {
    this.showToast(event.msg, event.type);
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastType.set(type);
    this.toast.set(message);
    window.setTimeout(() => {
      if (this.toast() === message) {
        this.toast.set(null);
      }
    }, 2800);
  }
}

