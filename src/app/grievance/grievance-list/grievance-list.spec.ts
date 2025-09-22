import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrievanceList } from './grievance-list';

describe('GrievanceList', () => {
  let component: GrievanceList;
  let fixture: ComponentFixture<GrievanceList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrievanceList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GrievanceList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
