/// <reference types="cypress-xpath" />
import * as moment from 'moment';
import 'cypress-localstorage-commands';
import 'cypress-real-events';
import Roku_PO from '../../support/pageObject/roku/roku_PO';



context('Campaign flow', () => {
  const roku_PO = new Roku_PO();
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
    roku_PO.interceptAlias('GET', '**/api/roku/campaign**', 'campaign');
    cy.get('.backbtn').click();
    roku_PO.waitForAlias('@campaign', apiWaitTimeoutObj);
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
        url: `${ENV_SERVER_URL}/api/roku/${module}/save?store=roku&product=twlght`,
        body: fixtureBody,
      }).then((response: any) => {
        modulesIdObj[responseId] = response.body.data[responseId];
      });
    });
  };
  before(() => {
    // cy.setLocalStorageClear();
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
    roku_PO.navigateToSamocSkuPage(apiWaitTimeout);
    roku_PO.interceptAlias('GET', '**/api/roku/campaign**', 'campaign');
    roku_PO.setHeaders('ROKU',  'twlght ', 'CAMPAIGNS');
    roku_PO.waitForAlias('@campaign', apiWaitTimeoutObj);
    cy.contains('[role="tab"]', 'CAMPAIGNS').click();
  });
  it('Create Store copy using API', () => {
    createModuleUsingAPI('StoreCopy-Roku', 'store-copy', 'storeCopyId');
  });
  it('Create App copy using API', () => {
    createModuleUsingAPI('AppCopy-Roku', 'app-copy', 'appCopyId');
   
  });
  it('Create SKU using API', () => {
    createModuleUsingAPI('SKU-Roku', 'sku', 'skuId');  
  });
  it('Create Selector using API', () => {
    createModuleUsingAPI('Selector', 'selector-config', 'selectorConfigId');
  });
  it('Create Bundle using API', () => {
    createModuleUsingAPI('Bundle', 'image/collection', 'imageCollectionId');
  });
  
  it('Create campaign', () => {
    roku_PO.interceptAlias('GET', '**//app-copy**', 'campaignForm');
    cy.contains('.button-primary', 'CREATE NEW CAMPAIGN').click();
    roku_PO.waitForAlias('@campaignForm', apiWaitTimeoutObj);
    cy.wait(2000);
    roku_PO.clearThenFillEmptyForm('name', dataJSON.name, typeDelay);
    roku_PO.clearThenFillEmptyForm(
      'startDate',
      firstDayNextMonth,
      typeDelay,
    );
    roku_PO.clearThenFillEmptyForm(
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
    roku_PO.interceptAlias(
      'POST',
      '**api/roku/campaign/save**',
      'campaignCopyPayload',
    );
    cy.contains('SAVE').click();
    cy.contains('.button-dialog-primary', 'OK').click(); // dialog message is not validated
    expectPayloadValues('@campaignCopyPayload');
    roku_PO.expectDialogMessage(
      `Roku ${dataJSON.name} Campaign module saved in DB successfully`,
    );
    goBackToGrid();
  });
  it('Validate filter and edit campaign', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'NAME')
      .should('be.visible')
      .click();
    roku_PO.clearThenFillPlaceholderForm(
      'Enter Campaign Name',
      'Invalid name',
    );
    cy.contains('[role="gridcell"]', dataJSON.name).should('not.exist');
    roku_PO.clearThenFillPlaceholderForm(
      'Enter Campaign Name',
      dataJSON.name,
    );
    roku_PO.clickDotMenuOption(dataJSON.name, 'Edit');
    cy.wait(2000);
    cy.contains('UPDATE').should('be.disabled');
    validateModule('AppCopy', 'appCopyId');
    validateModule('StoreCopy', 'storeCopyId');
    validateModule('Selector', 'selectorConfigId');
    validateModule('SKU', 'winbackSkuId');
    cy.fixture('Bundle').then((bundleJSON) => {
      cy.contains(bundleJSON.name).should('exist'); //is not seen
    });
    roku_PO.clearThenFillEmptyForm(
      'endDate',
      firstDayAfterFutureMonth,
      typeDelay,
    );
    cy.contains('UPDATE').should('not.be.disabled').click();
    roku_PO.interceptAlias('PUT', '**/update**', 'campaignUpdate');
    roku_PO.expectDialogMessage('Do you wish to proceed with UPDATE?');
    roku_PO.waitForAlias('@campaignUpdate', apiWaitTimeoutObj);
    roku_PO.expectDialogMessage(
      `Roku ${dataJSON.name} Campaign module updated in DB successfully`,
    );
    goBackToGrid();
  });
  it('Duplicate campaign', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'NAME')
      .should('be.visible')
      .click();
   roku_PO.clearThenFillPlaceholderForm(
      'Enter Campaign Name',
      dataJSON.name ,
    );
   roku_PO.interceptAlias('GET', '**api/roku/campaign**', 'campaign');
   roku_PO.clickDotMenuOption(dataJSON.name, 'Duplicate');
   roku_PO.waitForAlias('@campaign', apiWaitTimeoutObj);
   roku_PO.clearThenFillEmptyForm('name', dataJSON.name, typeDelay);
    cy.get('.form-header').click();
   roku_PO.validateErrorHaveText(0, ' This Campaign Name already exists ');
   roku_PO.clearThenFillEmptyForm(
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
    roku_PO.interceptAlias(
      'POST',
      '**api/roku/campaign/save**',
      'campaignCopyPayload',
    );
    cy.contains('SAVE').click();
    cy.contains('.button-dialog-primary', 'OK').click(); // dialog message is not validated
    expectPayloadValues('@campaignCopyPayload');
    roku_PO.expectDialogMessage(
      `Roku ${campaignNameDuplicated} Campaign module saved in DB successfully`,
    );
    goBackToGrid();
  });
  it('Delete campaigns', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'NAME')
      .should('be.visible')
      .click();
   roku_PO.clearThenFillPlaceholderForm(
      'Enter Campaign Name',
      campaignNameDuplicated,
    );
   roku_PO.interceptAlias('GET', '**api/roku/campaign**', 'campaign');
   roku_PO.clickDotMenuOption(dataJSON.name, 'Delete');
   roku_PO.expectDialogMessage(
      `Do you wish to proceed with DELETE "${campaignNameDuplicated}"?`,
    );
   roku_PO.interceptAlias('GET', '**api/roku/campaign**', 'campaign');
   roku_PO.expectDialogMessage(
      `Roku ${campaignNameDuplicated} Campaign module deleted from DB successfully`,
    );
    roku_PO.waitForAlias('@campaign', apiWaitTimeoutObj);
    roku_PO.deleteUsingAPI(ENV_SERVER_URL, 'campaign', savedCampaignId);
  });
  it('Delete App copy using API', () => {
    roku_PO.deleteUsingAPI(
      ENV_SERVER_URL,
      'app-copy',
      modulesIdObj.appCopyId,
    );
  });
  it('Delete SKU using API', () => {
   roku_PO.deleteUsingAPI(ENV_SERVER_URL, 'SKU', modulesIdObj.skuId);
  });
  it('Delete Selector using API', () => {
   roku_PO.deleteUsingAPI(
      ENV_SERVER_URL,
      'selector-config',
      modulesIdObj.selectorConfigId,
    );
  });
  it('Delete Store copy using API', () => {
   roku_PO.deleteUsingAPI(
      ENV_SERVER_URL,
      'store-copy',
      modulesIdObj.storeCopyId,
    );
  });
  it('Delete Bundle using API', () => {
   roku_PO.deleteUsingAPI(
      ENV_SERVER_URL,
      'image/collection',
      modulesIdObj.imageCollectionId,
    );
  });
});
