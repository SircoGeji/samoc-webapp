import { DndDirective } from './dnd.directive';

describe('DndDirective', () => {
  it('should create an instance', () => {
    const directive = new DndDirective();
    expect(directive).toBeTruthy();
  });

  it('onDrop will emit file change event when there are file', () => {
    const directive = new DndDirective();
    const spy = spyOn(directive['filesChangeEmitter'], 'emit');
    const file = new File([''], 'dummy.jpg');
    const event = {
      preventDefault: () => {},
      stopPropagation: () => {},
      dataTransfer: { files: [file] },
    };
    directive.onDrop(event);
    expect(spy).toHaveBeenCalled();
  });

  it('onDrop will not emit file change event when there no file', () => {
    const directive = new DndDirective();
    const spy = spyOn(directive['filesChangeEmitter'], 'emit');
    const event = {
      preventDefault: () => {},
      stopPropagation: () => {},
      dataTransfer: { files: [] },
    };
    directive.onDrop(event);
    expect(spy).not.toHaveBeenCalled();
  });

  it('on drag event will change background style', () => {
    const directive = new DndDirective();
    const event = new Event('dragover');
    directive.onDragOver(event);
    expect(directive['background']).toBe('#999');
    const event2 = new Event('dragleave');
    directive.onDragLeave(event2);
    expect(directive['background']).toBe('#343434');
  });
});
