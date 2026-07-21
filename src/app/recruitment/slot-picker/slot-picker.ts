import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Slot { start: string; end: string; }
interface DayGroup { key: string; weekday: string; day: string; month: string; slots: Slot[]; }

/**
 * Availability slot picker — a horizontal day strip + a grid of time chips for
 * the selected day. Dark-themed to match the recruitment dialogs. Takes a flat
 * list of {start,end} slots (as returned by the panel-availability endpoint)
 * and emits the chosen slot.
 */
@Component({
  selector: 'app-slot-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sp-card">
      <div class="sp-days">
        <button *ngFor="let d of days" type="button" class="sp-day" [class.active]="d.key === selectedKey"
          (click)="selectDay(d.key)">
          <span class="sp-wd">{{ d.weekday }}</span>
          <span class="sp-num">{{ d.day }}</span>
          <span class="sp-mo">{{ d.month }}</span>
        </button>
      </div>

      <div class="sp-times" *ngIf="selectedDay as sd">
        <button *ngFor="let s of sd.slots" type="button" class="sp-time"
          [class.active]="s.start === activeStart" (click)="choose(s)">
          {{ timeLabel(s.start) }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .sp-card { border: 1px solid #2b2b3d; border-radius: 12px; background: #0d0d14; padding: .75rem; }
    .sp-days {
      display: flex; gap: .5rem; overflow-x: auto; padding-bottom: .6rem;
      border-bottom: 1px solid #23232f; margin-bottom: .7rem;
    }
    .sp-days::-webkit-scrollbar { height: 6px; }
    .sp-days::-webkit-scrollbar-thumb { background: #2b2b3d; border-radius: 6px; }
    .sp-day {
      flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: .05rem;
      min-width: 56px; padding: .45rem .4rem; border: 1px solid #2b2b3d; border-radius: 10px;
      background: #15151f; color: #c7c7d4; cursor: pointer; transition: border-color .15s, background .15s;
    }
    .sp-day:hover { border-color: #4a4a63; }
    .sp-day.active {
      background: linear-gradient(135deg, #C160FF, #8b3dff); border-color: transparent; color: #fff;
      box-shadow: 0 4px 14px rgba(193, 96, 255, .35);
    }
    .sp-wd { font-size: .62rem; text-transform: uppercase; letter-spacing: .04em; opacity: .85; }
    .sp-num { font-size: 1.05rem; font-weight: 700; line-height: 1.15; }
    .sp-mo { font-size: .58rem; text-transform: uppercase; opacity: .7; }
    .sp-times {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(82px, 1fr));
      gap: .5rem; max-height: 216px; overflow-y: auto; padding-right: .15rem;
    }
    .sp-times::-webkit-scrollbar { width: 6px; }
    .sp-times::-webkit-scrollbar-thumb { background: #2b2b3d; border-radius: 6px; }
    .sp-time {
      padding: .5rem; border: 1px solid #33334a; border-radius: 8px; background: #16161f;
      color: #e8e8f0; font-size: .8rem; font-weight: 500; cursor: pointer;
      transition: border-color .15s, background .15s, color .15s;
    }
    .sp-time:hover { border-color: #C160FF; background: #241a33; color: #fff; }
    .sp-time.active { border-color: #C160FF; background: #C160FF; color: #14141c; font-weight: 600; }
  `],
})
export class SlotPicker {
  @Output() pick = new EventEmitter<Slot>();

  days: DayGroup[] = [];
  selectedKey: string | null = null;
  activeStart: string | null = null;

  private _slots: Slot[] = [];
  @Input() set slots(v: Slot[] | null | undefined) {
    this._slots = v || [];
    this.group();
  }

  private group() {
    const map = new Map<string, DayGroup>();
    for (const s of this._slots) {
      const d = new Date(s.start);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
          day: String(d.getDate()).padStart(2, '0'),
          month: d.toLocaleDateString('en-US', { month: 'short' }),
          slots: [],
        });
      }
      map.get(key)!.slots.push(s);
    }
    this.days = Array.from(map.values());
    if (!this.selectedKey || !map.has(this.selectedKey)) {
      this.selectedKey = this.days.length ? this.days[0].key : null;
    }
  }

  get selectedDay(): DayGroup | null {
    return this.days.find((d) => d.key === this.selectedKey) ?? null;
  }

  timeLabel(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  selectDay(key: string) { this.selectedKey = key; }

  choose(s: Slot) {
    this.activeStart = s.start;
    this.pick.emit(s);
  }
}
