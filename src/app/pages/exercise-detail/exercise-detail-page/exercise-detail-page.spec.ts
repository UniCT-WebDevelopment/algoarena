import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExerciseDetailPageComponent } from './exercise-detail-page';

describe('ExerciseDetailPageComponent', () => {
  let component: ExerciseDetailPageComponent;
  let fixture: ComponentFixture<ExerciseDetailPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExerciseDetailPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExerciseDetailPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
