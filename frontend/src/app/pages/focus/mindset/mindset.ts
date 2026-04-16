import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MindsetService, JournalEntry } from '../../../core/mindset.service';
import { AuthService } from '../../../core/auth.service';
import { AppToastComponent } from '../../shared/components/toast/toast.component';
import { FocusHeaderComponent } from '../../shared/components/focus-header/focus-header.component';

@Component({
  selector: 'app-mindset',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, AppToastComponent, FocusHeaderComponent],
  templateUrl: './mindset.html',
  styleUrls: ['./mindset.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MindsetComponent implements OnInit {
  private mindsetService = inject(MindsetService);
  private authService = inject(AuthService);

  dailyQuote = signal<string>('');
  meditationTime = signal<number>(5);
  isMeditating = signal<boolean>(false);
  timeLeft = signal<number>(0);
  journalEntry = signal<string>('');
  journalEntries = signal<JournalEntry[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  toast = signal('');

  readonly isAuthenticated = computed(() => this.authService.isLogged());

  readonly meditationProgress = computed(() => {
    const total = this.meditationTime() * 60;
    if (!total) return 0;
    return Math.max(0, Math.min(100, (this.timeLeft() / total) * 100));
  });

  readonly formattedTimeLeft = computed(() => {
    const totalSeconds = this.timeLeft();
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  });

  readonly journalEntriesView = computed(() => {
    return this.journalEntries().map((entry) => ({
      ...entry,
      formattedDate: new Date(entry.created_at).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }));
  });

  private intervalId: any;

  quotes = [
    "The only way to do great work is to love what you do. - Steve Jobs",
    "Believe you can and you're halfway there. - Theodore Roosevelt",
    "The mind is everything. What you think you become. - Buddha",
    "Your only limit is you.",
    "Success is not final, failure is not fatal: It is the courage to continue that counts. - Winston Churchill",
    "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt"
  ];

  ngOnInit(): void {
    this.setRandomQuote();
    this.loadJournalEntries();
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  setRandomQuote(): void {
    const randomIndex = Math.floor(Math.random() * this.quotes.length);
    this.dailyQuote.set(this.quotes[randomIndex]);
  }

  setMeditationTime(value: number | string): void {
    const next = Number(value);
    if (Number.isNaN(next)) return;
    this.meditationTime.set(Math.max(1, Math.min(60, next)));
  }

  setJournalEntry(value: string): void {
    this.journalEntry.set(value);
  }

  startMeditation(): void {
    if (this.isMeditating()) return;
    this.isMeditating.set(true);
    this.timeLeft.set(this.meditationTime() * 60);
    this.intervalId = setInterval(() => {
      this.timeLeft.update(t => t - 1);
      if (this.timeLeft() <= 0) {
        this.stopMeditation();
      }
    }, 1000);
  }

  stopMeditation(): void {
    this.isMeditating.set(false);
    clearInterval(this.intervalId);
    this.timeLeft.set(0);
  }

  loadJournalEntries(): void {
    if (!this.authService.isLogged()) {
      this.showToast('Log in to sync your journal.');
      return;
    }

    this.isLoading.set(true);
    this.mindsetService.getJournalEntries().subscribe({
      next: (entries) => {
        this.journalEntries.set(entries);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.showToast(error.status === 401 ? 'Session expired. Log in again.' : 'Unable to load journal entries.');
      }
    });
  }

  saveJournalEntry(): void {
    if (!this.journalEntry().trim()) return;

    if (!this.authService.isLogged()) {
      this.showToast('Log in to save your journal.');
      return;
    }

    this.isSaving.set(true);
    this.mindsetService.createJournalEntry(this.journalEntry().trim()).subscribe({
      next: (newEntry) => {
        this.journalEntries.update(entries => [newEntry, ...entries]);
        this.journalEntry.set('');
        this.isSaving.set(false);
        this.showToast('Entry saved.');
      },
      error: (error) => {
        this.isSaving.set(false);
        this.showToast(error.status === 401 ? 'Session expired. Log in again.' : 'Unable to save entry.');
      }
    });
  }

  private showToast(message: string): void {
    this.toast.set(message);
    window.setTimeout(() => {
      if (this.toast() === message) {
        this.toast.set('');
      }
    }, 2600);
  }

  trackByJournalEntryId(_index: number, entry: JournalEntry): number {
    return entry.id;
  }
}
