import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoshList } from './posh-list';

describe('PoshList', () => {
  let component: PoshList;
  let fixture: ComponentFixture<PoshList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoshList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoshList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
