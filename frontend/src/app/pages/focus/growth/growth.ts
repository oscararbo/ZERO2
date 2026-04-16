import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MindsetService, JournalEntry } from '../../../core/mindset.service';
import { AuthService } from '../../../core/auth.service';
import { AppToastComponent } from '../../shared/components/toast/toast.component';
import { FocusHeaderComponent } from '../../shared/components/focus-header/focus-header.component';

interface GrowthGoal {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
}

@Component({
  selector: 'app-growth',
  standalone: true,
  imports: [CommonModule, FormsModule, AppToastComponent, FocusHeaderComponent],
  templateUrl: './growth.html',
  styleUrls: ['./growth.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrowthComponent implements OnInit {
  private mindsetService = inject(MindsetService);
  private authService = inject(AuthService);

  dailyQuote = signal<string>('');
  newGoal = signal<string>('');
  goals = signal<GrowthGoal[]>([]);
  journalEntry = signal<string>('');
  journalEntries = signal<JournalEntry[]>([]);
  loadingJournal = signal(false);
  savingJournal = signal(false);
  toast = signal('');

  readonly completedGoalsCount = computed(() => this.goals().filter((g) => g.completed).length);
  readonly totalGoalsCount = computed(() => this.goals().length);
  readonly journalEntriesCount = computed(() => this.journalEntries().length);

  quotes = [
    "Growth is the only evidence of life. - John Henry Newman",
    "What you get by achieving your goals is not as important as what you become by achieving your goals. - Zig Ziglar",
    "The journey of a thousand miles begins with one step. - Lao Tzu",
    "Personal growth is not a matter of learning new information but of unlearning old limits. - Alan Cohen",
    "Change is the law of life. And those who look only to the past or present are certain to miss the future. - John F. Kennedy",
    "The only way to make sense out of change is to plunge into it, move with it, and join the dance. - Alan Watts"
  ];

  ngOnInit(): void {
    this.setRandomQuote();
    this.loadGoals();
    this.loadJournalEntries();
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

  setRandomQuote(): void {
    const randomIndex = Math.floor(Math.random() * this.quotes.length);
    this.dailyQuote.set(this.quotes[randomIndex]);
  }

  setNewGoal(value: string): void {
    this.newGoal.set(value);
  }

  setJournalEntry(value: string): void {
    this.journalEntry.set(value);
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
