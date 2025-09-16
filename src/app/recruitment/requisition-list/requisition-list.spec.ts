import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequisitionList } from './requisition-list';

describe('RequisitionList', () => {
  let component: RequisitionList;
  let fixture: ComponentFixture<RequisitionList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequisitionList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequisitionList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
