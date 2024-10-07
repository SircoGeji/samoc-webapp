import {
  Component,
  ElementRef,
  ViewChild,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { elementAt, filter, takeUntil } from 'rxjs/operators';
import { RokuService } from '../../../service/roku.service';
import { removeXid } from '../../../helpers/string-utils';

@Component({
  selector: 'roku-images-drop',
  templateUrl: './roku-images-drop.component.html',
  styleUrls: ['./roku-images-drop.component.scss'],
})
export class RokuImagesDropComponent {
  public singleImage: boolean = true;
  public uploadError: string = '';
  public uploadPending: boolean = false;
  public uploadFinished: boolean = false;
  public images: any[] = [];

  private _isDragging: boolean;
  private _destroy$ = new Subject<void>();

  constructor(
    private rokuService: RokuService,
  ) { }

  @ViewChild('fileSelector') public fileSelector: ElementRef;
  @Input() public uploadMultipleImages: boolean;
  @Input() public dimensions: string;
  @Input() public maxSizeStr: string;
  @Input() public maxSize: number;
  @Output() public selectedFiles = new EventEmitter<File[]>();
  @Input() private store: any;
  @Input() private product: any;
  @Input() private galleryNames: string[];

  public get isDragging(): boolean { return this._isDragging; }

  public onDrop(event: any): void {
    this.uploadFinished = false;
    // Stop browser opening the file
    event.preventDefault();
    this._isDragging = false;

    const result: any[] = [];
    if (event.dataTransfer.items) {
      // Use DataTransferItemList interface to access the file(s)
      for (const item of event.dataTransfer.items) {
        if (item.kind !== 'file') {
          return;
        }
        if (item.getAsFile().type.includes('jpg') || item.getAsFile().type.includes('jpeg')) {
          this.uploadError = '';
          result.push(item.getAsFile());
        } else {
          this.uploadError = 'You can upload only images of JPG or JPEG types';
          break;
        }
      }
    } else {
      // Use DataTransfer interface to access the file(s)
      for (const file of event.dataTransfer.files) {
        if (file.type.includes('jpg') || file.type.includes('jpeg')) {
          this.uploadError = '';
          result.push(file);
        } else {
          this.uploadError = 'You can upload only images of JPG or JPEG types';
          break;
        }
      }
    }
    if (!this.uploadError) {
      this.uploadPending = true;
      this.uploadImageToS3(result);
    }
  }

  public onFilesSelected(files: any[]): void {
    this.uploadFinished = false;
    if (files == undefined || files.length === 0) {
      return;
    }

    const result: any[] = [];
    for (const file of files) {
      if (file.type.includes('jpg') || file.type.includes('jpeg')) {
        this.uploadError = '';
        result.push(file);
      } else {
        this.uploadError = 'You can upload only images of JPG or JPEG types';
        break;
      }
    }
    
    this.fileSelector.nativeElement.value = ''; // required to trigger (change) if user immediately uploads same named file 
    if (!this.uploadError) {
      this.uploadPending = true;
      this.uploadImageToS3(result);
    }
  }

  public onDragOver(event: any): void {
    // Stop browser opening the file
    event.preventDefault();
    this._isDragging = true;
  }

  public stopDrag(event: any): void {
    this._isDragging = false;
    event.preventDefault();
    event.stopPropagation();
  }

  private async uploadImageToS3(images) {
    try {
      let imageNames: string[] = [];
      images.forEach((image) => {
        let name = image.name.replace(/\.[^/.]+$/, '');
        if (
          (this.galleryNames as string[]).length &&
          (this.galleryNames as string[]).includes(name)
        ) {
          imageNames.push(this.getNewImageName(name));
        } else {
          imageNames.push(name);
        }
      });
      this.rokuService
        .uploadImageToS3(
          'gallery',
          images,
          imageNames,
          this.store.code,
          this.product.code,
          this.dimensions !== '' ? this.dimensions : '',
          this.maxSize !== 0 ? this.maxSize : 0,
          this.maxSizeStr !== '' ? this.maxSizeStr : '',
        )
        .pipe(takeUntil(this._destroy$))
        .subscribe(
          (res) => {
            if (res && res.data.length) {
              this.images = res.data.map((imageObj, i) => {
                const type = images[i].type.replace('image/', '').toUpperCase();
                return {
                  path: imageObj.url,
                  name: imageNames[i].replace(/\.[^/.]+$/, ''),
                  size: images[i].size,
                  dimensions: imageObj.dimensions,
                  type,
                }
              });
              
              this.uploadFinished = true;
              this.singleImage = this.images.length === 1;
              this.emitFiles(this.images);
            }
            this.uploadPending = false;
          },
          (err) => {
            this.uploadError = removeXid(err.error.message);
            this.uploadPending = false;
          },
        );
    } catch (err) {
      this.uploadError = removeXid(err.error.message);
      this.uploadPending = false;
    }
  }

  private getNewImageName(name: string): string {
    let index = 1;
    name = `${name}_${index}`;
    while ((this.galleryNames as string[]).includes(name)) {
      const nameSubstring = name.substr(0, name.indexOf(`_${index}`));
      index++;
      name = `${nameSubstring}_${index}`;
    }
    return name;
  }

  private emitFiles(files: File[]): void {
    this.selectedFiles.emit(files);
  }
}
