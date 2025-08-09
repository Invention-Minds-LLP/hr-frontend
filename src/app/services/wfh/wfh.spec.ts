import { TestBed } from '@angular/core/testing';

import { Wfh } from './wfh';

describe('Wfh', () => {
  let service: Wfh;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Wfh);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
