import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIf, TitleCasePipe } from '@angular/common';
import { ExerciseDescriptor } from '../../../core/models/exercise.model';
import { ExerciseService } from '../../../core/services/exercise';

@Component({
  selector: 'app-exercise-detail-page',
  standalone: true,
  imports: [RouterLink, NgIf, TitleCasePipe],
  templateUrl: './exercise-detail-page.html',
  styleUrl: './exercise-detail-page.scss',
})
export class ExerciseDetailPageComponent {
  exercise?: ExerciseDescriptor;

  constructor(private route: ActivatedRoute, private exerciseService: ExerciseService) {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.exercise = this.exerciseService.getExerciseById(id);
    }
  }
}
