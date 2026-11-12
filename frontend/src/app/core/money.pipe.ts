import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

/** Formats integer bani as MDL using the active locale (PROMPT §7). 169990000 bani -> "16.999,00 MDL". */
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(bani: number | null | undefined): string {
    if (bani === null || bani === undefined) {
      return '';
    }
    const locale = this.transloco.getActiveLang() === 'ro' ? 'ro-MD' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'MDL',
      maximumFractionDigits: 2,
    }).format(bani / 100);
  }
}
