import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResignationList } from './resignation-list';

describe('ResignationList', () => {
  let component: ResignationList;
  let fixture: ComponentFixture<ResignationList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResignationList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResignationList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
