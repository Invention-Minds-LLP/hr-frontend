import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignedTest } from './assigned-test';

describe('AssignedTest', () => {
  let component: AssignedTest;
  let fixture: ComponentFixture<AssignedTest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignedTest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignedTest);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
