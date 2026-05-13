import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BackButtonComponent } from '../back-button/back-button.component';

@Component({
  selector: 'app-focus-header',
  standalone: true,
  imports: [CommonModule, BackButtonComponent],
  templateUrl: './focus-header.component.html',
  styleUrl: './focus-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() kicker = 'Focus';
  @Input() brand = 'ZERO';
  @Input() backLink: string | null = null;
  @Input() showBack = true;
}
