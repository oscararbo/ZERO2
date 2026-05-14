import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerformanceService, RecoveryLog } from '../../../../../core/performance.service';

@Component({
  selector: 'app-recovery-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recovery-card.component.html',
  styleUrls: ['./recovery-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecoveryCardComponent implements OnInit {
  @Output() toastMessage = new EventEmitter<{ msg: string; type: 'success' | 'error' }>();

  private performanceService = inject(PerformanceService);

  recoveryLogs = signal<RecoveryLog[]>([]);

  recoveryForm = signal({
    sleep_hours: 7,
    stress_level: 5,
    soreness_level: 5,
    resting_heart_rate: null as number | null,
    steps: null as number | null,
  });

  readonly latestRecovery = computed(() =>
    [...this.recoveryLogs()].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  );
  readonly latestRecoveryScore = computed(() => this.latestRecovery()?.recovery_score ?? 0);
  readonly latestRecoverySleepHours = computed(() => this.latestRecovery()?.sleep_hours ?? 0);

  ngOnInit(): void {
    this.performanceService.getRecoveryLogs().subscribe({
      next: (v) => this.recoveryLogs.set(v),
      error: () => this.recoveryLogs.set([]),
    });
  }

  setRecoveryField<K extends keyof ReturnType<typeof this.recoveryForm>>(
    field: K,
    value: ReturnType<typeof this.recoveryForm>[K]
  ): void {
    const next = { ...this.recoveryForm(), [field]: value };
    if (field === 'sleep_hours') next.sleep_hours = Math.max(0, Math.min(24, Number(value) || 0));
    if (field === 'stress_level') next.stress_level = Math.max(1, Math.min(10, Number(value) || 1));
    if (field === 'soreness_level') next.soreness_level = Math.max(1, Math.min(10, Number(value) || 1));
    if (field === 'resting_heart_rate') {
      next.resting_heart_rate = value === null ? null : Math.max(30, Math.min(220, Number(value) || 0));
    }
    this.recoveryForm.set(next);
  }

  saveRecovery(): void {
    this.performanceService.saveRecoveryLog(this.recoveryForm()).subscribe({
      next: () => {
        this.performanceService.getRecoveryLogs().subscribe({
          next: (v) => this.recoveryLogs.set(v),
          error: () => this.recoveryLogs.set([]),
        });
        this.toastMessage.emit({ msg: 'Recovery log saved.', type: 'success' });
      },
      error: () => this.toastMessage.emit({ msg: 'Could not save recovery log.', type: 'error' }),
    });
  }

  getScoreColor(score: number | null | undefined): string {
    if (!score) return '#666';
    if (score <= 40) return '#ef4444';
    if (score <= 65) return '#f59e0b';
    return '#22c55e';
  }
}
