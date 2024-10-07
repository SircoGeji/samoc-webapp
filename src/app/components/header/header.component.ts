import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { AuthenticationService } from '../../service/authentication.service';
import { ConfigurationService } from '../../service/configuration.service';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { NGXLogger } from 'ngx-logger';
import {
  Brand,
  NavLink,
  Region,
  Store,
  StorePayload,
} from '../../types/payload';
import { WebSocketService } from '../../service/web-socket.service';
import { PlatformEnum, SettingsTabEnum } from '../../types/enum';
import { AndroidService } from '../../service/android.service';
import { elementAt, filter, takeUntil } from 'rxjs/operators';
import { Observable, Subject, Subscription } from 'rxjs';
import { RokuService } from '../../service/roku.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent implements OnInit, OnDestroy {
  navLinks: NavLink[];
  activeLinkIndex = -1;
  brand: string;
  region: string;
  store: string;
  regions: Region[];
  brands: Brand[];
  stores: Store[];

  public currentPlatformAndroid: boolean;
  public currentPlatformRoku: boolean;

  public androidEnvs: any[];
  public androidStores: any[];
  public androidProducts: any[];
  public androidEnv: any[];
  public androidStore: string;
  public androidProduct: string;
  public androidEnvSubscription: Subscription;
  public androidStoreSubscription: Subscription;
  public androidProductSubscription: Subscription;

  public rokuEnvs: any[];
  public rokuStores: any[];
  public rokuProducts: any[];
  public rokuEnv: any[];
  public rokuStore: string;
  public rokuProduct: string;
  public rokuEnvSubscription: Subscription;
  public rokuStoreSubscription: Subscription;
  public rokuProductSubscription: Subscription;

  showBrandsButton = false;
  showRegionsButton = false;
  showTab = false;
  showTaskbar = false;
  showIcon = false;
  disable = false;
  healthStatus = true;
  brandSubscription: Subscription;
  regionSubscription: Subscription;
  routerSubscription: Subscription;
  storeSubscription: Subscription;
  healthSubscription: Subscription;
  webappVer: string;
  serverVer: string;
  newRegion: boolean;
  newBrand: boolean;
  serverInfo: string;

  private samocLinks = [
    // {
    //   label: 'INTERNATIONAL OFFERS',
    //   link: '/inter-offers',
    //   index: 0,
    // },
    {
      label: 'OFFERS',
      link: '/offers',
      index: 1,
    },
    {
      label: 'PLANS',
      link: '/plans',
      index: 2,
    },
    {
      label: 'RETENTION OFFER FILTERS',
      link: '/filters',
      index: 3,
    },
    {
      label: 'CANCEL 2.0',
      link: '/filters-2',
      index: 4,
    },
    // {
    //   label: 'I18N',
    //   link: '/translations',
    //   index: 5,
    // },
    {
      label: 'EXTENSION OFFER CONFIG',
      link: '/extension-config',
      index: 6,
    },
  ];
  private androidLinks = [
    {
      label: 'SKU',
      link: '/android/sku',
      index: 0,
    },
    {
      label: 'APP COPY',
      link: '/android/app-copy',
      index: 1,
    },
    {
      label: 'STORE COPY',
      link: '/android/store-copy',
      index: 2,
    },
    {
      label: 'IMAGES',
      link: '/android/images',
      index: 3,
    },
    {
      label: 'CAMPAIGNS',
      link: '/android/campaigns',
      index: 4,
    },
    {
      label: 'REGIONS',
      link: '/android/regions-languages',
      index: 5,
    },
  ];
  private rokuLinks = [
    {
      label: 'SKU',
      link: '/roku/sku',
      index: 0,
    },
    {
      label: 'APP COPY',
      link: '/roku/app-copy',
      index: 1,
    },
    {
      label: 'STORE COPY',
      link: '/roku/store-copy',
      index: 2,
    },
    {
      label: 'IMAGES',
      link: '/roku/images',
      index: 3,
    },
    {
      label: 'CAMPAIGNS',
      link: '/roku/campaigns',
      index: 4,
    },
    {
      label: 'REGIONS',
      link: '/roku/regions-languages',
      index: 5,
    },
  ];
  private destroy$ = new Subject<void>();

  constructor(
    private webSocketService: WebSocketService,
    private router: Router,
    private authenticationService: AuthenticationService,
    private route: ActivatedRoute,
    private configService: ConfigurationService,
    private logger: NGXLogger,
    private androidService: AndroidService,
    private rokuService: RokuService,
  ) {
    const store = JSON.parse(localStorage.getItem('store') as string);
    if (
      (this.router.url === '/offers' ||
        this.router.url === '/inter-offers' ||
        this.router.url === '/plans' ||
        this.router.url === '/extension-config' ||
        this.router.url === '/filters' ||
        this.router.url === '/filters-2') &&
      store &&
      (store.id === PlatformEnum.ANDROID || store.id === PlatformEnum.ROKU)
    ) {
      localStorage.removeItem('store');
      localStorage.removeItem('region');
    }
    if (
      this.router.url === '/android/sku' ||
      this.router.url === '/android/regions-languages' ||
      this.router.url === '/android/app-copy' ||
      this.router.url === '/android/store-copy' ||
      this.router.url === '/android/campaigns' ||
      this.router.url === '/android/images'
    ) {
      this.currentPlatformAndroid = true;
      this.currentPlatformRoku = false;
      this.navLinks = this.androidLinks;
    } else {
      this.currentPlatformAndroid = false;
      this.currentPlatformRoku = false;
      this.navLinks = this.samocLinks;
    }
    if (
      this.router.url === '/roku/regions-languages' ||
      this.router.url === '/roku/sku' ||
      this.router.url === '/roku/app-copy' ||
      this.router.url === '/roku/images' ||
      this.router.url === '/roku/campaigns' ||
      this.router.url === '/roku/store-copy'
    ) {
      this.currentPlatformAndroid = false;
      this.currentPlatformRoku = true;
      this.navLinks = this.rokuLinks;
    }

    this.webappVer = `v${environment.appVersion}`;
    this.serverVer = 'n/a';
    this.serverInfo = ``;
  }

  ngOnInit(): void {
    this.webSocketService
      .listen('health-status-update')
      .subscribe((data: any) => {
        this.healthUpdatedHandler(data);
      });

    this.fetchConfig();

    this.fetchHealthStatus();
    this.fetchStatus();
    this.routerSubscription = this.router.events.subscribe(() => {
      this.activeLinkIndex = this.navLinks.indexOf(
        this.navLinks.find(
          (tab) => tab.link === '.' + this.router.url,
        ) as NavLink,
      );
    });

    if (
      this.router.url === '/offers' ||
      this.router.url === '/inter-offers' ||
      this.router.url === '/plans' ||
      this.router.url === '/extension-config' ||
      this.router.url === '/filters' ||
      this.router.url === '/filters-2' ||
      this.router.url === '/translations' ||
      this.router.url === '/android/sku' ||
      this.router.url === '/android/regions-languages' ||
      this.router.url === '/android/app-copy' ||
      this.router.url === '/android/store-copy' ||
      this.router.url === '/android/campaigns' ||
      this.router.url === '/android/images' ||
      this.router.url === '/roku/regions-languages' ||
      this.router.url === '/roku/sku' ||
      this.router.url === '/roku/app-copy' ||
      this.router.url === '/roku/images' ||
      this.router.url === '/roku/campaigns' ||
      this.router.url === '/roku/store-copy' ||
      this.router.url.includes('/settings')
    ) {
      this.showTab = true;
      this.showTaskbar = true;
      this.showIcon = true;
      this.disable = false;
    } else if (
      this.router.url === '/plans/create' ||
      this.router.url === '/offers/create' ||
      this.router.url === '/inter-offers/inter-create/:offerType' ||
      this.route.routeConfig?.path === 'offers/update/:offerCode' ||
      this.route.routeConfig?.path ===
        'inter-offers/inter-update/:offerType/:campaign' ||
      this.route.routeConfig?.path === 'offers/detail/:offerCode' ||
      this.route.routeConfig?.path === 'inter-offers/inter-detail/:campaign' ||
      this.route.routeConfig?.path === 'plans/update/:planCode' ||
      this.route.routeConfig?.path === 'plans/detail/:planCode' ||
      this.route.routeConfig?.path === 'offers/create' ||
      this.route.routeConfig?.path === 'inter-offers/inter-create/:offerType' ||
      this.route.routeConfig?.path === 'settings/:tab' ||
      // android
      this.router.url.includes('/android/sku/') ||
      this.router.url.includes('/android/app-copy/') ||
      this.router.url.includes('/android/store-copy/') ||
      this.router.url.includes('/android/campaigns/') ||
      this.router.url.includes('/android/images/') ||
      this.router.url.includes('/android/regions-languages/') ||
      //roku
      this.router.url.includes('/roku/sku/') ||
      this.router.url.includes('/roku/app-copy/') ||
      this.router.url.includes('/roku/regions-languages/') ||
      this.router.url.includes('/roku/images') ||
      this.router.url.includes('/roku/campaigns') ||
      this.router.url.includes('/roku/store-copy')
    ) {
      this.showTab = false;
      this.showTaskbar = true;
      this.showIcon = false;
      this.disable = true;
    }

    if (
      this.router.url === '/inter-offers' ||
      this.router.url === '/inter-offers/inter-create/:offerType' ||
      this.router.url === '/android/app-copy' ||
      this.router.url === '/android/store-copy' ||
      this.router.url === '/android/sku' ||
      this.router.url === '/android/regions-languages' ||
      this.router.url === '/android/campaigns' ||
      this.router.url === '/android/images' ||
      this.route.routeConfig?.path ===
        'inter-offers/inter-update/:offerType/:campaign' ||
      this.route.routeConfig?.path === 'inter-offers/inter-detail/:campaign' ||
      this.route.routeConfig?.path === 'inter-offers/inter-create/:offerType' ||
      this.router.url === '/roku/sku' ||
      this.router.url === '/roku/app-copy' ||
      this.router.url === '/roku/regions-languages' ||
      this.router.url === '/roku/images' ||
      this.router.url === '/roku/campaigns' ||
      this.router.url === '/roku/store-copy'
    ) {
      this.showBrandsButton = false;
      this.showRegionsButton = false;
    } else {
      this.showBrandsButton = true;
      this.showRegionsButton = true;
    }
  }

  healthUpdatedHandler(data: any): void {
    this.healthStatus = !!data.success;
  }

  buildBrands(brands) {
    const array: any[] = [];
    for (const brand in brands) {
      if (brands[brand]) {
        const obj: { id?: string; title?: string } = {};
        obj.id = brand;
        obj.title = brands[brand].displayName;
        array.push(obj);
      }
    }
    return array;
  }

  buildStores(stores) {
    const array: any[] = [];
    for (const store in stores) {
      if (stores[store]) {
        const obj: { storeCode?: string; title?: string; id?: string } = {};
        obj.storeCode = stores[store].storeCode;
        obj.title = stores[store].displayName;
        obj.id = store;
        array.push(obj);
      }
    }
    return array;
  }

  changeRegion(region) {
    this.newRegion = true;
    this.newBrand = true;
    this.configService.setRegion(region);
  }

  changeBrand(brand) {
    this.newBrand = true;
    this.configService.setBrand(brand);
  }

  changeStore(store) {
    this.configService.setStore(store);
    this.setNavLinks(store);

    if (this.currentPlatformAndroid) {
      this.setAndroidEnv();
      this.setAndroidStores();
      this.setAndroidProducts();
    }
    if (this.currentPlatformRoku) {
      this.setRokuEnv();
      // this.setRokuStores();
      this.setRokuProducts();
    }
  }

  changeAndroidEnv(env) {
    this.androidService.setEnv(env);
  }

  changeAndroidStore(store) {
    this.androidService.setStore(store);
  }

  changeAndroidProduct(product) {
    this.androidService.setProduct(product);
  }

  changeRokuEnv(env) {
    this.rokuService.setEnv(env);
  }

  changeRokuStore(store) {
    this.rokuService.setStore(store);
  }

  changeRokuProduct(product) {
    this.rokuService.setProduct(product);
  }

  async logout() {
    try {
      const data = await this.authenticationService.logout().toPromise();
      localStorage.clear();
      await this.router.navigate(['/login']);
      // window.location.reload();
    } catch (err) {
      this.logger.error(err);
    }
  }

  async fetchConfig() {
    try {
      let data = this.configService.getConfigResponse();
      if (data == null) {
        data = await (<StorePayload>(
          this.configService.fetchConfig().toPromise()
        ));
        this.configService.setConfigResponse(data['data']);
      }

      this.regions = this.getActiveRegions(this.configService.getRegions());
      this.regionSubscription = this.configService.region.subscribe((value) => {
        if (value !== null) {
          const result = this.configService.getConfigResponse();
          this.brands = this.buildBrands(result[value.id]['brands']);
          if (this.newRegion) {
            const brand = this.configService.getBrand();
            if (result[value.id]['brands'][brand.id] !== undefined) {
              this.configService.setBrand(brand);
              this.brand = brand.title;
            } else {
              this.configService.setBrand(this.brands[0]);
              this.brand = this.brands[0]['title'];
            }
            this.newRegion = false;
          }
          this.region = value.title;
        }
      });

      this.brandSubscription = this.configService.brand.subscribe((value) => {
        if (value !== null) {
          const result = this.configService.getConfigResponse();
          const region = this.configService.getRegion();
          this.brand = value.title;
          this.stores = this.buildStores(
            result[region.id]['brands'][value.id]['platforms'],
          );
          if (this.isAndroidNavLinks()) {
            const androidStore = this.stores.filter((store) => {
              return store.id === PlatformEnum.ANDROID;
            });
            this.changeStore(androidStore[0]);
          }
          if (this.isRokuNavLinks()) {
            const rokuStore = this.stores.filter((store) => {
              return store.id === PlatformEnum.ROKU;
            });
            this.changeStore(rokuStore[0]);
          }
          const currentStore = this.configService.getStore();
          this.setNavLinks(currentStore);
          // if (this.newBrand) {
          //   const check =
          //     result[region.id]['brands'][value.id]['platforms'][
          //     currentStore.id
          //     ];
          //   if (
          //     result[region.id]['brands'][value.id]['platforms'][
          //     currentStore.id
          //     ] !== undefined
          //   ) {
          //     const store = this.stores.filter((obj) => {
          //       return obj['id'] === currentStore.id;
          //     });

          //     this.configService.setStore(store[0]);
          //   } else {
          //     this.configService.setStore(this.stores[0]);
          //   }
          //   this.newBrand = false;
          // }
        }
      });

      this.storeSubscription = this.configService.store.subscribe((value) => {
        if (value !== null) {
          this.store = value.title;
        }
      });
    } catch (err) {
      this.logger.error(err);
    }
  }

  getActiveRegions(regions: Region[]): Region[] {
    let platform: String;
    if (this.currentPlatformAndroid) {
      platform = 'android';
    } else if (this.currentPlatformRoku) {
      platform = 'roku';
    } else {
      platform = 'web';
    }
    let activeRegions: Region[] = [];
    for (const region in regions) {
      if (regions[region].storefronts?.includes(platform)) {
        activeRegions.push(regions[region]);
      }
    }
    return activeRegions;
  }

  isAndroidNavLinks(): boolean {
    return this.router.url.includes('/android');
  }

  isRokuNavLinks(): boolean {
    return this.router.url.includes('/roku');
  }

  setAndroidEnv(): void {
    this.androidService
      .getAllEnv()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.androidEnvs = res.data.map((env) => {
          return {
            envId: env.id,
            code: env.code,
            name: env.name,
          };
        });

        this.androidService.allEnv.next(this.androidEnvs);

        this.androidEnvSubscription = this.androidService.env.subscribe(
          (value) => {
            if (value !== null) {
              this.androidEnv = value.name.toUpperCase();
              localStorage.setItem('androidEnv', JSON.stringify(value));
            }
          },
        );
      });
  }

  setAndroidStores(): void {
    this.androidService
      .getAllStores()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.androidStores = res.data.map((store) => {
          return {
            storeId: store.storeId,
            code: store.code,
            name: store.name.toUpperCase(),
          };
        });

        localStorage.setItem(
          'androidStores',
          JSON.stringify(this.androidStores),
        );

        this.androidStoreSubscription = this.androidService.store.subscribe(
          (value) => {
            if (value !== null) {
              this.androidStore = value.name;
              localStorage.setItem('androidStore', JSON.stringify(value));
            }
          },
        );
      });
  }

  setAndroidProducts(): void {
    this.androidService
      .getAllProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.androidProducts = res.data.map((product) => {
          return {
            productId: product.productId,
            code: product.code,
            name: product.name.toUpperCase(),
          };
        });

        this.androidProductSubscription = this.androidService.product.subscribe(
          (value) => {
            if (value !== null) {
              this.androidProduct = value.name;
              localStorage.setItem('androidProduct', JSON.stringify(value));
            }
          },
        );
      });
  }

  setRokuEnv(): void {
    this.rokuService
      .getAllEnv()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.rokuEnvs = res.data.map((env) => {
          return {
            envId: env.id,
            code: env.code,
            name: env.name,
          };
        });

        this.rokuEnvSubscription = this.rokuService.env.subscribe((value) => {
          if (value !== null) {
            this.rokuEnv = value.name.toUpperCase();
            localStorage.setItem('rokuEnv', JSON.stringify(value));
          }
        });
      });
  }

  setRokuStores(): void {
    this.rokuService
      .getAllStores()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.rokuStores = res.data.map((store) => {
          return {
            storeId: store.storeId,
            code: store.code,
            name: store.name.toUpperCase(),
          };
        });

        this.rokuStoreSubscription = this.rokuService.store.subscribe(
          (value) => {
            if (value !== null) {
              this.rokuStore = value.name;
              localStorage.setItem('rokuStore', JSON.stringify(value));
            }
          },
        );
      });
  }

  setRokuProducts(): void {
    this.rokuService
      .getAllProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.rokuProducts = res.data.map((product) => {
          return {
            productId: product.productId,
            code: product.code,
            name: product.name.toUpperCase(),
          };
        });

        this.rokuProductSubscription = this.rokuService.product.subscribe(
          (value) => {
            if (value !== null) {
              this.rokuProduct = value.name;
              localStorage.setItem('rokuProduct', JSON.stringify(value));
            }
          },
        );
      });
  }

  setNavLinks(store) {
    const androidStore = this.stores.filter((store) => {
      return store.id === PlatformEnum.ANDROID;
    });
    const rokuStore = this.stores.filter((store) => {
      return store.id === PlatformEnum.ROKU;
    });
    if (androidStore.length && store.id === androidStore[0].id) {
      this.currentPlatformAndroid = true;
      this.currentPlatformRoku = false;
      this.navLinks = this.androidLinks;
    } else if (rokuStore.length && store.id === rokuStore[0].id) {
      this.currentPlatformAndroid = false;
      this.currentPlatformRoku = true;
      this.navLinks = this.rokuLinks;
    } else {
      this.currentPlatformAndroid = false;
      this.currentPlatformRoku = false;
      this.navLinks = this.samocLinks;
    }
  }

  fetchHealthStatus() {
    this.healthSubscription = this.configService.fetchHealthStatus().subscribe(
      (data) => {
        this.healthStatus = true;
        if (data && data['data'] && data['data'].version) {
          this.serverVer = `v${data['data'].version}`;
          this.serverInfo = `webapp: ${this.webappVer}\nserver: ${this.serverVer}`;
        }
      },
      (error) => {
        this.healthStatus = false;
      },
    );
  }

  fetchStatus() {
    if (
      this.configService.getStatuses().size === 0 ||
      this.configService.checkLastUpdate()
    ) {
      this.configService.fetchStatus();
    }
  }

  canShowAndroidEnv(): boolean {
    return (
      this.currentPlatformAndroid &&
      (this.router.url.includes('/app-copy') ||
        this.router.url.includes('/sku'))
    );
  }

  canShowAndroidStore(): boolean {
    return this.currentPlatformAndroid;
  }

  canShowAndroidProduct(): boolean {
    return this.currentPlatformAndroid;
  }

  canShowRokuEnv(): boolean {
    return (
      this.currentPlatformRoku &&
      (this.router.url.includes('/app-copy') ||
        this.router.url.includes('/sku'))
    );
  }

  canShowRokuStore(): boolean {
    return false;
    // return this.currentPlatformRoku;
  }

  canShowRokuProduct(): boolean {
    return this.currentPlatformRoku;
  }

  settingsAction(action: string): void {
    switch (action) {
      case 'SLACK':
        this.router.navigate([`settings/${SettingsTabEnum.SLACK}`]);
        break;
    }
  }

  ngOnDestroy(): void {
    if (this.brandSubscription) {
      this.brandSubscription.unsubscribe();
    }
    if (this.regionSubscription) {
      this.regionSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.healthSubscription) {
      this.healthSubscription.unsubscribe();
    }
    if (this.storeSubscription) {
      this.storeSubscription.unsubscribe();
    }
    if (this.androidEnvSubscription) {
      this.androidEnvSubscription.unsubscribe();
    }
    if (this.androidStoreSubscription) {
      this.androidStoreSubscription.unsubscribe();
    }
    if (this.androidProductSubscription) {
      this.androidProductSubscription.unsubscribe();
    }
    if (this.rokuEnvSubscription) {
      this.rokuEnvSubscription.unsubscribe();
    }
    if (this.rokuStoreSubscription) {
      this.rokuStoreSubscription.unsubscribe();
    }
    if (this.rokuProductSubscription) {
      this.rokuProductSubscription.unsubscribe();
    }
  }
}
