import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginPageComponent } from './page-components/login-page/login-page.component';
import { OffersPageComponent } from './page-components/offers-page/offers-page.component';
import { InterOffersPageComponent } from './components/inter-offers-page/inter-offers-page.component';
import { DetailOfferPageComponent } from './page-components/detail-offer-page/detail-offer-page.component';
import { InterDetailOfferPageComponent } from './components/inter-detail-offer-page/inter-detail-offer-page.component';
import { PlansPageComponent } from './page-components/plans-page/plans-page.component';
import { CreatePlanPageComponent } from './page-components/create-plan-page/create-plan-page.component';
import { EditPlanPageComponent } from './page-components/edit-plan-page/edit-plan-page.component';
import { DetailPlanPageComponent } from './page-components/detail-plan-page/detail-plan-page.component';
import { PageNotFoundComponent } from './page-components/page-not-found/page-not-found.component';
import { AuthGuard } from './helpers/auth.guard';
import { CreateOfferPageComponent } from './page-components/create-offer-page/create-offer-page.component';
import { InterOfferFormComponent } from './components/inter-offer-form/inter-offer-form.component';
import { EditOfferPageComponent } from './page-components/edit-offer-page/edit-offer-page.component';
import { FiltersComponent } from './components/filters/filters.component';
import { FiltersComponent2 } from './components/filters-2/filters-2.component';
import { TranslationsComponent } from './components/translations/translations.component';
import { AndroidSkuFormComponent } from './components/android/sku/sku-form/sku-form.component';
import { AndroidAppCopyGridComponent } from './components/android/app-copy/app-copy-grid/app-copy-grid.component';
import { AndroidStoreCopyGridComponent } from './components/android/store-copy/store-copy-grid/store-copy-grid.component';
import { AndroidAppCopyFormComponent } from './components/android/app-copy/app-copy-form/app-copy-form.component';
import { AndroidCampaignGridComponent } from './components/android/campaign/campaign-grid/campaign-grid.component';
import { AndroidSKUGridComponent } from './components/android/sku/sku-grid/sku-grid.component';
import { AndroidImagesGridComponent } from './components/android/images/images-grid/images-grid.component';
import { AndroidBundleFormComponent } from './components/android/images/bundle-form/bundle-form.component';
import { RegionsLanguagesGridComponent } from './components/android/regions-languages/regions-languages-grid/regions-languages-grid.component';
import { AndroidStoreCopyFormComponent } from './components/android/store-copy/store-copy-form/store-copy-form.component';
import { AndroidCampaignFormComponent } from './components/android/campaign/campaign-form/campaign-form.component';
import { ConfirmationGuard } from './helpers/confirmation.guard';
import { EndedModuleGuard } from './helpers/ended-module-guard';
import { RokuEndedModuleGuard } from './helpers/roku-ended-module-guard';
import { RokuAppCopyGridComponent } from './components/roku/app-copy/app-copy-grid/app-copy-grid.component';
import { RokuAppCopyFormComponent } from './components/roku/app-copy/app-copy-form/app-copy-form.component';
import { RokuSkuGridComponent } from './components/roku/sku/sku-grid/sku-grid.component';
import { RokuSkuFormComponent } from './components/roku/sku/sku-form/sku-form.component';
import { RokuRegionsLanguagesGridComponent } from './components/roku/regions-languages/regions-languages-grid/regions-languages-grid.component';
import { RokuImagesGridComponent } from './components/roku/images/images-grid/images-grid.component';
import { RokuBundleFormComponent } from './components/roku/images/bundle-form/bundle-form.component';
import { RokuCampaignFormComponent } from './components/roku/campaign/campaign-form/campaign-form.component';
import { RokuCampaignGridComponent } from './components/roku/campaign/campaign-grid/campaign-grid.component';
import { RokuStoreCopyGridComponent } from './components/roku/store-copy/store-copy-grid/store-copy-grid.component';
import { RokuStoreCopyFormComponent } from './components/roku/store-copy/store-copy-form/store-copy-form.component';
import { SettingsComponent } from './components/settings/settings.component';
import { FilterDiffComponent } from './components/filter-diff/filter-diff.component';
import { ExtensionConfigComponent } from './components/web/extension-config/extension-config.component';

const routes: Routes = [
  { path: '', redirectTo: 'offers', pathMatch: 'full' },
  { path: 'home', redirectTo: 'offers' },
  { path: 'login', component: LoginPageComponent, pathMatch: 'full' },
  {
    path: 'offers',
    component: OffersPageComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'inter-offers',
    component: InterOffersPageComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'offers/create',
    component: CreateOfferPageComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'offers/update/:offerCode',
    component: EditOfferPageComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'offers/detail/:offerCode',
    component: DetailOfferPageComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'inter-offers/inter-create/:offerType',
    component: InterOfferFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'inter-offers/inter-detail/:campaign',
    component: InterDetailOfferPageComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'inter-offers/inter-update/:offerType/:campaign',
    component: InterOfferFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'plans',
    component: PlansPageComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'plans/create',
    component: CreatePlanPageComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'plans/update/:planCode',
    component: EditPlanPageComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'plans/detail/:planCode',
    component: DetailPlanPageComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'filters',
    component: FiltersComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'filters-2',
    component: FiltersComponent2,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'translations',
    component: TranslationsComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'android/regions-languages',
    component: RegionsLanguagesGridComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'android/sku',
    component: AndroidSKUGridComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'android/sku/create',
    component: AndroidSkuFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
    canDeactivate: [ConfirmationGuard],
  },
  {
    path: 'android/sku/:action/:id',
    component: AndroidSkuFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
    canDeactivate: [ConfirmationGuard],
  },
  {
    path: 'android/app-copy',
    component: AndroidAppCopyGridComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'android/app-copy/create',
    component: AndroidAppCopyFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
    canDeactivate: [ConfirmationGuard],
  },
  {
    path: 'android/app-copy/:action/:id',
    component: AndroidAppCopyFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
    canDeactivate: [ConfirmationGuard],
    data: { moduleType: 'app-copy' },
  },
  {
    path: 'android/store-copy',
    component: AndroidStoreCopyGridComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'android/store-copy/create',
    component: AndroidStoreCopyFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
    canDeactivate: [ConfirmationGuard],
  },
  {
    path: 'android/store-copy/:action/:id',
    component: AndroidStoreCopyFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard, EndedModuleGuard],
    canDeactivate: [ConfirmationGuard],
    data: { moduleType: 'store-copy' },
  },
  {
    path: 'android/campaigns',
    component: AndroidCampaignGridComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'android/campaigns/create',
    component: AndroidCampaignFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
    canDeactivate: [ConfirmationGuard],
  },
  {
    path: 'android/campaigns/:action/:id',
    component: AndroidCampaignFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard, EndedModuleGuard],
    canDeactivate: [ConfirmationGuard],
    data: { moduleType: 'campaign' },
  },
  {
    path: 'android/images',
    component: AndroidImagesGridComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'android/images/collection/create',
    component: AndroidBundleFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
    canDeactivate: [ConfirmationGuard],
  },
  {
    path: 'android/images/collection/:action/:id',
    component: AndroidBundleFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard, EndedModuleGuard],
    canDeactivate: [ConfirmationGuard],
    data: { moduleType: 'image-collection' },
  },
  {
    path: 'roku/app-copy',
    component: RokuAppCopyGridComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'roku/app-copy/create',
    component: RokuAppCopyFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
    canDeactivate: [ConfirmationGuard],
  },
  {
    path: 'roku/app-copy/:action/:id',
    component: RokuAppCopyFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
    canDeactivate: [ConfirmationGuard],
    data: { moduleType: 'app-copy' },
  },
  {
    path: 'roku/sku',
    component: RokuSkuGridComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'roku/sku/create',
    component: RokuSkuFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
    canDeactivate: [ConfirmationGuard],
  },
  {
    path: 'roku/sku/:action/:id',
    component: RokuSkuFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
    canDeactivate: [ConfirmationGuard],
  },
  {
    path: 'roku/regions-languages',
    component: RokuRegionsLanguagesGridComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'roku/images',
    component: RokuImagesGridComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'roku/images/collection/create',
    component: RokuBundleFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
    canDeactivate: [ConfirmationGuard],
  },
  {
    path: 'roku/images/collection/:action/:id',
    component: RokuBundleFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard, RokuEndedModuleGuard],
    canDeactivate: [ConfirmationGuard],
    data: { moduleType: 'image-collection' },
  },
  {
    path: 'roku/campaigns',
    component: RokuCampaignGridComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'roku/campaigns/create',
    component: RokuCampaignFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
    canDeactivate: [ConfirmationGuard],
  },
  {
    path: 'roku/campaigns/:action/:id',
    component: RokuCampaignFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard, RokuEndedModuleGuard],
    canDeactivate: [ConfirmationGuard],
    data: { moduleType: 'campaign' },
  },
  {
    path: 'roku/store-copy',
    component: RokuStoreCopyGridComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'roku/store-copy/create',
    component: RokuStoreCopyFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
    canDeactivate: [ConfirmationGuard],
  },
  {
    path: 'roku/store-copy/:action/:id',
    component: RokuStoreCopyFormComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard, RokuEndedModuleGuard],
    canDeactivate: [ConfirmationGuard],
    data: { moduleType: 'store-copy' },
  },
  {
    path: 'settings/:tab',
    component: SettingsComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'filter-diff',
    component: FilterDiffComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  {
    path: 'extension-config',
    component: ExtensionConfigComponent,
    pathMatch: 'full',
    canActivate: [AuthGuard],
  },
  { path: '**', component: PageNotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
