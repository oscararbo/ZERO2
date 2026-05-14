import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerformanceService, WearableSnapshot } from '../../../../../core/performance.service';
import type { Chart } from 'chart.js/auto';

@Component({
  selector: 'app-wearables-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './wearables-card.component.html',
  styleUrls: ['./wearables-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WearablesCardComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() toastMessage = new EventEmitter<{ msg: string; type: 'success' | 'error' }>();
  @ViewChild('wearablesChart') wearablesChartRef?: ElementRef<HTMLCanvasElement>;

  private performanceService = inject(PerformanceService);
  private charts: Chart[] = [];
  private chartsReady = false;

  wearables = signal<WearableSnapshot[]>([]);
  wearableDateFrom = signal<string>(this.getDateNDaysAgo(6));
  wearableDateTo = signal<string>(this.getTodayDateValue());

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

  readonly selectedWearables = computed(() => {
    const from = this.wearableDateFrom();
    const to = this.wearableDateTo();
    return this.wearables()
      .filter((row) => row.date >= from && row.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date));
  });

  readonly wearablesSummary = computed(() => {
    const items = this.selectedWearables();
    const steps = items.map((row) => row.steps ?? 0);
    const active = items.map((row) => row.active_minutes ?? 0);
    const heart = items.map((row) => row.avg_heart_rate ?? 0).filter((v) => v > 0);
    const totalSteps = steps.reduce((s, v) => s + v, 0);
    return {
      totalSteps,
      averageSteps: items.length ? Math.round(totalSteps / items.length) : 0,
      averageActiveMinutes: items.length ? Math.round(active.reduce((s, v) => s + v, 0) / items.length) : 0,
      averageHeartRate: heart.length ? Math.round(heart.reduce((s, v) => s + v, 0) / heart.length) : 0,
    };
  });

  ngOnInit(): void {
    this.performanceService.getWearables().subscribe({
      next: (v) => {
        this.wearables.set(v);
        void this.renderCharts();
      },
      error: () => this.wearables.set([]),
    });
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    void this.renderCharts();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  getTodayDate(): string {
    return this.getTodayDateValue();
  }

  setWearableDateFrom(value: string): void {
    const from = new Date(value);
    const to = new Date(this.wearableDateTo());
    const today = new Date();
    if (from > today) { this.toastMessage.emit({ msg: 'Future dates not allowed', type: 'error' }); return; }
    if (from > to) { this.toastMessage.emit({ msg: 'Start date must be before end date', type: 'error' }); return; }
    const diffDays = Math.floor((to.getTime() - from.getTime()) / 86400000);
    if (diffDays > 7) { this.toastMessage.emit({ msg: 'Max 7 day range allowed', type: 'error' }); return; }
    this.wearableDateFrom.set(value);
    void this.renderCharts();
  }

  setWearableDateTo(value: string): void {
    const today = new Date();
    const selected = new Date(value);
    if (selected > today) { this.toastMessage.emit({ msg: 'Future dates not allowed', type: 'error' }); return; }
    const from = new Date(this.wearableDateFrom());
    if (selected < from) { this.toastMessage.emit({ msg: 'End date must be after start date', type: 'error' }); return; }
    const diffDays = Math.floor((selected.getTime() - from.getTime()) / 86400000);
    if (diffDays > 7) { this.toastMessage.emit({ msg: 'Max 7 day range allowed', type: 'error' }); return; }
    this.wearableDateTo.set(value);
    void this.renderCharts();
  }

  syncWearableEntry(): void {
    const f = this.wearableForm();
    this.performanceService.ingestWearables({
      provider: f.provider,
      source: f.source,
      entries: [{ date: f.date, steps: f.steps, active_minutes: f.active_minutes, calories_burned: f.calories_burned, avg_heart_rate: f.avg_heart_rate }],
    }).subscribe({
      next: () => {
        this.performanceService.getWearables().subscribe({
          next: (v) => { this.wearables.set(v); void this.renderCharts(); },
          error: () => this.wearables.set([]),
        });
        this.toastMessage.emit({ msg: 'Wearable snapshot synced.', type: 'success' });
      },
      error: () => this.toastMessage.emit({ msg: 'Could not sync wearable snapshot.', type: 'error' }),
    });
  }

  onBulkFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const isCsv = lowerName.endsWith('.csv');
    const isJson = lowerName.endsWith('.json');
    if (!isCsv && !isJson) {
      this.toastMessage.emit({ msg: 'Only .csv or .json files are allowed.', type: 'error' });
      input.value = '';
      return;
    }
    this.bulkImportFileName.set(file.name);
    this.bulkImportFormat.set(isCsv ? 'csv' : 'json');
    const reader = new FileReader();
    reader.onload = () => this.bulkImportText.set(String(reader.result ?? ''));
    reader.readAsText(file);
  }

  importBulkWearables(): void {
    const text = this.bulkImportText().trim();
    if (!text) { this.toastMessage.emit({ msg: 'Paste or upload JSON/CSV data first.', type: 'error' }); return; }
    let entries: any[];
    try {
      entries = this.bulkImportFormat() === 'json' ? this.parseJsonEntries(text) : this.parseCsvEntries(text);
    } catch (e) {
      this.toastMessage.emit({ msg: `Parse error: ${(e as Error).message}`, type: 'error' });
      return;
    }
    const f = this.wearableForm();
    this.bulkImportLoading.set(true);
    this.performanceService.ingestWearables({
      provider: f.provider, source: f.source || 'bulk-import', entries,
      import_format: this.bulkImportFormat(), import_filename: this.bulkImportFileName() || undefined,
    }).subscribe({
      next: (summary) => {
        this.bulkImportLoading.set(false);
        this.performanceService.getWearables().subscribe({
          next: (v) => { this.wearables.set(v); void this.renderCharts(); },
          error: () => this.wearables.set([]),
        });
        this.toastMessage.emit({ msg: `Imported ${summary.processed} wearable entries.`, type: 'success' });
      },
      error: () => { this.bulkImportLoading.set(false); this.toastMessage.emit({ msg: 'Bulk wearable import failed.', type: 'error' }); },
    });
  }

  private getTodayDateValue(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getDateNDaysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }

  private parseJsonEntries(text: string): any[] {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : parsed.entries;
    if (!Array.isArray(rows)) throw new Error('Invalid JSON payload');
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

  private parseCsvEntries(text: string): any[] {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const idx = (k: string) => headers.indexOf(k);
    const dateIdx = idx('date');
    if (dateIdx < 0) throw new Error('CSV must include date column');
    return lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim());
      const date = String(cols[dateIdx] ?? '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
      return {
        date,
        steps: this.asOptionalInt(idx('steps') >= 0 ? cols[idx('steps')] : null),
        active_minutes: this.asOptionalInt(idx('active_minutes') >= 0 ? cols[idx('active_minutes')] : null),
        calories_burned: this.asOptionalInt(idx('calories_burned') >= 0 ? cols[idx('calories_burned')] : null),
        avg_heart_rate: this.asOptionalInt(idx('avg_heart_rate') >= 0 ? cols[idx('avg_heart_rate')] : null),
      };
    }).filter(Boolean);
  }

  private asOptionalInt(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = parseInt(String(value), 10);
    return isFinite(parsed) ? parsed : null;
  }

  private destroyCharts(): void {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
  }

  private async renderCharts(): Promise<void> {
    if (!this.chartsReady) return;
    const canvas = this.wearablesChartRef?.nativeElement;
    if (!canvas) return;
    this.destroyCharts();
    const { Chart } = await import('chart.js/auto');
    const wearables = this.selectedWearables();
    const labels = (wearables.length ? wearables : [{ date: 'No data' } as WearableSnapshot]).map((r) => r.date.slice(5));
    this.charts.push(new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Steps', data: (wearables.length ? wearables : [{ steps: 0 } as WearableSnapshot]).map((r) => r.steps ?? 0), backgroundColor: 'rgba(160,132,255,0.55)', borderColor: 'rgba(160,132,255,1)', borderWidth: 1, borderRadius: 8, yAxisID: 'y' },
          { label: 'Active min', data: (wearables.length ? wearables : [{ active_minutes: 0 } as WearableSnapshot]).map((r) => r.active_minutes ?? 0), borderColor: 'rgba(90,200,250,1)', backgroundColor: 'rgba(90,200,250,0.25)', type: 'line', tension: 0.35, fill: false, yAxisID: 'y1' } as any,
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#f1f3f6' } } },
        scales: {
          x: { ticks: { color: '#aab2c0' }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { beginAtZero: true, ticks: { color: '#aab2c0' }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y1: { beginAtZero: true, position: 'right', ticks: { color: '#aab2c0' }, grid: { drawOnChartArea: false } },
        },
      },
    }));
  }
}
