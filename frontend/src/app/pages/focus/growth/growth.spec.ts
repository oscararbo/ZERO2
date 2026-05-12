import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrowthComponent } from './growth';

describe('Growth', () => {
  let component: GrowthComponent;
  let fixture: ComponentFixture<GrowthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrowthComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GrowthComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
