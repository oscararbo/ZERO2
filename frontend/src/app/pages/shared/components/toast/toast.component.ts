import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppToastComponent {
  @Input({ required: true }) message = '';
  @Input() type: 'success' | 'error' = 'success';
  @Input() position: 'top-right' | 'bottom-right' = 'top-right';
}
