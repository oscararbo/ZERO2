import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { extractApiErrorMessage } from '../../core/api-envelope';
import { AuthLayoutComponent } from '../shared/components/auth-layout/auth-layout';

const PASSWORD_PATTERN = /^.{6,}$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  msg = signal('');
  loading = signal(false);
  showPassword = signal(false);

  usernameAvailable = signal<boolean | null>(null);
  usernameError = signal('');
  emailAvailable = signal<boolean | null>(null);
  emailError = signal('');

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.pattern(USERNAME_PATTERN)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
  });

  get f() { return this.form.controls; }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  checkUsername(): void {
    const username = this.f.username.value.trim();
    if (!username || this.f.username.invalid) {
      this.usernameAvailable.set(null);
      this.usernameError.set('');
      return;
    }
    this.auth.checkUsername(username).subscribe({
      next: (res) => {
        if (res.available) {
          this.usernameAvailable.set(true);
          this.usernameError.set('');
        } else {
          this.usernameAvailable.set(false);
          this.usernameError.set(res.reason ?? 'Username already taken');
        }
      },
      error: () => {
        this.usernameAvailable.set(null);
        this.usernameError.set('');
      },
    });
  }

  checkEmail(): void {
    const email = this.f.email.value.trim();
    if (!email || this.f.email.invalid) {
      this.emailAvailable.set(null);
      this.emailError.set('');
      return;
    }
    this.auth.checkEmail(email).subscribe({
      next: (res) => {
        if (res.available) {
          this.emailAvailable.set(true);
          this.emailError.set('');
        } else {
          this.emailAvailable.set(false);
          this.emailError.set(res.reason ?? 'Email already in use');
        }
      },
      error: () => {
        this.emailAvailable.set(null);
        this.emailError.set('');
      },
    });
  }

  submit() {
    this.msg.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.msg.set('Please fix the errors above.');
      return;
    }
    if (this.usernameAvailable() === false) {
      this.msg.set('Username is already taken.');
      return;
    }
    if (this.emailAvailable() === false) {
      this.msg.set('Email is already in use.');
      return;
    }

    // Save step 1 data locally, navigate to step 2 without calling API yet
    const dto = this.form.getRawValue();
    localStorage.setItem('zero_reg_step1', JSON.stringify(dto));
    this.router.navigateByUrl('/register-step2');
  }
}
