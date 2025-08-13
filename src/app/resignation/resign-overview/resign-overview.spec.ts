import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResignOverview } from './resign-overview';

describe('ResignOverview', () => {
  let component: ResignOverview;
  let fixture: ComponentFixture<ResignOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResignOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResignOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
