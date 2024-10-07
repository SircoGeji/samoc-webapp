import { Injectable } from '@angular/core';
import {
  CdkDragDrop,
  copyArrayItem,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';

@Injectable()
export class ShareService {
  constructor() {}

  public drop(event: CdkDragDrop<string[]>) {
    if (
      event.previousContainer.id === 'all-offers-list' &&
      event.container.id !== 'all-offers-list'
    ) {
      copyArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    } else if (event.container.id !== 'all-offers-list') {
      if (event.previousContainer === event.container) {
        moveItemInArray(
          event.container.data,
          event.previousIndex,
          event.currentIndex,
        );
      } else {
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex,
        );
      }
    }
  }

  public drop2(event: CdkDragDrop<string[]>) {
    const previousContainerId: string = event.previousContainer.id as string;
    const currentContainerId: string = event.container.id as string;
    if (
      previousContainerId.includes('primary') ||
      previousContainerId.includes('secondary')
    ) {
      if (previousContainerId === currentContainerId) {
        moveItemInArray(
          event.container.data,
          event.previousIndex,
          event.currentIndex,
        );
      } else {
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex,
        );
      }
    } else if (
      previousContainerId.includes('all') &&
      ((previousContainerId.includes('apple') &&
        currentContainerId.includes('apple')) ||
        (previousContainerId.includes('google') &&
          currentContainerId.includes('google')) ||
        (previousContainerId.includes('recurly') &&
          currentContainerId.includes('recurly')))
    ) {
      copyArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }
}
