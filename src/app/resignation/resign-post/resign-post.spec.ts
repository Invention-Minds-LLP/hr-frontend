import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResignPost } from './resign-post';

describe('ResignPost', () => {
  let component: ResignPost;
  let fixture: ComponentFixture<ResignPost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResignPost]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResignPost);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
