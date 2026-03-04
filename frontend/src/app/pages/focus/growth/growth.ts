import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface GrowthGoal {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
}

@Component({
  selector: 'app-growth',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './growth.html',
  styleUrls: ['./growth.scss'],
})
export class GrowthComponent implements OnInit {
  dailyQuote = signal<string>('');
  newGoal = signal<string>('');
  goals = signal<GrowthGoal[]>([]);
  journalEntry = signal<string>('');
  journalEntries = signal<string[]>([]);

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
    const saved = localStorage.getItem('growthJournal');
    if (saved) {
      this.journalEntries.set(JSON.parse(saved));
    }
  }

  setRandomQuote(): void {
    const randomIndex = Math.floor(Math.random() * this.quotes.length);
    this.dailyQuote.set(this.quotes[randomIndex]);
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
  }

  saveGoals(): void {
    localStorage.setItem('growthGoals', JSON.stringify(this.goals()));
  }

  addJournalEntry(): void {
    if (this.journalEntry().trim()) {
      this.journalEntries.update(e => [...e, this.journalEntry().trim()]);
      this.journalEntry.set('');
      this.saveJournalEntries();
    }
  }

  saveJournalEntries(): void {
    localStorage.setItem('growthJournal', JSON.stringify(this.journalEntries()));
  }

  get completedGoalsCount(): number {
    return this.goals().filter(g => g.completed).length;
  }

  get totalGoalsCount(): number {
    return this.goals().length;
  }

  get journalEntriesCount(): number {
    return this.journalEntries().length;
  }
}
