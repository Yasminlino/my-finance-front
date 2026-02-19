import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigStatusColorsComponent } from './config-status-colors.component';

describe('ConfigStatusColorsComponent', () => {
  let component: ConfigStatusColorsComponent;
  let fixture: ComponentFixture<ConfigStatusColorsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ConfigStatusColorsComponent]
    });
    fixture = TestBed.createComponent(ConfigStatusColorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
