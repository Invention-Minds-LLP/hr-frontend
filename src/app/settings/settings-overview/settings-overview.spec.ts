import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsOverview } from './settings-overview';

describe('SettingsOverview', () => {
  let component: SettingsOverview;
  let fixture: ComponentFixture<SettingsOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettingsOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
