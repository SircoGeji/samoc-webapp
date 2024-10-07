import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RokuManagementUtils {
  private pageSizeOptions: number[] = [50, 100, 250];
  constructor() {}

  refreshTablePageNavigation(componentRouter: any) {
    let currentUrl = componentRouter.url;
    componentRouter.routeReuseStrategy.shouldReuseRoute = () => false;
    componentRouter.onSameUrlNavigation = 'reload';
    componentRouter.navigate([currentUrl]);
  }

  getModuleDeploymentString(deployedTo: string) {
    if (deployedTo.includes('dev') && deployedTo.includes('prod')) {
      return 'Client Dev, Production';
    } else if (deployedTo.includes('dev')) {
      return 'Client Dev';
    } else if (deployedTo.includes('prod')) {
      return 'Production';
    }
  }

  getModuleActiveString(activeOn: string) {
    if (activeOn.includes('dev') && activeOn.includes('prod')) {
      return 'D, P';
    } else if (activeOn.includes('dev')) {
      return 'D';
    } else if (activeOn.includes('prod')) {
      return 'P';
    }
  }

  isModulePublishedOnAllEnv(module: any): boolean {
    return (
      module.deployedTo.includes('dev') && module.deployedTo.includes('prod')
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
    return `roku${module}PageSize`;
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
      if (
        !!module.isPublished &&
        !foundUpdatedModule.isPublished
      ) {
        changes.removed.push(module[stringParam]);
      }
      // IF new module has isPublished checked AND old doesn't
      if (
        !module.isPublished &&
        !!foundUpdatedModule.isPublished
      ) {
        changes.added.push(module[stringParam]);
      }
    });
    return changes;
  }
}
