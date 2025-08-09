import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestAssignment } from './test-assignment';

describe('TestAssignment', () => {
  let component: TestAssignment;
  let fixture: ComponentFixture<TestAssignment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestAssignment]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestAssignment);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
