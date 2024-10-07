export enum CodeType {
  SINGLE_CODE = 'single_code',
  BULK_UNIQUE_CODE = 'bulk',
}

export enum DiscountType {
  FIXED = 'fixed',
  TRIAL = 'trial',
  PERCENT = 'percent',
}

export enum DurationType {
  FOREVER = 'forever',
  SINGLE_USE = 'single_use',
  TEMPORAL = 'temporal',
  CUSTOMIZE = 'customize',
}

export enum OfferType {
  DEFAULT = 1,
  ACQUISITION = 2,
  WINBACK = 3,
  RETENTION = 4,
  EXTENSION = 5,
}

export enum StatusEnum {
  DFT = 1,
  // ##### STG #####
  STG_ERR_CRT = 10,
  STG_ERR_UPD = 12,
  STG_ERR_DEL = 14,
  STG = 20,
  STG_MODIFIED = 25,
  // Validation on STG
  STG_VALDN_PEND = 30,
  STG_VALDN_FAIL = 33,
  STG_VALDN_PASS = 36,
  STG_RETD = 40,
  STG_RB_FAIL = 45,
  STG_FAIL = 47,
  // Approval Workflow - future phase
  APV_PEND = 50,
  APV_REJ = 53,
  APV_APRVD = 56,
  // ##### PROD #####
  PROD_PEND = 60, // Scheduled for publish - future phase
  PROD_ERR_PUB = 62,
  PROD_ERR_UPD = 64,
  PROD_ERR_DEL = 66,
  PROD = 70,
  PROD_MODIFIED = 75,
  // Validation on PROD
  PROD_VALDN_PEND = 80,
  PROD_VALDN_FAIL = 83,
  PROD_VALDN_PASS = 86,
  PROD_RETD = 90,
  PROD_RB_FAIL = 95,
  PROD_FAIL = 97,
}

export enum RegionEnum {
  US = 'US',
  AR = 'AR',
  BE = 'BE',
  BR = 'BR',
  CH = 'CH',
  CL = 'CL',
  CO = 'CO',
  DE = 'DE',
  ES = 'ES',
  FR = 'FR',
  GB = 'GB',
  IE = 'IE',
  MX = 'MX',
  NL = 'NL',
  DK = 'DK',
  FI = 'FI',
  NO = 'NO',
  SE = 'SE',
}

export enum RemoteSystem {
  RECURLY = 0,
  GHOSTLOCKER,
  PLAYAUTH,
  VALIDATE_GL,
  CONTENTFUL,
  DATA_API,
  BAMBOO,
}

export enum WorkflowAction {
  GENERATE_CSV = 'generateCsv',
  EXPORT_CSV = 'exportCsv',
}

export enum PlatformEnum {
  WEB = 'web',
  ANDROID = 'android',
  IOS = 'ios',
  ROKU = 'roku',
}

export enum DITColorEnum {
  GREY = 'grey',
  YELLOW = '#ff0',
  RED = '#f00',
  GREEN = '#0f0',
  BLUE = '#44f',
}

export enum SettingsTabEnum {
  SLACK = 'slack',
}

export enum SlackTriggerTypes {
  FILTERS = 'filters',
  EXPIRE = 'expire',
  DIT = 'dit',
}

export enum AndroidEnv {
  DEV = 'dev',
  STG_QA = 'stg-qa',
  QA = 'qa',
  STG_PROD = 'stg-prod',
  PROD = 'prod',
}
