import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-back-button',
  standalone: true,
  templateUrl: './back-button.component.html',
  styleUrl: './back-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackButtonComponent {
  /** If provided, navigate to this route. If null/undefined, call history.back(). */
  @Input() link: string | string[] | null = null;

  private router = inject(Router);

  navigate(): void {
    if (this.link) {
      this.router.navigate(Array.isArray(this.link) ? this.link : [this.link]);
    } else {
      window.history.back();
    }
  }
}
