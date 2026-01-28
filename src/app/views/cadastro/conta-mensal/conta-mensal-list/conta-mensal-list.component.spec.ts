import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContaMensalListComponent } from './conta-mensal-list.component';

describe('ContaMensalListComponent', () => {
  let component: ContaMensalListComponent;
  let fixture: ComponentFixture<ContaMensalListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ContaMensalListComponent]
    });
    fixture = TestBed.createComponent(ContaMensalListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
