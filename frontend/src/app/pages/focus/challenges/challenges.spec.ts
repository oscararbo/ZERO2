import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChallengesComponent } from './challenges';

describe('Challenges', () => {
  let component: ChallengesComponent;
  let fixture: ComponentFixture<ChallengesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChallengesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChallengesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
