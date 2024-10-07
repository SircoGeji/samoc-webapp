import { Injectable } from '@angular/core';
import { AndroidEnv } from '../types/enum';

@Injectable({
  providedIn: 'root',
})
export class AndroidManagementService {
  private pageSizeOptions: number[] = [50, 100, 250];
  constructor() {}

  refreshTablePageNavigation(componentRouter: any) {
    let currentUrl = componentRouter.url;
    componentRouter.routeReuseStrategy.shouldReuseRoute = () => false;
    componentRouter.onSameUrlNavigation = 'reload';
    componentRouter.navigate([currentUrl]);
  }

  getModuleDeploymentString(deployedTo: string) {
    if (
      deployedTo.includes(AndroidEnv.DEV) &&
      deployedTo.includes(AndroidEnv.PROD)
    ) {
      return 'Client Dev, Production';
    } else if (deployedTo.includes(AndroidEnv.DEV)) {
      return 'Client Dev';
    } else if (deployedTo.includes(AndroidEnv.PROD)) {
      return 'Production';
    }
  }

  getModuleActiveString(activeOn: string) {
    if (
      activeOn.includes(AndroidEnv.DEV) &&
      activeOn.includes(AndroidEnv.PROD)
    ) {
      return 'D, P';
    } else if (activeOn.includes(AndroidEnv.DEV)) {
      return 'D';
    } else if (activeOn.includes(AndroidEnv.PROD)) {
      return 'P';
    }
  }

  isModulePublishedOnAllEnv(module: any): boolean {
    return (
      module.deployedTo.includes(AndroidEnv.DEV) &&
      module.deployedTo.includes(AndroidEnv.PROD)
    );
  }

  getStatusTitle(status: string): string {
    let statusArr = status.split(' ');
    statusArr.forEach((word, i) => {
      statusArr[i] = word[0].toUpperCase() + word.slice(1);
    });
    return statusArr.join(' ');
  }

  getPageSizeOptions(): any[] {
    return [...this.pageSizeOptions];
  }

  getPageSizeLocalStorageKey(module: string): string {
    return `android${module}PageSize`;
  }

  getPageSize(module: string): number {
    const localStoragePageSize = localStorage.getItem(
      this.getPageSizeLocalStorageKey(module),
    );
    if (!!localStoragePageSize) {
      return Number(localStoragePageSize);
    } else {
      return this.pageSizeOptions[0];
    }
  }

  setPageSize(module: string, size): void {
    localStorage.setItem(this.getPageSizeLocalStorageKey(module), size);
  }

  getModulesListChanges(
    importedData: any[],
    changedData: any[],
    index: string,
    stringParam: string,
  ) {
    let changes: any = {
      added: [],
      removed: [],
    };
    importedData.forEach((module) => {
      const foundUpdatedModule = changedData.find(
        (changedModule) => changedModule[index] === module[index],
      );
      // IF old module has isPublished checked AND new doesn't
      if (!!module.isPublished && !foundUpdatedModule.isPublished) {
        changes.removed.push(module[stringParam]);
      }
      // IF new module has isPublished checked AND old doesn't
      if (!module.isPublished && !!foundUpdatedModule.isPublished) {
        changes.added.push(module[stringParam]);
      }
    });
    return changes;
  }
}
