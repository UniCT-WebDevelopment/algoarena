import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeapVisualizer } from './heap-visualizer';

describe('HeapVisualizer', () => {
  let component: HeapVisualizer;
  let fixture: ComponentFixture<HeapVisualizer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeapVisualizer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeapVisualizer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
