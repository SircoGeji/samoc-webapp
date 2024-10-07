import {
  Directive,
  EventEmitter,
  HostBinding,
  HostListener,
  Output,
} from '@angular/core';

@Directive({
  selector: '[appDnd]',
})
export class DndDirective {
  @Output()
  private filesChangeEmitter: EventEmitter<FileList> = new EventEmitter();
  @HostBinding('style.background') private background = '#343434';

  constructor() {}

  @HostListener('dragover', ['$event']) onDragOver(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    this.background = '#999';
  }

  @HostListener('dragleave', ['$event'])
  public onDragLeave(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    this.background = '#343434';
  }

  @HostListener('drop', ['$event'])
  public onDrop(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    this.background = '#343434';
    const files = evt.dataTransfer.files;
    if (files.length > 0) {
      this.filesChangeEmitter.emit(files);
    }
  }
}
