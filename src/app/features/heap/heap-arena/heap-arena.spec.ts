import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeapArenaComponent } from './heap-arena';

describe('HeapArenaComponent', () => {
  let component: HeapArenaComponent;
  let fixture: ComponentFixture<HeapArenaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeapArenaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HeapArenaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
