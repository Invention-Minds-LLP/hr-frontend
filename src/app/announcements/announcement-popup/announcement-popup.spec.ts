import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnouncementPopup } from './announcement-popup';

describe('AnnouncementPopup', () => {
  let component: AnnouncementPopup;
  let fixture: ComponentFixture<AnnouncementPopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnouncementPopup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnnouncementPopup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
