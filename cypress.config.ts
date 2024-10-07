import { defineConfig } from 'cypress';

export default defineConfig({
  defaultCommandTimeout: 30000,
  requestTimeout: 15000,
  responseTimeout: 60000,
  chromeWebSecurity: false,
  env: {
    VM_USERNAME: 'mmartirosyan',
    UA_USERNAME: 'aunanyan',
    VM_PASSWORD: 'ArmMar3030!@#$%',
    UA_PASSWORD: 'Cyberhull02a??',
    VM_EMAIL: 'Mariam.Martirosyan@twlght.com',
    UA_EMAIL: 'Aleksey.Unanyan@twlght.com',
    LOGIN_URL: '/#/login',
    OFFERS_URL: '/#/offers',
    INT_OFFERS_URL: '/#/inter-offers',
    INT_FILTERS_URL: '/#/inter-filters',
    FILTERS_URL:'/#/filters',
    SKU_URL: '/#/android/sku/sku',
    POST_TOKEN_URL: 'https://api.twlghtapps.com/auth/api/v2/Users/JsonToken',
    STOCK_IMAGE_URL:
      'https://bigtex.com/wp-content/uploads/2018/05/placeholder-1920x1080.png',
    twlght: 'month, 7 days trial',
    twlghtnft: 'month, no trial',
    twlght3month: '3 months, 7 days trial',
    twlght3monthnft: '3 months, no trial',
    twlght6month: '6 months, 7 days tria',
    twlght6monthnft: '6 months, no trial',
    twlghty: '12 months, 7 days trial',
    imageUrl: 'https://samoc-images-dev.twlght.com/samoc/Offers/Images/DOG.jpg',
    offerName: 'Cypress test Offer Name',
    campaignName: 'Cypress test Campaign Name',
    marketingHeadline: 'Cypress test marketing headline',
    offerHeadline: 'Cypress test offer headline',
    subhead: 'Cypress test subhead',
    offerAppliedBanner: 'Cypress test offer applied banner',
    offerTerms: 'Cypress test offer terms',
    welcomeEmailText: 'Cypress welcome Email Text',
  },
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    // setupNodeEvents(on, config) {
    //   return require('./cypress/plugins/index.js')(on, config)
    // },
    supportFile: 'cypress/support/commands.ts',
    testIsolation: false,
    // excludeSpecPattern: '**/examples/*.spec.js',
  },
});
