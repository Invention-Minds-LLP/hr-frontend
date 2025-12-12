import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnreportedEmployee } from './unreported-employee';

describe('UnreportedEmployee', () => {
  let component: UnreportedEmployee;
  let fixture: ComponentFixture<UnreportedEmployee>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnreportedEmployee]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnreportedEmployee);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
