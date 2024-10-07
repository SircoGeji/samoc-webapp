interface OfferBasePayload {
  storeCode?: string | undefined;
  offerCode?: string | undefined; // offerCode
  offerCodeType: string | undefined; // offerCodeType: [single_code, bulk]
  totalUniqueCodes?: number | undefined; // totalUniqueCodes
  offerHeader: string | undefined; // contentful title
  offerName: string | undefined; // recurly coupon name
  offerBodyText: string | undefined; // description
  offerCTA?: string | undefined; // cta
  offerAppliedBannerText: string | undefined; // bannerText
  offerBgImageUrl?: string | undefined; // imageUrl
  legalDisclaimer: string | undefined; // legalDisclaimer
  claimOfferTerms?: string | undefined;
  welcomeEmailText?: string | undefined; // welcomeEmailText
  discountType: string | undefined; // discountType: [fixed, trial]
  discountAmount?: number | null | undefined; // discountAmount
  discountDurationValue?: number | null | undefined; // discountDurationValue
  discountDurationUnit?: string | undefined; // discountDurationUnit: [days, weeks, months, years]
  offerBusinessOwner: string | undefined; // businessOwner
  offerVanityUrl?: string | undefined; // vanityUrl
  publishDate?: string | undefined; // format: mm/dd/yyyy
  publishTime?: string | undefined; // format: hh:mm (AM/PM)
  endDate?: string | undefined; // format: mm/dd/yyyy
  endTime?: string | undefined; // format: hh:mm (AM/PM)
  noEndDate: boolean | undefined;
  lastModifiedAt?: string | undefined; // 2021-02-13T01:06:26.000Z

  // Retention specific payload
  discountDurationType?: string;
  eligiblePlans?: string[];
  createUpgradeOffer?: boolean;
  upgradePlan?: string;
  usersOnPlans?: string[];
  addToPrimaryDefault?: boolean;
  addToSecondaryDefault?: boolean;
}

export interface OfferRequestPayload extends OfferBasePayload {
  offerTypeId: number | undefined; // offerTypeId: 1=Default Signup, 2=Acquisition
  planCode?: string | undefined; // planCode
  publishDateTime?: string | undefined; // combines publish date and time
  endDateTime?: string | undefined; // combines end date and time
  draftPlanCode?: string | undefined;
  offerBoldedText?: string | undefined;
  campaign?: string | null | undefined;
  campaignName?: string | undefined;
  createdBy?: string | null | undefined;
  updatedBy?: string | null | undefined;
  useUpgradePlan?: boolean;
  nextValidOfferCode?: string;
}

export interface OfferResponsePayload extends OfferBasePayload {
  OfferType: {
    id: number; // 1=Default Signup, 2=Acquisition
    title: string;
  };
  Plan: {
    planCode: string; // planCode
    planPrice: number;
    trialDuration?: number;
    trialUnit?: string;
  };
  totalRedemptions: number;
  statusId: number;
  publishDateTime: string;
  endDateTime: string;
  offerTypeId: number;
  entryState?: string;
  couponState?: string;
  couponExpiredAt?: string;
  csvFileName?: string;
  origTotalUniqueCodes?: number;
  isInWorkflow?: string;
  offerBoldedText?: string;
  offerBoldedTextHint?: string;
  offerUrl?: string;
  couponCreatedAt?: Date;
  contentfulImageUpdatedAt?: Date;
  contentfulUpdatedAt?: Date;
  couponUpdatedAt?: Date;
  dataIntegrityStatus?: boolean;
  dataIntegrityCheckTime?: Date;
  dataIntegrityErrorMessage?: string;
  glValidationError?: string;
  glValidationWarning?: string;
  forceUserToPlanCode?: string;
  campaign?: string;
  campaignName?: string;
}

export interface InterOfferResponsePayload extends OfferBasePayload {
  OfferType: {
    id: number; // 1=Default Signup, 2=Acquisition
    title: string;
  };
  Plan: {
    planCode: string; // planCode
    planPrice: number;
    trialDuration?: number;
    trialUnit?: string;
  };
  totalRedemptions: number;
  statusId: number;
  publishDateTime: string;
  endDateTime: string;
  offerTypeId: number;
  entryState?: string;
  couponState?: string;
  couponExpiredAt?: string;
  csvFileName?: string;
  origTotalUniqueCodes?: number;
  isInWorkflow?: string;
  offerBoldedText?: string;
  offerBoldedTextHint?: string;
  offerUrl?: string;
  couponCreatedAt?: Date;
  contentfulImageUpdatedAt?: Date;
  contentfulUpdatedAt?: Date;
  couponUpdatedAt?: Date;
  dataIntegrityStatus?: boolean;
  dataIntegrityCheckTime?: Date;
  dataIntegrityErrorMessage?: string;
  glValidationError?: string;
  glValidationWarning?: string;
  forceUserToPlanCode?: string;
  campaign: string;
  campaignName: string;
  localized: any;
}

export interface PlanRequestPayload {
  planCode: string; // planCode
  price?: number; // price, samoc-272 - changed to optional for phase 2
  billingCycleDuration?: number; // billingPeriodLength
  billingCycleUnit?: string; // billingPeriodUnit: [days, months]
  totalBillingCycles?: number; // totalBillingCycles
  trialDuration?: number; // trialLength
  trialUnit?: string; // trialUnit: [days, months]
}

export interface PlanResponsePayload extends PlanRequestPayload {
  planName: string;
  numberOfUsers: number;
  statusId: number; // status title
  createdAt?: string;
}

export interface UserRequestPayload {
  username: string;
  password: string;
}

export interface UserResponsePayload {
  sub: string;
  email: string;
  role: string[];
  exp: number;
}

export interface LoginResponsePayload {
  token: string;
  user: UserResponsePayload;
}

export interface SamocResponse {
  success: boolean;
  status: number;
  message: string;
}

export interface SamocSuccessResponse<T> extends SamocResponse {
  data: T;
  meta?: any;
}

export interface Brand {
  id: string;
  title: string;
}

export interface Region {
  id: string;
  title: string;
  storefronts?: any[];
}

export interface Store {
  id: string;
  title: string;
  storeCode: string;
}

export interface NavLink {
  label: string;
  link: string;
  index: number;
}

export interface Dropdown {
  value: string;
  viewValue: string;
}

export interface Plan {
  billingCycleDuration: number;
  billingCycleUnit: string;
  numberOfUsers: number;
  planCode: string;
  planDetails: string;
  // planId: string;
  planName: string;
  planTrial: string;
  price: number;
  state: string;
  statusId: number;
  term: string;
  totalBillingCycles: number;
  trialDuration: number;
  trialUnit: string;
}

export interface DropdownInt {
  value: number;
  viewValue: string;
}

export interface StorePayload {
  es?: RegionInfoPayload;
  gb?: RegionInfoPayload;
  it?: RegionInfoPayload;
  mx?: RegionInfoPayload;
  us?: RegionInfoPayload;
}

export interface RegionInfoPayload {
  displayName: string;
  brands: BrandPayload;
}

interface BrandPayload {
  pantaya?: BrandInfoPayload;
  twlght?: BrandInfoPayload;
  twlghtplay?: BrandInfoPayload;
}

export interface BrandInfoPayload {
  displayName: string;
  platforms: PlatformPayload;
}

interface PlatformPayload {
  android?: PlatformInfoPayload;
  ios?: PlatformInfoPayload;
  web?: PlatformInfoPayload;
}

export interface PlatformInfoPayload {
  displayName: string;
  storeCode: string;
}

export interface DialogInfo {
  message: string;
  footNote: string;
  action: string;
  errors: string[];
  warningName?: string;
  module?: string;
  id?: number;
  warningList?: string[];
  warningListName?: string;
  warningMessage?: string;
  env?: string;
  galleryNames?: string[];
  multiple?: boolean;
  dimensions?: string;
  maxSize?: string;
  showPasswordField?: boolean;
  changes?: any;
  envTitle?: string;
}

export interface AllowedOffersForTerm {
  term: number;
  allowedOffers: OfferResponsePayload[];
}

export enum FiltersStatus {
  NEW,
  DFT,
  STG,
}

export interface WeightedRetentionOffer {
  name: string;
  weight: number;
  offers: string[];
}

export interface RetentionOfferFilterRule {
  status: FiltersStatus;
  name?: string;
  planLengthInMonths?: number | null;
  isInFreeTrial?: boolean | null;
  activeCoupons?: string[];
  inactiveCoupons?: string[];
  primaryLists: WeightedRetentionOffer[];
  secondaryLists: WeightedRetentionOffer[];
  exclusiveOfferOverrides?: any[];
}

export interface InterRetentionOfferFilterRule {
  status: FiltersStatus;
  name?: string;
  countries: string[];
  planLengthInMonths?: number;
  isInFreeTrial?: boolean;
  activeCoupons?: string[];
  inactiveCoupons?: string[];
  primaryLists: WeightedRetentionOffer[];
  secondaryLists: WeightedRetentionOffer[];
  suffix?: number;
  exclusiveOfferOverrides?: any[];
}

export interface TranslationsTableLanguage {
  lang: string;
  storeOffers: [];
}

export enum UserEligibilityStatus {
  NEW = 0,
  STG = 1,
  PROD = 2,
  DFT = 3,
}

export interface FilterState {
  stgVer: number;
  prodVer: number;
  status: UserEligibilityStatus;
  canDelete: boolean;
  canRetire: boolean;
  updatedAt?: string;
  updatedBy?: string;
  errorMessage?: string;
  testUrl?: string;
}

export interface RetentionOfferFiltersPayload {
  filterState: FilterState;
  rules: RetentionOfferFilterRule[];
}

export interface RetentionOfferFiltersUpdateReply {
  filterState: FilterState;
}

export interface InterRetentionOfferFiltersPayload {
  filterState: FilterState;
  rules: InterRetentionOfferFilterRule[];
  regions: any[];
}

export interface RetentionOfferFiltersUpdateReply {
  filterState: FilterState;
}

export enum StoreTranslatedStatus {
  NEW = 0,
  STG = 1,
  PROD = 2,
}

export interface StoreTranslatedState {
  stgVer: number;
  prodVer: number;
  status: StoreTranslatedStatus;
  canDelete: boolean;
  canRetire: boolean;
  updatedAt?: string;
  updatedBy?: string;
  errorMessage?: string;
}

export interface StoreTranslatedPayload {
  translatedState: StoreTranslatedState;
  translations: any;
}

export interface StoreTranslatedUpdateReply {
  translatedState: StoreTranslatedState;
}

export interface RegionsInterface {
  region: string;
  price: number;
  duration: string;
  planViewValue: string;
  offerCode: string;
  offerName: string;
}

export interface InterFormRegion {
  code: string,
  name?: string,
  price?: number | null | undefined,
  duration?: string;
  durationType?: string,
  durationValue: number | null,
  durationUnit: string,
  planCode?: string,
  planViewValue?: string,
  offerCode: string,
  offerName: string,
  editting?: boolean,
  offerCodeStatus: number | null,
  currencyPrefix?: string,
  currencyRatio?: number,
  eligiblePlans?: string[],
  eligiblePlanCodes?: string[],
  createUpgradeOffer?: boolean,
  upgradePlan?: string,
  usersOnPlans?: string[],
  statusId: number,
  fetchedOfferCode?: string,
  offerUrl?: string,
  totalUniqueCodes?: number;
  origTotalUniqueCodes?: number;
  priceMaxValue?: number;
  showExportCsvBtn?: boolean;
  showDownloadCsvBtn?: boolean;
  exportingCsv?: boolean;
  downloadingCsv?: boolean;
  isInWorkflow?: string;
  showRefreshBtn?: boolean;
  csvFileName?: string;
  nextValidOfferCode?: string;
}

export interface InterFormLanguage {
  code: string,
  name?: string,
  marketingHeadline: string,
  offerHeadline: string,
  subhead: string,
  offerAppliedBanner: string,
  offerTerms: string,
  welcomeEmailText?: string,
  editting?: boolean,
  offerBgImageUrl?: string,
  claimOfferTerms?: string,
  offerUrl?: string,
}

export interface UpdateSlackConfigData {
  enabled: boolean,
  key: string,
  channelsId: string[],
  mentionsId: string[],
}

export interface UpdateSlackConfig {
  name: string,
  data: UpdateSlackConfigData,
}

export interface SlackBotChannelInfo {
  name: string,
  id: string,
  valid: boolean,
}
export interface SlackBotConfiguration {
  key: string,
  enabled: boolean,
  mentionsId: string[],
  channelsId: SlackBotChannelInfo[],
  mentionsSelector: any[],
}

export interface SlackBot {
  id: number,
  name: string,
  data: SlackBotConfiguration,
}

export interface GetSlackConfigResponsePayload {
  success: string,
  status: number,
  message: string,
  data: SlackBot[],
}

export interface UpdateSlackConfigResponse {
  success: boolean,
  status: number,
  message: string,
}