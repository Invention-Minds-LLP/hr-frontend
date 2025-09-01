import { TestBed } from '@angular/core/testing';

import { SurveryService } from './survery-service';

describe('SurveryService', () => {
  let service: SurveryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SurveryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
