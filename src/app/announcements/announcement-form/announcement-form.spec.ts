import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnouncementForm } from './announcement-form';

describe('AnnouncementForm', () => {
  let component: AnnouncementForm;
  let fixture: ComponentFixture<AnnouncementForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnouncementForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnnouncementForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
