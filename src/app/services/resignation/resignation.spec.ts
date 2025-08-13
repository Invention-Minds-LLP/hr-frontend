import { TestBed } from '@angular/core/testing';

import { Resignation } from './resignation';

describe('Resignation', () => {
  let service: Resignation;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Resignation);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
