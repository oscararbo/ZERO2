import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FocusPageHeaderComponent } from '../../shared/components/focus-page-header/focus-page-header';
import type { Chart } from 'chart.js/auto';
import {
  FeatureFlag,
  NutritionPlusResponse,
  PerformanceService,
  RecoveryLog,
  WeeklyPlanResponse,
  WearableSnapshot,
} from '../../../core/performance.service';

interface PlannerEvent {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  repeatWeekly: boolean;
}

@Component({
  selector: 'app-performance',
  standalone: true,
  imports: [CommonModule, FormsModule, FocusPageHeaderComponent],
  templateUrl: './performance.html',
  styleUrls: ['./performance.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformanceComponent implements OnInit, AfterViewInit, OnDestroy {
  private performanceService = inject(PerformanceService);

  @ViewChild('wearablesChart') wearablesChartRef?: ElementRef<HTMLCanvasElement>;

  loading = signal(true);
  toast = signal<string | null>(null);
  toastType = signal<'success' | 'error'>('success');

  weeklyPlan = signal<WeeklyPlanResponse | null>(null);
  coachBrief = signal<any | null>(null);
  nutrition = signal<NutritionPlusResponse | null>(null);
  recoveryLogs = signal<RecoveryLog[]>([]);
  wearables = signal<WearableSnapshot[]>([]);
  flags = signal<FeatureFlag[]>([]);

  recoveryForm = signal({
    sleep_hours: 7,
    stress_level: 5,
    soreness_level: 5,
    resting_heart_rate: null as number | null,
    steps: null as number | null,
  });

  wearableForm = signal({
    provider: 'samsung_health' as 'samsung_health' | 'manual',
    source: 'manual-entry',
    date: new Date().toISOString().slice(0, 10),
    steps: 8000,
    active_minutes: 45,
    calories_burned: 520,
    avg_heart_rate: 118,
  });

  bulkImportText = signal('');
  bulkImportFormat = signal<'json' | 'csv'>('json');
  bulkImportFileName = signal('');
  bulkImportLoading = signal(false);

  // New planner and wearables date controls
  plannerDate = signal<string>(this.getTodayDateValue());
  wearableDateFrom = signal<string>(this.getDateNDaysAgo(6));
  wearableDateTo = signal<string>(this.getTodayDateValue());
  plannerSelectedWeek = signal<string>(this.getTodayDateValue());
  plannerEventTitle = signal('');
  plannerEventDate = signal(this.getTodayDateValue());
  plannerEventStart = signal('08:00');
  plannerEventEnd = signal('09:00');
  plannerEventNotes = signal('');
  plannerEventRepeatWeekly = signal(false);
  plannerEvents = signal<PlannerEvent[]>([]);

  private charts: Chart[] = [];
  private chartsReady = false;

  private getTodayDateValue(): string {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }

  private getDateNDaysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }

  private weekStart(dateValue: string): Date {
    const date = new Date(dateValue);
    const day = date.getDay();
    const diff = (day + 6) % 7;
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - diff);
    return date;
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private formatTimeLabel(value: string): string {
    if (!value) return '';
    return value.slice(0, 5);
  }

  readonly plannerCompletion = computed(() => {
    const p = this.weeklyPlan();
    if (!p || p.items.length === 0) return 0;
    return Math.round((p.completed_items / p.items.length) * 100);
  });

  readonly latestRecovery = computed(() => [...this.recoveryLogs()].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null);
  readonly latestRecoveryScore = computed(() => this.latestRecovery()?.recovery_score ?? 0);
  readonly latestRecoverySleepHours = computed(() => this.latestRecovery()?.sleep_hours ?? 0);

  readonly selectedWearables = computed(() => {
    const fromDate = this.wearableDateFrom();
    const toDate = this.wearableDateTo();
    return this.wearables()
      .filter((row) => row.date >= fromDate && row.date <= toDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  });

  readonly wearablesSummary = computed(() => {
    const items = this.selectedWearables();
    const steps = items.map((row) => row.steps ?? 0);
    const active = items.map((row) => row.active_minutes ?? 0);
    const heart = items.map((row) => row.avg_heart_rate ?? 0).filter((value) => value > 0);

    const totalSteps = steps.reduce((sum, value) => sum + value, 0);
    return {
      rows: items.length,
      totalSteps,
      averageSteps: items.length ? Math.round(totalSteps / items.length) : 0,
      averageActiveMinutes: items.length ? Math.round(active.reduce((sum, value) => sum + value, 0) / items.length) : 0,
      averageHeartRate: heart.length ? Math.round(heart.reduce((sum, value) => sum + value, 0) / heart.length) : 0,
      maxSteps: steps.length ? Math.max(...steps) : 0,
    };
  });

  readonly recoverySummary = computed(() => {
    const items = this.recoveryLogs();
    const scores = items.map((row) => row.recovery_score);
    const sleep = items.map((row) => row.sleep_hours);

    return {
      rows: items.length,
      averageScore: items.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / items.length) : 0,
      averageSleep: items.length ? (sleep.reduce((sum, value) => sum + value, 0) / items.length).toFixed(1) : '0.0',
      bestScore: scores.length ? Math.max(...scores) : 0,
      latestScore: scores[0] ?? 0,
    };
  });

  readonly plannerWeekDays = computed(() => {
    const start = this.weekStart(this.plannerSelectedWeek());
    return Array.from({ length: 7 }, (_value, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        date: this.formatDate(date),
        label: date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
      };
    });
  });

  readonly plannerWeekLabel = computed(() => {
    const days = this.plannerWeekDays();
    if (days.length === 0) return '';
    return `${days[0].label} - ${days[6].label}`;
  });

  readonly plannerEventsByDay = computed(() => {
    const weekDays = this.plannerWeekDays().map((day) => day.date);
    const result: Record<string, PlannerEvent[]> = {};
    for (const day of weekDays) {
      result[day] = this.eventsForDay(day);
    }
    return result;
  });

  ngOnInit(): void {
    this.loadPlannerEvents();
    this.reloadAll();
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    void this.renderCharts();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
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
    this.performanceService.getRecoveryLogs().subscribe({
      next: (v) => {
        this.recoveryLogs.set(v);
        void this.renderCharts();
      },
      error: () => { this.recoveryLogs.set([]); this.showToast('Recovery logs unavailable (service starting up).', 'error'); },
    });
    this.performanceService.getWearables().subscribe({
      next: (v) => {
        this.wearables.set(v);
        void this.renderCharts();
      },
      error: () => this.wearables.set([]),
    });
    this.performanceService.getFeatureFlags().subscribe({
      next: (v) => {
        this.flags.set(v);
        this.loading.set(false);
      },
      error: () => {
        this.flags.set([]);
        this.loading.set(false);
      },
    });
  }

  togglePlanItem(itemId: number, completed: boolean): void {
    this.performanceService.setPlanItemCompleted(itemId, completed).subscribe({
      next: () => {
        this.performanceService.getWeeklyPlan().subscribe({
          next: (v) => this.weeklyPlan.set(v),
          error: () => this.weeklyPlan.set(null),
        });
      },
      error: () => this.showToast('Could not update planner item.', 'error'),
    });
  }

  setRecoveryField<K extends keyof ReturnType<typeof this.recoveryForm>>(field: K, value: ReturnType<typeof this.recoveryForm>[K]): void {
    const next = { ...this.recoveryForm(), [field]: value };

    if (field === 'sleep_hours') {
      next.sleep_hours = Math.max(0, Math.min(24, Number(value) || 0));
    }
    if (field === 'stress_level') {
      next.stress_level = Math.max(1, Math.min(10, Number(value) || 1));
    }
    if (field === 'soreness_level') {
      next.soreness_level = Math.max(1, Math.min(10, Number(value) || 1));
    }
    if (field === 'resting_heart_rate') {
      next.resting_heart_rate = value === null ? null : Math.max(30, Math.min(220, Number(value) || 0));
    }

    this.recoveryForm.set(next);
  }

  saveRecovery(): void {
    this.performanceService.saveRecoveryLog(this.recoveryForm()).subscribe({
      next: () => {
        this.performanceService.getRecoveryLogs().subscribe({
          next: (v) => {
            this.recoveryLogs.set(v);
            void this.renderCharts();
          },
          error: () => this.recoveryLogs.set([]),
        });
        this.showToast('Recovery log saved.');
      },
      error: () => this.showToast('Could not save recovery log.', 'error'),
    });
  }

  setWearableField<K extends keyof ReturnType<typeof this.wearableForm>>(field: K, value: ReturnType<typeof this.wearableForm>[K]): void {
    this.wearableForm.set({ ...this.wearableForm(), [field]: value });
  }

  syncWearableEntry(): void {
    const f = this.wearableForm();
    this.performanceService.ingestWearables({
      provider: f.provider,
      source: f.source,
      entries: [
        {
          date: f.date,
          steps: f.steps,
          active_minutes: f.active_minutes,
          calories_burned: f.calories_burned,
          avg_heart_rate: f.avg_heart_rate,
        },
      ],
    }).subscribe({
      next: () => {
        this.performanceService.getWearables().subscribe({
          next: (v) => {
            this.wearables.set(v);
            void this.renderCharts();
          },
          error: () => this.wearables.set([]),
        });
        this.showToast('Wearable snapshot synced.');
      },
      error: () => this.showToast('Could not sync wearable snapshot.', 'error'),
    });
  }

  setBulkImportText(value: string): void {
    this.bulkImportText.set(value);
  }

  setBulkImportFormat(value: 'json' | 'csv'): void {
    this.bulkImportFormat.set(value);
  }

  setPlannerDate(value: string): void {
    this.plannerDate.set(value);
  }

  setWearableDateFrom(value: string): void {
    const from = new Date(value);
    const to = new Date(this.wearableDateTo());
    const today = new Date();
    if (from > today) {
      this.showToast('Future dates not allowed', 'error');
      return;
    }
    if (from > to) {
      this.showToast('Start date must be before end date', 'error');
      return;
    }
    const diffDays = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) {
      this.wearableDateFrom.set(value);
      void this.renderCharts();
    } else {
      this.showToast('Max 7 day range allowed', 'error');
    }
  }

  setWearableDateTo(value: string): void {
    const today = new Date();
    const selectedDate = new Date(value);
    if (selectedDate > today) {
      this.showToast('Future dates not allowed', 'error');
      return;
    }
    const from = new Date(this.wearableDateFrom());
    if (selectedDate < from) {
      this.showToast('End date must be after start date', 'error');
      return;
    }
    const diffDays = Math.floor((selectedDate.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) {
      this.wearableDateTo.set(value);
      void this.renderCharts();
    } else {
      this.showToast('Max 7 day range allowed', 'error');
    }
  }

  setPlannerSelectedWeek(value: string): void {
    this.plannerSelectedWeek.set(value);
    this.plannerEventDate.set(value);
  }

  shiftPlannerWeek(delta: number): void {
    const start = this.weekStart(this.plannerSelectedWeek());
    start.setDate(start.getDate() + (delta * 7));
    const next = this.formatDate(start);
    this.setPlannerSelectedWeek(next);
  }

  setPlannerEventTitle(value: string): void {
    this.plannerEventTitle.set(value);
  }

  setPlannerEventDate(value: string): void {
    this.plannerEventDate.set(value);
  }

  setPlannerEventStart(value: string): void {
    this.plannerEventStart.set(value);
  }

  setPlannerEventEnd(value: string): void {
    this.plannerEventEnd.set(value);
  }

  setPlannerEventNotes(value: string): void {
    this.plannerEventNotes.set(value);
  }

  setPlannerEventRepeatWeekly(value: boolean): void {
    this.plannerEventRepeatWeekly.set(value);
  }

  addPlannerEvent(): void {
    const title = this.plannerEventTitle().trim();
    const date = this.plannerEventDate();
    const startTime = this.plannerEventStart();
    const endTime = this.plannerEventEnd();
    if (!title || !date || !startTime || !endTime) {
      this.showToast('Add title, date and time before saving the event.', 'error');
      return;
    }
    if (endTime <= startTime) {
      this.showToast('Event end time must be after the start time.', 'error');
      return;
    }

    const event: PlannerEvent = {
      id: Date.now(),
      title,
      date,
      startTime,
      endTime,
      notes: this.plannerEventNotes().trim(),
      repeatWeekly: this.plannerEventRepeatWeekly(),
    };

    this.plannerEvents.update((current) => [...current, event].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)));
    localStorage.setItem('performancePlannerEvents', JSON.stringify(this.plannerEvents()));
    this.plannerEventTitle.set('');
    this.plannerEventNotes.set('');
    this.plannerEventRepeatWeekly.set(false);
    this.showToast('Planner event added.');
  }

  removePlannerEvent(eventId: number): void {
    this.plannerEvents.update((current) => current.filter((event) => event.id !== eventId));
    localStorage.setItem('performancePlannerEvents', JSON.stringify(this.plannerEvents()));
  }

  loadPlannerEvents(): void {
    try {
      const saved = localStorage.getItem('performancePlannerEvents');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        this.plannerEvents.set(parsed);
      }
    } catch {
      this.plannerEvents.set([]);
    }
  }

  eventsForDay(dateValue: string): PlannerEvent[] {
    const targetDate = new Date(dateValue);
    const targetDow = targetDate.getDay();
    return this.plannerEvents().filter((event) => {
      const eventDate = new Date(event.date);
      if (event.repeatWeekly) {
        if (targetDate < eventDate) return false;
        return targetDow === eventDate.getDay();
      }
      return event.date === dateValue;
    });
  }

  getTodayDate(): string {
    return this.getTodayDateValue();
  }

  getPlannerDayIndex(): number {
    const plan = this.weeklyPlan();
    if (!plan) return 0;
    const selectedDate = this.plannerDate();
    return plan.items.findIndex((item) => item.date === selectedDate);
  }

  getScoreColor(score: number | null | undefined): string {
    if (!score) return '#666';
    if (score <= 40) return '#ef4444';
    if (score <= 65) return '#f59e0b';
    return '#22c55e';
  }

  onBulkFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isCsv = lowerName.endsWith('.csv');
    const isJson = lowerName.endsWith('.json');
    const mime = (file.type || '').toLowerCase();
    const validMimes = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'application/json', 'text/json'];
    const isMimeAllowed = !mime || validMimes.includes(mime);

    if ((!isCsv && !isJson) || !isMimeAllowed) {
      this.bulkImportFileName.set('');
      this.bulkImportText.set('');
      input.value = '';
      this.showToast('Only .csv or .json files are allowed.', 'error');
      return;
    }

    this.bulkImportFileName.set(file.name);
    this.bulkImportFormat.set(isCsv ? 'csv' : 'json');

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      this.bulkImportText.set(text);
    };
    reader.readAsText(file);
  }

  importBulkWearables(): void {
    const text = this.bulkImportText().trim();
    if (!text) {
      this.showToast('Paste or upload JSON/CSV data first.', 'error');
      return;
    }

    let entries: Array<{
      date: string;
      steps?: number | null;
      active_minutes?: number | null;
      calories_burned?: number | null;
      avg_heart_rate?: number | null;
    }> = [];

    try {
      entries = this.bulkImportFormat() === 'json' ? this.parseJsonEntries(text) : this.parseCsvEntries(text);
    } catch {
      this.showToast('Invalid wearable data format.', 'error');
      return;
    }

    if (!entries.length) {
      this.showToast('No valid entries found to import.', 'error');
      return;
    }

    const f = this.wearableForm();
    this.bulkImportLoading.set(true);
    this.performanceService.ingestWearables({
      provider: f.provider,
      source: f.source || 'bulk-import',
      entries,
      import_format: this.bulkImportFormat(),
      import_filename: this.bulkImportFileName() || undefined,
    }).subscribe({
      next: (summary) => {
        this.bulkImportLoading.set(false);
        this.performanceService.getWearables().subscribe({
          next: (v) => {
            this.wearables.set(v);
            void this.renderCharts();
          },
          error: () => this.wearables.set([]),
        });
        this.showToast(`Imported ${summary.processed} wearable entries.`);
      },
      error: () => {
        this.bulkImportLoading.set(false);
        this.showToast('Bulk wearable import failed.', 'error');
      },
    });
  }

  private parseJsonEntries(text: string) {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : parsed.entries;
    if (!Array.isArray(rows)) {
      throw new Error('Invalid JSON payload');
    }

    return rows
      .map((row: any) => ({
        date: String(row.date ?? '').slice(0, 10),
        steps: this.asOptionalInt(row.steps),
        active_minutes: this.asOptionalInt(row.active_minutes),
        calories_burned: this.asOptionalInt(row.calories_burned),
        avg_heart_rate: this.asOptionalInt(row.avg_heart_rate),
      }))
      .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date));
  }

  private parseCsvEntries(text: string) {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length < 2) {
      return [];
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const idx = (key: string) => headers.indexOf(key);

    const dateIdx = idx('date');
    const stepsIdx = idx('steps');
    const activeIdx = idx('active_minutes');
    const caloriesIdx = idx('calories_burned');
    const hrIdx = idx('avg_heart_rate');

    if (dateIdx < 0) {
      throw new Error('CSV must include date column');
    }

    const entries = [];
    for (const line of lines.slice(1)) {
      const cols = line.split(',').map((c) => c.trim());
      const date = String(cols[dateIdx] ?? '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

      entries.push({
        date,
        steps: this.asOptionalInt(stepsIdx >= 0 ? cols[stepsIdx] : null),
        active_minutes: this.asOptionalInt(activeIdx >= 0 ? cols[activeIdx] : null),
        calories_burned: this.asOptionalInt(caloriesIdx >= 0 ? cols[caloriesIdx] : null),
        avg_heart_rate: this.asOptionalInt(hrIdx >= 0 ? cols[hrIdx] : null),
      });
    }

    return entries;
  }

  private asOptionalInt(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private destroyCharts(): void {
    this.charts.forEach((chart) => chart.destroy());
    this.charts = [];
  }

  private async renderCharts(): Promise<void> {
    if (!this.chartsReady) return;

    const wearablesCanvas = this.wearablesChartRef?.nativeElement;
    if (!wearablesCanvas) return;

    this.destroyCharts();

    const chartModule = await import('chart.js/auto');
    const ChartClass = chartModule.Chart;

    // Filter wearables by date range
    const wearables = this.selectedWearables();

    const wearablesLabels = (wearables.length ? wearables : [{ date: 'No data' } as WearableSnapshot]).map((row) => row.date.slice(5));

    this.charts.push(new ChartClass(wearablesCanvas, {
      type: 'bar',
      data: {
        labels: wearablesLabels,
        datasets: [
          {
            label: 'Steps',
            data: (wearables.length ? wearables : [{ steps: 0 } as WearableSnapshot]).map((row) => row.steps ?? 0),
            backgroundColor: 'rgba(160, 132, 255, 0.55)',
            borderColor: 'rgba(160, 132, 255, 1)',
            borderWidth: 1,
            borderRadius: 8,
            yAxisID: 'y',
          },
          {
            label: 'Active min',
            data: (wearables.length ? wearables : [{ active_minutes: 0 } as WearableSnapshot]).map((row) => row.active_minutes ?? 0),
            borderColor: 'rgba(90, 200, 250, 1)',
            backgroundColor: 'rgba(90, 200, 250, 0.25)',
            type: 'line',
            tension: 0.35,
            fill: false,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#f1f3f6' } },
        },
        scales: {
          x: { ticks: { color: '#aab2c0' }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { beginAtZero: true, ticks: { color: '#aab2c0' }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y1: {
            beginAtZero: true,
            position: 'right',
            ticks: { color: '#aab2c0' },
            grid: { drawOnChartArea: false },
          },
        },
      },
    }));
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

