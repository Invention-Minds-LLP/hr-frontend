import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentOverview } from './incident-overview';

describe('IncidentOverview', () => {
  let component: IncidentOverview;
  let fixture: ComponentFixture<IncidentOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncidentOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
