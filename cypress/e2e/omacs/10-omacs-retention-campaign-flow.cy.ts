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
  const priceRetention = '19.99';
  const offerCodeRetentionSingle = `${offerPrefix}ret_${dateString}_1999_for_6mo_${fiveRandomCharacters}`;
  const offerCodeRetentionPercent = `${offerPrefix}ret_${dateString}__${fiveRandomCharacters}`;
  const offerCodeRetention = `${offerPrefix}ret_${dateString}_1999_for_12mo_${fiveRandomCharacters}`;
  const offerCodeUpgradeRetention = `${offerPrefix}ret_${dateString}_1999_for_12mo_${fiveRandomCharacters}_upgrade`;
  const email = Cypress.env('VM_EMAIL');
  const imageUrl =
    'https://samoc-images-dev.twlght.com/samoc/Offers/Images/DOG.jpg';
  const twlghtnft = Cypress.env('twlghtnft');
  const twlght6month = Cypress.env('twlght6month');
  const twlghty = Cypress.env('twlghty');
  const offerName = Cypress.env('offerName');
  const campaignName = Cypress.env('campaignName');
  const offerHeadline = Cypress.env('offerHeadline');
  const offerAppliedBanner = Cypress.env('offerAppliedBanner');
  const offerTerms = Cypress.env('offerTerms');
  const subhead = Cypress.env('subhead');
  const marketingHeadline = Cypress.env('marketingHeadline');
  const welcomeEmailText = Cypress.env('welcomeEmailText');
  const singleCode = 'Single Code';
  const claimOfferTermsEn =
    'By selecting "CLAIM MY DISCOUNT", you agree to authorize this charge and to the twlghtPLAY <a class="shout" target="_blank" href="termsofuse">Terms of Service</a>, <a class="shout" target="_blank" href="privacy">Privacy Policy</a> and <a class="shout" target="_blank" href="offers/terms/{{offerCode}}">Offer Terms</a>.';
  const claimOfferTermsEnWithCode = `By selecting "CLAIM MY DISCOUNT", you agree to authorize this charge and to the twlghtPLAY <a class="shout" target="_blank" href="termsofuse">Terms of Service</a>, <a class="shout" target="_blank" href="privacy">Privacy Policy</a> and <a class="shout" target="_blank" href="offers/terms/${offerCodeRetention}">Offer Terms</a>.`;
  const claimOfferTermsEnWithCodev2 = `By selecting "CLAIM MY DISCOUNT", you agree to authorize this charge and to the twlghtPLAY <a class="shout" target="_blank" href="termsofuse">Terms of Service</a>, <a class="shout" target="_blank" href="privacy">Privacy Policy</a> and <a class="shout" target="_blank" href="offers/terms/${offerCodeRetention}_v2">Offer Terms</a>.`;
  const claimOfferTermsEnWithCodePercent = `By selecting "CLAIM MY DISCOUNT", you agree to authorize this charge and to the twlghtPLAY <a class="shout" target="_blank" href="termsofuse">Terms of Service</a>, <a class="shout" target="_blank" href="privacy">Privacy Policy</a> and <a class="shout" target="_blank" href="offers/terms/${offerCodeRetentionPercent}">Offer Terms</a>.`;
  const claimOfferTermsEnWithCodePercentv2 = `By selecting "CLAIM MY DISCOUNT", you agree to authorize this charge and to the twlghtPLAY <a class="shout" target="_blank" href="termsofuse">Terms of Service</a>, <a class="shout" target="_blank" href="privacy">Privacy Policy</a> and <a class="shout" target="_blank" href="offers/terms/${offerCodeRetentionPercent}_v2">Offer Terms</a>.`;
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
  const validateContentTerms = (title, value) => {
    cy.wait(200);
    cy.wrap(title)
      .parents('.tab-content-block-languages-item ')
      .find('.tab-content-block-languages-data-item-title')
      .contains('CLAIM OFFER TERMS')
      .siblings('.tab-content-block-languages-data-item-content')
      .should('contain', value);
  };
  const validateContentMaster = () => {
    web_PO.formHasValue('marketingHeadline', marketingHeadline);
    web_PO.formHasValue('offerHeadline', offerHeadline);
    web_PO.formHasValue('subhead', subhead);
    web_PO.formHasValue('offerAppliedBanner', offerAppliedBanner);
    web_PO.formHasValue('offerTerms', offerTerms);
    web_PO.formHasValue('welcomeEmailText', welcomeEmailText);
  };
  const fillSettingsMasterRet = (
    plan,
    price,
    upgrade,
    duration,
    discountType,
  ) => {
    let upgradeVersion = upgrade;
    cy.get('[formcontrolname="eligiblePlans"]').click();
    cy.get('[role="listbox"]').contains(plan).click();
    cy.get('.cdk-overlay-backdrop').click();
    if (upgradeVersion === 'upgrade') {
      cy.get('[formcontrolname="createUpgradeOffer"]')
        .find('[class="mat-checkbox-inner-container"]')
        .click();
      cy.get('[formcontrolname="upgradePlan"]').click();
      cy.get('[class="mat-option-text"]').contains(plan).click();
    }
    web_PO.fillTextField('[formcontrolname="offerName"]', offerName);
    cy.get('[formcontrolname="discountType"]').click();
    cy.get('[role="option"]').contains(discountType).click();
    cy.get('[formcontrolname="discountDurationType"]').click();
    cy.get('[role="option"]').contains(duration).click();
    if (discountType === 'Percentage') {
      web_PO.fillTextField('[formcontrolname="discountPercents"]', '50');
    }
    if (discountType !== 'Percentage') {
      web_PO.fillTextField('[formcontrolname="discountAmount"]', price);
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
        if (upgradeVersion === 'upgrade' && duration === ' 12 Months ') {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('contain', offerCodeRetention);
          cy.wrap($el)
            .contains('_upgrade')
            .should('have.text', offerCodeUpgradeRetention);
        } else if (upgradeVersion !== 'upgrade' && duration === ' 12 Months ') {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeRetention);
        } else if (
          upgradeVersion !== 'upgrade' &&
          duration === 'Single Use' &&
          discountType !== 'Percentage'
        ) {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeRetentionSingle);
        } else if (discountType === 'Percentage') {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeRetentionPercent);
        }
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
    cy.get('[formcontrolname="languagesSelectControl"]').click();
    cy.get('[role="option"]').contains('Select All').click();
    cy.get('[type="button"]').contains('SUBMIT').click();
    cy.get('.language-item-content-container').should('exist');
    cy.wait(1000);
    cy.get('.tab-content-languages-item-container').each((cont) => {
      cy.wrap(cont)
        .find('.language-item-title')
        .then((title) => {
          if (title.text().includes('English')) {
            cy.wrap(title)
              .parents('.tab-content-languages-item-container')
              .find('.language-item-content-block-label')
              .contains('CLAIM OFFER TERMS')
              .siblings('.language-item-content-block-data')
              .should('contain', claimOfferTermsEn);
          } else {
            web_PO.validateLanguageFields('CLAIM OFFER TERMS', '{{offerCode}}');
          }
        });
    });
    web_PO.validateLanguageFields('OFFER HEADER', marketingHeadline);
    web_PO.validateLanguageFields('OFFER BODY TEXT', offerHeadline);
    web_PO.validateLanguageFields('OFFER BOLDED TEXT', subhead);
    web_PO.validateLanguageFields('OFFER APPLIED BANNER', offerAppliedBanner);
    web_PO.validateLanguageFields('OFFER TERMS', offerTerms);
    web_PO.validateLanguageFields('WELCOME EMAIL TEXT', welcomeEmailText);
  };
  const saveCampaign = (type: string) => {
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
    if (type === 'retention') {
      cy.url().should(
        'contain',
        `${interURL}/inter-detail/${offerCodeRetention}`,
      );
      web_PO.validateDurationOnGrid('12 Months');
      web_PO.validateDetailPageFields('OFFER TYPE', 'Retention');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeRetention);
        });
    } else if (type === 'upgrade') {
      cy.url().should(
        'contain',
        `${interURL}/inter-detail/${offerCodeRetention}`,
      );
      web_PO.validateDurationOnGrid('12 Months');
      web_PO.validateDetailPageFields('OFFER TYPE', 'Retention');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeRetention);
          cy.wrap($el)
            .contains('_upgrade')
            .should('have.text', offerCodeUpgradeRetention);
        });
    } else if (type === 'retentionpercent') {
      cy.url().should(
        'contain',
        `${interURL}/inter-detail/${offerCodeRetentionPercent}`,
      );
      web_PO.validateDurationOnGrid('Single Use');
      web_PO.validateDetailPageFields('OFFER TYPE', 'Retention');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeRetentionPercent);
        });
    }
    web_PO.gridCellisnotEmpty('.cdk-column-statusId');
    web_PO.gridCellisnotEmpty('.cdk-column-region');
    web_PO.gridCellisnotEmpty('.mat-column-price');
    web_PO.gridCellisnotEmpty('.mat-column-plan');
    web_PO.validateOfferNamesOnGrid(offerName);
    web_PO.validateDetailPageFields('RECURLY STATUS', 'Not found');
    web_PO.validateDetailPageFields('CONTENTFUL STATUS', 'Not found');
    web_PO.validateDetailPageFields('DPTRM LINK', 'Link');
    if (type !== 'retentionpercent') {
      web_PO.validateDetailPageFields('DISCOUNT TYPE', 'Fixed Amount');
    } else if (type === 'retentionpercent') {
      web_PO.validateDetailPageFields('DISCOUNT TYPE', 'Percentage');
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
    web_PO.validateLanguageFieldsDetail('WELCOME EMAIL TEXT', welcomeEmailText);
    if (type === 'retention' || type === 'upgrade') {
      cy.get('.tab-content-block-languages-item')
        .find('.item-content-language')
        .each((title) => {
          if (title.text().includes('English')) {
            validateContentTerms(title, claimOfferTermsEnWithCode);
          }
        });
      cy.get('.tab-content-block-languages-item')
        .find('.item-content-language')
        .each((title) => {
          if (!title.text().includes('English')) {
            validateContentTerms(title, offerCodeRetention);
          }
        });
    } else if (type === 'retentionpercent') {
      cy.get('.tab-content-block-languages-item')
        .find('.item-content-language')
        .each((title) => {
          if (title.text().includes('English')) {
            validateContentTerms(title, claimOfferTermsEnWithCodePercent);
          }
        });
      cy.get('.tab-content-block-languages-item')
        .find('.item-content-language')
        .each((title) => {
          if (!title.text().includes('English')) {
            validateContentTerms(title, offerCodeRetentionPercent);
          }
        });
    }
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
    validateContentMaster();
    cy.get('.mat-tab-label-content').contains('SETTINGS').click();
    web_PO.formHasValue('campaignName', campaignName);
    web_PO.formHasValue('dptrmLink', imageUrl);
    web_PO.formHasValue('offerName', offerName);
    web_PO.formContains('offerCodeType', singleCode);
    if (type === 'retention') {
      web_PO.formContains('eligiblePlans', twlght6month);
      web_PO.formContains('discountType', 'Fixed Amount');
      web_PO.formContains('discountDurationType', '12 Months');
      web_PO.formHasValue('discountAmount', priceRetention);
    } else if (type === 'retentionpercent') {
      web_PO.formContains('eligiblePlans', twlghtnft);
      web_PO.formContains('discountType', 'Percentage');
      web_PO.formContains('discountDurationType', 'Single Use');
      web_PO.formHasValue('discountPercents', '50');
    } else if (type === 'upgrade') {
      web_PO.formContains('eligiblePlans', twlghty);
      web_PO.formContains('upgradePlan', twlghty);
      web_PO.formContains('usersOnPlans', ' All Plans ');
      web_PO.formContains('discountType', 'Fixed Amount');
      web_PO.formHasValue('discountAmount', priceRetention);
      web_PO.formContains('discountDurationType', '12 Months');
    }
    cy.intercept('GET', '**/api/offers/campaign/**').as('loadedCampaign');
    cy.get('button').contains('UPDATE').should('not.be.disabled').click();
    web_PO.expectMessage('Do you wish to proceed with UPDATE ?');
    web_PO.expectMessage('updated successfully');
    cy.wait('@loadedCampaign', { timeout: apiWaitTimeout })
      .its('response.statusCode')
      .should('exist');
    if (type === 'retention') {
      cy.url().should(
        'contain',
        `${interURL}/inter-detail/${offerCodeRetention}`,
      );
      web_PO.validateDurationOnGrid('12 Months');
      web_PO.validateDetailPageFields('OFFER TYPE', 'Retention');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeRetention);
        });
    } else if (type === 'upgrade') {
      cy.url().should(
        'contain',
        `${interURL}/inter-detail/${offerCodeRetention}`,
      );
      web_PO.validateDurationOnGrid('12 Months');
      web_PO.validateDetailPageFields('OFFER TYPE', 'Retention');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeRetention);
          cy.wrap($el)
            .contains('_upgrade')
            .should('have.text', offerCodeUpgradeRetention);
        });
    } else if (type === 'retentionpercent') {
      cy.url().should(
        'contain',
        `${interURL}/inter-detail/${offerCodeRetentionPercent}`,
      );
      web_PO.validateDurationOnGrid('Single Use');
      web_PO.validateDetailPageFields('OFFER TYPE', 'Retention');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeRetentionPercent);
        });
    }
    web_PO.gridCellisnotEmpty('.cdk-column-statusId');
    web_PO.gridCellisnotEmpty('.cdk-column-region');
    web_PO.gridCellisnotEmpty('.mat-column-price');
    web_PO.gridCellisnotEmpty('.mat-column-plan');
    web_PO.validateDetailPageFields('RECURLY STATUS', 'Not found');
    web_PO.validateDetailPageFields('CONTENTFUL STATUS', 'Not found');
    web_PO.validateDetailPageFields('DPTRM LINK', 'Link');
    if (type !== 'retentionpercent') {
      web_PO.validateDetailPageFields('DISCOUNT TYPE', 'Fixed Amount');
    } else if (type === 'retentionpercent') {
      web_PO.validateDetailPageFields('DISCOUNT TYPE', 'Percentage');
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
    web_PO.validateLanguageFieldsDetail('WELCOME EMAIL TEXT', welcomeEmailText);
    if (type === 'retention' || type === 'upgrade') {
      cy.get('.tab-content-block-languages-item')
        .find('.item-content-language')
        .each((title) => {
          if (title.text().includes('English')) {
            validateContentTerms(title, claimOfferTermsEnWithCode);
          }
        });
      cy.get('.tab-content-block-languages-item')
        .find('.item-content-language')
        .each((title) => {
          if (!title.text().includes('English')) {
            validateContentTerms(title, offerCodeRetention);
          }
        });
    } else if (type === 'retentionpercent') {
      cy.get('.tab-content-block-languages-item')
        .find('.item-content-language')
        .each((title) => {
          if (title.text().includes('English')) {
            validateContentTerms(title, claimOfferTermsEnWithCodePercent);
          }
        });
      cy.get('.tab-content-block-languages-item')
        .find('.item-content-language')
        .each((title) => {
          if (!title.text().includes('English')) {
            validateContentTerms(title, offerCodeRetentionPercent);
          }
        });
    }
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
    validateContentMaster();
    cy.get('.mat-tab-label-content').contains('SETTINGS').click();
    web_PO.formHasValue('campaignName', campaignName);
    web_PO.formContains('offerCodeType', singleCode);
    web_PO.formHasValue('offerName', offerName);
    if (type === 'retention') {
      web_PO.formContains('eligiblePlans', twlght6month);
      web_PO.formContains('discountType', 'Fixed Amount');
      web_PO.formContains('discountDurationType', '12 Months');
      web_PO.formHasValue('discountAmount', priceRetention);
      web_PO.formHasValue('dptrmLink', imageUrl);
    } else if (type === 'retentionpercent') {
      web_PO.formContains('eligiblePlans', twlghtnft);
      web_PO.formContains('discountType', 'Percentage');
      web_PO.formContains('discountDurationType', 'Single Use');
      web_PO.formHasValue('discountPercents', '50');
      web_PO.formHasValue('dptrmLink', imageUrl);
    } else if (type === 'upgrade') {
      web_PO.formContains('eligiblePlans', twlghty);
      web_PO.formContains('upgradePlan', twlghty);
      web_PO.formContains('usersOnPlans', ' All Plans ');
      web_PO.formContains('discountType', 'Fixed Amount');
      web_PO.formHasValue('discountAmount', priceRetention);
      web_PO.formContains('discountDurationType', '12 Months');
      web_PO.formHasValue('dptrmLink', imageUrl);
    }
    web_PO.validateOfferNamesOnGrid(offerName + ' Edited');
    if (type === 'retention') {
      web_PO.validateDurationOnGrid('12 Months');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeRetention + '_v2');
        });
    } else if (type === 'retentionpercent') {
      web_PO.validateDurationOnGrid('Single Use');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeRetentionPercent + '_v2');
        });
    } else if (type === 'upgrade') {
      web_PO.validateDurationOnGrid('12 Months');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeRetention + '_v2');
          cy.wrap($el)
            .contains('_upgrade')
            .should('have.text', offerCodeRetention + '_v2' + '_upgrade');
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
    web_PO.validateTextField(
      '[formcontrolname="welcomeEmailText"]',
      welcomeEmailText,
    );
    web_PO.validateLanguageFields('WELCOME EMAIL TEXT', welcomeEmailText);
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
    if (type === 'retention') {
      cy.url().should(
        'contain',
        `${interURL}/inter-detail/${offerCodeRetention}_v2`,
      );
      web_PO.validateDurationOnGrid('12 Months');
      web_PO.validateDetailPageFields('OFFER TYPE', 'Retention');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeRetention + '_v2');
        });
    } else if (type === 'retentionpercent') {
      cy.url().should(
        'contain',
        `${interURL}/inter-detail/${offerCodeRetentionPercent}_v2`,
      );
      web_PO.validateDurationOnGrid('Single Use');
      web_PO.validateDetailPageFields('OFFER TYPE', 'Retention');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeRetentionPercent + '_v2');
        });
    } else if (type === 'upgrade') {
      cy.url().should(
        'contain',
        `${interURL}/inter-detail/${offerCodeRetention}_v2`,
      );
      web_PO.validateDurationOnGrid('12 Months');
      web_PO.validateDetailPageFields('OFFER TYPE', 'Retention');
      cy.get('.cdk-column-offerCode')
        .find('.table-cell-left')
        .each(($el) => {
          cy.wrap($el)
            .contains(fiveRandomCharacters)
            .should('have.text', offerCodeRetention + '_v2');
          cy.wrap($el)
            .contains('_upgrade')
            .should('have.text', offerCodeRetention + '_v2' + '_upgrade');
        });
    }
    web_PO.gridCellisnotEmpty('.cdk-column-statusId');
    web_PO.gridCellisnotEmpty('.cdk-column-region');
    web_PO.gridCellisnotEmpty('.mat-column-price');
    if (type !== 'retentionpercent') {
      web_PO.validateDetailPageFields('DISCOUNT TYPE', 'Fixed Amount');
    } else if (type === 'retentionpercent') {
      web_PO.validateDetailPageFields('DISCOUNT TYPE', 'Percentage');
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
    if (type === 'retention' || type === 'upgrade') {
      cy.get('.tab-content-block-languages-item')
        .find('.item-content-language')
        .each((title) => {
          if (title.text().includes('English')) {
            // validateContentTerms(title, claimOfferTermsEnWithCodev2)
            validateContentTerms(title, claimOfferTermsEnWithCode);
          }
        });
      cy.get('.tab-content-block-languages-item')
        .find('.item-content-language')
        .each((title) => {
          if (!title.text().includes('English')) {
            // validateContentTerms(title, offerCodeRetention + '_v2')
            validateContentTerms(title, offerCodeRetention);
          }
        });
    } else if (type === 'retentionpercent') {
      cy.get('.tab-content-block-languages-item')
        .find('.item-content-language')
        .each((title) => {
          if (title.text().includes('English')) {
            // validateContentTerms(title, claimOfferTermsEnWithCodePercentv2)
            validateContentTerms(title, claimOfferTermsEnWithCodePercent);
          }
        });
      cy.get('.tab-content-block-languages-item')
        .find('.item-content-language')
        .each((title) => {
          if (!title.text().includes('English')) {
            // validateContentTerms(title, offerCodeRetentionPercent + '_v2')
            validateContentTerms(title, offerCodeRetentionPercent);
          }
        });
    }
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
    if (origin === 'retention') {
      cy.visit(interURL + '/inter-detail/' + offerCodeRetention);
    } else if (origin === 'upgrade') {
      cy.visit(interURL + '/inter-detail/' + offerCodeRetention);
    } else if (origin === 'retentionpercent') {
      cy.visit(interURL + '/inter-detail/' + offerCodeRetentionPercent);
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
  describe('Retention percentage campaign with twlghtnft plan and without upgrade', () => {
    it('Navigate to add campaign form', () => {
      web_PO.navigateToAddCampaign(
        interURL,
        'International Retention',
        apiWaitTimeoutObj,
      );
    });
    it('Validate disabled elements', () => {
      checkDisabledMaster();
    });
    it('Fill Master Settings', () => {
      fillSettingsMasterRet(
        twlghtnft,
        priceRetention,
        'common',
        'Single Use',
        'Percentage',
      );
    });
    it('Fill Content', () => {
      fillContentMaster();
    });
    it('Save campaign', () => {
      saveCampaign('retentionpercent');
    });
    it('Edit campaign', () => {
      editCampaign('retentionpercent');
    });
    it('Duplicate campaign', () => {
      duplicateCampaign('retentionpercent');
    });
    it('Delete campaigns', () => {
      deleteDuplicatedCampaign();
      deleteOriginalCampaign('retentionpercent');
    });
  });
  describe('Retention campaign with twlght6month plan without upgrade, 12 Months ', () => {
    it('Navigate to add campaign form', () => {
      web_PO.navigateToAddCampaign(
        interURL,
        'International Retention',
        apiWaitTimeoutObj,
      );
    });
    it('Validate disabled elements', () => {
      checkDisabledMaster();
    });
    it('Fill Master Settings', () => {
      fillSettingsMasterRet(
        twlght6month,
        priceRetention,
        'common',
        ' 12 Months ',
        'Fixed Amount',
      );
    });
    it('Fill Content', () => {
      fillContentMaster();
    });
    it('Save campaign', () => {
      saveCampaign('retention');
    });
    it('Edit campaign', () => {
      editCampaign('retention');
    });
    it('Duplicate campaign', () => {
      duplicateCampaign('retention');
    });
    it('Delete campaigns', () => {
      deleteDuplicatedCampaign();
      deleteOriginalCampaign('retention');
    });
  });
  describe('Retention campaign with twlghty plan and upgrade, 12 Months ', () => {
    it('Navigate to add campaign form', () => {
      web_PO.navigateToAddCampaign(
        interURL,
        'International Retention',
        apiWaitTimeoutObj,
      );
    });
    it('Validate disabled elements', () => {
      checkDisabledMaster();
    });
    it('Fill Master Settings', () => {
      fillSettingsMasterRet(
        twlghty,
        priceRetention,
        'upgrade',
        ' 12 Months ',
        'Fixed Amount',
      );
    });
    it('Fill Content', () => {
      fillContentMaster();
    });
    it('Save campaign', () => {
      saveCampaign('upgrade');
    });
    it('Edit campaign', () => {
      editCampaign('upgrade');
    });
    it('Duplicate campaign', () => {
      duplicateCampaign('upgrade');
    });
    it('Delete campaigns', () => {
      deleteDuplicatedCampaign();
      deleteOriginalCampaign('upgrade');
    });
  });
});
