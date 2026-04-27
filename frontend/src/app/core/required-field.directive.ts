import {
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  Renderer2,
} from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { merge, Subscription } from 'rxjs';

/**
 * Usage: add [appRequired]="formControl" to any input, select or textarea.
 * When the control is touched and has a required error it:
 *   - adds a red border to the host element (class `input--required-invalid`)
 *   - inserts a "Required field" message immediately after the host element
 * Remove the attribute to disable the behaviour on a specific field.
 */
@Directive({
  selector: '[appRequired]',
  standalone: true,
})
export class RequiredFieldDirective implements OnInit, OnDestroy {
  @Input('appRequired') control!: AbstractControl | null;

  private msgEl: HTMLElement | null = null;
  private sub = new Subscription();

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    if (!this.control) return;

    // Create the error message element
    this.msgEl = this.renderer.createElement('span') as HTMLElement;
    this.renderer.addClass(this.msgEl, 'field__required-msg');
    this.renderer.setProperty(this.msgEl, 'textContent', 'Required field');
    this.renderer.setAttribute(this.msgEl, 'aria-live', 'polite');
    this.renderer.setStyle(this.msgEl, 'display', 'none');

    const host = this.el.nativeElement;
    const parent = host.parentNode;
    if (parent) {
      this.renderer.insertBefore(parent, this.msgEl, host.nextSibling);
    }

    // React to any status or value change
    this.sub = merge(
      this.control.statusChanges,
      this.control.valueChanges
    ).subscribe(() => this.update());

    this.update();
  }

  private update(): void {
    const invalid =
      !!this.control &&
      this.control.touched &&
      this.control.hasError('required');

    const host = this.el.nativeElement;

    if (invalid) {
      this.renderer.addClass(host, 'input--required-invalid');
      if (this.msgEl) this.renderer.setStyle(this.msgEl, 'display', 'block');
    } else {
      this.renderer.removeClass(host, 'input--required-invalid');
      if (this.msgEl) this.renderer.setStyle(this.msgEl, 'display', 'none');
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.msgEl?.parentNode) {
      this.renderer.removeChild(this.msgEl.parentNode, this.msgEl);
    }
  }
}
