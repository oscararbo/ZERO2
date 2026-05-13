import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FocusHeaderComponent } from '../focus-header/focus-header.component';

@Component({
  selector: 'app-page-top-header',
  standalone: true,
  imports: [CommonModule, FocusHeaderComponent],
  templateUrl: './page-top-header.html',
  styleUrl: './page-top-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageTopHeaderComponent {
  @Input() brand = 'ZΞRO';
  @Input() kicker = '';
  @Input() title = '';
  @Input() backRoute: string | null = null;
}
