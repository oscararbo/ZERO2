import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart } from 'chart.js/auto';

import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import {
  AdminService,
  AdminStatsFilters,
  AdminStatsResponse,
  PersistedAlert,
} from '../../core/admin.service';

const CHART_DEFAULTS = {
  color: '#ffffff',
  borderColor: 'rgba(255,255,255,0.1)',
  gridColor: 'rgba(255,255,255,0.07)',
};

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent implements AfterViewInit, OnDestroy {
  private adminService = inject(AdminService);
  private auth = inject(AuthService);
  private router = inject(Router);

  @ViewChild('userTrendChart') userTrendRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sessionTrendChart') sessionTrendRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('interestsChart') interestsRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('goalsChart') goalsRef!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];
  private viewReady = signal(false);

  readonly today = new Date().toISOString().slice(0, 10);

  loading = signal(true);
  error = signal('');
  dateError = signal('');
  exporting = signal(false);
  stats = signal<AdminStatsResponse | null>(null);
  rangeMode = signal<'preset' | 'custom'>('preset');
  selectedDays = signal<7 | 30 | 90>(30);

  persistedAlerts = signal<PersistedAlert[]>([]);
  alertsLoading = signal(false);
  alertsFilter = signal<'all' | 'open' | 'resolved'>('all');

  customStart = signal('');
  customEnd = signal('');
  topLimitInput = signal(10);
  private currentFilters = signal<AdminStatsFilters>({ days: 30, top: 10 });

  readonly activeRangeLabel = computed(() => {
    const payload = this.stats();
    if (payload?.meta?.range?.start && payload?.meta?.range?.end) {
      return `${this.formatDate(payload.meta.range.start)} - ${this.formatDate(payload.meta.range.end)}`;
    }

    if (this.rangeMode() === 'custom' && this.customStart() && this.customEnd()) {
      return `${this.formatDate(this.customStart())} - ${this.formatDate(this.customEnd())}`;
    }

    const days = this.selectedDays();
    const end = new Date(`${this.today}T00:00:00`);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));

    return `${this.formatDate(start.toISOString().slice(0, 10))} - ${this.formatDate(this.today)}`;
  });

  readonly kpis = computed(() => {
    const data = this.stats()?.summary;
    const cmp = this.stats()?.comparison;
    if (!data) return [];

    const d = (key: keyof NonNullable<typeof cmp>['delta_pct']) => cmp?.delta_pct?.[key] ?? null;

    return [
      { label: 'Usuarios totales', value: data.users_total, delta: null },
      { label: 'Usuarios activos', value: data.users_active, delta: null },
      { label: 'Altas en rango', value: data.users_in_selected_range, delta: d('new_users') },
      { label: 'Perfiles completados', value: `${data.profile_completion_rate}%`, delta: null },
      { label: 'Sesiones (rango)', value: this.stats()?.comparison?.current?.sessions ?? data.exercise_sessions_total, delta: d('sessions') },
      { label: 'Ejercicios completados (rango)', value: this.stats()?.comparison?.current?.completed_exercises ?? data.completed_exercises_total, delta: d('completed_exercises') },
      { label: 'Journal (rango)', value: this.stats()?.comparison?.current?.journal_entries ?? data.journal_entries_total, delta: d('journal_entries') },
      { label: 'Mood (rango)', value: this.stats()?.comparison?.current?.mood_entries ?? data.mood_entries_total, delta: d('mood_entries') },
      { label: 'Mood promedio (30d)', value: data.mood_average_last_30_days ?? 'N/A', delta: null },
      { label: 'Challenges', value: data.challenges_total, delta: null },
      { label: 'Participantes challenges (rango)', value: this.stats()?.comparison?.current?.challenge_participants ?? data.challenge_participants_total, delta: d('challenge_participants') },
      { label: 'Completion challenges', value: `${data.challenge_completion_rate}%`, delta: null },
      { label: 'Badges otorgados', value: data.badges_total, delta: null },
      { label: 'Reminders sin leer', value: data.reminders_unread_total, delta: null },
    ];
  });

  readonly skeletonKpis = Array.from({ length: 12 }, (_, index) => index);
  readonly skeletonComparisonRows = Array.from({ length: 7 }, (_, index) => index);
  readonly skeletonTopRows = Array.from({ length: 6 }, (_, index) => index);
  readonly skeletonAlertsRows = Array.from({ length: 4 }, (_, index) => index);

  readonly interestRows = computed(() => {
    const interests = this.stats()?.distributions.interests;
    if (!interests) return [];
    return [
      { label: 'Sport', value: interests.sport },
      { label: 'Food', value: interests.food },
      { label: 'Mindset', value: interests.mindset },
      { label: 'Growth', value: interests.growth },
      { label: 'Challenges', value: interests.challenges },
    ];
  });

  readonly comparisonRows = computed(() => {
    const cmp = this.stats()?.comparison;
    if (!cmp) return [];

    const keys: Array<{ key: keyof typeof cmp.current; label: string }> = [
      { key: 'new_users', label: 'Nuevos usuarios' },
      { key: 'sessions', label: 'Sesiones' },
      { key: 'journal_entries', label: 'Journal' },
      { key: 'mood_entries', label: 'Mood' },
      { key: 'completed_exercises', label: 'Ejercicios completados' },
      { key: 'challenge_participants', label: 'Participantes challenges' },
      { key: 'challenges_completed', label: 'Challenges completados' },
    ];

    return keys.map(({ key, label }) => ({
      label,
      current: cmp.current[key],
      previous: cmp.previous[key],
      delta: cmp.delta_pct[key],
    }));
  });

  readonly cohortRows = computed(() => this.stats()?.cohorts ?? null);

  readonly topUsers = computed(() => this.stats()?.top_users ?? []);

  readonly alerts = computed(() => this.stats()?.alerts ?? []);

  readonly filteredPersistedAlerts = computed(() => {
    const filter = this.alertsFilter();
    const all = this.persistedAlerts();
    if (filter === 'all') return all;
    return all.filter((a) => a.status === filter);
  });

  constructor() {
    this.load({ days: this.selectedDays(), top: this.topLimitInput() });
    this.loadPersistedAlerts();

    effect(() => {
      const data = this.stats();
      const ready = this.viewReady();
      if (ready) {
        this.renderCharts(data);
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady.set(true);
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  retry() {
    this.load(this.currentFilters());
  }

  applyPresetDays(days: number) {
    const safeDays: 7 | 30 | 90 = days === 7 || days === 90 ? days : 30;
    this.rangeMode.set('preset');
    this.selectedDays.set(safeDays);
    this.customStart.set('');
    this.customEnd.set('');
    this.load({ days: safeDays, top: this.topLimitInput() });
  }

  applyTopLimit() {
    this.load({ ...this.currentFilters(), top: this.topLimitInput() });
  }

  applyCustomRange() {
    this.dateError.set('');
    const start = this.customStart();
    const end = this.customEnd();

    if (!start || !end) {
      this.dateError.set('Selecciona fecha de inicio y fin.');
      return;
    }
    if (start > this.today) {
      this.dateError.set('La fecha de inicio no puede ser posterior a hoy.');
      return;
    }
    if (end > this.today) {
      this.dateError.set('La fecha de fin no puede ser posterior a hoy.');
      return;
    }
    if (start > end) {
      this.dateError.set('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }

    this.rangeMode.set('custom');
    this.load({ start, end, top: this.topLimitInput() });
  }

  exportCsv() {
    this.exporting.set(true);
    this.adminService.exportStatsCsv(this.currentFilters()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'zero_admin_stats.csv';
        anchor.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => {
        this.error.set('No se pudo exportar el CSV de estadísticas.');
        this.exporting.set(false);
      },
    });
  }

  setAlertsFilter(filter: 'all' | 'open' | 'resolved') {
    this.alertsFilter.set(filter);
  }

  resolveAlert(id: number) {
    this.adminService.resolveAlert(id).subscribe({
      next: (res) => {
        this.persistedAlerts.update((list) =>
          list.map((a) =>
            a.id === id ? { ...a, status: 'resolved' as const, resolved_at: res?.resolved_at ?? new Date().toISOString() } : a
          )
        );
      },
      error: () => {
        this.error.set('No se pudo resolver la alerta.');
      },
    });
  }

  reopenAlert(id: number) {
    this.adminService.reopenAlert(id).subscribe({
      next: () => {
        this.persistedAlerts.update((list) =>
          list.map((a) =>
            a.id === id ? { ...a, status: 'open' as const, resolved_at: null } : a
          )
        );
      },
      error: () => {
        this.error.set('No se pudo reabrir la alerta.');
      },
    });
  }

  private loadPersistedAlerts() {
    this.alertsLoading.set(true);
    this.adminService.getAlerts().subscribe({
      next: (res) => {
        this.persistedAlerts.set(res.alerts ?? []);
        this.alertsLoading.set(false);
      },
      error: () => {
        this.alertsLoading.set(false);
      },
    });
  }

  private load(filters: AdminStatsFilters) {
    this.currentFilters.set({ ...filters });
    this.loading.set(true);
    this.error.set('');
    this.stats.set(null);

    this.adminService.getStats(filters).subscribe({
      next: (payload) => {
        this.stats.set(payload);
        this.loading.set(false);
        this.loadPersistedAlerts();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar las estadísticas de administración.');
      },
    });
  }

  private destroyCharts() {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
  }

  private renderCharts(data: AdminStatsResponse | null) {
    this.destroyCharts();

    const lineOpts = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: CHART_DEFAULTS.color, font: { size: 11 } },
          grid: { color: CHART_DEFAULTS.gridColor },
        },
        y: {
          ticks: { color: CHART_DEFAULTS.color, font: { size: 11 }, stepSize: 1 },
          grid: { color: CHART_DEFAULTS.gridColor },
          beginAtZero: true,
        },
      },
    };

    const userTrend = data?.trends.new_users ?? [];
    if (this.userTrendRef?.nativeElement) {
      this.charts.push(this.createChart(this.userTrendRef.nativeElement, {
        type: 'line',
        data: {
          labels: userTrend.map((p) => p.day.slice(5)),
          datasets: [{
            data: userTrend.map((p) => p.value),
            borderColor: 'rgba(154,210,230,0.9)',
            backgroundColor: 'rgba(154,210,230,0.12)',
            fill: true,
            tension: 0.35,
            pointRadius: 3,
          }],
        },
        options: lineOpts as any,
      }));
    }

    const sessionTrend = data?.trends.sessions ?? [];
    if (this.sessionTrendRef?.nativeElement) {
      this.charts.push(this.createChart(this.sessionTrendRef.nativeElement, {
        type: 'line',
        data: {
          labels: sessionTrend.map((p) => p.day.slice(5)),
          datasets: [{
            data: sessionTrend.map((p) => p.value),
            borderColor: 'rgba(154,230,180,0.9)',
            backgroundColor: 'rgba(154,230,180,0.12)',
            fill: true,
            tension: 0.35,
            pointRadius: 3,
          }],
        },
        options: lineOpts as any,
      }));
    }

    const interests = data?.distributions.interests;
    if (this.interestsRef?.nativeElement) {
      const labels = ['Sport', 'Food', 'Mindset', 'Growth', 'Challenges'];
      const values = interests
        ? [interests.sport, interests.food, interests.mindset, interests.growth, interests.challenges]
        : [0, 0, 0, 0, 0];
      this.charts.push(this.createChart(this.interestsRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: [
              'rgba(154,210,230,0.75)',
              'rgba(154,230,180,0.75)',
              'rgba(230,200,154,0.75)',
              'rgba(200,154,230,0.75)',
              'rgba(230,154,154,0.75)',
            ],
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'right',
              labels: { color: '#fff', font: { size: 12 }, padding: 10 },
            },
          },
        },
      }));
    }

    const goals = data?.distributions.fitness_goals ?? [];
    if (this.goalsRef?.nativeElement) {
      this.charts.push(this.createChart(this.goalsRef.nativeElement, {
        type: 'bar',
        data: {
          labels: goals.map((g) => g.fitness_goal),
          datasets: [{
            data: goals.map((g) => g.value),
            backgroundColor: 'rgba(200,154,230,0.65)',
            borderColor: 'rgba(200,154,230,0.9)',
            borderWidth: 1,
            borderRadius: 6,
          }],
        },
        options: {
          indexAxis: 'y' as const,
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              ticks: { color: CHART_DEFAULTS.color, font: { size: 11 }, stepSize: 1 },
              grid: { color: CHART_DEFAULTS.gridColor },
              beginAtZero: true,
            },
            y: {
              ticks: { color: CHART_DEFAULTS.color, font: { size: 12 } },
              grid: { color: CHART_DEFAULTS.gridColor },
            },
          },
        } as any,
      }));
    }
  }

  private createChart(canvas: HTMLCanvasElement, config: any): Chart {
    const existing = Chart.getChart(canvas);
    if (existing) {
      existing.destroy();
    }
    return new Chart(canvas, config);
  }

  private formatDate(value: string): string {
    const [y, m, d] = value.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
}
