import { StatusEnum } from './types/enum';

export const VALIDATE_BUTTON_TOOLTIP =
  'Validate action triggers the Automated Offer Validation workflow in Bamboo';
export const VALIDATE_BUTTON_TOOLTIP_DISABLED =
  'Unique codes are being generated, this process may take a few minutes.';
export const VALIDATE_BUTTON_TOOLTIP_DISABLED_TIMER =
  'Offer cache is not ready, this process may take up to {0} minutes, please be patient.';

export const DEFAULT_TIMEZONE = 'America/Denver';
export const DEFAULT_SPINNER_TEXT = 'Processing...';

export const SUPPORTED_DIMENSIONS = ['2560x1440', '1920x1080'];
export const FILE_EXT_REGEXP = /.*\.(jpg|jpeg|png)/gi;
export const PROCEED_MESSAGE = 'Do you wish to proceed with ';
const ALL_BUT_DRAFT = [
  StatusEnum.STG_ERR_CRT,
  StatusEnum.STG_ERR_UPD,
  StatusEnum.STG_ERR_DEL,
  StatusEnum.STG,
  StatusEnum.STG_MODIFIED,
  StatusEnum.STG_VALDN_PEND,
  StatusEnum.STG_VALDN_FAIL,
  StatusEnum.STG_VALDN_PASS,
  StatusEnum.STG_RETD,
  StatusEnum.STG_RB_FAIL,
  StatusEnum.STG_FAIL,
  StatusEnum.APV_PEND,
  StatusEnum.APV_REJ,
  StatusEnum.APV_APRVD,
  StatusEnum.PROD_PEND,
  StatusEnum.PROD_ERR_PUB,
  StatusEnum.PROD_ERR_UPD,
  StatusEnum.PROD_ERR_DEL,
  StatusEnum.PROD,
  StatusEnum.PROD_MODIFIED,
  StatusEnum.PROD_VALDN_PEND,
  StatusEnum.PROD_VALDN_FAIL,
  StatusEnum.PROD_VALDN_PASS,
  StatusEnum.PROD_RETD,
  StatusEnum.PROD_RB_FAIL,
  StatusEnum.PROD_FAIL,
];

/**
 * These fields cannot be modified for the defined Status.
 * If not set or empty [], it can be modified at any Status.
 */
export const FIELDS_LOOKUP = {
  offerType: [...ALL_BUT_DRAFT, StatusEnum.DFT],
  offerCode: [...ALL_BUT_DRAFT, StatusEnum.DFT],
  offerCodeType: ALL_BUT_DRAFT,
  totalUniqueCodes: ALL_BUT_DRAFT,
  plan: [...ALL_BUT_DRAFT, StatusEnum.DFT],
  eligiblePlans: [...ALL_BUT_DRAFT, StatusEnum.DFT],
  eligibleCharges: [...ALL_BUT_DRAFT, StatusEnum.DFT],
  usersOnPlans: ALL_BUT_DRAFT,
  createUpgradeOffer: ALL_BUT_DRAFT,
  upgradePlan: ALL_BUT_DRAFT,
  discountPercents: ALL_BUT_DRAFT,
  offerHeader: [],
  offerName: [],
  offerBodyText: [
    StatusEnum.APV_PEND,
    StatusEnum.APV_REJ,
    StatusEnum.APV_APRVD,
    StatusEnum.PROD_PEND,
    StatusEnum.PROD_MODIFIED,
  ],
  offerBoldedText: [],
  offerCTA: [],
  offerAppliedBannerText: [],
  offerBgImageUrl: [],
  legalDisclaimer: [],
  claimOfferTerms: [],
  welcomeText: [],
  discountType: ALL_BUT_DRAFT,
  discountAmount: ALL_BUT_DRAFT,
  durationType: ALL_BUT_DRAFT,
  durationAmount: ALL_BUT_DRAFT,
  durationUnit: ALL_BUT_DRAFT,
  offerBusinessOwner: [],
  offerVanityUrl: [],
  discountDurationValue: ALL_BUT_DRAFT,
  discountDurationUnit: ALL_BUT_DRAFT,
  discountDurationType: ALL_BUT_DRAFT,
  publishDate: [
    StatusEnum.STG_VALDN_PASS,
    StatusEnum.APV_PEND,
    StatusEnum.APV_REJ,
    StatusEnum.APV_APRVD,
    StatusEnum.PROD_PEND,
    StatusEnum.PROD,
    StatusEnum.PROD_VALDN_PASS,
    StatusEnum.PROD_MODIFIED,
  ],
  publishTime: [
    StatusEnum.STG_VALDN_PASS,
    StatusEnum.APV_PEND,
    StatusEnum.APV_REJ,
    StatusEnum.APV_APRVD,
    StatusEnum.PROD_PEND,
    StatusEnum.PROD,
    StatusEnum.PROD_VALDN_PASS,
    StatusEnum.PROD_MODIFIED,
  ],
  endDate: [
    StatusEnum.APV_PEND,
    StatusEnum.APV_REJ,
    StatusEnum.APV_APRVD,
    StatusEnum.PROD_PEND,
    StatusEnum.PROD_MODIFIED,
  ],
  endTime: [
    StatusEnum.APV_PEND,
    StatusEnum.APV_REJ,
    StatusEnum.APV_APRVD,
    StatusEnum.PROD_PEND,
    StatusEnum.PROD_MODIFIED,
  ],
  noEndDate: [
    StatusEnum.APV_PEND,
    StatusEnum.APV_REJ,
    StatusEnum.APV_APRVD,
    StatusEnum.PROD_PEND,
    StatusEnum.PROD_MODIFIED,
  ],
  planName: [],
  planCode: [
    StatusEnum.STG,
    StatusEnum.STG_MODIFIED,
    StatusEnum.STG_VALDN_PEND,
    StatusEnum.STG_VALDN_FAIL,
    StatusEnum.STG_VALDN_PASS,
    StatusEnum.APV_PEND,
    StatusEnum.APV_REJ,
    StatusEnum.APV_APRVD,
    StatusEnum.PROD_PEND,
    StatusEnum.PROD,
    StatusEnum.PROD_MODIFIED,
  ],
  planPrice: [],
  billingCycle: [
    StatusEnum.STG,
    StatusEnum.STG_MODIFIED,
    StatusEnum.STG_VALDN_PEND,
    StatusEnum.STG_VALDN_FAIL,
    StatusEnum.STG_VALDN_PASS,
    StatusEnum.APV_PEND,
    StatusEnum.APV_REJ,
    StatusEnum.APV_APRVD,
    StatusEnum.PROD_PEND,
    StatusEnum.PROD,
    StatusEnum.PROD_MODIFIED,
  ],
  billingCycleDuration: [
    StatusEnum.STG,
    StatusEnum.STG_MODIFIED,
    StatusEnum.STG_VALDN_PEND,
    StatusEnum.STG_VALDN_FAIL,
    StatusEnum.STG_VALDN_PASS,
    StatusEnum.APV_PEND,
    StatusEnum.APV_REJ,
    StatusEnum.APV_APRVD,
    StatusEnum.PROD_PEND,
    StatusEnum.PROD,
    StatusEnum.PROD_MODIFIED,
  ],
  billingCycleUnit: [
    StatusEnum.STG,
    StatusEnum.STG_MODIFIED,
    StatusEnum.STG_VALDN_PEND,
    StatusEnum.STG_VALDN_FAIL,
    StatusEnum.STG_VALDN_PASS,
    StatusEnum.APV_PEND,
    StatusEnum.APV_REJ,
    StatusEnum.APV_APRVD,
    StatusEnum.PROD_PEND,
    StatusEnum.PROD,
    StatusEnum.PROD_MODIFIED,
  ],
  trialOffer: [],
  trialDuration: [],
  trialUnit: [],
  offerTitle: [],
  offerDescription: [],
  offerTerms: [],
  bannerText: [],
};

export const MILLISECONDS_IN_A_SECOND = 1000;
export const MINUTES_IN_A_NHOUR = 60;
export const SECONDS_IN_A_MINUTE = 60;
