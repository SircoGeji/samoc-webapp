import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UploadService } from '../../service/upload.service';
import { BaseComponent } from '../base/base.component';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { LoaderService } from '../../service/loader.service';
import { FILE_EXT_REGEXP, SUPPORTED_DIMENSIONS } from '../../constants';
import * as pluralize from 'pluralize';
import { OpenErrorDialogOptions } from '../../types/OpenErrorDialogOptions';

@Component({
  selector: 'app-dnd',
  templateUrl: './dnd.component.html',
  styleUrls: ['./dnd.component.scss'],
})
export class DndComponent extends BaseComponent {
  @Output() dndCompleted: EventEmitter<string> = new EventEmitter<string>();
  @Input() imgSrc: string;
  @Input() editableDnd: boolean;
  public fileList: any = [];
  public showPlaceHolder = true;
  public hintText = `Supported images (JPG, JPEG, PNG) and dimensions ${pluralize(
    'is',
    SUPPORTED_DIMENSIONS.length,
  )} ${SUPPORTED_DIMENSIONS}.`;

  constructor(
    private uploadService: UploadService,
    public dialog: MatDialog,
    public router: Router,
    public loaderService: LoaderService,
  ) {
    super(dialog, loaderService, router);
  }

  async onFilesChange(fileList: FileList) {
    this.loaderService.show();
    // this.dndCompleted.emit('');  // samoc-503 fix
    this.fileList = fileList;

    const file = fileList[0]; // only take first file, ignore rest
    const fileName = file.name;
    const found = fileName.match(FILE_EXT_REGEXP);

    // check file extension
    if (
      !found ||
      found.length === 0 ||
      (file && file.type && file.type.indexOf('image') < 0)
    ) {
      this.openErrorDialog(
        new Error(
          'Invalid file format, only JPG, JPEG and PNG files are supported for upload.',
        ),
        {
          reload: false,
        } as OpenErrorDialogOptions,
      );
      return;
    }

    // check image dimensions (2560x1440)
    const reader = new FileReader();
    const img = new Image();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      setTimeout(async () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        window.URL.revokeObjectURL(img.src);
        const dimension = `${width}x${height}`;
        if (!SUPPORTED_DIMENSIONS.includes(dimension)) {
          this.openErrorDialog(
            new Error(
              `Unsupported image dimensions, only ${SUPPORTED_DIMENSIONS} ${pluralize(
                'is',
                SUPPORTED_DIMENSIONS.length,
              )} allowed.`,
            ),
            {
              reload: false,
            } as OpenErrorDialogOptions,
          );
          return;
        }

        // Uploading image
        const response = (await this.uploadImage(file)) as any;
        const url = response.data.url;
        if (url) {
          this.dndCompleted.emit(url);
          this.imgSrc = url;
          this.showPlaceHolder = false;
        }
        this.loaderService.hide();
      }, 500);
    };
    const _URL = window.URL || window.webkitURL;
    img.src = _URL.createObjectURL(file);
  }

  async uploadImage(file) {
    try {
      return await this.uploadService.uploadImage(file).toPromise();
    } catch (err) {
      this.openErrorDialog(err, {
        reload: false,
      } as OpenErrorDialogOptions);
      this.loaderService.hide();
    }
  }
}
