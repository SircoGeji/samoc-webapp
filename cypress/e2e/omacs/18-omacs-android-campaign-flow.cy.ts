/// <reference types="cypress-xpath" />
import * as moment from 'moment';
import 'cypress-localstorage-commands';
import 'cypress-real-events';
import Android_PO from '../../support/pageObject/android/android_PO';
import { log } from 'console';


context('Campaign flow', () => {
  const android_PO = new Android_PO();
  const firstDayNextMonth = moment()
    .add(1, 'M')
    .startOf('month')
    .format('MM.DD.YYYY');
  const firstDayAfterNextMonth = moment()
    .add(3, 'M')
    .startOf('month')
    .format('MM.DD.YYYY');
  const firstDayAfterFutureMonth = moment()
    .add(3, 'M')
    .startOf('month')
    .format('MM.DD.YYYY');
  const apiWaitTimeout = 20000;
  const apiWaitTimeoutObj = { timeout: apiWaitTimeout };
  const typeDelay = { delay: 0 };
  const forced = { force: true };
  const ENV_SERVER_URL = Cypress.env('ENV_SERVER_URL');
  let modulesIdObj: any = {};
  let savedCampaignId;
  // let duplicatedCampaignId;
  let dataJSON;
  let campaignNameDuplicated;
  let increment = 0;
  const expectPayloadValues = (alias) => {
    cy.wait(alias).then((payload) => {
      const body = payload.request.body;
      expect(body.appCopyId).to.eq(modulesIdObj.appCopyId);
      expect(body.storeCopyId).to.eq(modulesIdObj.storeCopyId);
      expect(body.selectorConfigId).to.eq(modulesIdObj.selectorConfigId);
      expect(body.winbackSkuId).to.eq(modulesIdObj.skuId);
      expect(body.imageCollectionIndexes).to.contain(
        modulesIdObj.imageCollectionId,
      );
      if (increment === 0) {
        increment++;
        savedCampaignId = payload.response.body.data.campaignId;
      } else if (increment === 1) {
        // duplicatedCampaignId = payload.response.body.data.campaignId;
      }
    });
  };
   
  const goBackToGrid = () => {
    cy.wait(1000);
    android_PO.interceptAlias('GET', '**/api/android/campaign**', 'campaign');
    cy.get('.backbtn').click();
    android_PO.waitForAlias('@campaign', apiWaitTimeoutObj);
  };
  const selectModule = (fixture, moduleSelector) => {
    cy.fixture(fixture).then((moduleJSON) => {
      cy.get(`[formcontrolname="${moduleSelector}"]`)
        .click()
        .then(() => {
          cy.contains('.mat-option-text', moduleJSON.name).click();
        });
    });
  };
  const validateModule = (fixture, moduleSelector) => {
    cy.fixture(fixture).then((moduleJSON) => {
      cy.get(`[formcontrolname="${moduleSelector}"]`).should(
        'contain',
        moduleJSON.name,
      );
    });
  };
  const createModuleUsingAPI = (fixture, module, responseId) => {
    cy.fixture(fixture).then((fixtureBody) => {
      cy.request({
        method: 'POST',
        url: `${ENV_SERVER_URL}/api/android/${module}/save?store=google&product=twlght`,
        body: fixtureBody,
      }).then((response: any) => {
        modulesIdObj[responseId] = response.body.data[responseId];
      });
    });
  };
  before(() => {
    localStorage.clear();
    cy.customPostUserData();
    cy.saveLocalStorage();
    cy.fixture('Campaign-Android').then((data) => {
      dataJSON = data;
      campaignNameDuplicated = `${dataJSON.name}Duplicated`;
    });
  });
  beforeEach(() => {
    cy.setViewPort();
  });
  it('Set headers', () => {
    android_PO.navigateToSamocSkuPage(apiWaitTimeout);
    android_PO.interceptAlias('GET', '**/api/android/campaign**', 'campaign');
    android_PO.setHeaders('ANDROID', 'GOOGLE', 'twlght ', 'CAMPAIGNS');
    android_PO.waitForAlias('@campaign', apiWaitTimeoutObj);
    cy.contains('[role="tab"]', 'CAMPAIGNS').click();
  });
  it('Create Store copy using API', () => {
    createModuleUsingAPI('StoreCopy', 'store-copy', 'storeCopyId');
  });
  it('Create App copy using API', () => {
    createModuleUsingAPI('AppCopy', 'app-copy', 'appCopyId');
    
  });
  it('Create Selector using API', () => {
    createModuleUsingAPI('Selector', 'selector-config', 'selectorConfigId');
  });
  it('Create SKU using API', () => {
    createModuleUsingAPI('SKU', 'sku', 'skuId');
  });
  it('Create Bundle using API', () => {
    createModuleUsingAPI('Bundle', 'image/collection', 'imageCollectionId');
  });
  it('Create campaign', () => {
    android_PO.interceptAlias('GET', '**//app-copy**', 'campaignForm');
    cy.contains('.button-primary', 'CREATE NEW CAMPAIGN').click();
    android_PO.waitForAlias('@campaignForm', apiWaitTimeoutObj);
    cy.wait(2000);
    android_PO.clearThenFillEmptyForm('name', dataJSON.name, typeDelay);
    android_PO.clearThenFillEmptyForm(
      'startDate',
      firstDayNextMonth,
      typeDelay,
    );
    android_PO.clearThenFillEmptyForm(
      'endDate',
      firstDayAfterNextMonth,
      typeDelay,
    );
    selectModule('AppCopy', 'appCopyId');
    selectModule('StoreCopy', 'storeCopyId');
    selectModule('Selector', 'selectorConfigId');
    selectModule('SKU', 'winbackSkuId');
    cy.contains('Image Collection').click(forced);
    cy.get('[type="checkbox"]').each(($el) => {
      cy.wrap($el).uncheck(forced);
    });
    cy.fixture('Bundle').then((bundleJSON) => {
      cy.contains('.image-checkbox-container', bundleJSON.name)
        .find('[type="checkbox"]')
        .check(forced);
    });
    cy.contains('Image Collection').click(forced);
    android_PO.interceptAlias(
      'POST',
      '**api/android/campaign/save**',
      'campaignCopyPayload',
    );
    cy.contains('SAVE').click();
    cy.contains('.button-dialog-primary', 'OK').click(); // dialog message is not validated
    expectPayloadValues('@campaignCopyPayload');
    android_PO.expectDialogMessage(
      `Android ${dataJSON.name} Campaign module saved in DB successfully`,
    );
    goBackToGrid();
  });
  it('Validate filter and edit campaign', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'NAME')
      .should('be.visible')
      .click();
    android_PO.clearThenFillPlaceholderForm(
      'Enter Campaign Name',
      'Invalid name',
    );
    cy.contains('[role="gridcell"]', dataJSON.name).should('not.exist');
    android_PO.clearThenFillPlaceholderForm(
      'Enter Campaign Name',
      dataJSON.name,
    );
    android_PO.clickDotMenuOption(dataJSON.name, 'Edit');
    cy.wait(2000);
    cy.contains('UPDATE').should('be.disabled');
    validateModule('AppCopy', 'appCopyId');
    validateModule('StoreCopy', 'storeCopyId');
    validateModule('Selector', 'selectorConfigId');
    validateModule('SKU', 'winbackSkuId');
    cy.fixture('Bundle').then((bundleJSON) => {
      cy.contains(bundleJSON.name).should('exist'); //is not seen
    });
    android_PO.clearThenFillEmptyForm(
      'endDate',
      firstDayAfterFutureMonth,
      typeDelay,
    );
    cy.contains('UPDATE').should('not.be.disabled').click();
    android_PO.interceptAlias('PUT', '**/update**', 'campaignUpdate');
    android_PO.expectDialogMessage('Do you wish to proceed with UPDATE?');
    android_PO.waitForAlias('@campaignUpdate', apiWaitTimeoutObj);
    android_PO.expectDialogMessage(
      `Android ${dataJSON.name} Campaign module updated in DB successfully`,
    );
    goBackToGrid();
  });
  it('Duplicate campaign', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'NAME')
      .should('be.visible')
      .click();
    android_PO.clearThenFillPlaceholderForm(
      'Enter Campaign Name',
      dataJSON.name ,
    );
    android_PO.interceptAlias('GET', '**api/android/campaign**', 'campaign');
    android_PO.clickDotMenuOption(dataJSON.name, 'Duplicate');
    android_PO.waitForAlias('@campaign', apiWaitTimeoutObj);
    android_PO.clearThenFillEmptyForm('name', dataJSON.name, typeDelay);
    cy.get('.form-header').click();
    android_PO.validateErrorHaveText(0, ' This Campaign Name already exists ');
    android_PO.clearThenFillEmptyForm(
      'name',
      campaignNameDuplicated,
      typeDelay,
    );
    cy.get('.form-header').click();
    selectModule('AppCopy', 'appCopyId');
    validateModule('AppCopy', 'appCopyId');
    validateModule('StoreCopy', 'storeCopyId');
    validateModule('Selector', 'selectorConfigId');
    validateModule('SKU', 'winbackSkuId');
    android_PO.interceptAlias(
      'POST',
      '**api/android/campaign/save**',
      'campaignCopyPayload',
    );
    cy.contains('SAVE').click();
    cy.contains('.button-dialog-primary', 'OK').click(); // dialog message is not validated
    expectPayloadValues('@campaignCopyPayload');
    android_PO.expectDialogMessage(
      `Android ${campaignNameDuplicated} Campaign module saved in DB successfully`,
    );
    goBackToGrid();
  });
  it('Delete campaigns', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'NAME')
      .should('be.visible')
      .click();
    android_PO.clearThenFillPlaceholderForm(
      'Enter Campaign Name',
      campaignNameDuplicated,
    );
    android_PO.interceptAlias('GET', '**api/android/campaign**', 'campaign');
    android_PO.clickDotMenuOption(dataJSON.name, 'Delete');
    android_PO.expectDialogMessage(
      `Do you wish to proceed with DELETE "${campaignNameDuplicated}"?`,
    );
    android_PO.interceptAlias('GET', '**api/android/campaign**', 'campaign');
    android_PO.expectDialogMessage(
      `Android ${campaignNameDuplicated} Campaign module deleted from DB successfully`,
    );
    android_PO.waitForAlias('@campaign', apiWaitTimeoutObj);
    android_PO.deleteUsingAPI(ENV_SERVER_URL, 'campaign', savedCampaignId);
  });
  it('Delete App copy using API', () => {
    android_PO.deleteUsingAPI(
      ENV_SERVER_URL,
      'app-copy',
      modulesIdObj.appCopyId,
    );
  });
  it('Delete SKU using API', () => {
    android_PO.deleteUsingAPI(ENV_SERVER_URL, 'SKU', modulesIdObj.skuId);
  });
  it('Delete Selector using API', () => {
    android_PO.deleteUsingAPI(
      ENV_SERVER_URL,
      'selector-config',
      modulesIdObj.selectorConfigId,
    );
  });
  it('Delete Store copy using API', () => {
    android_PO.deleteUsingAPI(
      ENV_SERVER_URL,
      'store-copy',
      modulesIdObj.storeCopyId,
    );
  });
  it('Delete Bundle using API', () => {
    android_PO.deleteUsingAPI(
      ENV_SERVER_URL,
      'image/collection',
      modulesIdObj.imageCollectionId,
    );
  });
});
