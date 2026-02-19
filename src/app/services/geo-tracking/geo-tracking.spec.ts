import { TestBed } from '@angular/core/testing';

import { GeoTracking } from './geo-tracking';

describe('GeoTracking', () => {
  let service: GeoTracking;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeoTracking);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
