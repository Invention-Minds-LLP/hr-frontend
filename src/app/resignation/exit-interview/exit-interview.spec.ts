import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExitInterview } from './exit-interview';

describe('ExitInterview', () => {
  let component: ExitInterview;
  let fixture: ComponentFixture<ExitInterview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExitInterview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExitInterview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
