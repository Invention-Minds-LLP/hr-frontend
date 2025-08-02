import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkFromHome } from './work-from-home';

describe('WorkFromHome', () => {
  let component: WorkFromHome;
  let fixture: ComponentFixture<WorkFromHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkFromHome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkFromHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
