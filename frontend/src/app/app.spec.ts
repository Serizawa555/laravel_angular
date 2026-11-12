import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTransloco, TranslocoLoader, TRANSLOCO_LOADER } from '@jsverse/transloco';
import { of } from 'rxjs';
import { App } from './app';
import { routes } from './app.routes';

class StubLoader implements TranslocoLoader {
  getTranslation() {
    return of({});
  }
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTransloco({ config: { availableLangs: ['en', 'ro'], defaultLang: 'en' } }),
        { provide: TRANSLOCO_LOADER, useClass: StubLoader },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the language switcher in the top bar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const header = (fixture.nativeElement as HTMLElement).querySelector('header')?.textContent ?? '';
    expect(header.toLowerCase()).toContain('en');
    expect(header.toLowerCase()).toContain('ro');
  });
});
