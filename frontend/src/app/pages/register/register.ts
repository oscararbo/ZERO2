import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
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

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get f() { return this.form.controls; }

  submit() {
    this.msg.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.msg.set('Revisa los campos.');
      return;
    }

    this.loading.set(true);
    const dto = this.form.getRawValue();

    this.auth.register(dto).pipe(
      switchMap(() => this.auth.login({ username: dto.username, password: dto.password }))
    ).subscribe({
      next: (res) => {
        this.loading.set(false);
        const token = res?.access || res?.token;
        if (token) {
          this.auth.setToken(token, dto.username);
        }
        this.router.navigateByUrl('/register-step2');
      },
      error: (err) => {
        this.loading.set(false);
        const data = err?.error;
        if (data?.username) this.msg.set(data.username[0]);
        else if (data?.email) this.msg.set(data.email[0]);
        else if (data?.password) this.msg.set(data.password[0]);
        else if (typeof data?.detail === 'string') this.msg.set(data.detail);
        else this.msg.set('No se pudo crear la cuenta.');
      }
    });
  }
}
