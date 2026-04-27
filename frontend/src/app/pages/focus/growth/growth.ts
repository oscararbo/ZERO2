import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MindsetService, JournalEntry } from '../../../core/mindset.service';
import { AuthService } from '../../../core/auth.service';
import { TemplateService, UserTemplateVersion } from '../../../core/template.service';
import { FocusPageHeaderComponent } from '../../shared/components/focus-page-header/focus-page-header';

interface GrowthGoal {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
}

@Component({
  selector: 'app-growth',
  standalone: true,
  imports: [CommonModule, FormsModule, FocusPageHeaderComponent],
  templateUrl: './growth.html',
  styleUrls: ['./growth.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrowthComponent implements OnInit {
  private mindsetService = inject(MindsetService);
  private authService = inject(AuthService);
  private templateService = inject(TemplateService);
  private http = inject(HttpClient);

  dailyQuote = signal<string>('');
  newGoal = signal<string>('');
  goals = signal<GrowthGoal[]>([]);
  journalEntry = signal<string>('');
  journalEntries = signal<JournalEntry[]>([]);
  goalFilter = signal<'all' | 'active' | 'completed'>('all');
  loadingJournal = signal(false);
  savingJournal = signal(false);
  userTemplates = signal<UserTemplateVersion[]>([]);
  toast = signal('');

  readonly completedGoalsCount = computed(() => this.goals().filter((g) => g.completed).length);
  readonly activeGoalsCount = computed(() => this.goals().filter((g) => !g.completed).length);
  readonly totalGoalsCount = computed(() => this.goals().length);
  readonly journalEntriesCount = computed(() => this.journalEntries().length);
  readonly goalCompletionPercent = computed(() => {
    const total = this.totalGoalsCount();
    if (!total) return 0;
    return Math.round((this.completedGoalsCount() / total) * 100);
  });

  readonly weeklyMomentum = computed(() => {
    const score = (this.completedGoalsCount() * 18) + (this.activeGoalsCount() * 6) + Math.min(this.journalEntriesCount(), 7) * 8;
    return Math.max(0, Math.min(100, score));
  });

  readonly recentJournalPreview = computed(() => this.journalEntries()[0]?.content ?? 'No journal entries yet.');

  readonly filteredGoals = computed(() => {
    const filter = this.goalFilter();
    if (filter === 'active') {
      return this.goals().filter((goal) => !goal.completed);
    }
    if (filter === 'completed') {
      return this.goals().filter((goal) => goal.completed);
    }
    return this.goals();
  });

  readonly goalTemplates = [
    'Read 10 pages every day',
    '30 minutes deep work block daily',
    'Track one personal win before sleep',
  ];

  ngOnInit(): void {
    this.loadDailyQuote();
    this.loadGoals();
    this.loadJournalEntries();
    this.loadUserTemplates();
  }

  private readonly QUOTE_CACHE_KEY = 'zero_daily_quote_growth';

  loadDailyQuote(): void {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const cached = localStorage.getItem(this.QUOTE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.date === today) { this.dailyQuote.set(parsed.text); return; }
      }
    } catch { /* ignore */ }
    this.http.get<any[]>('https://api.quotable.io/quotes/random?tags=success|personal-development&limit=1').subscribe({
      next: (res) => {
        const q = Array.isArray(res) ? res[0] : res;
        const text = q?.content ? `${q.content}${q.author ? ' — ' + q.author : ''}` : '';
        if (text) {
          this.dailyQuote.set(text);
          try { localStorage.setItem(this.QUOTE_CACHE_KEY, JSON.stringify({ date: today, text })); } catch { /* ignore */ }
        }
      },
      error: () => {},
    });
  }

  loadUserTemplates(): void {
    if (!this.authService.isLogged()) {
      this.userTemplates.set([]);
      return;
    }

    this.templateService.getTemplates('growth').subscribe({
      next: (items) => this.userTemplates.set(items),
      error: () => this.userTemplates.set([]),
    });
  }

  loadGoals(): void {
    const saved = localStorage.getItem('growthGoals');
    if (saved) {
      const parsed = JSON.parse(saved);
      this.goals.set(parsed.map((g: any) => ({ ...g, createdAt: new Date(g.createdAt) })));
    }
  }

  loadJournalEntries(): void {
    if (!this.authService.isLogged()) {
      return;
    }

    this.loadingJournal.set(true);
    this.mindsetService.getJournalEntries().subscribe({
      next: (entries) => {
        this.journalEntries.set(entries);
        this.loadingJournal.set(false);
      },
      error: () => {
        this.loadingJournal.set(false);
        this.showToast('Unable to load journal entries.');
      }
    });
  }

  setNewGoal(value: string): void {
    this.newGoal.set(value);
  }

  setJournalEntry(value: string): void {
    this.journalEntry.set(value);
  }

  setGoalFilter(value: 'all' | 'active' | 'completed'): void {
    this.goalFilter.set(value);
  }

  useGoalTemplate(template: string): void {
    this.newGoal.set(template);
  }

  useCustomTemplate(template: UserTemplateVersion): void {
    const title = String(template.payload?.['title'] ?? '');
    if (title) this.newGoal.set(title);
  }

  saveCurrentGoalAsTemplate(): void {
    const title = this.newGoal().trim();
    if (!title) {
      this.showToast('Write a goal first to save a template.');
      return;
    }
    if (!this.authService.isLogged()) {
      this.showToast('Log in to save templates.');
      return;
    }

    const key = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
    this.templateService.saveTemplate('growth', title, { title }, key).subscribe({
      next: () => {
        this.showToast('Template saved.');
        this.loadUserTemplates();
      },
      error: () => this.showToast('Could not save template.'),
    });
  }

  addGoal(): void {
    if (this.newGoal().trim()) {
      const goal: GrowthGoal = {
        id: Date.now(),
        title: this.newGoal().trim(),
        completed: false,
        createdAt: new Date()
      };
      this.goals.update(g => [...g, goal]);
      this.newGoal.set('');
      this.saveGoals();
      this.showToast('Goal added.');
    }
  }

  toggleGoal(id: number): void {
    this.goals.update(g =>
      g.map(goal =>
        goal.id === id ? { ...goal, completed: !goal.completed } : goal
      )
    );
    this.saveGoals();
  }

  removeGoal(id: number): void {
    this.goals.update(g => g.filter(goal => goal.id !== id));
    this.saveGoals();
    this.showToast('Goal removed.');
  }

  saveGoals(): void {
    localStorage.setItem('growthGoals', JSON.stringify(this.goals()));
  }

  addJournalEntry(): void {
    if (!this.journalEntry().trim()) return;
    if (!this.authService.isLogged()) {
      this.showToast('Log in to save your journal.');
      return;
    }

    this.savingJournal.set(true);
    this.mindsetService.createJournalEntry(this.journalEntry().trim()).subscribe({
      next: (entry) => {
        this.journalEntries.update(e => [entry, ...e]);
        this.journalEntry.set('');
        this.savingJournal.set(false);
        this.showToast('Entry saved.');
      },
      error: () => {
        this.savingJournal.set(false);
        this.showToast('Unable to save entry.');
      }
    });
  }

  trackByGoalId(_index: number, goal: GrowthGoal): number {
    return goal.id;
  }

  trackByEntryId(_index: number, entry: JournalEntry): number {
    return entry.id;
  }

  private showToast(message: string): void {
    this.toast.set(message);
    window.setTimeout(() => {
      if (this.toast() === message) {
        this.toast.set('');
      }
    }, 2400);
  }
}
