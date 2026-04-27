import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FocusHeaderComponent } from '../focus-header/focus-header.component';
import { AppToastComponent } from '../toast/toast.component';

@Component({
  selector: 'app-focus-page-header',
  standalone: true,
  imports: [CommonModule, FocusHeaderComponent, AppToastComponent],
  templateUrl: './focus-page-header.html',
  styleUrl: './focus-page-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusPageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() showBack = true;
  @Input() toastMessage: string | null = null;
  @Input() toastType: 'success' | 'error' = 'success';
  @Input() toastPosition: 'top-right' | 'bottom-right' = 'top-right';
}
