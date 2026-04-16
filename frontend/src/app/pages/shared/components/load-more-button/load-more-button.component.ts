import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-load-more-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './load-more-button.component.html',
  styleUrls: ['./load-more-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadMoreButtonComponent {
  @Input() loading = false;
  @Input() disabled = false;
  @Input() label = 'Load more';
  @Input() loadingLabel = 'Loading...';

  @Output() pressed = new EventEmitter<void>();

  onPress(): void {
    if (this.loading || this.disabled) return;
    this.pressed.emit();
  }
}
