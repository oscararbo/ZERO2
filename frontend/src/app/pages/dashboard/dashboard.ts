import { Component, AfterViewInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Chart } from 'chart.js/auto';
import { AuthService } from '../../core/auth.service';
import { ProfileService, Profile } from '../../core/profile.service';
import { ExerciseService } from '../../core/exercise.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private profiles = inject(ProfileService);
  private exercises = inject(ExerciseService);

  progressCanvas: HTMLCanvasElement | null = null;
  menuOpen = signal(false);

  name = signal('User');
  weeklyGoal = signal(3);
  loadingProfile = signal(true);

  focus = signal<{ label: string; link: string }[]>([]);

  private chart: Chart | null = null;

  ngAfterViewInit() {
    this.progressCanvas = document.querySelector('canvas[id="progressCanvas"]') as HTMLCanvasElement;
    const local = this.profiles.getLocal();
    if (local) this.applyProfile(local);

    this.profiles.getProfile().subscribe({
      next: (p) => {
        this.applyProfile(p);
        this.loadingProfile.set(false);
        this.createChart();
        this.refreshChart();
      },
      error: () => {
        this.loadingProfile.set(false);
        this.createChart();
      }
    });
  }

  ngOnDestroy() {
    this.destroyChart();
  }

  toggleMenu() {
    this.menuOpen.set(!this.menuOpen());
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  goProfile() {
    this.closeMenu();
    this.router.navigateByUrl('/profile/edit');
  }

  logout() {
    this.closeMenu();
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  private applyProfile(p: Profile) {
    this.name.set(p.full_name || 'User');
    this.weeklyGoal.set(p.weekly_goal || 3);

    const items = [
      { key: 'sport', label: 'Sport', link: '/sport' },
      { key: 'food', label: 'Food', link: '/food' },
      { key: 'mindset', label: 'Mindset', link: '/mindset' },
      { key: 'growth', label: 'Growth', link: '/growth' },
      { key: 'challenges', label: 'Challenges', link: '/challenges' },
    ] as const;

    const selected = items
      .filter(i => (p as any)[i.key] === true)
      .map(i => ({ label: i.label, link: i.link }));

    this.focus.set(selected.length ? selected : items.slice(0, 3).map(i => ({ label: i.label, link: i.link })));
  }

  private createChart() {
    if (!this.progressCanvas) return;

    const ctx = this.progressCanvas.getContext('2d');
    if (!ctx) return;

    const labels = this.getLast7Days();
    const data = [0, 0, 0, 0, 0, 0, 0];

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Exercises Completed',
            data,
            backgroundColor: '#9aa0a6',
            borderRadius: 8,
            borderSkipped: false,
          }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: 'rgba(255,255,255,0.65)' }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: 'rgba(255,255,255,0.65)' }
          }
        }
      }
    });
  }

  private refreshChart() {
    if (!this.chart) return;
    
    this.exercises.getSessions().subscribe({
      next: (sessions) => {
        const labels = this.getLast7Days();
        const data = this.getExercisesCountByDay(sessions, labels.length);
        this.chart!.data.labels = labels;
        this.chart!.data.datasets[0].data = data;
        this.chart!.update();
      },
      error: () => {
        this.chart!.data.datasets[0].data = [0, 0, 0, 0, 0, 0, 0];
        this.chart!.update();
      }
    });
  }

  private destroyChart() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  private getLast7Days(): string[] {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toLocaleDateString('es-ES', { weekday: 'short' }));
    }
    return days;
  }

  private getExercisesCountByDay(sessions: any[], daysCount: number): number[] {
    const counts = new Array(daysCount).fill(0);
    const today = new Date();

    sessions.forEach((session) => {
      const sessionDate = new Date(session.date);
      const daysAgo = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysAgo >= 0 && daysAgo < daysCount) {
        const index = daysCount - 1 - daysAgo;
        counts[index] = (counts[index] || 0) + session.completed_exercises;
      }
    });

    return counts;
  }
}
