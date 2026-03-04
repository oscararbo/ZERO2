import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MindsetService, JournalEntry } from '../../../core/mindset.service';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-mindset',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './mindset.html',
  styleUrls: ['./mindset.scss'],
})
export class MindsetComponent implements OnInit {
  private mindsetService = inject(MindsetService);
  private authService = inject(AuthService);

  dailyQuote = signal<string>('');
  meditationTime = signal<number>(5); // minutes
  isMeditating = signal<boolean>(false);
  timeLeft = signal<number>(0);
  journalEntry = signal<string>('');
  journalEntries = signal<JournalEntry[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  private intervalId: any;

  get isAuthenticated(): boolean {
    return this.authService.isLogged();
  }

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

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  loadJournalEntries(): void {
    if (!this.authService.isLogged()) {
      console.warn('User not authenticated. Skipping journal entries load.');
      return;
    }

    this.isLoading.set(true);
    this.mindsetService.getJournalEntries().subscribe({
      next: (entries) => {
        this.journalEntries.set(entries);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading journal entries:', error);
        this.isLoading.set(false);
        if (error.status === 401) {
          console.warn('Authentication failed. Token may be expired.');
        } else if (error.status === 404) {
          console.warn('Journal API endpoint not found. Check server configuration.');
        }
      }
    });
  }

  saveJournalEntry(): void {
    if (!this.journalEntry().trim()) return;

    if (!this.authService.isLogged()) {
      console.warn('User not authenticated. Cannot save journal entry.');
      return;
    }

    this.isSaving.set(true);
    this.mindsetService.createJournalEntry(this.journalEntry().trim()).subscribe({
      next: (newEntry) => {
        this.journalEntries.update(entries => [newEntry, ...entries]);
        this.journalEntry.set('');
        this.isSaving.set(false);
      },
      error: (error) => {
        console.error('Error saving journal entry:', error);
        this.isSaving.set(false);
        if (error.status === 401) {
          console.warn('Authentication failed. Please log in again.');
        } else if (error.status === 404) {
          console.warn('Journal API endpoint not found. Check server configuration.');
        }
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
