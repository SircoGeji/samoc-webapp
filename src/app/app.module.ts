import { BrowserModule } from '@angular/platform-browser';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
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
import { TableComponent } from './components/table/table.component';
import { InterTableComponent } from './components/inter-table/inter-table.component';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import {
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { OfferFormComponent } from './components/offer-form/offer-form.component';
import { InterOfferFormComponent } from './components/inter-offer-form/inter-offer-form.component';
import { HeaderComponent } from './components/header/header.component';
import { MatMenuModule } from '@angular/material/menu';
import { CreateOfferPageComponent } from './page-components/create-offer-page/create-offer-page.component';
import { EditOfferPageComponent } from './page-components/edit-offer-page/edit-offer-page.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DialogComponent } from './components/dialog/dialog.component';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PlanFormComponent } from './components/plan-form/plan-form.component';
import { BaseComponent } from './components/base/base.component';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { DndComponent } from './components/dnd/dnd.component';
import { DndDirective } from './dnd.directive';
import { ImgFallbackDirective } from './ImgFallbackDirective';
import { SocketidInterceptor } from './service/socketid-interceptor';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { CountDownComponent } from './components/countdown-timer/countdown-timer.component';
import { WinbackFormComponent } from './components/winback-form/winback-form.component';
import { RetentionFormComponent } from './components/retention-form/retention-form.component';
import { ExtensionFormComponent } from './components/web/extension-form/extension-form.component';
import { FiltersComponent } from './components/filters/filters.component';
import { FiltersComponent2 } from './components/filters-2/filters-2.component';
import { SummaryComponent } from './components/pop-up-table/summary.component';
import { TranslationsComponent } from './components/translations/translations.component';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { PlanAdjustmentComponent } from './components/plan-adjustment/plan-adjustment.component';
import { PlanAdjustmentComponent2 } from './components/plan-adjustment-2/plan-adjustment-2.component';
import { MatExpansionModule } from '@angular/material/expansion';
import { OffersFilterPipe } from './helpers/offers-filter.pipe';
import { InterOffersFilterPipe } from './helpers/inter-offers-filter.pipe';
import { CriteriaFilterPipe } from './helpers/criteria-filter.pipe';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { WeightListComponent } from './components/weight-list/weight-list.component';
import { WeightListComponent2 } from './components/weight-list-2/weight-list-2.component';
import { ShareService } from './service/share.service';
import { InfoModalComponent } from './components/info-modal/info-modal.component';
import { ShareInterOfferService } from './service/inter-offer-share.service';
import { AndroidSkuFormComponent } from './components/android/sku/sku-form/sku-form.component';
import { AndroidSKUGridComponent } from './components/android/sku/sku-grid/sku-grid.component';
import { AndroidImagesGridComponent } from './components/android/images/images-grid/images-grid.component';
import { AndroidAppCopyGridComponent } from './components/android/app-copy/app-copy-grid/app-copy-grid.component';
import { AndroidStoreCopyGridComponent } from './components/android/store-copy/store-copy-grid/store-copy-grid.component';
import { AndroidAppCopyFormComponent } from './components/android/app-copy/app-copy-form/app-copy-form.component';
import { AndroidBundleFormComponent } from './components/android/images/bundle-form/bundle-form.component';
import { AndroidGalleryFormComponent } from './components/android/images/gallery-form/gallery-form.component';
import { AndroidCampaignGridComponent } from './components/android/campaign/campaign-grid/campaign-grid.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SelectorConfigFormComponent } from './components/android/sku/selector-config-form/selector-config-form.component';
import { RegionsLanguagesGridComponent } from './components/android/regions-languages/regions-languages-grid/regions-languages-grid.component';
import { RegionModalComponent } from './components/android/regions-languages/region-modal/region-modal.component';
import { LanguageModalComponent } from './components/android/regions-languages/language-modal/language-modal.component';
import { AndroidStoreCopyFormComponent } from './components/android/store-copy/store-copy-form/store-copy-form.component';
import { AndroidCampaignFormComponent } from './components/android/campaign/campaign-form/campaign-form.component';
import { ImagesDropComponent } from './components/android/images-drop/images-drop.component';
import { RokuAppCopyGridComponent } from './components/roku/app-copy/app-copy-grid/app-copy-grid.component';
import { RokuAppCopyFormComponent } from './components/roku/app-copy/app-copy-form/app-copy-form.component';
import { RokuSkuGridComponent } from './components/roku/sku/sku-grid/sku-grid.component';
import { RokuSkuFormComponent } from './components/roku/sku/sku-form/sku-form.component';
import { RokuSelectorConfigFormComponent } from './components/roku/sku/selector-config-form/selector-config-form.component';
import { RokuRegionsLanguagesGridComponent } from './components/roku/regions-languages/regions-languages-grid/regions-languages-grid.component';
import { RokuRegionModalComponent } from './components/roku/regions-languages/region-modal/region-modal.component';
import { RokuLanguageModalComponent } from './components/roku/regions-languages/language-modal/language-modal.component';
import { RokuImagesGridComponent } from './components/roku/images/images-grid/images-grid.component';
import { RokuGalleryFormComponent } from './components/roku/images/gallery-form/gallery-form.component';
import { RokuBundleFormComponent } from './components/roku/images/bundle-form/bundle-form.component';
import { RokuImagesDropComponent } from './components/roku/images-drop/roku-images-drop.component';
import { RokuCampaignFormComponent } from './components/roku/campaign/campaign-form/campaign-form.component';
import { RokuCampaignGridComponent } from './components/roku/campaign/campaign-grid/campaign-grid.component';
import { RokuStoreCopyGridComponent } from './components/roku/store-copy/store-copy-grid/store-copy-grid.component';
import { RokuStoreCopyFormComponent } from './components/roku/store-copy/store-copy-form/store-copy-form.component';
import { SettingsComponent } from './components/settings/settings.component';
import { SlackNotificationsSettingsComponent } from './components/settings/slack/slack-notifications-settings.component';
import { SlackBotComponent } from './components/settings/slack/slack-bot/slack-bot.component';
import { FilterDiffComponent } from './components/filter-diff/filter-diff.component';
import { JsonComparisonComponent } from './components/json-comparison/json-comparison.component';
import { ExtensionConfigComponent } from './components/web/extension-config/extension-config.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginPageComponent,
    OffersPageComponent,
    InterOffersPageComponent,
    DetailOfferPageComponent,
    InterDetailOfferPageComponent,
    PlansPageComponent,
    CreatePlanPageComponent,
    EditPlanPageComponent,
    DetailPlanPageComponent,
    PageNotFoundComponent,
    TableComponent,
    InterTableComponent,
    OfferFormComponent,
    InterOfferFormComponent,
    HeaderComponent,
    CreateOfferPageComponent,
    EditOfferPageComponent,
    DialogComponent,
    SpinnerComponent,
    PlanFormComponent,
    BaseComponent,
    DndComponent,
    DndDirective,
    ImgFallbackDirective,
    CountDownComponent,
    WinbackFormComponent,
    RetentionFormComponent,
    ExtensionFormComponent,
    FiltersComponent,
    FiltersComponent2,
    SummaryComponent,
    TranslationsComponent,
    PlanAdjustmentComponent,
    PlanAdjustmentComponent2,
    OffersFilterPipe,
    InterOffersFilterPipe,
    CriteriaFilterPipe,
    WeightListComponent,
    WeightListComponent2,
    InfoModalComponent,
    AndroidSKUGridComponent,
    AndroidSkuFormComponent,
    AndroidAppCopyGridComponent,
    AndroidStoreCopyGridComponent,
    AndroidAppCopyFormComponent,
    AndroidCampaignGridComponent,
    SelectorConfigFormComponent,
    AndroidImagesGridComponent,
    AndroidBundleFormComponent,
    AndroidGalleryFormComponent,
    RegionsLanguagesGridComponent,
    RegionModalComponent,
    LanguageModalComponent,
    AndroidStoreCopyFormComponent,
    AndroidCampaignFormComponent,
    ImagesDropComponent,
    RokuAppCopyGridComponent,
    RokuAppCopyFormComponent,
    RokuSkuGridComponent,
    RokuSkuFormComponent,
    RokuSelectorConfigFormComponent,
    RokuRegionsLanguagesGridComponent,
    RokuRegionModalComponent,
    RokuLanguageModalComponent,
    RokuImagesGridComponent,
    RokuGalleryFormComponent,
    RokuBundleFormComponent,
    RokuImagesDropComponent,
    RokuCampaignFormComponent,
    RokuCampaignGridComponent,
    RokuStoreCopyGridComponent,
    RokuStoreCopyFormComponent,
    SettingsComponent,
    SlackNotificationsSettingsComponent,
    SlackBotComponent,
    FilterDiffComponent,
    JsonComparisonComponent,
    ExtensionConfigComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    BrowserAnimationsModule,
    MatSelectModule,
    MatToolbarModule,
    MatTabsModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatNativeDateModule,
    MatSnackBarModule,
    NgxMaterialTimepickerModule,
    MatDialogModule,
    MatMenuModule,
    FlexLayoutModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    LoggerModule.forRoot({
      serverLoggingUrl: '/api/logs',
      level: NgxLoggerLevel.DEBUG,
      serverLogLevel: NgxLoggerLevel.ERROR,
    }),
    AppRoutingModule,
    MatRadioModule,
    MatIconModule,
    MatExpansionModule,
    DragDropModule,
    MatSlideToggleModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: SocketidInterceptor, multi: true },
    { provide: LocationStrategy, useClass: HashLocationStrategy },
    { provide: ShareService, useClass: ShareService },
    { provide: ShareInterOfferService, useClass: ShareInterOfferService },
    { provide: MAT_DIALOG_DATA, useValue: {} },
    { provide: MatDialogRef, useValue: {} },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
