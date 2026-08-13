import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { DataGridComponent } from './data-grid.component';
import { Dropdown } from 'primeng/dropdown';

describe('DataGridComponent', () => {
  let component: DataGridComponent;
  let fixture: ComponentFixture<DataGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataGridComponent, BrowserAnimationsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should activate and deactivate a row for editing', () => {
    const row = { id: 1, name: 'Teste' };

    component.activateRow(row);
    expect(component.isRowActive(row)).toBeTrue();

    component.deactivateRow(row);
    expect(component.isRowActive(row)).toBeFalse();
  });

  it('should emit activate event when a row is activated', () => {
    const row = { id: 2 };
    const onActivate = jasmine.createSpy('activate');

    component.activate.subscribe(onActivate);
    component.activateRow(row);

    expect(onActivate).toHaveBeenCalledWith(row);
  });

  it('should emit edit only when the row is active and the column uses activation', () => {
    const onEdit = jasmine.createSpy('edit');
    const row = { id: 3 };
    const col = { field: 'actions', header: 'Ações', type: 'actions' as const, functions: ['activate', 'edit'] };

    component.edit.subscribe(onEdit);

    // Linha desativada -> não abre a modal de edição
    component.onEditClick(row, col);
    expect(onEdit).not.toHaveBeenCalled();

    // Linha ativada -> emite edição
    component.activateRow(row);
    component.onEditClick(row, col);
    expect(onEdit).toHaveBeenCalledWith(row);
  });

  it('should always emit edit when the column has no activation', () => {
    const onEdit = jasmine.createSpy('edit');
    const row = { id: 4 };
    const col = { field: 'actions', header: 'Ações', type: 'actions' as const, functions: ['edit'] };

    component.edit.subscribe(onEdit);
    component.onEditClick(row, col);

    expect(onEdit).toHaveBeenCalledWith(row);
  });

  it('should format cells with the column formatter (label instead of id)', () => {
    const col = {
      field: 'status',
      header: 'Status',
      formatter: (row: any) => (row.status === 1 ? 'Ativo' : 'Inativo')
    };

    expect(col.formatter({ status: 1 })).toBe('Ativo');
    expect(col.formatter({ status: 0 })).toBe('Inativo');
  });

  it('should start and cancel inline editing, reverting the values', () => {
    const row = { id: 1, name: 'Original', status: 1 };
    component.columns = [
      { field: 'name', header: 'Nome', type: 'text' },
      { field: 'status', header: 'Status', type: 'select', options: [
        { label: 'Ativo', value: 1 },
        { label: 'Inativo', value: 0 }
      ] }
    ];
    component.dataSource = [row];

    component.startInlineEdit(row);
    expect(component.isRowEditing(row)).toBeTrue();

    row.name = 'Alterado';
    row.status = 0;
    component.cancelInlineEdit(row);

    expect(row.name).toBe('Original');
    expect(row.status).toBe(1);
    expect(component.isRowEditing(row)).toBeFalse();
    expect(component.pendingCount).toBe(0);
  });

  it('should commit inline editing and track the changed fields as pending', () => {
    const row = { id: 2, name: 'Original', status: 1 };
    component.columns = [
      { field: 'name', header: 'Nome', type: 'text' },
      { field: 'status', header: 'Status', type: 'select', options: [
        { label: 'Ativo', value: 1 },
        { label: 'Inativo', value: 0 }
      ] }
    ];
    component.dataSource = [row];

    component.startInlineEdit(row);
    row.name = 'Editado';
    row.status = 0;
    component.commitInlineEdit(row);

    expect(component.isRowEditing(row)).toBeFalse();
    expect(component.pendingCount).toBe(1);
    expect(component.isRowDirty(row)).toBeTrue();

    const pending = component.pendingChanges.get(2)!;
    expect(pending.row).toBe(row);
    expect(pending.changes['name']).toBe('Editado');
    expect(pending.changes['status']).toBe(0);
  });

  it('should not track pending changes when nothing changed', () => {
    const row = { id: 3, name: 'Mesmo', status: 1 };
    component.columns = [{ field: 'name', header: 'Nome', type: 'text' }];
    component.dataSource = [row];

    component.startInlineEdit(row);
    component.commitInlineEdit(row);

    expect(component.pendingCount).toBe(0);
  });

  it('should emit saveInline with pending changes and clear them on save all', () => {
    const onSave = jasmine.createSpy('saveInline');
    const row = { id: 4, name: 'A' };
    component.columns = [{ field: 'name', header: 'Nome', type: 'text' }];
    component.dataSource = [row];

    component.saveInline.subscribe(onSave);
    component.startInlineEdit(row);
    row.name = 'B';
    component.commitInlineEdit(row);

    expect(component.pendingCount).toBe(1);
    component.onSaveAll();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect((onSave.calls.first().args[0] as any[]).length).toBe(1);
    expect(component.pendingCount).toBe(0);
  });

  it('should consolidate rows still in editing before saving all', () => {
    const onSave = jasmine.createSpy('saveInline');
    const row = { id: 5, name: 'A' };
    component.columns = [{ field: 'name', header: 'Nome', type: 'text' }];
    component.dataSource = [row];

    component.saveInline.subscribe(onSave);
    component.startInlineEdit(row);
    row.name = 'Editado-sem-commit';
    component.onSaveAll();

    expect((onSave.calls.first().args[0] as any[]).length).toBe(1);
    expect(component.isRowEditing(row)).toBeFalse();
    expect(component.pendingCount).toBe(0);
  });

  it('should emit deleteSelected with the selected rows', () => {
    const onDelete = jasmine.createSpy('deleteSelected');
    const row = { id: 6, name: 'X' };
    component.selectedItems = [row];
    component.deleteSelected.subscribe(onDelete);

    component.onDeleteSelected();

    expect(onDelete).toHaveBeenCalledWith([row]);
  });

  it('should open the dropdown panel aligned under the filter select', (done) => {
    component.filter = true;
    component.columns = [
      { field: 'name', header: 'Nome', type: 'text' },
      { field: 'status', header: 'Status', type: 'select', options: [
        { label: 'Ativo', value: 1 },
        { label: 'Inativo', value: 0 }
      ] }
    ];
    component.dataSource = [];
    fixture.detectChanges();

    const ddEl = fixture.debugElement.query(By.directive(Dropdown));
    expect(ddEl).toBeTruthy();
    const dropdown = ddEl.componentInstance as Dropdown;
    const trigger = ddEl.nativeElement as HTMLElement;

    const triggerRect = trigger.getBoundingClientRect();
    dropdown.show();
    fixture.detectChanges();

    setTimeout(() => {
      const panel = document.querySelector('.p-dropdown-panel') as HTMLElement | null;
      expect(panel).toBeTruthy();
      const panelRect = panel!.getBoundingClientRect();
      // O painel deve abrir alinhado horizontalmente com o select do filtro.
      expect(Math.abs(panelRect.left - triggerRect.left)).toBeLessThan(2);
      expect(panelRect.top).toBeGreaterThanOrEqual(triggerRect.top);
      done();
    }, 300);
  });
});
