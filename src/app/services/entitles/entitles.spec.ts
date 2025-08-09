import { TestBed } from '@angular/core/testing';

import { Entitles } from './entitles';

describe('Entitles', () => {
  let service: Entitles;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Entitles);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
