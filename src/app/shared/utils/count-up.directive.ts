import {
  DestroyRef,
  Directive,
  ElementRef,
  NgZone,
  OnChanges,
  SimpleChanges,
  inject,
  input,
} from '@angular/core';

import { formatDecimal, formatPercent, formatTnd } from './formatters';

type CountUpFormat = 'integer' | 'decimal' | 'currency' | 'percent';

@Directive({
  selector: '[appCountUp]',
})
export class CountUpDirective implements OnChanges {
  readonly value = input.required<number>({ alias: 'appCountUp' });
  readonly format = input<CountUpFormat>('integer');
  readonly suffix = input('');

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private frameId: number | null = null;
  private destroyed = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['format'] || changes['suffix']) {
      this.startAnimation();
    }
  }

  private startAnimation(): void {
    this.cancelAnimation();

    const target = Math.max(0, this.value());
    const duration = 600;
    const startTime = performance.now();

    this.ngZone.runOutsideAngular(() => {
      const step = (now: number) => {
        if (this.destroyed) {
          return;
        }

        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        this.render(target * eased);

        if (progress < 1) {
          this.frameId = requestAnimationFrame(step);
          return;
        }

        this.render(target);
      };

      this.frameId = requestAnimationFrame(step);
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.cancelAnimation();
    });
  }

  private render(value: number): void {
    this.elementRef.nativeElement.textContent = `${this.formatValue(value)}${this.suffix()}`;
  }

  private formatValue(value: number): string {
    switch (this.format()) {
      case 'currency':
        return formatTnd(value);
      case 'decimal':
        return formatDecimal(value);
      case 'percent':
        return `${formatPercent(value)}%`;
      default:
        return new Intl.NumberFormat('fr-TN', {
          maximumFractionDigits: 0,
        }).format(value);
    }
  }

  private cancelAnimation(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}
