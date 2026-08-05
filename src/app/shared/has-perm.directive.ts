import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { PermissionService } from '../services/auth/permission.service';
import { PermissionKey } from './permissions';

/**
 * Structural directive: render the element only if the user holds the key.
 *
 *   <li *hasPerm="'admin.payroll.view'">…</li>
 *   <li *hasPerm="['admin.reports.view', 'admin.payroll.view']">…</li>   ← any-of
 *
 * Replaces role expressions like
 *   *ngIf="!isRestricted && !isIncharge && executiveRoleId !== 4"
 * which listed who was BLOCKED — so every new role silently inherited access.
 *
 * Re-evaluates when the permission set arrives, since the initializer fetch
 * can resolve after the first render.
 */
@Directive({
  selector: '[hasPerm]',
  standalone: true,
})
export class HasPermDirective {
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private perms = inject(PermissionService);

  private required: string[] = [];
  private rendered = false;

  constructor() {
    // Reads perms.has() → tracks the permission signal → re-runs on load.
    effect(() => this.sync());
  }

  @Input({ required: true })
  set hasPerm(key: PermissionKey | PermissionKey[] | string | string[]) {
    this.required = Array.isArray(key) ? [...key] : [key];
    this.sync();
  }

  private sync(): void {
    const allowed = this.required.length > 0 && this.perms.hasAny(...this.required);
    if (allowed === this.rendered) return;

    this.vcr.clear();
    if (allowed) this.vcr.createEmbeddedView(this.tpl);
    this.rendered = allowed;
  }
}
