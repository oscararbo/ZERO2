import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, Input, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type UiSelectOption = {
  value: string;
  label: string;
};

@Component({
  selector: 'app-ui-select',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiSelectComponent),
      multi: true,
    },
  ],
  templateUrl: './ui-select.component.html',
  styleUrl: './ui-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiSelectComponent implements ControlValueAccessor {
  @Input() options: UiSelectOption[] = [];
  @Input() placeholder = 'Select an option';
  @Input() ariaLabel = 'Select option';

  readonly open = signal(false);
  readonly value = signal<string>('');
  readonly disabled = signal(false);

  private onChange: (value: string) => void = () => {};
  private onTouchedCallback: () => void = () => {};

  constructor(private host: ElementRef<HTMLElement>) {}

  readonly selectedLabel = () => {
    const selected = this.options.find((item) => item.value === this.value());
    return selected?.label ?? this.placeholder;
  };

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedCallback = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  toggle(): void {
    if (this.disabled()) return;
    this.open.update((current) => !current);
  }

  select(value: string): void {
    this.value.set(value);
    this.onChange(value);
    this.onTouchedCallback();
    this.open.set(false);
  }

  touch(): void {
    this.onTouchedCallback();
  }

  trackByValue(_index: number, option: UiSelectOption): string {
    return option.value;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
