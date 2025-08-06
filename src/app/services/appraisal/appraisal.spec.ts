import { TestBed } from '@angular/core/testing';

import { Appraisal } from './appraisal';

describe('Appraisal', () => {
  let service: Appraisal;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Appraisal);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
