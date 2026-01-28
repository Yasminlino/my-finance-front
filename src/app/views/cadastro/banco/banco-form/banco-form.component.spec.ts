import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BancoFormComponent } from './banco-form.component';

describe('BancoFormComponent', () => {
  let component: BancoFormComponent;
  let fixture: ComponentFixture<BancoFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BancoFormComponent]
    });
    fixture = TestBed.createComponent(BancoFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
