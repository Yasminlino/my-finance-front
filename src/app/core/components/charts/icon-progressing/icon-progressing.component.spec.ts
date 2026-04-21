import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IconProgressingComponent } from './icon-progressing.component';

describe('IconProgressingComponent', () => {
  let component: IconProgressingComponent;
  let fixture: ComponentFixture<IconProgressingComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [IconProgressingComponent]
    });
    fixture = TestBed.createComponent(IconProgressingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
