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
  const priceWinback = '19.99';
  const offerCodeWinback = `${offerPrefix}win_${dateString}_1999_for_6mo_${fiveRandomCharacters}`;
  const offerCodeWinbackFt = `${offerPrefix}win_${dateString}__${fiveRandomCharacters}`;
  const email = Cypress.env('VM_EMAIL');
  const imageUrl =
    'https://samoc-images-dev.twlght.com/samoc/Offers/Images/DOG.jpg';
  const twlght3month = Cypress.env('twlght3month');
  const offerName = Cypress.env('offerName');
  const campaignName = Cypress.env('campaignName');
  const offerHeadline = Cypress.env('offerHeadline');
  const offerAppliedBanner = Cypress.env('offerAppliedBanner');
  const offerTerms = Cypress.env('offerTerms');
  const subhead = Cypress.env('subhead');
  const marketingHeadline = Cypress.env('marketingHeadline');
  const welcomeEmailText = Cypress.env('welcomeEmailText');
  const singleCode = 'Single Code';
  const apiWaitTimeout = 120000;
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
    if (type !== 'winbackft') {
      web_PO.formHasValue('welcomeEmailText', welcomeEmailText);
    }
  };
  const fillSettingsMasterWin = (plan, price, discountType) => {
    cy.get('[formcontrolname="plan"]').click();
    cy.get('[role="listbox"]').contains(plan).click();
    web_PO.fillTextField('[formcontrolname="offerName"]', offerName);
    cy.get('[formcontrolname="discountType"]').click();
    cy.get('[role="option"]').contains(discountType).click();
    cy.get('[formcontrolname="discountDurationType"]').click();
    cy.get('[role="option"]').contains('Customize').click();
    web_PO.fillTextField('[formcontrolname="discountDurationValue"]', '6');
    if (discountType === 'Fixed Amount') {
      web_PO.fillTextField('[formcontrolname="discountAmount"]', price);
    }
    if (discountType === 'Free Trial') {
      cy.get('[formcontrolname="discountAmount"]').should('be.disabled');
    }
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
        if (discountType === 'Free Trial') {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeWinbackFt);
        }
        if (discountType === 'Fixed Amount') {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeWinback);
        }
      });
    cy.get('.button-primary').contains('NEXT').click();
    cy.wait(1000);
  };
  const fillContentMaster = (type: string) => {
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
    if (type !== 'winbackft') {
      web_PO.fillTextField(
        '[formcontrolname="welcomeEmailText"]',
        welcomeEmailText,
      );
    }
    cy.get('[formcontrolname="languagesSelectControl"]')
      .should('not.be.disabled')
      .click();
    cy.get('[role="option"]').contains('Select All').click();
    cy.get('[type="button"]').contains('SUBMIT').click();
    cy.get('.language-item-content-container').should('exist');
    web_PO.validateLanguageFields('OFFER HEADER', marketingHeadline);
    web_PO.validateLanguageFields('OFFER BODY TEXT', offerHeadline);
    web_PO.validateLanguageFields('OFFER BOLDED TEXT', subhead);
    web_PO.validateLanguageFields('OFFER APPLIED BANNER', offerAppliedBanner);
    web_PO.validateLanguageFields('OFFER TERMS', offerTerms);
    if (type !== 'winbackft') {
      web_PO.validateLanguageFields('WELCOME EMAIL TEXT', welcomeEmailText);
    }
    cy.get('.language-item-content-container').each(($el) => {
      cy.wrap($el).find('.dnd-preview').should('have.attr', 'src', imageUrl);
    });
  };
  const saveCampaign = (type: string) => {
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
    if (type === 'winback') {
      cy.url().should(
        'contain',
        `${interURL}/inter-detail/${offerCodeWinback}`,
      );
      web_PO.validateDurationOnGrid('6 Months');
      web_PO.validateDetailPageFields('OFFER TYPE', 'Winback');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeWinback);
        });
    } else if (type === 'winbackft') {
      cy.url().should(
        'contain',
        `${interURL}/inter-detail/${offerCodeWinbackFt}`,
      );
      web_PO.validateDurationOnGrid('6 Days');
      web_PO.validateDetailPageFields('OFFER TYPE', 'Winback');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeWinbackFt);
        });
    }
    web_PO.gridCellisnotEmpty('.cdk-column-statusId');
    web_PO.gridCellisnotEmpty('.cdk-column-region');
    if (type !== 'winbackft') {
      web_PO.gridCellisnotEmpty('.mat-column-price');
    }
    web_PO.gridCellisnotEmpty('.mat-column-plan');
    web_PO.validateOfferNamesOnGrid(offerName);
    web_PO.validateDetailPageFields('RECURLY STATUS', 'Not found');
    web_PO.validateDetailPageFields('CONTENTFUL STATUS', 'Not found');
    web_PO.validateDetailPageFields('DPTRM LINK', 'Link');
    if (type !== 'winbackft') {
      web_PO.validateDetailPageFields('DISCOUNT TYPE', 'Fixed Amount');
    } else if (type === 'winbackft') {
      web_PO.validateDetailPageFields('DISCOUNT TYPE', 'Free Trial');
    }
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
    if (type !== 'winbackft') {
      web_PO.validateLanguageFieldsDetail(
        'WELCOME EMAIL TEXT',
        welcomeEmailText,
      );
    }
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
    web_PO.formContains('plan', twlght3month);
    web_PO.formContains('offerCodeType', singleCode);
    web_PO.formContains('discountDurationType', 'Customize');
    web_PO.formHasValue('discountDurationValue', '6');
    web_PO.formHasValue('offerName', offerName);
    web_PO.formHasValue('dptrmLink', imageUrl);
    web_PO.formHasValue('campaignName', campaignName);
    if (type === 'winback') {
      web_PO.formContains('discountType', 'Fixed Amount');
      web_PO.formHasValue('discountAmount', priceWinback);
    } else if (type === 'winbackft') {
      web_PO.formContains('discountType', 'Free Trial');
      web_PO.formHasValue('discountAmount', '');
      cy.get('[formcontrolname="discountAmount"]').should('be.disabled');
    }
    cy.intercept('GET', '**/api/offers/campaign/**').as('loadedCampaign');
    cy.get('button').contains('UPDATE').should('not.be.disabled').click();
    web_PO.expectMessage('Do you wish to proceed with UPDATE ?');
    web_PO.expectMessage('updated successfully');
    cy.wait('@loadedCampaign', { timeout: apiWaitTimeout })
      .its('response.statusCode')
      .should('exist');
    if (type === 'winback') {
      cy.url().should(
        'contain',
        `${interURL}/inter-detail/${offerCodeWinback}`,
      );
      web_PO.validateDurationOnGrid('6 Months');
      web_PO.validateDetailPageFields('OFFER TYPE', 'Winback');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeWinback);
        });
    } else if (type === 'winbackft') {
      cy.url().should(
        'contain',
        `${interURL}/inter-detail/${offerCodeWinbackFt}`,
      );
      web_PO.validateDurationOnGrid('6 Days');
      web_PO.validateDetailPageFields('OFFER TYPE', 'Winback');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeWinbackFt);
        });
    }
    web_PO.gridCellisnotEmpty('.cdk-column-statusId');
    web_PO.gridCellisnotEmpty('.cdk-column-region');
    if (type !== 'winbackft') {
      web_PO.gridCellisnotEmpty('.mat-column-price');
    }
    web_PO.gridCellisnotEmpty('.mat-column-plan');
    web_PO.validateDetailPageFields('RECURLY STATUS', 'Not found');
    web_PO.validateDetailPageFields('CONTENTFUL STATUS', 'Not found');
    web_PO.validateDetailPageFields('DPTRM LINK', 'Link');
    if (type !== 'winbackft') {
      web_PO.validateDetailPageFields('DISCOUNT TYPE', 'Fixed Amount');
    } else if (type === 'winbackft') {
      web_PO.validateDetailPageFields('DISCOUNT TYPE', 'Free Trial');
    }
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
    if (type !== 'winbackft') {
      web_PO.validateLanguageFieldsDetail(
        'WELCOME EMAIL TEXT',
        welcomeEmailText,
      );
    }
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
    web_PO.formContains('plan', twlght3month);
    web_PO.formContains('offerCodeType', singleCode);
    web_PO.formContains('discountDurationType', 'Customize');
    web_PO.formHasValue('discountDurationValue', '6');
    web_PO.formHasValue('offerName', offerName);
    web_PO.formHasValue('dptrmLink', imageUrl);
    web_PO.formHasValue('campaignName', campaignName);
    if (type === 'winback') {
      web_PO.formContains('discountType', 'Fixed Amount');
      web_PO.formHasValue('discountAmount', priceWinback);
    } else if (type === 'winbackft') {
      web_PO.formContains('discountType', 'Free Trial');
      web_PO.formHasValue('discountAmount', ''); // was 0
      cy.get('[formcontrolname="discountAmount"]').should('be.disabled');
    }
    web_PO.validateOfferNamesOnGrid(offerName + ' Edited');
    if (type === 'winback') {
      web_PO.validateDurationOnGrid('6 Months');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeWinback + '_v2');
        });
    } else if (type === 'winbackft') {
      web_PO.validateDurationOnGrid('6 Days');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeWinbackFt + '_v2');
        });
    }
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
    if (type !== 'winbackft') {
      web_PO.validateTextField(
        '[formcontrolname="welcomeEmailText"]',
        welcomeEmailText,
      );
      web_PO.validateLanguageFields('WELCOME EMAIL TEXT', welcomeEmailText);
    }
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
    cy.url().should('contain', '_v2');
    if (type === 'winback') {
      cy.url().should(
        'contain',
        `${interURL}/inter-detail/${offerCodeWinback}_v2`,
      );
      web_PO.validateDurationOnGrid('6 Months');
      web_PO.validateDetailPageFields('OFFER TYPE', 'Winback');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeWinback + '_v2');
        });
    } else if (type === 'winbackft') {
      cy.url().should(
        'contain',
        `${interURL}/inter-detail/${offerCodeWinbackFt}_v2`,
      );
      web_PO.validateDurationOnGrid('6 Days');
      web_PO.validateDetailPageFields('OFFER TYPE', 'Winback');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeWinbackFt + '_v2');
        });
    }
    web_PO.gridCellisnotEmpty('.cdk-column-statusId');
    web_PO.gridCellisnotEmpty('.cdk-column-region');
    if (type !== 'winbackft') {
      web_PO.validateDetailPageFields('DISCOUNT TYPE', 'Fixed Amount');
      web_PO.gridCellisnotEmpty('.mat-column-price');
    }
    if (type === 'winbackft') {
      web_PO.validateDetailPageFields('DISCOUNT TYPE', 'Free Trial');
    }
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
    if (type !== 'winbackft') {
      web_PO.validateLanguageFieldsDetail(
        'WELCOME EMAIL TEXT',
        welcomeEmailText,
      );
    }
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
  const deleteOriginalCampaign = (origin: string) => {
    cy.intercept('GET', '**/api/offers/campaign/**').as('loadedCampaign');
    cy.intercept('GET', '**/api/offers').as('loadedOffers');
    if (origin === 'winback') {
      cy.visit(`${interURL}/inter-detail/${offerCodeWinback}`);
    } else if (origin === 'winbackft') {
      cy.visit(`${interURL}/inter-detail/${offerCodeWinbackFt}`);
    }
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
  describe('Winback campaign with twlght3month plan and free trial', () => {
    it('Navigate to add campaign form', () => {
      web_PO.navigateToAddCampaign(
        interURL,
        'International Winback',
        apiWaitTimeoutObj,
      );
    });
    it('Validate disabled elements', () => {
      checkDisabledMaster();
    });
    it('Fill Master Settings', () => {
      fillSettingsMasterWin(twlght3month, priceWinback, 'Free Trial');
    });
    it('Fill Content', () => {
      fillContentMaster('winbackft');
    });
    it('Save campaign', () => {
      saveCampaign('winbackft');
    });
    it('Edit campaign', () => {
      editCampaign('winbackft');
    });
    it('Duplicate campaign', () => {
      duplicateCampaign('winbackft');
    });
    it('Delete campaigns', () => {
      deleteDuplicatedCampaign();
      deleteOriginalCampaign('winbackft');
    });
  });
  describe('Winback campaign with twlght3month plan and no free trial', () => {
    it('Navigate to add campaign form', () => {
      web_PO.navigateToAddCampaign(
        interURL,
        'International Winback',
        apiWaitTimeoutObj,
      );
    });
    it('Validate disabled elements', () => {
      checkDisabledMaster();
    });
    it('Fill Master Settings', () => {
      fillSettingsMasterWin(twlght3month, priceWinback, 'Fixed Amount');
    });
    it('Fill Content', () => {
      fillContentMaster('winback');
    });
    it('Save campaign', () => {
      saveCampaign('winback');
    });
    it('Edit campaign', () => {
      editCampaign('winback');
    });
    it('Duplicate campaign', () => {
      duplicateCampaign('winback');
    });
    it('Delete campaigns', () => {
      deleteDuplicatedCampaign();
      deleteOriginalCampaign('winback');
    });
  });
});
