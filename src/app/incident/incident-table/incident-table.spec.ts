import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentTable } from './incident-table';

describe('IncidentTable', () => {
  let component: IncidentTable;
  let fixture: ComponentFixture<IncidentTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncidentTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
