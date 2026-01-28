import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BancoListComponent } from './banco-list.component';

describe('BancoListComponent', () => {
  let component: BancoListComponent;
  let fixture: ComponentFixture<BancoListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BancoListComponent]
    });
    fixture = TestBed.createComponent(BancoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
