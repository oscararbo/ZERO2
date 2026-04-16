import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-focus-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './focus-header.component.html',
  styleUrls: ['./focus-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() kicker = 'Focus';
  @Input() brand = 'ZERO';
  @Input() backLink = '/dashboard';
  @Input() backLabel = 'Back';
  @Input() showBack = true;
  @Input() backClass = 'btn';
}
