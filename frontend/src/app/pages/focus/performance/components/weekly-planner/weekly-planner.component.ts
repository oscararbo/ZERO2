import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface PlannerEvent {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  repeatWeekly: boolean;
}

interface EditEventState {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  notes: string;
  repeatWeekly: boolean;
  date: string; // kept read-only, only for display
}

@Component({
  selector: 'app-weekly-planner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './weekly-planner.component.html',
  styleUrls: ['./weekly-planner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeeklyPlannerComponent implements OnInit {
  @Output() toastMessage = new EventEmitter<{ msg: string; type: 'success' | 'error' }>();

  // Compose form
  plannerEventTitle = signal('');
  plannerEventDate = signal(this.getTodayDateValue());
  plannerEventStart = signal('08:00');
  plannerEventEnd = signal('09:00');
  plannerEventNotes = signal('');
  plannerEventRepeatWeekly = signal(false);

  // Week navigation
  plannerSelectedWeek = signal(this.getTodayDateValue());

  // Events store
  plannerEvents = signal<PlannerEvent[]>([]);

  // Detail/edit popup
  detailEvent = signal<EditEventState | null>(null);

  // Computed
  readonly plannerWeekDays = computed(() => {
    const start = this.weekStart(this.plannerSelectedWeek());
    return Array.from({ length: 7 }, (_v, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return {
        date: this.formatDate(d),
        label: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
      };
    });
  });

  readonly plannerWeekLabel = computed(() => {
    const days = this.plannerWeekDays();
    return days.length ? `${days[0].label} - ${days[6].label}` : '';
  });

  readonly plannerEventsByDay = computed(() => {
    const weekDays = this.plannerWeekDays().map((d) => d.date);
    const result: Record<string, PlannerEvent[]> = {};
    for (const day of weekDays) {
      result[day] = this.eventsForDay(day);
    }
    return result;
  });

  ngOnInit(): void {
    this.loadPlannerEvents();
  }

  private getTodayDateValue(): string {
    return new Date().toISOString().split('T')[0];
  }

  private weekStart(dateValue: string): Date {
    const date = new Date(dateValue);
    const diff = (date.getDay() + 6) % 7;
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - diff);
    return date;
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  eventsForDay(dateValue: string): PlannerEvent[] {
    const targetDate = new Date(dateValue);
    const targetDow = targetDate.getDay();
    return this.plannerEvents().filter((ev) => {
      const evDate = new Date(ev.date);
      if (ev.repeatWeekly) {
        if (targetDate < evDate) return false;
        return targetDow === evDate.getDay();
      }
      return ev.date === dateValue;
    });
  }

  setPlannerSelectedWeek(value: string): void {
    this.plannerSelectedWeek.set(value);
    this.plannerEventDate.set(value);
  }

  shiftPlannerWeek(delta: number): void {
    const start = this.weekStart(this.plannerSelectedWeek());
    start.setDate(start.getDate() + delta * 7);
    this.setPlannerSelectedWeek(this.formatDate(start));
  }

  addPlannerEvent(): void {
    const title = this.plannerEventTitle().trim();
    const date = this.plannerEventDate();
    const startTime = this.plannerEventStart();
    const endTime = this.plannerEventEnd();

    if (!title || !date || !startTime || !endTime) {
      this.toastMessage.emit({ msg: 'Add title, date and time before saving the event.', type: 'error' });
      return;
    }
    if (startTime === endTime) {
      this.toastMessage.emit({ msg: 'Start time and end time cannot be the same.', type: 'error' });
      return;
    }
    if (endTime < startTime) {
      this.toastMessage.emit({ msg: 'End time must be after start time.', type: 'error' });
      return;
    }

    const event: PlannerEvent = {
      id: Date.now(),
      title,
      date,
      startTime,
      endTime,
      notes: this.plannerEventNotes().trim(),
      repeatWeekly: this.plannerEventRepeatWeekly(),
    };

    this.plannerEvents.update((current) =>
      [...current, event].sort(
        (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
      )
    );
    this.savePlannerEvents();
    this.plannerEventTitle.set('');
    this.plannerEventNotes.set('');
    this.plannerEventRepeatWeekly.set(false);
    this.toastMessage.emit({ msg: 'Planner event added.', type: 'success' });
  }

  removePlannerEvent(eventId: number): void {
    this.plannerEvents.update((current) => current.filter((ev) => ev.id !== eventId));
    this.savePlannerEvents();
    this.detailEvent.set(null);
  }

  openEventDetail(event: PlannerEvent): void {
    this.detailEvent.set({
      id: event.id,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      notes: event.notes,
      repeatWeekly: event.repeatWeekly,
      date: event.date,
    });
  }

  closeEventDetail(): void {
    this.detailEvent.set(null);
  }

  saveEventDetail(): void {
    const ev = this.detailEvent();
    if (!ev) return;

    const title = ev.title.trim();
    if (!title) {
      this.toastMessage.emit({ msg: 'Event title is required.', type: 'error' });
      return;
    }
    if (ev.startTime === ev.endTime) {
      this.toastMessage.emit({ msg: 'Start time and end time cannot be the same.', type: 'error' });
      return;
    }
    if (ev.endTime < ev.startTime) {
      this.toastMessage.emit({ msg: 'End time must be after start time.', type: 'error' });
      return;
    }

    this.plannerEvents.update((current) =>
      current.map((e) =>
        e.id === ev.id
          ? { ...e, title: ev.title.trim(), startTime: ev.startTime, endTime: ev.endTime, notes: ev.notes, repeatWeekly: ev.repeatWeekly }
          : e
      )
    );
    this.savePlannerEvents();
    this.detailEvent.set(null);
    this.toastMessage.emit({ msg: 'Event updated.', type: 'success' });
  }

  patchDetail(field: keyof EditEventState, value: string | boolean): void {
    const ev = this.detailEvent();
    if (!ev) return;
    this.detailEvent.set({ ...ev, [field]: value });
  }

  private loadPlannerEvents(): void {
    try {
      const saved = localStorage.getItem('performancePlannerEvents');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) this.plannerEvents.set(parsed);
      }
    } catch {
      this.plannerEvents.set([]);
    }
  }

  private savePlannerEvents(): void {
    localStorage.setItem('performancePlannerEvents', JSON.stringify(this.plannerEvents()));
  }
}
