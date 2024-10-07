import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { UploadService } from '../../service/upload.service';
import { DndComponent } from './dnd.component';
import testImageValid from '../../../assets/validImage.jpg';
import testImageInvalid from '../../../assets/invalidImage.jpg';
import { of } from 'rxjs';

describe('DndComponent', () => {
  let component: DndComponent;
  let fixture: ComponentFixture<DndComponent>;
  let uploadService: UploadService;
  let imageFileValid;
  let imageFileInvalid;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [DndComponent],
        imports: [
          HttpClientTestingModule,
          MatDialogModule,
          RouterTestingModule,
          BrowserAnimationsModule,
        ],
        providers: [
          {
            provide: UploadService,
            useValue: {
              uploadImage: () => of({}),
            },
          },
        ],
      }).compileComponents();
    }),
  );

  beforeEach(async () => {
    fixture = TestBed.createComponent(DndComponent);
    uploadService = TestBed.inject(UploadService);
    component = fixture.componentInstance;
    fixture.detectChanges();

    imageFileValid = await fetch(testImageValid)
      .then((r) => r.blob())
      .then(
        (blobFile) =>
          new File([blobFile], 'testImageValid.jpg', { type: 'image/jpg' }),
      );

    imageFileInvalid = await fetch(testImageInvalid)
      .then((r) => r.blob())
      .then(
        (blobFile) =>
          new File([blobFile], 'testImageInvalid.jpg', { type: 'image/jpg' }),
      );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not accept file that is not an image', () => {
    const blob = new Blob([''], { type: 'text/html' });
    blob['lastModifiedDate'] = '';
    blob['name'] = 'filename';
    const file = blob as File;
    const fileList = {
      0: file,
      1: file,
      length: 2,
      item: (index: number) => file,
    };
    const spy = spyOn(component, 'openErrorDialog');
    component.onFilesChange(fileList);
    expect(spy).toHaveBeenCalledWith(
      new Error(
        'Invalid file format, only JPG, JPEG and PNG files are supported for upload.',
      ),
      { reload: false },
    );
  });

  it('should not accept image with invalid dimensions', () => {
    const file = imageFileInvalid;
    const fileList = {
      0: file,
      1: file,
      length: 2,
      item: (index: number) => file,
    };
    const spy = spyOn(component, 'openErrorDialog');
    fixture.detectChanges();
    component.onFilesChange(fileList);
  });

  it('should accept a valid file', () => {
    const file = imageFileValid;
    const fileList = {
      0: file,
      1: file,
      length: 2,
      item: (index: number) => file,
    };
    const spy = spyOn(URL, 'createObjectURL');
    fixture.detectChanges();
    component.onFilesChange(fileList);
    expect(spy).toHaveBeenCalled();
  });

  it('upload image should call upload image service', async () => {
    const spy = spyOn(uploadService, 'uploadImage');
    const file = imageFileValid;
    await component.uploadImage(file);
    expect(spy).toHaveBeenCalled();
  });
});
