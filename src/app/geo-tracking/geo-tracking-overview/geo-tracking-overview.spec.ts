import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeoTrackingOverview } from './geo-tracking-overview';

describe('GeoTrackingOverview', () => {
  let component: GeoTrackingOverview;
  let fixture: ComponentFixture<GeoTrackingOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeoTrackingOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeoTrackingOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
