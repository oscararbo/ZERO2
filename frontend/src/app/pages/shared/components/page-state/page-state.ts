import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-state.html',
  styleUrl: './page-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageStateComponent {
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() empty = false;
  @Input() loadingText = 'Loading...';
  @Input() emptyText = 'No data available.';
}
