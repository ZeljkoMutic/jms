import {CdkDragEnter, moveItemInArray} from '@angular/cdk/drag-drop';
import {HttpClient} from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnInit,
  TemplateRef,
  ViewChild
} from '@angular/core';
import {AngularFireStorage} from '@angular/fire/storage';
import {MatDialog} from '@angular/material';
import {forkJoin, from, of} from 'rxjs';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import {ENV_CONFIG} from '../../../../../../env-config';
import {StateService} from '../../../../../shared/services/state/state.service';
import {notify} from '../../../../../shared/utils/notify.operator';
import {COMPONENT_DATA} from '../../../utils/create-component-injector';
import {FieldComponent, FieldData} from '../../field/field.component';
import {readFile} from './read-file';

interface GalleryData extends FieldData {
  allowUrl?: boolean;
  allowServerUpload?: boolean;
}

@Component({
  selector: 'jms-gallery',
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GalleryComponent extends FieldComponent<GalleryData>
  implements OnInit {
  static STORAGE_URL =
    'https://firebasestorage.googleapis.com/v0/b/' +
    ENV_CONFIG.firebase.storageBucket;

  constructor(
    @Inject(COMPONENT_DATA) public cData: GalleryData,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private storage: AngularFireStorage,
    private state: StateService
  ) {
    super(cData);
  }

  @ViewChild('modal', {static: true})
  modalTemplate: TemplateRef<any>;

  @ViewChild('file', {static: true})
  fileEl: ElementRef<HTMLInputElement>;

  lastFrom: number;
  lastTo: number;

  isHovering: boolean;

  files: File[] = [];
  toRemove = [];

  ngOnInit() {
    this.state.uploadComponents.push(this);
  }

  toggleHover(event: boolean) {
    this.isHovering = event;
  }

  openUploadDialog() {
    this.dialog.open(this.modalTemplate);
  }

  addImage(image: string) {
    this.http
      .get(image, {
        withCredentials: false,
        responseType: 'blob'
      })
      .pipe(notify({error: 'Error on uploading image.', success: ''}))
      .subscribe(res => {
        const urlCreator = window.URL || (window as any).webkitURL;
        const value = this.cData.control.value;

        value.push({
          data: urlCreator.createObjectURL(res),
          live: true
        });

        this.cData.control.setValue(value);
        this.cdr.detectChanges();
      });
  }

  openFileUpload() {
    this.fileEl.nativeElement.click();
  }

  filesUploaded(fileList: FileList) {
    forkJoin(
      Array.from(fileList).map(file =>
        readFile(file).pipe(
          map(data => ({
            data,
            pushToLive: file,
            live: false
          }))
        )
      )
    ).subscribe(files => {
      const value = this.cData.control.value;
      value.push(...files);
      this.cData.control.setValue(value);
      this.cdr.detectChanges();
    });
  }

  entered(event: CdkDragEnter) {
    if (this.cData.control.value && this.cData.control.value.length === 1) {
      return;
    }

    this.lastFrom = event.item.data;
    this.lastTo = event.container.data;
  }

  ended() {
    if (this.cData.control.value && this.cData.control.value.length === 1) {
      return;
    }

    if (this.lastFrom === undefined || this.lastTo === undefined) {
      return;
    }

    moveItemInArray(this.cData.control.value, this.lastFrom, this.lastTo);
  }

  removeImage(index: number, item) {
    if (item.live && item.data.includes(GalleryComponent.STORAGE_URL)) {
      this.toRemove.push(item.data);
    }

    this.cData.control.value.splice(index, 1);
  }

  /**
   * Executes all uploads/removes to persist
   * the changes on server
   */
  save() {
    if (
      !this.toRemove.length &&
      !this.cData.control.value.find(val => !val.live)
    ) {
      return of([]);
    }

    return forkJoin([
      ...this.toRemove.map(file =>
        from(this.storage.storage.refFromURL(file).delete()).pipe(
          /**
           * Dont' fail if files didn't delete
           */
          catchError(() => of([]))
        )
      ),
      ...this.cData.control.value.reduce((acc, cur) => {
        if (cur.live !== undefined && !cur.live) {
          acc.push(
            from(
              this.storage.upload(cur.pushToLive.name, cur.pushToLive, {
                contentType: cur.pushToLive.type
              })
            ).pipe(
              switchMap(task => task.ref.getDownloadURL()),
              tap(url => {
                cur.data = url;
              })
            )
          );
        } else {
          acc.push(cur);
        }

        return acc;
      }, [])
    ]).pipe(
      tap(() =>
        this.cData.control.setValue(
          this.cData.control.value.map(item => (item.data ? item.data : item))
        )
      )
    );
  }
}
