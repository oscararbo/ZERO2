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
  @ViewChild('recoveryChart') recoveryChartRef?: ElementRef<HTMLCanvasElement>;

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

  private charts: Chart[] = [];
  private chartsReady = false;

  readonly plannerCompletion = computed(() => {
    const p = this.weeklyPlan();
    if (!p || p.items.length === 0) return 0;
    return Math.round((p.completed_items / p.items.length) * 100);
  });

  readonly latestRecovery = computed(() => this.recoveryLogs()[0] ?? null);

  readonly wearablesSummary = computed(() => {
    const items = this.wearables();
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

  ngOnInit(): void {
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
    this.recoveryForm.set({ ...this.recoveryForm(), [field]: value });
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

  queueVideoSync(): void {
    this.performanceService.enqueueVideoSync(false).subscribe({
      next: () => this.showToast('Video sync job queued.'),
      error: () => this.showToast('Could not queue video sync — service unavailable.', 'error'),
    });
  }

  private destroyCharts(): void {
    this.charts.forEach((chart) => chart.destroy());
    this.charts = [];
  }

  private async renderCharts(): Promise<void> {
    if (!this.chartsReady) return;

    const wearablesCanvas = this.wearablesChartRef?.nativeElement;
    const recoveryCanvas = this.recoveryChartRef?.nativeElement;
    if (!wearablesCanvas || !recoveryCanvas) return;

    this.destroyCharts();

    const chartModule = await import('chart.js/auto');
    const ChartClass = chartModule.Chart;

    const wearables = [...this.wearables()].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
    const recovery = [...this.recoveryLogs()].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

    const wearablesLabels = (wearables.length ? wearables : [{ date: 'No data' } as WearableSnapshot]).map((row) => row.date.slice(5));
    const recoveryLabels = (recovery.length ? recovery : [{ date: 'No data' } as RecoveryLog]).map((row) => row.date.slice(5));

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

    this.charts.push(new ChartClass(recoveryCanvas, {
      type: 'line',
      data: {
        labels: recoveryLabels,
        datasets: [
          {
            label: 'Recovery score',
            data: (recovery.length ? recovery : [{ recovery_score: 0 } as RecoveryLog]).map((row) => row.recovery_score),
            borderColor: 'rgba(255, 196, 61, 1)',
            backgroundColor: 'rgba(255, 196, 61, 0.18)',
            tension: 0.35,
            fill: true,
          },
          {
            label: 'Sleep hours',
            data: (recovery.length ? recovery : [{ sleep_hours: 0 } as RecoveryLog]).map((row) => row.sleep_hours),
            borderColor: 'rgba(120, 255, 214, 1)',
            backgroundColor: 'rgba(120, 255, 214, 0.14)',
            tension: 0.3,
            fill: false,
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

