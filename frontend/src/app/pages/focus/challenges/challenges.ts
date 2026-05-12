import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import {
  ChallengeService,
  Challenge,
  ChallengeCategory,
  MyParticipation,
  ChallengeUpdate,
  InAppReminder,
  UserBadge,
  ChallengeAnalytics,
  PaginatedLeaderboardResponse,
  PaginatedUpdatesResponse,
} from '../../../core/challenge.service';
import { AuthService } from '../../../core/auth.service';
import { TemplateService, UserTemplateVersion } from '../../../core/template.service';
import { FocusPageHeaderComponent } from '../../shared/components/focus-page-header/focus-page-header';
import { LoadMoreButtonComponent } from '../../shared/components/load-more-button/load-more-button.component';
import { UiSelectComponent, UiSelectOption } from '../../shared/components/ui-select/ui-select.component';

type ChallengeViewModel = Challenge & {
  isOwner: boolean;
  isParticipating: boolean;
  progressPercent: number;
  categoryLabel: string;
  deadlineLabel: string;
};

@Component({
  selector: 'app-challenges',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ScrollingModule,
    FocusPageHeaderComponent,
    LoadMoreButtonComponent,
    UiSelectComponent,
  ],
  templateUrl: './challenges.html',
  styleUrls: ['./challenges.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChallengesComponent implements OnInit {
  private challengeService = inject(ChallengeService);
  private authService = inject(AuthService);
  private templateService = inject(TemplateService);
  private fb = inject(FormBuilder);

  challenges = signal<Challenge[]>([]);
  loading = signal(true);
  saving = signal(false);
  toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  activeTab = signal<'all' | 'mine' | 'joined' | 'create'>('all');
  activeFilter = signal<ChallengeCategory | 'all'>('all');
  searchTerm = signal('');
  sortMode = signal<'recent' | 'popular' | 'completed'>('recent');

  reminders = signal<InAppReminder[]>([]);
  unreadReminders = signal(0);
  remindersOpen = signal(false);
  remindersPage = signal(1);
  remindersHasNext = signal(false);
  remindersLoading = signal(false);
  remindersUnreadOnly = signal(false);

  badges = signal<UserBadge[]>([]);
  analytics = signal<ChallengeAnalytics | null>(null);
  loadingInsights = signal(true);
  userTemplates = signal<UserTemplateVersion[]>([]);

  expandedId = signal<number | null>(null);
  progressEditing = signal<number | null>(null);
  progressValue = signal(0);
  progressNotes = signal('');
  quickUpdatingId = signal<number | null>(null);

  leaderboardByChallenge = signal<Partial<Record<number, MyParticipation[]>>>({});
  leaderboardPageByChallenge = signal<Partial<Record<number, number>>>({});
  leaderboardHasNextByChallenge = signal<Partial<Record<number, boolean>>>({});
  loadingLeaderboardByChallenge = signal<Partial<Record<number, boolean>>>({});
  updatesByChallenge = signal<Partial<Record<number, ChallengeUpdate[]>>>({});
  updateDraftByChallenge = signal<Partial<Record<number, string>>>({});
  updatesPageByChallenge = signal<Partial<Record<number, number>>>({});
  updatesHasNextByChallenge = signal<Partial<Record<number, boolean>>>({});
  loadingUpdatesByChallenge = signal<Partial<Record<number, boolean>>>({});

  readonly categories: ReadonlyArray<{ key: ChallengeCategory | 'all'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'sport', label: 'Sport' },
    { key: 'nutrition', label: 'Nutrition' },
    { key: 'mindset', label: 'Mindset' },
    { key: 'growth', label: 'Growth' },
    { key: 'general', label: 'General' },
  ];

  readonly sortOptions: UiSelectOption[] = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'completed', label: 'Most Completed' },
  ];

  readonly categoryOptions: UiSelectOption[] = [
    { value: 'sport', label: 'Sport' },
    { value: 'nutrition', label: 'Nutrition' },
    { value: 'mindset', label: 'Mindset' },
    { value: 'growth', label: 'Growth' },
    { value: 'general', label: 'General' },
  ];

  readonly categoryLabelByKey: Partial<Record<string, string>> = {
    all: 'All',
    sport: 'Sport',
    nutrition: 'Nutrition',
    mindset: 'Mindset',
    growth: 'Growth',
    general: 'General',
  };

  readonly badgeIconByCode: Partial<Record<string, string>> = {
    first_join: '•',
    consistent_3: '◦',
    finisher_1: '◆',
    finisher_5: '◈',
  };

  createForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    description: [''],
    category: ['general' as ChallengeCategory, Validators.required],
    duration_days: [7, [Validators.required, Validators.min(1), Validators.max(365)]],
    target_count: [1, [Validators.required, Validators.min(1), Validators.max(1000)]],
  });

  readonly challengeTemplates: ReadonlyArray<{
    title: string;
    description: string;
    category: ChallengeCategory;
    duration_days: number;
    target_count: number;
  }> = [
    {
      title: '14-Day Push-Up Streak',
      description: 'Complete your daily push-up target and post one update each day.',
      category: 'sport',
      duration_days: 14,
      target_count: 14,
    },
    {
      title: 'Hydration Discipline Week',
      description: 'Hit your hydration target every day and track consistency in updates.',
      category: 'nutrition',
      duration_days: 7,
      target_count: 7,
    },
    {
      title: 'Morning Journal Reset',
      description: 'Write a short mindset journal entry each morning before 9 AM.',
      category: 'mindset',
      duration_days: 10,
      target_count: 10,
    },
  ];

  private readonly visibleChallengesComputed = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const sort = this.sortMode();
    const tab = this.activeTab();
    const filter = this.activeFilter();
    const currentUsername = this.currentUsername;
    let list = [...this.challenges()];

    // Filter by tab (all/mine/joined)
    if (tab === 'mine') {
      list = list.filter((c) => c.creator_username === currentUsername);
    } else if (tab === 'joined') {
      list = list.filter((c) => c.my_participation !== null && c.creator_username !== currentUsername);
    }
    // tab === 'all' shows everything

    // Filter by category
    if (filter !== 'all') {
      list = list.filter((c) => c.category === filter);
    }

    // Filter by search query
    if (query) {
      list = list.filter((challenge) => {
        const title = challenge.title.toLowerCase();
        const description = (challenge.description ?? '').toLowerCase();
        const creator = challenge.creator_username.toLowerCase();
        return title.includes(query) || description.includes(query) || creator.includes(query);
      });
    }

    // Apply sort
    if (sort === 'popular') {
      list.sort((a, b) => b.participant_count - a.participant_count);
    } else if (sort === 'completed') {
      list.sort((a, b) => b.completed_count - a.completed_count);
    } else {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return list;
  });

  readonly visibleChallenges = computed<ChallengeViewModel[]>(() => {
    const currentUsername = this.authService.currentUsername;
    return this.visibleChallengesComputed().map((challenge) => ({
      ...challenge,
      isOwner: challenge.creator_username === currentUsername,
      isParticipating: challenge.my_participation !== null,
      progressPercent: challenge.my_participation?.progress ?? 0,
      categoryLabel: this.categoryLabelByKey[challenge.category] ?? challenge.category,
      deadlineLabel: this.getDeadlineLabel(challenge),
    }));
  });

  readonly hasExpandedCard = computed(() => this.expandedId() !== null);

  readonly overviewStats = computed(() => {
    const list = this.visibleChallenges();
    const joined = list.filter((c) => c.isParticipating).length;
    const completed = list.filter((c) => c.my_participation?.completed).length;
    const expiringSoon = list.filter((c) => !c.is_expired && c.days_left <= 2).length;
    const mine = list.filter((c) => c.isOwner).length;
    const participationRate = list.length ? Math.round((joined / list.length) * 100) : 0;

    return {
      total: list.length,
      joined,
      completed,
      expiringSoon,
      mine,
      participationRate,
    };
  });

  readonly weeklyStats = computed(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    let joinedThisWeek = 0;
    let completedThisWeek = 0;
    let activeJoined = 0;
    let progressTotal = 0;
    let progressCount = 0;

    for (const challenge of this.visibleChallenges()) {
      const participation = challenge.my_participation;
      if (!participation) continue;

      activeJoined += challenge.is_expired || participation.completed ? 0 : 1;
      progressTotal += participation.progress;
      progressCount += 1;

      const joinedAt = new Date(participation.joined_at);
      if (joinedAt >= weekAgo) {
        joinedThisWeek += 1;
      }

      if (participation.completed_at) {
        const completedAt = new Date(participation.completed_at);
        if (completedAt >= weekAgo) {
          completedThisWeek += 1;
        }
      }
    }

    const avgProgress = progressCount ? Math.round(progressTotal / progressCount) : 0;
    const completionRate = joinedThisWeek ? Math.round((completedThisWeek / joinedThisWeek) * 100) : 0;

    return {
      joinedThisWeek,
      completedThisWeek,
      activeJoined,
      avgProgress,
      completionRate,
    };
  });

  readonly leaderboardItems = computed(() => {
    const source = this.leaderboardByChallenge();
    const result: Record<number, MyParticipation[]> = {};
    for (const challenge of this.visibleChallenges()) {
      result[challenge.id] = source[challenge.id] ?? [];
    }
    return result;
  });

  readonly updatesItems = computed(() => {
    const source = this.updatesByChallenge();
    const result: Record<number, ChallengeUpdate[]> = {};
    for (const challenge of this.visibleChallenges()) {
      result[challenge.id] = source[challenge.id] ?? [];
    }
    return result;
  });

  readonly leaderboardHasNextMap = computed(() => {
    const source = this.leaderboardHasNextByChallenge();
    const result: Record<number, boolean> = {};
    for (const challenge of this.visibleChallenges()) {
      result[challenge.id] = source[challenge.id] ?? false;
    }
    return result;
  });

  readonly leaderboardLoadingMap = computed(() => {
    const source = this.loadingLeaderboardByChallenge();
    const result: Record<number, boolean> = {};
    for (const challenge of this.visibleChallenges()) {
      result[challenge.id] = source[challenge.id] ?? false;
    }
    return result;
  });

  readonly updatesHasNextMap = computed(() => {
    const source = this.updatesHasNextByChallenge();
    const result: Record<number, boolean> = {};
    for (const challenge of this.visibleChallenges()) {
      result[challenge.id] = source[challenge.id] ?? false;
    }
    return result;
  });

  readonly updatesLoadingMap = computed(() => {
    const source = this.loadingUpdatesByChallenge();
    const result: Record<number, boolean> = {};
    for (const challenge of this.visibleChallenges()) {
      result[challenge.id] = source[challenge.id] ?? false;
    }
    return result;
  });

  readonly updateDraftMap = computed(() => {
    const source = this.updateDraftByChallenge();
    const result: Record<number, string> = {};
    for (const challenge of this.visibleChallenges()) {
      result[challenge.id] = source[challenge.id] ?? '';
    }
    return result;
  });

  get currentUsername(): string | null {
    return this.authService.currentUsername;
  }

  ngOnInit(): void {
    this.loadChallenges();
    this.loadInsights();
    this.loadReminders();
    this.loadUserTemplates();
  }

  loadUserTemplates(): void {
    if (!this.currentUsername) {
      this.userTemplates.set([]);
      return;
    }

    this.templateService.getTemplates('challenge').subscribe({
      next: (items) => this.userTemplates.set(items),
      error: () => this.userTemplates.set([]),
    });
  }

  setTab(tab: 'all' | 'mine' | 'joined' | 'create'): void {
    this.activeTab.set(tab);
    // Tab change now filters locally via computed, no backend call needed
    // Only reset expandedId when creating a new challenge
    if (tab === 'create') {
      this.expandedId.set(null);
    }
  }

  setFilter(cat: ChallengeCategory | 'all'): void {
    this.activeFilter.set(cat);
    // Filter now applied locally via computed, no backend call needed
    // Reset expand state on filter change to avoid showing expanded card with no matching data
    this.expandedId.set(null);
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  setSort(mode: string): void {
    if (mode === 'recent' || mode === 'popular' || mode === 'completed') {
      this.sortMode.set(mode);
    }
  }

  applyTemplate(template: {
    title: string;
    description: string;
    category: ChallengeCategory;
    duration_days: number;
    target_count: number;
  }): void {
    this.createForm.patchValue(template);
    this.activeTab.set('create');
  }

  applyUserTemplate(template: UserTemplateVersion): void {
    const payload = template.payload as Partial<{
      title: string;
      description: string;
      category: ChallengeCategory;
      duration_days: number;
      target_count: number;
    }>;

    this.createForm.patchValue({
      title: payload.title ?? template.title,
      description: payload.description ?? '',
      category: payload.category ?? 'general',
      duration_days: payload.duration_days ?? 7,
      target_count: payload.target_count ?? 1,
    });
    this.activeTab.set('create');
  }

  saveDraftAsTemplate(): void {
    const v = this.createForm.getRawValue();
    const title = (v.title ?? '').trim();
    if (!title) {
      this.showToast('Add a challenge title before saving template.', 'error');
      return;
    }

    const key = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
    this.templateService.saveTemplate('challenge', title, {
      title,
      description: v.description ?? '',
      category: v.category,
      duration_days: v.duration_days,
      target_count: v.target_count,
    }, key).subscribe({
      next: () => {
        this.showToast('Template saved.', 'success');
        this.loadUserTemplates();
      },
      error: () => this.showToast('Could not save template.', 'error'),
    });
  }

  loadChallenges(): void {
    this.loading.set(true);
    this.challengeService.getChallenges().subscribe({
      next: (data) => {
        this.challenges.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.showToast('Failed to load challenges.', 'error');
      },
    });
  }

  loadInsights(): void {
    this.loadingInsights.set(true);
    this.challengeService.getBadges().subscribe({
      next: (badges) => this.badges.set(badges),
      error: () => this.badges.set([]),
    });

    this.challengeService.getAnalytics().subscribe({
      next: (analytics) => {
        this.analytics.set(analytics);
        this.loadingInsights.set(false);
      },
      error: () => {
        this.analytics.set(null);
        this.loadingInsights.set(false);
      },
    });
  }

  loadReminders(unreadOnly = this.remindersUnreadOnly()): void {
    this.remindersLoading.set(true);
    this.challengeService.getReminders(unreadOnly, 1).subscribe({
      next: (payload) => {
        this.reminders.set(payload.items);
        this.unreadReminders.set(payload.unread_count);
        this.remindersPage.set(payload.page);
        this.remindersHasNext.set(payload.has_next);
        this.remindersLoading.set(false);
      },
      error: () => {
        this.reminders.set([]);
        this.unreadReminders.set(0);
        this.remindersHasNext.set(false);
        this.remindersLoading.set(false);
      },
    });
  }

  loadMoreReminders(unreadOnly = this.remindersUnreadOnly()): void {
    if (!this.remindersHasNext() || this.remindersLoading()) return;
    const nextPage = this.remindersPage() + 1;
    this.remindersLoading.set(true);
    this.challengeService.getReminders(unreadOnly, nextPage).subscribe({
      next: (payload) => {
        this.reminders.update((current) => [...current, ...payload.items]);
        this.unreadReminders.set(payload.unread_count);
        this.remindersPage.set(payload.page);
        this.remindersHasNext.set(payload.has_next);
        this.remindersLoading.set(false);
      },
      error: () => {
        this.remindersLoading.set(false);
      },
    });
  }

  toggleReminders(): void {
    const next = !this.remindersOpen();
    this.remindersOpen.set(next);
    if (next) {
      this.loadReminders();
    }
  }

  toggleUnreadOnlyReminders(): void {
    this.remindersUnreadOnly.set(!this.remindersUnreadOnly());
    this.loadReminders();
  }

  markReminderRead(reminder: InAppReminder): void {
    if (reminder.is_read) return;
    this.challengeService.markReminderRead(reminder.id).subscribe({
      next: () => {
        this.loadReminders();
      },
    });
  }

  markAllRemindersRead(): void {
    this.challengeService.markAllRemindersRead().subscribe({
      next: () => {
        this.loadReminders();
        this.showToast('All reminders marked as read.', 'success');
      },
      error: () => this.showToast('Could not mark reminders.', 'error'),
    });
  }

  toggleExpand(id: number): void {
    const next = this.expandedId() === id ? null : id;
    this.expandedId.set(next);
    this.progressEditing.set(null);
    if (next !== null) {
      this.ensureChallengeDetailsLoaded(next);
      // Keep the challenge card visible after expansion
      // Wait for DOM to update before scrolling
      window.setTimeout(() => {
        const element = document.querySelector(`[data-challenge-id="${next}"]`);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest', // Minimize scroll movement
          });
        }
      }, 100);
    }
  }

  ensureChallengeDetailsLoaded(challengeId: number): void {
    const leaderboard = this.leaderboardByChallenge();
    const updates = this.updatesByChallenge();

    if (!leaderboard[challengeId]) {
      this.setLoadingLeaderboard(challengeId, true);
      this.challengeService.getLeaderboardPaginated(challengeId, 1).subscribe({
        next: (payload: PaginatedLeaderboardResponse) => {
          this.leaderboardByChallenge.set({
            ...this.leaderboardByChallenge(),
            [challengeId]: payload.items,
          });
          this.leaderboardPageByChallenge.set({
            ...this.leaderboardPageByChallenge(),
            [challengeId]: payload.page,
          });
          this.leaderboardHasNextByChallenge.set({
            ...this.leaderboardHasNextByChallenge(),
            [challengeId]: payload.has_next,
          });
          this.setLoadingLeaderboard(challengeId, false);
        },
        error: () => {
          this.setLoadingLeaderboard(challengeId, false);
        },
      });
    }

    if (!updates[challengeId]) {
      this.setLoadingUpdates(challengeId, true);
      this.challengeService.getUpdatesPaginated(challengeId, 1).subscribe({
        next: (payload: PaginatedUpdatesResponse) => {
          this.updatesByChallenge.set({
            ...this.updatesByChallenge(),
            [challengeId]: payload.items,
          });
          this.updatesPageByChallenge.set({
            ...this.updatesPageByChallenge(),
            [challengeId]: payload.page,
          });
          this.updatesHasNextByChallenge.set({
            ...this.updatesHasNextByChallenge(),
            [challengeId]: payload.has_next,
          });
          this.setLoadingUpdates(challengeId, false);
        },
        error: () => {
          this.setLoadingUpdates(challengeId, false);
        },
      });
    }
  }

  loadMoreLeaderboard(challengeId: number): void {
    if (!(this.leaderboardHasNextByChallenge()[challengeId] ?? false) || (this.loadingLeaderboardByChallenge()[challengeId] ?? false)) return;
    const nextPage = (this.leaderboardPageByChallenge()[challengeId] ?? 1) + 1;
    this.setLoadingLeaderboard(challengeId, true);
    this.challengeService.getLeaderboardPaginated(challengeId, nextPage).subscribe({
      next: (payload) => {
        this.leaderboardByChallenge.set({
          ...this.leaderboardByChallenge(),
          [challengeId]: [...(this.leaderboardByChallenge()[challengeId] ?? []), ...payload.items],
        });
        this.leaderboardPageByChallenge.set({
          ...this.leaderboardPageByChallenge(),
          [challengeId]: payload.page,
        });
        this.leaderboardHasNextByChallenge.set({
          ...this.leaderboardHasNextByChallenge(),
          [challengeId]: payload.has_next,
        });
        this.setLoadingLeaderboard(challengeId, false);
      },
      error: () => {
        this.setLoadingLeaderboard(challengeId, false);
      },
    });
  }

  loadMoreUpdates(challengeId: number): void {
    if (!(this.updatesHasNextByChallenge()[challengeId] ?? false) || (this.loadingUpdatesByChallenge()[challengeId] ?? false)) return;
    const nextPage = (this.updatesPageByChallenge()[challengeId] ?? 1) + 1;
    this.setLoadingUpdates(challengeId, true);
    this.challengeService.getUpdatesPaginated(challengeId, nextPage).subscribe({
      next: (payload) => {
        this.updatesByChallenge.set({
          ...this.updatesByChallenge(),
          [challengeId]: [...(this.updatesByChallenge()[challengeId] ?? []), ...payload.items],
        });
        this.updatesPageByChallenge.set({
          ...this.updatesPageByChallenge(),
          [challengeId]: payload.page,
        });
        this.updatesHasNextByChallenge.set({
          ...this.updatesHasNextByChallenge(),
          [challengeId]: payload.has_next,
        });
        this.setLoadingUpdates(challengeId, false);
      },
      error: () => {
        this.setLoadingUpdates(challengeId, false);
      },
    });
  }

  join(challenge: Challenge): void {
    this.challengeService.joinChallenge(challenge.id).subscribe({
      next: () => {
        this.showToast('Joined challenge!', 'success');
        this.loadChallenges();
        this.loadInsights();
      },
      error: () => this.showToast('Could not join.', 'error'),
    });
  }

  leave(challenge: Challenge): void {
    this.challengeService.leaveChallenge(challenge.id).subscribe({
      next: () => {
        this.showToast('Left challenge.', 'success');
        this.loadChallenges();
      },
      error: () => this.showToast('Could not leave.', 'error'),
    });
  }

  startProgressEdit(challenge: Challenge): void {
    this.progressEditing.set(challenge.id);
    this.progressValue.set(challenge.my_participation?.progress ?? 0);
    this.progressNotes.set(challenge.my_participation?.notes ?? '');
  }

  cancelProgressEdit(): void {
    this.progressEditing.set(null);
  }

  saveProgress(challenge: Challenge): void {
    this.saving.set(true);
    this.challengeService.updateProgress(challenge.id, {
      progress: this.progressValue(),
      notes: this.progressNotes(),
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.progressEditing.set(null);
        this.showToast('Progress updated!', 'success');
        this.loadChallenges();
        this.loadInsights();
      },
      error: () => {
        this.saving.set(false);
        this.showToast('Failed to update progress.', 'error');
      },
    });
  }

  quickIncreaseProgress(challenge: Challenge, step = 10): void {
    const participation = challenge.my_participation;
    if (!participation || this.quickUpdatingId() === challenge.id) return;

    this.quickUpdatingId.set(challenge.id);
    this.challengeService.updateProgress(challenge.id, {
      delta: step,
      notes: participation.notes ?? '',
    }).subscribe({
      next: () => {
        this.quickUpdatingId.set(null);
        this.showToast(`Progress +${step}%`, 'success');
        this.loadChallenges();
        this.loadInsights();
      },
      error: () => {
        this.quickUpdatingId.set(null);
        this.showToast('Could not update progress.', 'error');
      },
    });
  }

  markChallengeCompleted(challenge: Challenge): void {
    const participation = challenge.my_participation;
    if (!participation || this.quickUpdatingId() === challenge.id || participation.progress >= 100) return;

    this.quickUpdatingId.set(challenge.id);
    this.challengeService.updateProgress(challenge.id, {
      progress: 100,
      notes: participation.notes ?? '',
    }).subscribe({
      next: () => {
        this.quickUpdatingId.set(null);
        this.showToast('Challenge completed!', 'success');
        this.loadChallenges();
        this.loadInsights();
      },
      error: () => {
        this.quickUpdatingId.set(null);
        this.showToast('Could not mark challenge as completed.', 'error');
      },
    });
  }

  deleteChallenge(challenge: Challenge): void {
    if (!confirm(`Delete "${challenge.title}"?`)) return;
    this.challengeService.deleteChallenge(challenge.id).subscribe({
      next: () => {
        this.showToast('Challenge deleted.', 'success');
        this.loadChallenges();
      },
      error: () => this.showToast('Could not delete.', 'error'),
    });
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.createForm.getRawValue();
    this.challengeService.createChallenge({
      title: v.title,
      description: v.description || undefined,
      category: v.category,
      duration_days: v.duration_days,
      target_count: v.target_count,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.createForm.reset({ category: 'general', duration_days: 7, target_count: 1, title: '', description: '' });
        this.showToast('Challenge created!', 'success');
        this.activeTab.set('mine');
        this.loadChallenges();
        this.loadInsights();
      },
      error: () => {
        this.saving.set(false);
        this.showToast('Failed to create challenge.', 'error');
      },
    });
  }

  setUpdateDraft(challengeId: number, value: string): void {
    this.updateDraftByChallenge.set({
      ...this.updateDraftByChallenge(),
      [challengeId]: value,
    });
  }

  postUpdate(challenge: Challenge): void {
    const content = (this.updateDraftByChallenge()[challenge.id] ?? '').trim();
    if (!content) return;
    this.challengeService.postUpdate(challenge.id, content).subscribe({
      next: (newUpdate) => {
        this.updatesByChallenge.set({
          ...this.updatesByChallenge(),
          [challenge.id]: [newUpdate, ...(this.updatesByChallenge()[challenge.id] ?? [])],
        });
        this.updatesPageByChallenge.set({
          ...this.updatesPageByChallenge(),
          [challenge.id]: 1,
        });
        this.updatesHasNextByChallenge.set({
          ...this.updatesHasNextByChallenge(),
          [challenge.id]: true,
        });
        this.setUpdateDraft(challenge.id, '');
        this.loadReminders();
        this.showToast('Update posted.', 'success');
      },
      error: () => this.showToast('Could not post update.', 'error'),
    });
  }

  trackByChallengeId(_index: number, challenge: Challenge): number {
    return challenge.id;
  }

  trackByReminderId(_index: number, reminder: InAppReminder): number {
    return reminder.id;
  }

  trackByUpdateId(_index: number, update: ChallengeUpdate): number {
    return update.id;
  }

  trackByParticipationId(_index: number, item: MyParticipation): number {
    return item.id;
  }

  trackByCategoryKey(_index: number, item: { key: ChallengeCategory | 'all' }): string {
    return item.key;
  }

  trackBySortKey(_index: number, item: UiSelectOption): string {
    return item.value;
  }

  trackByBadgeId(_index: number, badge: UserBadge): number {
    return badge.id;
  }

  trackByCategoryAnalytics(_index: number, row: { category: string }): string {
    return row.category;
  }

  private getDeadlineLabel(challenge: Challenge): string {
    if (challenge.is_expired) return 'Expired';
    if (challenge.days_left === 0) return 'Ends today';
    if (challenge.days_left === 1) return '1 day left';
    return `${challenge.days_left} days left`;
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3000);
  }

  private setLoadingUpdates(challengeId: number, loading: boolean): void {
    this.loadingUpdatesByChallenge.set({
      ...this.loadingUpdatesByChallenge(),
      [challengeId]: loading,
    });
  }

  private setLoadingLeaderboard(challengeId: number, loading: boolean): void {
    this.loadingLeaderboardByChallenge.set({
      ...this.loadingLeaderboardByChallenge(),
      [challengeId]: loading,
    });
  }
}

