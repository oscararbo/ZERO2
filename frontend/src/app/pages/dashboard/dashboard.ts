import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AdminService } from '../../core/admin.service';
import { ProfileService, Profile } from '../../core/profile.service';
import { ProgressService } from '../../core/progress.service';
import { ExerciseService } from '../../core/exercise.service';

import type { Chart } from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  private auth = inject(AuthService);
  private admin = inject(AdminService);
  private router = inject(Router);
  private profiles = inject(ProfileService);
  private progress = inject(ProgressService);
  private exercises = inject(ExerciseService);

  @ViewChild('progressCanvas') progressCanvasRef?: ElementRef<HTMLCanvasElement>;

  menuOpen = signal(false);
  isAdmin = signal(false);

  name = signal('User');
  weeklyGoal = signal(3);
  sessionsThisWeek = signal(0);
  totalExercisesThisWeek = signal(0);
  loadingProfile = signal(true);
  fitnessGoal = signal('bulk');

  focus = signal<{ label: string; link: string }[]>([]);
  chartReady = signal(false);
  chartHasData = signal(false);

  readonly goalLabel = computed(() => {
    const g = this.fitnessGoal();
    if (g === 'bulk') return 'Muscle Gain';
    if (g === 'cut') return 'Definition';
    return 'Maintain';
  });

  readonly weeklyProgress = computed(() => {
    const goal = this.weeklyGoal();
    if (!goal) return 0;
    return Math.min(100, Math.round((this.sessionsThisWeek() / goal) * 100));
  });

  private chart = signal<Chart | null>(null);
  private loadingChart = false;
  private pendingChartRetry: number | null = null;
  private chartRetryCount = 0;

  private getFallbackProgressData(): { labels: string[]; values: number[] } {
    const labels = this.getLast7DayLabels();
    return { labels, values: labels.map(() => 0) };
  }

  private getLast7DayLabels(): string[] {
    const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const label = fmt.format(d).replace('.', '');
      return label.charAt(0).toUpperCase() + label.slice(1);
    });
  }

  private normalizeProgressData(data: { labels?: string[]; values?: number[] } | null | undefined) {
    const fallback = this.getFallbackProgressData();
    if (!data || !Array.isArray(data.labels) || !Array.isArray(data.values)) {
      return fallback;
    }

    const limit = Math.min(data.labels.length, data.values.length);
    if (limit === 0) {
      return fallback;
    }

    const labels = data.labels.slice(0, limit);
    const values = data.values.slice(0, limit).map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0));
    return { labels, values };
  }

  ngAfterViewInit() {
    this.refreshChart();
    const staffCandidate = this.auth.isStaff();
    this.isAdmin.set(staffCandidate);
    if (staffCandidate) {
      this.admin.hasAccess().subscribe({
        next: (isAdmin) => this.isAdmin.set(isAdmin),
        error: () => this.isAdmin.set(false),
      });
    }

    const local = this.profiles.getLocal();
    if (local) this.applyProfile(local);

    this.profiles.getProfile().subscribe({
      next: (p) => {
        this.applyProfile(p);
        this.loadingProfile.set(false);
        this.loadWeeklyStats();
        this.refreshChart();
      },
      error: () => {
        this.loadingProfile.set(false);
        this.refreshChart();
      }
    });
  }

  ngOnDestroy() {
    this.clearChartRetry();
    this.destroyChart();
  }
  private clearChartRetry(): void {
    if (this.pendingChartRetry !== null) {
      window.clearTimeout(this.pendingChartRetry);
      this.pendingChartRetry = null;
    }
  }

  private queueChartRetry(): void {
    if (this.pendingChartRetry !== null || this.chart() || this.chartRetryCount >= 30) {
      return;
    }

    this.chartRetryCount += 1;
    this.pendingChartRetry = window.setTimeout(() => {
      this.pendingChartRetry = null;
      this.refreshChart();
    }, 50);
  }


  toggleMenu() { this.menuOpen.set(!this.menuOpen()); }
  closeMenu() { this.menuOpen.set(false); }

  goProfile() {
    this.closeMenu();
    this.router.navigateByUrl('/profile');
  }

  goAdmin() {
    this.closeMenu();
    this.router.navigateByUrl('/admin');
  }

  logout() {
    this.closeMenu();
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  private applyProfile(p: Profile) {
    this.name.set(p.full_name || 'User');
    this.weeklyGoal.set(p.weekly_goal || 3);
    this.fitnessGoal.set(p.fitness_goal || 'bulk');
    this.profiles.setLocal(p);

    const items = [
      { key: 'sport', label: 'Sport', link: '/sport' },
      { key: 'food', label: 'Food', link: '/food' },
      { key: 'mindset', label: 'Mindset', link: '/mindset' },
      { key: 'growth', label: 'Growth', link: '/growth' },
      { key: 'challenges', label: 'Challenges', link: '/challenges' },
    ] as const;

    const selected = items
      .filter(i => (p as any)[i.key] === true)
      .map(i => ({ label: i.label, link: i.link }));

    this.focus.set(selected.length ? selected : items.slice(0, 3).map(i => ({ label: i.label, link: i.link })));
  }

  private loadWeeklyStats() {
    this.exercises.getSessions().subscribe({
      next: (sessions) => {
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        const recent = sessions.filter(s => new Date(s.date) >= weekAgo);
        this.sessionsThisWeek.set(recent.length);
        this.totalExercisesThisWeek.set(recent.reduce((acc, s) => acc + s.completed_exercises, 0));
      },
    });
  }

  private async ensureChart(): Promise<void> {
    if (this.chart() || this.loadingChart) return;
    const canvas = this.progressCanvasRef?.nativeElement;
    if (!canvas) return;

    this.loadingChart = true;
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const chartModule = await import('chart.js/auto');
      const ChartClass = chartModule.Chart;
      const fallback = this.getFallbackProgressData();

      const nextChart = new ChartClass(ctx, {
        type: 'bar',
        data: {
          labels: fallback.labels,
          datasets: [{
            label: 'Exercises',
            data: fallback.values,
            backgroundColor: 'rgba(154,160,166,0.7)',
            hoverBackgroundColor: '#fff',
            borderRadius: 8,
            borderSkipped: false,
            minBarLength: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(10,10,10,.9)',
              titleColor: 'rgba(255,255,255,.7)',
              bodyColor: '#fff',
              borderColor: 'rgba(255,255,255,.12)',
              borderWidth: 1,
              padding: 10,
            },
          },
          scales: {
            x: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: 'rgba(255,255,255,0.55)', font: { weight: 'bold' } },
            },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: 'rgba(255,255,255,0.55)', stepSize: 1 },
            },
          },
        },
      });

      this.chart.set(nextChart);
      this.chartReady.set(true);
      this.chartHasData.set(false);
    } finally {
      this.loadingChart = false;
    }
  }

  private refreshChart() {
    const canvas = this.progressCanvasRef?.nativeElement;
    if (!this.chart() && !canvas) {
      this.queueChartRetry();
      return;
    }

    this.clearChartRetry();
    this.chartRetryCount = 0;

    this.ensureChart().then(() => {
      const chart = this.chart();
      if (!chart) return;

      this.progress.getProgress().subscribe({
        next: (data) => {
          const normalized = this.normalizeProgressData(data);
          this.chartHasData.set(normalized.values.some((v) => v > 0));
          chart.data.labels = normalized.labels;
          chart.data.datasets[0].data = normalized.values;
          chart.update();
        },
        error: () => {
          const fallback = this.getFallbackProgressData();
          this.chartHasData.set(false);
          chart.data.labels = fallback.labels;
          chart.data.datasets[0].data = fallback.values;
          chart.update();
        },
      });
    });
  }

  private destroyChart() {
    const chart = this.chart();
    chart?.destroy();
    this.chart.set(null);
    this.chartReady.set(false);
  }
}

