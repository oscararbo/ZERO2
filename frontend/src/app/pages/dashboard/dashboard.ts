import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
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
  private router = inject(Router);
  private profiles = inject(ProfileService);
  private progress = inject(ProgressService);
  private exercises = inject(ExerciseService);

  @ViewChild('progressCanvas') progressCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartSection') chartSectionRef?: ElementRef<HTMLElement>;

  menuOpen = signal(false);

  name = signal('User');
  weeklyGoal = signal(3);
  sessionsThisWeek = signal(0);
  totalExercisesThisWeek = signal(0);
  loadingProfile = signal(true);
  fitnessGoal = signal('bulk');

  focus = signal<{ label: string; link: string }[]>([]);
  chartVisible = signal(false);
  chartReady = signal(false);

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
  private chartObserver: IntersectionObserver | null = null;
  private loadingChart = false;

  ngAfterViewInit() {
    this.observeChartVisibility();

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
    this.chartObserver?.disconnect();
    this.destroyChart();
  }

  toggleMenu() { this.menuOpen.set(!this.menuOpen()); }
  closeMenu() { this.menuOpen.set(false); }

  goProfile() {
    this.closeMenu();
    this.router.navigateByUrl('/profile');
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

      const nextChart = new ChartClass(ctx, {
        type: 'bar',
        data: {
          labels: ['', '', '', '', '', '', ''],
          datasets: [{
            label: 'Exercises',
            data: [0, 0, 0, 0, 0, 0, 0],
            backgroundColor: 'rgba(154,160,166,0.7)',
            hoverBackgroundColor: '#fff',
            borderRadius: 8,
            borderSkipped: false,
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
    } finally {
      this.loadingChart = false;
    }
  }

  private refreshChart() {
    this.progress.getProgress().subscribe({
      next: async (data) => {
        if (!this.chartVisible()) return;
        await this.ensureChart();
        const chart = this.chart();
        if (!chart) return;
        chart.data.labels = data.labels;
        chart.data.datasets[0].data = data.values;
        chart.update();
      },
      error: () => {},
    });
  }

  private observeChartVisibility(): void {
    const target = this.chartSectionRef?.nativeElement;
    if (!target) return;

    this.chartObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;

        this.chartVisible.set(true);
        this.refreshChart();
        this.chartObserver?.disconnect();
      },
      {
        root: null,
        threshold: 0.2,
      }
    );

    this.chartObserver.observe(target);
  }

  private destroyChart() {
    const chart = this.chart();
    chart?.destroy();
    this.chart.set(null);
    this.chartReady.set(false);
  }
}

