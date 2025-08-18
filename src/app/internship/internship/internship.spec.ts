import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Internship } from './internship';

describe('Internship', () => {
  let component: Internship;
  let fixture: ComponentFixture<Internship>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Internship]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Internship);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
