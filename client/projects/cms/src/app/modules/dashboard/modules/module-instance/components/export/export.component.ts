import {HttpClient} from '@angular/common/http';
import {ChangeDetectionStrategy, Component, Inject, TemplateRef, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';
import {MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef} from '@angular/material/bottom-sheet';
import {MatDialog} from '@angular/material/dialog';
import {TranslocoService} from '@ngneat/transloco';
import {saveAs} from 'file-saver';
import firebase from 'firebase/app';
import {from} from 'rxjs';
import {switchMap, tap} from 'rxjs/operators';
import {FilterModule} from '../../../../../../shared/interfaces/filter-module.interface';
import {InstanceSort} from '../../../../../../shared/interfaces/instance-sort.interface';
import {ModuleLayoutTableColumn} from '../../../../../../shared/interfaces/module-layout-table.interface';
import {DbService} from '../../../../../../shared/services/db/db.service';
import {notify} from '../../../../../../shared/utils/notify.operator';
import {queue} from '../../../../../../shared/utils/queue.operator';
import {ColumnOrganizationComponent} from '../column-organization/column-organization.component';

enum ExportType {
  csv = 'csv',
  tab = 'tab',
  json = 'json',
  xls = 'xls'
}

@Component({
  selector: 'jms-export',
  templateUrl: './export.component.html',
  styleUrls: ['./export.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExportComponent {
  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA)
    public data: {
      filterModule?: FilterModule;
      filterValue?: any;
      sort?: InstanceSort;
      collection: string;
      subCollection?: string;
      columns?: ModuleLayoutTableColumn[];
      ids?: string[];
    },
    private http: HttpClient,
    private sheetRef: MatBottomSheetRef<ExportComponent>,
    private dialog: MatDialog,
    private db: DbService,
    private fb: FormBuilder,
    private transloco: TranslocoService
  ) {
  }

  @ViewChild('options', {static: true})
  optionsTemplate: TemplateRef<any>;

  types = ExportType;
  type: ExportType;
  form: FormGroup;

  selectType(type: ExportType) {

    this.sheetRef.dismiss();
    this.type = type;

    this.form = this.fb.group({
      useFilters: !!(this.data.filterModule && this.data.filterValue),
      skip: null,
      limit: null
    });

    this.dialog.open(
      this.optionsTemplate,
      {
        width: '600px'
      }
    );
  }

  export(columnOrganization: ColumnOrganizationComponent) {
    return () => {
      const {useFilters, skip, limit} = this.form.getRawValue();
      const type = this.type;
      const typeMap = {
        [ExportType.csv]: {fileType: 'csv', contentType: 'text/csv'},
        [ExportType.tab]: {fileType: 'csv', contentType: 'text/csv'},
        [ExportType.json]: {fileType: 'json', contentType: 'application/json'},
        [ExportType.xls]: {
          fileType: 'xls',
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      };

      let columns = this.data.columns;

      if (columnOrganization) {
        columns = columnOrganization.save();
      }

      columns = columns.map(it => ({
        key: it.key,
        label: this.transloco.translate(it.label),
        disabled: it.disabled
      }));

      return from(
        firebase.auth().currentUser.getIdToken()
      )
        .pipe(
          switchMap(token =>
            this.http
              .post(
                this.db.url(
                  'cms-exportData/' + (
                    this.data.subCollection ?
                      this.data.subCollection
                        .replace(/\//g, '~') :
                      this.data.collection
                  )
                ),
                {
                  type,
                  ...columns && {columns},
                  ...this.data.subCollection && {collectionRef: this.data.collection},
                  ...skip && {skip},
                  ...limit && {limit},
                  ...useFilters && {filters: this.data.filterValue},
                  ...this.data.sort && {sort: this.data.sort},
                  ...this.data.ids && this.data.ids.length && {ids: this.data.ids}
                },
                {
                  responseType: 'blob',
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                }
              )
          ),
          queue(),
          notify({
            success: null,
            error: 'EXPORT.ERROR'
          }),
          tap((res) => {
            saveAs(
              new Blob([res], {type: typeMap[type].contentType}),
              `${this.data.collection}.${typeMap[type].fileType}`
            );
            this.dialog.closeAll();
          })
        );
    };
  }
}
