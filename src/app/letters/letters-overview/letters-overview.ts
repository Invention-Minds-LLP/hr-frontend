import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { saveAs } from 'file-saver';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { EditorModule } from 'primeng/editor';
import { MultiSelectModule } from 'primeng/multiselect';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import {
  LettersService, LetterTemplate, LetterIssued, LetterToken, LetterPreview,
} from '../../services/letters/letters.service';
import { Employees } from '../../services/employees/employees';

@Component({
  selector: 'app-letters-overview',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TabsModule, TableModule, ButtonModule, InputTextModule, SelectModule,
    TagModule, ToastModule, DialogModule, CheckboxModule, DividerModule,
    SkeletonModule, TooltipModule, EditorModule, MultiSelectModule,
    ConfirmDialogModule, ModuleGuide,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './letters-overview.html',
  styleUrl: './letters-overview.css',
})
export class LettersOverview implements OnInit {

  activeTab = 0;
  readonly skeletonRows: any[] = [1, 2, 3];

  // ── Templates ───────────────────────────────────────────────────────────────
  templates: LetterTemplate[] = [];
  templatesLoading = false;
  showInactive = false;

  templateDialog = false;
  editing: Partial<LetterTemplate> = {};
  savingTemplate = false;

  categories: { label: string; value: string }[] = [];
  tokens: LetterToken[] = [];
  tokenGroups: { group: string; tokens: LetterToken[] }[] = [];

  // ── Preview ─────────────────────────────────────────────────────────────────
  previewDialog = false;
  previewResult: LetterPreview | null = null;
  previewing = false;
  previewEmployee: any = null;

  // ── Issue ───────────────────────────────────────────────────────────────────
  issueDialog = false;
  issueTemplate: LetterTemplate | null = null;
  issueEmployees: any[] = [];
  issueSendEmail = false;
  issueRemarks = '';
  issuing = false;

  employees: any[] = [];
  employeesLoading = false;

  // ── Issued history ──────────────────────────────────────────────────────────
  issued: LetterIssued[] = [];
  issuedTotal = 0;
  issuedLoading = false;
  issuedPage = 1;
  issuedCategoryFilter = '';

  // ── My letters ──────────────────────────────────────────────────────────────
  myLetters: LetterIssued[] = [];
  myLettersLoading = false;

  constructor(
    private svc: LettersService,
    private employeeSvc: Employees,
    private msg: MessageService,
    private confirm: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.svc.getTokens().subscribe({
      next: (res) => {
        this.tokens = res.tokens;
        this.categories = res.categories.map((c) => ({ label: this.prettyCategory(c), value: c }));

        // Group for the token palette in the editor sidebar.
        const groups = new Map<string, LetterToken[]>();
        for (const t of res.tokens) {
          if (!groups.has(t.group)) groups.set(t.group, []);
          groups.get(t.group)!.push(t);
        }
        this.tokenGroups = [...groups.entries()].map(([group, tokens]) => ({ group, tokens }));
      },
      error: () => this.err('Could not load the token catalog'),
    });

    this.loadTemplates();
    this.loadIssued();
    this.loadMyLetters();
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.employeesLoading = true;
    this.employeeSvc.getActiveEmployees().subscribe({
      next: (list: any[]) => {
        this.employees = (Array.isArray(list) ? list : []).map((e: any) => ({
          ...e,
          displayName:
            `${e.firstName || ''} ${e.lastName || ''}`.trim() + ` (${e.employeeCode || e.id})`,
        }));
        this.employeesLoading = false;
      },
      error: () => { this.employeesLoading = false; this.employees = []; },
    });
  }

  // ── Templates ───────────────────────────────────────────────────────────────

  loadTemplates(): void {
    this.templatesLoading = true;
    this.svc.listTemplates(undefined, this.showInactive).subscribe({
      next: (rows) => { this.templates = rows; this.templatesLoading = false; },
      error: () => { this.templatesLoading = false; this.err('Could not load templates'); },
    });
  }

  openNewTemplate(): void {
    this.editing = {
      name: '',
      category: 'CUSTOM',
      subject: '',
      bodyHtml: '<p>Dear {{employee.fullName}},</p><p></p><p></p><p>Regards,</p>',
      includeSignature: true,
      isActive: true,
    };
    this.templateDialog = true;
  }

  openEditTemplate(t: LetterTemplate): void {
    this.editing = { ...t };
    this.templateDialog = true;
  }

  saveTemplate(): void {
    if (!this.editing.name?.trim())    { this.err('Template name is required'); return; }
    if (!this.editing.subject?.trim()) { this.err('Subject is required'); return; }
    if (!this.editing.bodyHtml?.trim()) { this.err('Letter body is required'); return; }

    this.savingTemplate = true;
    this.svc.saveTemplate(this.editing).subscribe({
      next: () => {
        this.savingTemplate = false;
        this.templateDialog = false;
        this.ok('Template saved');
        this.loadTemplates();
      },
      error: (e) => {
        this.savingTemplate = false;
        this.err(e?.error?.message || 'Could not save the template');
      },
    });
  }

  deleteTemplate(t: LetterTemplate): void {
    this.confirm.confirm({
      header: 'Delete template',
      message:
        `Delete "${t.name}"? If letters have already been issued from it, it will be ` +
        `deactivated instead of deleted so the history stays intact.`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => {
        this.svc.deleteTemplate(t.id!).subscribe({
          next: (r) => { this.ok(r.message); this.loadTemplates(); },
          error: (e) => this.err(e?.error?.message || 'Could not delete the template'),
        });
      },
    });
  }

  /** Append a token at the end of the body — simplest reliable insertion. */
  insertToken(token: string): void {
    const marker = `{{${token}}}`;
    this.editing.bodyHtml = `${this.editing.bodyHtml || ''}<p>${marker}</p>`;
    this.ok(`Inserted ${marker} at the end — drag it where you need it`);
  }

  // ── Preview ─────────────────────────────────────────────────────────────────

  openPreview(t?: LetterTemplate): void {
    this.previewResult = null;
    this.previewEmployee = this.employees[0] || null;
    this.issueTemplate = t ?? (this.editing.id ? (this.editing as LetterTemplate) : null);
    this.previewDialog = true;
    if (this.previewEmployee) this.runPreview();
  }

  runPreview(): void {
    if (!this.previewEmployee) { this.err('Pick an employee to preview against'); return; }

    this.previewing = true;
    // Preview the unsaved editor content when the dialog was opened from the
    // editor; otherwise preview the saved template.
    const body = this.templateDialog
      ? {
          employeeId: this.previewEmployee.id,
          subject: this.editing.subject,
          bodyHtml: this.editing.bodyHtml,
          headerHtml: this.editing.headerHtml,
          footerHtml: this.editing.footerHtml,
        }
      : { employeeId: this.previewEmployee.id, templateId: this.issueTemplate?.id };

    this.svc.preview(body).subscribe({
      next: (r) => { this.previewResult = r; this.previewing = false; },
      error: (e) => {
        this.previewing = false;
        this.err(e?.error?.message || 'Could not render the preview');
      },
    });
  }

  // ── Issue ───────────────────────────────────────────────────────────────────

  openIssue(t: LetterTemplate): void {
    this.issueTemplate = t;
    this.issueEmployees = [];
    this.issueSendEmail = false;
    this.issueRemarks = '';
    this.issueDialog = true;
  }

  issue(): void {
    if (!this.issueTemplate?.id) return;
    if (!this.issueEmployees.length) { this.err('Select at least one employee'); return; }

    this.issuing = true;
    this.svc.issue({
      templateId: this.issueTemplate.id,
      employeeIds: this.issueEmployees.map((e) => e.id),
      sendEmail: this.issueSendEmail,
      remarks: this.issueRemarks || undefined,
    }).subscribe({
      next: (r) => {
        this.issuing = false;
        this.issueDialog = false;
        this.msg.add({
          severity: r.failed.length ? 'warn' : 'success',
          summary: `Issued ${r.issued} letter(s)`,
          detail: r.failed.length
            ? `${r.failed.length} had problems: ${r.failed.slice(0, 3).map((f) => f.reason).join('; ')}`
            : undefined,
          life: r.failed.length ? 8000 : 3000,
        });
        this.loadIssued();
        this.loadTemplates();
      },
      error: (e) => {
        this.issuing = false;
        this.err(e?.error?.message || 'Could not issue the letter');
      },
    });
  }

  // ── Issued history ──────────────────────────────────────────────────────────

  loadIssued(): void {
    this.issuedLoading = true;
    this.svc.listIssued({
      category: this.issuedCategoryFilter || undefined,
      page: this.issuedPage,
      limit: 20,
    }).subscribe({
      next: (r) => { this.issued = r.data; this.issuedTotal = r.total; this.issuedLoading = false; },
      error: () => { this.issuedLoading = false; this.err('Could not load issued letters'); },
    });
  }

  onIssuedPage(event: any): void {
    this.issuedPage = Math.floor((event.first || 0) / (event.rows || 20)) + 1;
    this.loadIssued();
  }

  download(letter: LetterIssued): void {
    this.svc.downloadIssued(letter.id).subscribe({
      next: (blob) => {
        const name = (letter.templateName || 'Letter').replace(/[^\w-]+/g, '_');
        const code = letter.employee?.employeeCode || letter.employeeId;
        saveAs(blob, `${name}_${code}.pdf`);
      },
      error: async (e) => this.err((await this.readBlobError(e)) || 'Could not generate the PDF'),
    });
  }

  revoke(letter: LetterIssued): void {
    this.confirm.confirm({
      header: 'Revoke letter',
      message: 'Mark this letter as revoked? It stays in the history but is no longer valid.',
      acceptLabel: 'Revoke',
      rejectLabel: 'Cancel',
      accept: () => {
        this.svc.revoke(letter.id).subscribe({
          next: () => { this.ok('Letter revoked'); this.loadIssued(); },
          error: (e) => this.err(e?.error?.message || 'Could not revoke the letter'),
        });
      },
    });
  }

  loadMyLetters(): void {
    this.myLettersLoading = true;
    this.svc.listMine().subscribe({
      next: (rows) => { this.myLetters = rows; this.myLettersLoading = false; },
      error: () => { this.myLettersLoading = false; this.myLetters = []; },
    });
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  prettyCategory(c?: string): string {
    if (!c) return '—';
    return c.charAt(0) + c.slice(1).toLowerCase();
  }

  categorySeverity(c?: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (c) {
      case 'OFFER': case 'CONFIRMATION': return 'success';
      case 'WARNING': return 'danger';
      case 'RELIEVING': case 'EXPERIENCE': return 'info';
      case 'INCREMENT': case 'APPRECIATION': return 'warn';
      default: return 'secondary';
    }
  }

  statusSeverity(s?: string): 'success' | 'info' | 'danger' | 'secondary' {
    switch (s) {
      case 'EMAILED': return 'success';
      case 'ISSUED':  return 'info';
      case 'REVOKED': return 'danger';
      default:        return 'secondary';
    }
  }

  private async readBlobError(e: any): Promise<string> {
    try {
      if (e?.error instanceof Blob) return JSON.parse(await e.error.text())?.message || '';
      return e?.error?.message || '';
    } catch { return ''; }
  }

  private ok(detail: string) { this.msg.add({ severity: 'success', summary: 'Done', detail }); }
  private err(detail: string) { this.msg.add({ severity: 'error', summary: 'Error', detail }); }
}
