/// <reference types="cypress-xpath" />

import * as moment from 'moment';
import 'cypress-localstorage-commands';
import 'cypress-wait-until';
import Web_PO from '../../support/pageObject/web/web_PO';

context('Campaign: Save, edit, duplicate and delete', () => {
  const web_PO = new Web_PO();
  const envUrl = Cypress.env('ENV_URL');
  const interURL = envUrl + Cypress.env('INT_OFFERS_URL');
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  const generateRandomString = (length: number) => {
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  };
  const fiveRandomCharacters = generateRandomString(4);
  let offerPrefix = '';
  if (Cypress.env('ENV') !== 'PROD') {
    offerPrefix = 'samocqa_';
  }
  const firstDayNextMonth = moment()
    .add(1, 'M')
    .startOf('month')
    .format('MM.DD.YYYY');
  const dateString = moment().format('YYMMDD');
  const priceAcquisition = '5.99';
  const offerCodeAcquisition = `${offerPrefix}acq_${dateString}_599_for_2mo_${fiveRandomCharacters}`;
  const email = Cypress.env('VM_EMAIL');
  const imageUrl =
    'https://samoc-images-dev.twlght.com/samoc/Offers/Images/DOG.jpg';
  const twlght = Cypress.env('twlght');
  const offerName = Cypress.env('offerName');
  const campaignName = Cypress.env('campaignName');
  const offerHeadline = Cypress.env('offerHeadline');
  const offerAppliedBanner = Cypress.env('offerAppliedBanner');
  const offerTerms = Cypress.env('offerTerms');
  const subhead = Cypress.env('subhead');
  const marketingHeadline = Cypress.env('marketingHeadline');
  const welcomeEmailText = Cypress.env('welcomeEmailText');
  const singleCode = 'Single Code';
  const bulkCode = 'Bulk Unique Codes';
  const apiWaitTimeout = 170000;
  const apiWaitTimeoutObj = { timeout: apiWaitTimeout };
  const checkDisabledMaster = () => {
    web_PO.checkDisabledElement('.button-secondary');
    cy.get('button').contains('SAVE').should('be.disabled');
    web_PO.checkDisabledElement("[class='button-primary button-disabled']");
    web_PO.checkDisabledAriaElement('[formcontrolname="offerCodeType"]');
    web_PO.checkDisabledAriaElement('[formcontrolname="discountType"]');
    web_PO.checkDisabledAriaElement('[formcontrolname="discountDurationType"]');
    web_PO.checkDisabledElement('[formcontrolname="discountAmount"]');
    web_PO.checkDisabledAriaElement('[formcontrolname="regionsSelectControl"]');
  };
  const validateContentMaster = (type) => {
    web_PO.formHasValue('marketingHeadline', marketingHeadline);
    web_PO.formHasValue('offerHeadline', offerHeadline);
    web_PO.formHasValue('subhead', subhead);
    web_PO.formHasValue('offerAppliedBanner', offerAppliedBanner);
    web_PO.formHasValue('offerTerms', offerTerms);
    web_PO.formHasValue('welcomeEmailText', welcomeEmailText);
  };
  const fillSettingsMasterAcq = (plan, code, price) => {
    cy.get('[formcontrolname="plan"]').click();
    cy.get('[role="listbox"]').contains(plan).click();
    web_PO.fillTextField('[formcontrolname="offerName"]', offerName);
    cy.get('[formcontrolname="offerCodeType"]').click();
    cy.get('[role="option"]')
      .contains(code)
      .click()
      .then(() => {
        if (code === bulkCode) {
          web_PO.fillTextField('[formcontrolname="totalUniqueCodes"]', '5');
        }
      });
    cy.get('[formcontrolname="discountType"]').click();
    cy.get('[role="option"]').contains('Fixed Amount').click();
    cy.get('[formcontrolname="discountDurationType"]').click();
    cy.get('[role="option"]').contains('Customize').click();
    web_PO.fillTextField('[formcontrolname="discountDurationValue"]', '2');
    web_PO.fillTextField('[formcontrolname="discountAmount"]', price);
    web_PO.chooseFirstDayNextMonth(0);
    web_PO.fillTextField('[formcontrolname="dptrmLink"]', imageUrl);
    web_PO.fillTextField('[formcontrolname="campaignName"]', campaignName);
    cy.get('[formcontrolname="offerBusinessOwner"]').should(
      'have.value',
      email,
    );
    cy.get('[formcontrolname="regionsSelectControl"]').click();
    cy.intercept('GET', '**/api/validator/offer/**').as('loadedValidator');
    cy.get('[role="option"]').contains('Select All').click();
    cy.get('[type="button"]').contains('SUBMIT').click();
    cy.wait('@loadedValidator', { timeout: apiWaitTimeout })
      .its('response.statusCode')
      .should('exist');
    web_PO.validateCodes();
    web_PO.editAllCodes();
    web_PO.addRndCharToCode(fiveRandomCharacters);
    web_PO.updateAllCodes();
    cy.wait('@loadedValidator', { timeout: apiWaitTimeout })
      .its('response.statusCode')
      .should('exist');
    web_PO.validateCodes();
    cy.get('.cdk-column-offerCode')
      .find('.table-cell-left')
      .each(($el) => {
        cy.wrap($el)
          .contains(fiveRandomCharacters)
          .should('have.text', offerCodeAcquisition);
      });
    cy.get('.button-primary').contains('NEXT').click();
    cy.wait(1000);
  };
  const fillContentMaster = () => {
    cy.get('.language-item-content-container').should('not.exist');
    web_PO.fillTextField(
      '[formcontrolname="marketingHeadline"]',
      marketingHeadline,
    );
    web_PO.fillTextField('[formcontrolname="offerHeadline"]', offerHeadline);
    web_PO.fillTextField('[formcontrolname="subhead"]', subhead);
    web_PO.fillTextField(
      '[formcontrolname="offerAppliedBanner"]',
      offerAppliedBanner,
    );
    web_PO.fillTextField('[formcontrolname="offerTerms"]', offerTerms);
    web_PO.fillTextField(
      '[formcontrolname="welcomeEmailText"]',
      welcomeEmailText,
    );
    cy.get('[class="dnd-preview"]')
      .should('have.attr', 'src')
      .should('eq', 'assets/Placeholder.png');
    cy.get('[formcontrolname="offerBgImageUrl"]')
      .invoke('val', imageUrl)
      .trigger('change')
      .type(' ')
      .type('{backspace}')
      .should('have.value', imageUrl);
    cy.get('[class="dnd-preview"]')
      .should('have.attr', 'src')
      .should('not.eq', 'assets/Placeholder.png');
    cy.get('[formcontrolname="languagesSelectControl"]').click();
    cy.get('[role="option"]').contains('Select All').click();
    cy.get('[type="button"]').contains('SUBMIT').click();
    cy.get('.language-item-content-container').should('exist');
    web_PO.validateLanguageFields('OFFER HEADER', marketingHeadline);
    web_PO.validateLanguageFields('OFFER BODY TEXT', offerHeadline);
    web_PO.validateLanguageFields('OFFER BOLDED TEXT', subhead);
    web_PO.validateLanguageFields('OFFER APPLIED BANNER', offerAppliedBanner);
    web_PO.validateLanguageFields('OFFER TERMS', offerTerms);
    web_PO.validateLanguageFields('WELCOME EMAIL TEXT', welcomeEmailText);
    cy.get('.language-item-content-container').each(($el) => {
      cy.wrap($el).find('.dnd-preview').should('have.attr', 'src', imageUrl);
    });
  };
  const saveCampaign = () => {
    cy.intercept('GET', '**/api/offers/campaign/**').as('loadedCampaign');
    cy.get('button').contains('SAVE').should('be.visible');
    cy.get('button').contains('SAVE').should('not.be.disabled');
    cy.get('button').contains('SAVE').click();
    web_PO.expectMessage('Do you wish to proceed with SAVE ?');
    web_PO.expectMessage(
      `Campaign (${campaignName}) saved as draft successfully`,
    );
    cy.wait('@loadedCampaign', { timeout: apiWaitTimeout })
      .its('response.statusCode')
      .should('exist');
    cy.url().should(
      'contain',
      `${interURL}/inter-detail/${offerCodeAcquisition}`,
    );
    web_PO.validateDurationOnGrid('2 Months');
    web_PO.validateDetailPageFields('OFFER TYPE', 'Acquisition');
    cy.get('.cdk-column-offerCode')
      .find('.table-cell-left')
      .each(($el) => {
        cy.wrap($el)
          .contains(fiveRandomCharacters)
          .should('have.text', offerCodeAcquisition);
      });
    web_PO.gridCellisnotEmpty('.cdk-column-statusId');
    web_PO.gridCellisnotEmpty('.cdk-column-region');
    web_PO.gridCellisnotEmpty('.mat-column-plan');
    web_PO.validateOfferNamesOnGrid(offerName);
    web_PO.validateDetailPageFields('RECURLY STATUS', 'Not found');
    web_PO.validateDetailPageFields('CONTENTFUL STATUS', 'Not found');
    web_PO.validateDetailPageFields('DPTRM LINK', 'Link');
    web_PO.validateDetailPageFields('BUSINESS OWNER', email);
    web_PO.validateDetailPageFields('END DATE', firstDayNextMonth);
    web_PO.validateDetailPageFields('END TIME', '11:59 PM');
    cy.get('.mat-tab-body-wrapper')
      .find('.tab-content-block-row-title')
      .contains('CREATED AT')
      .siblings('.tab-content-block-data')
      .should('be.empty');
    cy.get('.mat-tab-label-content').contains('CONTENT').click();
    web_PO.validateLanguageFieldsDetail('OFFER HEADER', marketingHeadline);
    web_PO.validateLanguageFieldsDetail('OFFER BODY TEXT', offerHeadline);
    web_PO.validateLanguageFieldsDetail('OFFER BOLDED TEXT', subhead);
    web_PO.validateLanguageFieldsDetail(
      'OFFER APPLIED BANNER',
      offerAppliedBanner,
    );
    web_PO.validateLanguageFieldsDetail('OFFER TERMS', offerTerms);
    cy.get('.tab-content-block-languages-item')
      .find('.dnd-preview')
      .should('have.attr', 'src', imageUrl);
  };
  const editCampaign = (type: string) => {
    cy.intercept('GET', '**/api/offers/campaign/**').as('loadedCampaign');
    cy.get('.button-primary').contains('EDIT ').should('be.visible').click();
    cy.wait('@loadedCampaign', { timeout: apiWaitTimeout })
      .its('response.statusCode')
      .should('exist');
    web_PO.editAllCodes();
    cy.get('[role="gridcell"]')
      .find('[maxlength="255"]')
      .each(($el) => {
        cy.wait(100);
        cy.wrap($el).type(' Edited');
      });
    web_PO.updateAllCodes();
    web_PO.validateCodes();
    web_PO.validateOfferNamesOnGrid(offerName + ' Edited');
    cy.get('.mat-tab-label-content').contains('CONTENT').click();
    web_PO.formHasValue('offerBgImageUrl', imageUrl);
    validateContentMaster(type);
    cy.get('.mat-tab-label-content').contains('SETTINGS').click();
    web_PO.formContains('plan', twlght);
    web_PO.formContains('discountType', 'Fixed Amount');
    web_PO.formContains('discountDurationType', 'Customize');
    web_PO.formHasValue('discountDurationValue', '2');
    web_PO.formHasValue('discountAmount', priceAcquisition);
    web_PO.formHasValue('offerName', offerName);
    web_PO.formHasValue('dptrmLink', imageUrl);
    web_PO.formHasValue('campaignName', campaignName);
    if (type === 'acquisition') {
      web_PO.formContains('offerCodeType', singleCode);
    } else if (type === 'bulk') {
      web_PO.formHasValue('totalUniqueCodes', '5');
      web_PO.formContains('offerCodeType', bulkCode);
    }
    cy.intercept('GET', '**/api/offers/campaign/**').as('loadedCampaign');
    cy.get('button').contains('UPDATE').should('not.be.disabled').click();
    web_PO.expectMessage('Do you wish to proceed with UPDATE ?');
    web_PO.expectMessage('updated successfully');
    cy.wait('@loadedCampaign', { timeout: apiWaitTimeout })
      .its('response.statusCode')
      .should('exist');
    cy.url().should(
      'contain',
      interURL + '/inter-detail/' + offerCodeAcquisition,
    );
    web_PO.validateDurationOnGrid('2 Months');
    web_PO.validateDetailPageFields('OFFER TYPE', 'Acquisition');
    cy.get('.cdk-column-offerCode')
      .find('.table-cell-left')
      .each(($el) => {
        cy.wrap($el)
          .contains(fiveRandomCharacters)
          .should('have.text', offerCodeAcquisition);
      });
    web_PO.gridCellisnotEmpty('.cdk-column-statusId');
    web_PO.gridCellisnotEmpty('.cdk-column-region');

    web_PO.gridCellisnotEmpty('.mat-column-plan');
    web_PO.validateDetailPageFields('RECURLY STATUS', 'Not found');
    web_PO.validateDetailPageFields('CONTENTFUL STATUS', 'Not found');
    web_PO.validateDetailPageFields('DPTRM LINK', 'Link');
    web_PO.validateDetailPageFields('BUSINESS OWNER', email);
    web_PO.validateDetailPageFields('END DATE', firstDayNextMonth);
    web_PO.validateDetailPageFields('END TIME', '11:59 PM');
    cy.get('.mat-tab-body-wrapper')
      .find('.tab-content-block-row-title')
      .contains('CREATED AT')
      .siblings('.tab-content-block-data')
      .should('be.empty');
    cy.get('.mat-tab-label-content').contains('CONTENT').click();
    web_PO.validateLanguageFieldsDetail('OFFER HEADER', marketingHeadline);
    web_PO.validateLanguageFieldsDetail('OFFER BODY TEXT', offerHeadline);
    web_PO.validateLanguageFieldsDetail('OFFER BOLDED TEXT', subhead);
    web_PO.validateLanguageFieldsDetail(
      'OFFER APPLIED BANNER',
      offerAppliedBanner,
    );
    web_PO.validateLanguageFieldsDetail('OFFER TERMS', offerTerms);
    cy.get('.tab-content-block-languages-item')
      .find('.dnd-preview')
      .should('have.attr', 'src', imageUrl);
  };
  const duplicateCampaign = (type: string) => {
    cy.intercept('GET', '**/api/validator/offer/**').as('loadedValidator');
    cy.get('.button-primary ')
      .contains('DUPLICATE ')
      .should('exist')
      .and('not.be.disabled')
      .click();
    web_PO.expectMessage('Do you wish to proceed with DUPLICATE?');
    cy.wait('@loadedValidator', { timeout: apiWaitTimeout })
      .its('response.statusCode')
      .should('exist');
    cy.get('[formcontrolname="offerBusinessOwner"]')
      .type('!')
      .type('{backspace}')
      .should('have.value', email);
    cy.get('.mat-tab-label-content').contains('CONTENT').click();
    web_PO.formHasValue('offerBgImageUrl', imageUrl);
    validateContentMaster(type);
    cy.get('.mat-tab-label-content').contains('SETTINGS').click();
    web_PO.formContains('plan', twlght);
    web_PO.formContains('discountType', 'Fixed Amount');
    web_PO.formHasValue('discountAmount', priceAcquisition);
    web_PO.formHasValue('offerName', offerName);
    web_PO.formHasValue('dptrmLink', imageUrl);
    web_PO.formHasValue('campaignName', campaignName);
    web_PO.formContains('discountDurationType', 'Customize');
    web_PO.formHasValue('discountDurationValue', '2');
    if (type === 'acquisition') {
      web_PO.formContains('offerCodeType', singleCode);
      web_PO.formContains('discountDurationType', 'Customize');
      web_PO.formHasValue('discountDurationValue', '2');
    } else if (type === 'bulk') {
      web_PO.formHasValue('totalUniqueCodes', '5');
      web_PO.formContains('offerCodeType', bulkCode);
    }
    web_PO.validateOfferNamesOnGrid(offerName + ' Edited');
    web_PO.validateDurationOnGrid('2 Months');
    cy.get('.cdk-column-offerCode')
      .find('.table-cell-left')
      .each(($el) => {
        cy.wrap($el)
          .contains(fiveRandomCharacters)
          .should('have.text', offerCodeAcquisition + '_v2');
      });
    cy.get('.button-primary').contains('NEXT').click();
    cy.wait(1000);
    cy.get('.language-item-content-container').should('exist');
    web_PO.validateTextField(
      '[formcontrolname="marketingHeadline"]',
      marketingHeadline,
    );
    web_PO.validateTextField(
      '[formcontrolname="offerHeadline"]',
      offerHeadline,
    );
    web_PO.validateTextField('[formcontrolname="subhead"]', subhead);
    web_PO.validateTextField(
      '[formcontrolname="offerAppliedBanner"]',
      offerAppliedBanner,
    );
    web_PO.validateTextField('[formcontrolname="offerTerms"]', offerTerms);
    web_PO.validateLanguageFields('OFFER HEADER', marketingHeadline);
    web_PO.validateLanguageFields('OFFER BODY TEXT', offerHeadline);
    web_PO.validateLanguageFields('OFFER BOLDED TEXT', subhead);
    web_PO.validateLanguageFields('OFFER APPLIED BANNER', offerAppliedBanner);
    web_PO.validateLanguageFields('OFFER TERMS', offerTerms);
    cy.intercept('GET', '**/api/offers/campaign/**').as('loadedCampaign');
    cy.get('button')
      .contains('SAVE')
      .should('be.visible')
      .and('not.be.disabled')
      .click();
    web_PO.expectMessage('Do you wish to proceed with SAVE ?');
    web_PO.expectMessage(
      `Campaign (${campaignName}) saved as draft successfully`,
    );
    cy.wait('@loadedCampaign', { timeout: apiWaitTimeout })
      .its('response.statusCode')
      .should('exist');
    cy.url().should('contain', '_v2');
    if (type === 'acquisition') {
      cy.url().should(
        'contain',
        `${interURL}/inter-detail/${offerCodeAcquisition}_v2`,
      );
      web_PO.validateDurationOnGrid('2 Months');
      web_PO.validateDetailPageFields('OFFER TYPE', 'Acquisition');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeAcquisition + '_v2');
        });
    }
    web_PO.gridCellisnotEmpty('.cdk-column-statusId');
    web_PO.gridCellisnotEmpty('.cdk-column-region');
    web_PO.gridCellisnotEmpty('.mat-column-price');
    web_PO.validateDetailPageFields('DISCOUNT TYPE', 'Fixed Amount');
    web_PO.gridCellisnotEmpty('.mat-column-plan');
    web_PO.validateOfferNamesOnGrid(offerName + ' Edited');
    web_PO.validateDetailPageFields('RECURLY STATUS', 'Not found');
    web_PO.validateDetailPageFields('CONTENTFUL STATUS', 'Not found');
    web_PO.validateDetailPageFields('DPTRM LINK', 'Link');
    web_PO.validateDetailPageFields('BUSINESS OWNER', email);
    web_PO.validateDetailPageFields('END DATE', firstDayNextMonth);
    web_PO.validateDetailPageFields('END TIME', '11:59 PM');
    cy.get('.mat-tab-body-wrapper')
      .find('.tab-content-block-row-title')
      .contains('CREATED AT')
      .siblings('.tab-content-block-data')
      .should('be.empty');
    cy.get('.mat-tab-label-content').contains('CONTENT').click();
    web_PO.validateLanguageFieldsDetail('OFFER HEADER', marketingHeadline);
    web_PO.validateLanguageFieldsDetail('OFFER BODY TEXT', offerHeadline);
    web_PO.validateLanguageFieldsDetail('OFFER BOLDED TEXT', subhead);
    web_PO.validateLanguageFieldsDetail(
      'OFFER APPLIED BANNER',
      offerAppliedBanner,
    );
    web_PO.validateLanguageFieldsDetail('OFFER TERMS', offerTerms);
    cy.get('.tab-content-block-languages-item')
      .find('.dnd-preview')
      .should('have.attr', 'src', imageUrl);
  };
  const deleteDuplicatedCampaign = () => {
    cy.intercept('GET', '**/api/offers').as('loadedOffers');
    cy.get('.button-tertiary')
      .contains(' DELETE ')
      .should('exist')
      .and('not.be.disabled')
      .click();
    web_PO.expectMessage('Do you wish to proceed with DELETE?');
    web_PO.expectMessage('deleted successfully from DB');
    cy.wait('@loadedOffers', { timeout: apiWaitTimeout })
      .its('response.statusCode')
      .should('exist');
    cy.url().should('not.contain', fiveRandomCharacters);
  };
  const deleteOriginalCampaign = () => {
    cy.intercept('GET', '**/api/offers/campaign/**').as('loadedCampaign');
    cy.intercept('GET', '**/api/offers').as('loadedOffers');
    cy.visit(`${interURL}/inter-detail/${offerCodeAcquisition}`);
    cy.wait('@loadedCampaign', { timeout: apiWaitTimeout })
      .its('response.statusCode')
      .should('exist');
    cy.get('.status-cell').contains('DFT ').should('exist');
    cy.get('.button-tertiary').contains(' DELETE ').click();
    web_PO.expectMessage('Do you wish to proceed with DELETE?');
    web_PO.expectMessage('deleted successfully from DB');
    cy.wait('@loadedOffers', { timeout: apiWaitTimeout })
      .its('response.statusCode')
      .should('exist');
  };
  before(() => {
    cy.setLocalStorageClear();
    cy.customPostUserData();
    cy.saveLocalStorage();
  });
  beforeEach(() => {
    cy.viewport(1980, 1024);
  });
  describe('Acquisition campaign with twlght plan and single code', () => {
    it('Navigate to add campaign form', () => {
      web_PO.navigateToAddCampaign(
        interURL,
        'International Acquisition',
        apiWaitTimeoutObj,
      );
    });
    it('Validate disabled elements', () => {
      checkDisabledMaster();
    });
    it('Fill Master Settings', () => {
      fillSettingsMasterAcq(twlght, singleCode, priceAcquisition);
    });
    it('Fill Content', () => {
      fillContentMaster();
    });
    it('Save campaign', () => {
      saveCampaign();
    });
    it('Edit campaign', () => {
      editCampaign('acquisition');
    });
    it('Duplicate campaign', () => {
      duplicateCampaign('acquisition');
    });
    it('Delete campaigns', () => {
      deleteDuplicatedCampaign();
      deleteOriginalCampaign();
    });
  });
  describe('Acquisition campaign with twlght plan and bulk code', () => {
    it('Navigate to add campaign form', () => {
      web_PO.navigateToAddCampaign(
        interURL,
        'International Acquisition',
        apiWaitTimeoutObj,
      );
    });
    it('Validate disabled elements', () => {
      checkDisabledMaster();
    });
    it('Fill Master Settings', () => {
      fillSettingsMasterAcq(twlght, bulkCode, priceAcquisition);
    });
    it('Fill Content', () => {
      fillContentMaster();
    });
    it('Save campaign', () => {
      saveCampaign();
    });
    it('Edit campaign', () => {
      editCampaign('bulk');
    });
    it('Duplicate campaign', () => {
      duplicateCampaign('bulk');
    });
    it('Delete campaigns', () => {
      deleteDuplicatedCampaign();
      deleteOriginalCampaign();
    });
  });
});
