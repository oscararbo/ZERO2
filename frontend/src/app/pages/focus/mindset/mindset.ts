import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MindsetService, JournalEntry } from '../../../core/mindset.service';
import { AuthService } from '../../../core/auth.service';
import { TemplateService } from '../../../core/template.service';
import { FocusPageHeaderComponent } from '../../shared/components/focus-page-header/focus-page-header';

@Component({
  selector: 'app-mindset',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, FocusPageHeaderComponent],
  templateUrl: './mindset.html',
  styleUrls: ['./mindset.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MindsetComponent implements OnInit {
  private mindsetService = inject(MindsetService);
  private authService = inject(AuthService);
  private templateService = inject(TemplateService);
  private http = inject(HttpClient);

  dailyQuote = signal<string>('');
  quoteLoading = signal<boolean>(false);
  meditationTime = signal<number>(5);
  isMeditating = signal<boolean>(false);
  timeLeft = signal<number>(0);
  journalEntry = signal<string>('');
  journalEntries = signal<JournalEntry[]>([]);
  moodToday = signal<number | null>(null);
  moodHistory = signal<Array<{ date: string; value: number }>>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  toast = signal('');
  readonly meditationPresets = [5, 10, 15, 20];
  readonly breathingSteps = [
    'Inhale deeply for 4 seconds',
    'Hold for 4 seconds',
    'Exhale slowly for 6 seconds',
    'Pause for 2 seconds and repeat 4 rounds',
  ];

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

  readonly moodAverage = computed(() => {
    const history = this.moodHistory();
    if (!history.length) return null;
    const avg = history.reduce((acc, item) => acc + item.value, 0) / history.length;
    return Number(avg.toFixed(1));
  });

  readonly moodTrendLabel = computed(() => {
    const average = this.moodAverage();
    if (average === null) return 'No data yet';
    if (average >= 4.2) return 'Very positive';
    if (average >= 3.4) return 'Stable';
    if (average >= 2.6) return 'Needs recovery';
    return 'Low energy';
  });

  private intervalId: any;
  private readonly QUOTE_CACHE_KEY = 'zero_daily_quote_mindset';
  private readonly fallbackQuotes = [
    'Small progress each day compounds into meaningful change. — ZERO',
    'Discipline is choosing what you want most over what you want now. — Abraham Lincoln',
    'You do not rise to the level of your goals. You fall to the level of your systems. — James Clear',
    'Consistency beats intensity when intensity is rare. — ZERO',
    'What you repeat daily becomes your identity. — ZERO',
  ];

  ngOnInit(): void {
    this.loadDailyQuote();
    this.loadMoodHistory();
    this.loadJournalEntries();
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  loadDailyQuote(): void {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const cached = localStorage.getItem(this.QUOTE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.date === today) {
          this.dailyQuote.set(parsed.text);
          this.quoteLoading.set(false);
          return;
        }
      }
    } catch { /* ignore */ }

    this.quoteLoading.set(true);
    this.http.get<any[]>('https://api.quotable.io/quotes/random?tags=inspirational|motivational&limit=1').subscribe({
      next: (res) => {
        const q = Array.isArray(res) ? res[0] : res;
        const text = q?.content ? `${q.content}${q.author ? ' — ' + q.author : ''}` : '';
        if (text) {
          this.setDailyQuote(text, today);
          this.quoteLoading.set(false);
          return;
        }
        this.setDailyQuote(this.pickFallbackQuote(today), today);
        this.quoteLoading.set(false);
      },
      error: () => {
        this.setDailyQuote(this.pickFallbackQuote(today), today);
        this.quoteLoading.set(false);
      },
    });
  }

  private setDailyQuote(text: string, date: string): void {
    this.dailyQuote.set(text);
    try {
      localStorage.setItem(this.QUOTE_CACHE_KEY, JSON.stringify({ date, text }));
    } catch {
      /* ignore */
    }
  }

  private pickFallbackQuote(seedDate: string): string {
    const hash = seedDate.split('-').reduce((acc, part) => acc + Number(part), 0);
    return this.fallbackQuotes[hash % this.fallbackQuotes.length];
  }

  setMeditationTime(value: number | string): void {
    const next = Number(value);
    if (Number.isNaN(next)) return;
    this.meditationTime.set(Math.max(1, Math.min(60, next)));
  }

  applyMeditationPreset(minutes: number): void {
    this.setMeditationTime(minutes);
  }

  setMood(value: number): void {
    this.moodToday.set(Math.max(1, Math.min(5, value)));
  }

  saveMood(): void {
    const mood = this.moodToday();
    if (!mood) return;

    if (!this.authService.isLogged()) {
      this.showToast('Log in to sync mood history.');
      return;
    }

    this.templateService.saveMood(mood).subscribe({
      next: (entry) => {
        const next = [...this.moodHistory()];
        const existingIndex = next.findIndex((item) => item.date === entry.date);
        if (existingIndex >= 0) {
          next[existingIndex] = { date: entry.date, value: entry.value };
        } else {
          next.unshift({ date: entry.date, value: entry.value });
        }
        this.moodHistory.set(next.slice(0, 14));
        this.showToast('Mood check-in saved.');
      },
      error: () => this.showToast('Could not sync mood check-in.'),
    });
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

  private loadMoodHistory(): void {
    if (!this.authService.isLogged()) {
      this.moodHistory.set([]);
      return;
    }

    this.templateService.getMoodEntries(14).subscribe({
      next: (entries) => {
        this.moodHistory.set(entries.map((entry) => ({ date: entry.date, value: entry.value })));
      },
      error: () => {
        this.moodHistory.set([]);
      },
    });
  }

  trackByJournalEntryId(_index: number, entry: JournalEntry): number {
    return entry.id;
  }
}
