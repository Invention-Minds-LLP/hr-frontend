import {
  AfterViewInit,
  Directive,
  ElementRef,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Turns an overflowing horizontal row into a scrollable one and marks which
 * edges still have content, so arrow buttons can appear only when there is
 * somewhere to go.
 *
 *   <div class="nav-scroll-wrap">
 *     <button (click)="row.page(-1)">‹</button>
 *     <div class="nav-scroll" navScroll #row="navScroll"> … </div>
 *     <button (click)="row.page(1)">›</button>
 *   </div>
 *
 * It toggles `can-left` / `can-right` on the PARENT element instead of
 * exposing bound properties. The navbar re-renders whenever permissions
 * resolve or a menu opens, and a bound property written from a layout read
 * during that pass trips ExpressionChangedAfterItHasBeenChecked. Class
 * toggles are invisible to change detection, which also lets every listener
 * run outside the Angular zone.
 */
@Directive({
  selector: '[navScroll]',
  standalone: true,
  exportAs: 'navScroll',
})
export class NavScrollDirective implements AfterViewInit, OnDestroy {
  private host: HTMLElement = inject(ElementRef).nativeElement;
  private zone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);

  private resizeObserver?: ResizeObserver;
  private mutationObserver?: MutationObserver;
  private frame = 0;

  /** Coalesce bursts (a permission batch renders many items) into one read. */
  private readonly sync = (): void => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.update();
    });
  };

  ngAfterViewInit(): void {
    // Server render has no layout to measure; the arrows resolve on hydration.
    if (!isPlatformBrowser(this.platformId)) return;

    this.zone.runOutsideAngular(() => {
      this.host.addEventListener('scroll', this.sync, { passive: true });
      window.addEventListener('resize', this.sync, { passive: true });

      this.resizeObserver = new ResizeObserver(this.sync);
      this.resizeObserver.observe(this.host);

      // The row keeps its own width while its contents change — switching an
      // admin group swaps the items, and *hasPerm adds more once the
      // permission set arrives — so the box observer alone would miss it.
      this.mutationObserver = new MutationObserver(this.sync);
      this.mutationObserver.observe(this.host, { childList: true, subtree: true });

      this.update();
    });
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.host.removeEventListener('scroll', this.sync);
    window.removeEventListener('resize', this.sync);
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
  }

  /** Scroll about one screenful. `dir` is -1 for left, 1 for right. */
  page(dir: -1 | 1): void {
    this.host.scrollBy({
      left: dir * Math.round(this.host.clientWidth * 0.7),
      behavior: 'smooth',
    });
  }

  private update(): void {
    const wrap = this.host.parentElement;
    if (!wrap) return;

    const max = this.host.scrollWidth - this.host.clientWidth;
    // 1px of slack: fractional layout widths never land exactly on 0 or max.
    wrap.classList.toggle('can-left', this.host.scrollLeft > 1);
    wrap.classList.toggle('can-right', this.host.scrollLeft < max - 1);
  }
}
