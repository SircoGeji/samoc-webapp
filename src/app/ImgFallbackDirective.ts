import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: 'img[appImgFallback]',
})
export class ImgFallbackDirective {
  @Input() appImgFallback: string;

  constructor(private eRef: ElementRef) {}

  @HostListener('error')
  loadFallbackOnError() {
    const element: HTMLInputElement = this.eRef
      .nativeElement as HTMLInputElement;
    element.src = this.appImgFallback || 'assets/Placeholder.png';
  }
}
