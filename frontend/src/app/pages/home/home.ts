import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { InfoCardComponent } from '../shared/components/info-card/info-card';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, InfoCardComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  readonly pillars = [
    { title: 'Discipline', description: 'Push yourself every day' },
    { title: 'Health', description: 'Fuel your body properly' },
    { title: 'Mindset', description: 'Cultivate positive thoughts' },
    { title: 'Goals', description: 'Aim for continued growth' },
  ] as const;

  readonly highlights = [
    { title: 'Track your week', description: 'See sessions completed, exercises done and weekly progress at a glance.' },
    { title: 'Build real habits', description: 'Create routines for food, mindset and growth that stay consistent over time.' },
    { title: 'Challenge yourself', description: 'Join and create challenges, post updates and stay motivated with the community.' },
  ] as const;

  readonly stats = [
    { value: '4', label: 'Core areas', detail: 'Training, nutrition, mindset, growth' },
    { value: '7x', label: 'Weekly visibility', detail: 'Track progress every day' },
    { value: '100%', label: 'Personalized flow', detail: 'Goal and routine based' },
    { value: '24/7', label: 'Progress access', detail: 'Dashboard always available' },
  ] as const;

  readonly flowSteps = [
    {
      step: '01',
      title: 'Set your baseline',
      description: 'Choose goal, weekly frequency and areas you want to improve first.',
    },
    {
      step: '02',
      title: 'Execute daily',
      description: 'Log workouts, meals and mindset actions without interrupting your routine.',
    },
    {
      step: '03',
      title: 'Review progress',
      description: 'Check analytics, streaks and completed sessions to spot momentum early.',
    },
    {
      step: '04',
      title: 'Adjust quickly',
      description: 'Refine your plan week by week and keep consistency as your main metric.',
    },
  ] as const;

  readonly testimonials = [
    {
      quote: '“ZERO helped me stop improvising. I now know exactly what to do each day.”',
      author: 'Alex, 12-week consistency streak',
    },
    {
      quote: '“The challenge feature gave me accountability without overcomplicating anything.”',
      author: 'Marina, Growth + Mindset focus',
    },
    {
      quote: '“My progress feels measurable now. Weekly review changed my training rhythm.”',
      author: 'David, Sport + Nutrition focus',
    },
  ] as const;

  readonly topics: ReadonlyArray<{ title: string; description: string; bullets: string[] }> = [
    {
      title: 'Sport',
      description: 'Plan sessions by category, register volume and keep weekly execution visible.',
      bullets: ['Home or gym mode', 'Sets/reps tracking', 'Workout history'],
    },
    {
      title: 'Food',
      description: 'Get practical meal recommendations and maintain macro awareness every day.',
      bullets: ['Daily meal structure', 'Macros overview', 'Simple recipe guidance'],
    },
    {
      title: 'Mindset',
      description: 'Strengthen consistency with journaling, breathing and reflection prompts.',
      bullets: ['Journal entries', 'Meditation timer', 'Daily quote support'],
    },
    {
      title: 'Growth',
      description: 'Convert intentions into measurable goals and review completion over time.',
      bullets: ['Goal creation', 'Completion tracking', 'Weekly review rhythm'],
    },
  ];

  readonly aboutCards: ReadonlyArray<{ title: string; description: string | null; bullets: string[] | null }> = [
    {
      title: 'Mission',
      description: 'Help you simplify improvement and execute with clarity instead of relying on motivation alone.',
      bullets: null,
    },
    {
      title: 'Principles',
      description: null,
      bullets: ['Consistency beats intensity', 'Clarity beats complexity', 'Review beats guessing'],
    },
    {
      title: 'Who it is for',
      description: 'People who want a practical system to improve fitness, nutrition and mindset with one weekly flow.',
      bullets: null,
    },
  ];

  readonly communityCards = [
    {
      title: 'Challenges',
      description: 'Create or join time-boxed challenges and push your consistency with shared accountability.',
    },
    {
      title: 'Leaderboard',
      description: 'See participant progress, celebrate milestones and keep friendly competitive momentum.',
    },
    {
      title: 'Updates & reminders',
      description: 'Post updates, receive in-app reminders and stay connected to your active goals.',
    },
  ] as const;

  readonly communityItems = [
    {
      title: '30-Day Discipline Sprint',
      subtitle: 'Consistency challenge',
      detail: 'Daily check-ins, accountability pairs and weekly summaries to stay focused.',
      metric: '1,280 active members',
    },
    {
      title: 'Strength + Nutrition Stack',
      subtitle: 'Performance challenge',
      detail: 'Train 4 times per week while following a practical nutrition structure.',
      metric: '86% completion rate',
    },
    {
      title: 'Mindset Reset Week',
      subtitle: 'Recovery challenge',
      detail: 'Short journaling prompts, breathing routines and stress management habits.',
      metric: '4.8/5 participant rating',
    },
  ] as const;

  readonly faqItems = signal([
    {
      question: 'Do I need to train every day?',
      answer: 'No. ZERO is built for consistency, not perfection. You define your weekly goal and track real progress.',
      open: false,
    },
    {
      question: 'Can I focus only on one area?',
      answer: 'Yes. You can prioritize a single area and expand later when your routine is stable.',
      open: false,
    },
    {
      question: 'Can I change my goal over time?',
      answer: 'Absolutely. You can edit your profile and adapt your objective whenever your phase changes.',
      open: false,
    },
    {
      question: 'Is it beginner friendly?',
      answer: 'Yes. The onboarding and dashboard keep the process simple and clear from day one.',
      open: false,
    },
  ]);

  readonly activeCommunityIndex = signal(0);

  readonly activeCommunityItem = computed(() => this.communityItems[this.activeCommunityIndex()]);

  toggleFaq(index: number): void {
    this.faqItems.update((items) =>
      items.map((item, itemIndex) => ({
        ...item,
        open: itemIndex === index ? !item.open : item.open,
      }))
    );
  }

  nextCommunity(): void {
    this.activeCommunityIndex.update((index) => (index + 1) % this.communityItems.length);
  }

  prevCommunity(): void {
    this.activeCommunityIndex.update((index) => (index - 1 + this.communityItems.length) % this.communityItems.length);
  }
}
