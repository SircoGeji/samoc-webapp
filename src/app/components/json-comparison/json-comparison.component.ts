import {
  Component,
  OnInit,
  OnDestroy,
  Renderer2,
  AfterViewInit,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-json-comparison',
  templateUrl: './json-comparison.component.html',
  styleUrls: ['./json-comparison.component.scss'],
})
export class JsonComparisonComponent
  implements OnInit, OnDestroy, AfterViewInit {
  @Input() env: string;
  @Input() leftVersion: string;
  @Input() rightVersion: string;
  @Input() leftTree: any;
  @Input() rightTree: any;
  @Input() hideInitialStep = true;
  @Input() hideReport = true;
  @Output() differenceReport: EventEmitter<any> = new EventEmitter();
  @ViewChild('compare') elementRef: ElementRef;
  @ViewChild('previousCodeContent') previousCodeContent: ElementRef;
  @ViewChild('currentCodeContent') currentCodeContent: ElementRef;

  public reportData: any;

  private currentElement = '';

  constructor(private renderer: Renderer2) {}

  ngOnInit(): void {}

  ngAfterViewInit() {
    this.addDiffFiles();
  }

  emitReportData(data) {
    if (data) {
      this.reportData = JSON.parse(data);
    } else {
      this.reportData = {
        incorrectTypes: 0,
        missingProperties: 0,
        totalDiffCount: 0,
        unequalValues: 0,
      };
    }
    this.differenceReport.emit(this.reportData);
  }

  addDiffFiles() {
    this.addCssToElement('assets/jdd-resources/styles/jdd.css');
    new Observable((res) => {
      this.addJsToElement(
        'assets/jdd-resources/js-files/jQuery.min.js',
      ).onload = (test) => {
        return res.next();
      };
    }).subscribe((data) => {
      this.addJsToElement(
        'assets/jdd-resources/js-files/jsl.format.js',
      ).onload = (test) => {
        (document as any).leftTree = this.leftTree;
        (document as any).rightTree = this.rightTree;
        this.addJsToElement('assets/jdd-resources/js-files/jsl.parser.js');
        this.addJsToElement('assets/jdd-resources/js-files/jdd.js');
      };
    });
  }

  addCssToElement(src: string) {
    const headID = document.getElementsByTagName('head')[0];
    const link = document.createElement('link');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.media = 'screen';
    link.href = src;
    headID.appendChild(link);
  }

  addJsToElement(src: string): HTMLScriptElement {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.charset = 'utf-8';
    script.src = src;
    this.renderer.appendChild(document.body, script);
    return script;
  }

  deleteDiffFiles() {
    const scripts = document.getElementsByTagName('script');
    let i = scripts.length;
    while (i--) {
      if (
        scripts[i].src.includes(
          'assets/jdd-resources/js-files/jQuery.min.js',
        ) ||
        scripts[i].src.includes(
          'assets/jdd-resources/js-files/jsl.format.js',
        ) ||
        scripts[i].src.includes(
          'assets/jdd-resources/js-files/jsl.parser.js',
        ) ||
        scripts[i].src.includes('assets/jdd-resources/js-files/jdd.js')
      ) {
        (scripts[i] as any).parentNode.removeChild(scripts[i]);
      }
    }

    const styles = window.document.getElementsByTagName('link');
    let j = styles.length;
    while (j--) {
      if (
        styles[j].href.includes('assets/bpmn/bpmn-resources/styles/jdd.css')
      ) {
        (styles[j] as any).parentNode.removeChild(styles[j]);
      }
    }
  }

  updateVerticalScroll(event): void {
    if (this.currentElement === 'previousCodeContent') {
      this.currentCodeContent.nativeElement.scrollTop = event.target.scrollTop;
    } else if (this.currentElement === 'currentCodeContent') {
      this.previousCodeContent.nativeElement.scrollTop = event.target.scrollTop;
    }
  }

  updateCurrentElement(element: 'previousCodeContent' | 'currentCodeContent') {
    this.currentElement = element;
  }

  ngOnDestroy() {
    this.deleteDiffFiles();
  }
}
