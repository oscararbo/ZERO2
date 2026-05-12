import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MindsetComponent } from './mindset';

describe('Mindset', () => {
  let component: MindsetComponent;
  let fixture: ComponentFixture<MindsetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MindsetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MindsetComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
