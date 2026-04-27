import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CommonModule } from '@angular/common';
import { AuthLayoutComponent } from '../shared/components/auth-layout/auth-layout';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule, AuthLayoutComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  msg = signal('');
  loading = signal(false);
  showPassword = signal(false);

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  get f() {
    return this.form.controls;
  }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  submit() {
    this.msg.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.msg.set('Please enter username and password.');
      return;
    }

    this.loading.set(true);
    const dto = this.form.getRawValue();

    this.auth.login(dto).subscribe({
      next: (res) => {
        this.loading.set(false);
        const token = res?.access || res?.token;
        const refresh = res?.refresh ?? null;
        const isStaff = !!(res as any)?.is_staff;
        if (token) {
          this.auth.setSession(token, refresh, dto.username, isStaff);
        }
        this.router.navigateByUrl(isStaff ? '/admin' : '/dashboard');
      },
      error: () => {
        this.loading.set(false);
        this.msg.set('Invalid credentials.');
      },
    });
  }

}
