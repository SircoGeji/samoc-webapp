/// <reference types="cypress-xpath" />

import 'cypress-localstorage-commands';
import 'cypress-real-events';
import Roku_PO from '../../support/pageObject/roku/roku_PO';
import 'cypress-file-upload';

context('Images flow', () => {
  const roku_PO = new Roku_PO();
  const apiWaitTimeout = 15000;
  const apiWaitTimeoutObj = { timeout: apiWaitTimeout };
  const typeDelay = { delay: 0 };
  const ENV_SERVER_URL = Cypress.env('ENV_SERVER_URL');
  const bundleName = 'CypressBundle';
  const bundleNameDuplicated = 'CypressBundleDuplicated';
  const instance = `samoc-${Cypress.env('ENV').toLowerCase()}-instance`;
  // let savedImageId;
  let savedBundleId;
  // let duplicatedBundleId;
  const selectImage = (placeholder, name) => {
    cy.contains('.bundle-image-container', placeholder)
      .click()
      .then(() => {
        cy.contains('.gallery-image-name', name)
          .parents('.gallery-image-container')
          .find('.gallery-image')
          .click({ force: true });
        cy.contains('.gallery-save-button', ' SELECT IMAGE ').click();
      });
  };
  const generateRandomString = (length) => {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
    1;
  };
  let randomString = generateRandomString(3);
  before(() => {
    cy.setLocalStorageClear();
    cy.customPostUserData();
    cy.saveLocalStorage();
    cy.fixture('Image-Roku').then((data) => {
      globalThis.data = data;
    });
  });
  beforeEach(() => {
    cy.setViewPort();
  });
  it('Set headers', () => {
    roku_PO.navigateToSamocSkuPage(apiWaitTimeout);
    roku_PO.setHeaders('ROKU', 'twlght ', 'IMAGES');
    roku_PO.interceptAlias(
      'GET',
      '**/api/roku/image/collection**',
      'collection',
    );
    cy.contains('[role="tab"]', 'GALLERY').click();
    roku_PO.waitForAlias('@collection', apiWaitTimeoutObj);
  });
  it('Upload image to gallery', () => {
    cy.contains('.gallery-save-button', ' UPLOAD TO GALLERY ').click();
    cy.get('.button-dialog-primary').should('be.disabled');
    cy.get('input[type=file]').attachFile('Bundle-Android.json');
    cy.get('.component-container').should(
      'contain',
      'You can upload only images of JPG or JPEG types',
    );
    cy.get('.button-dialog-primary').should('be.disabled');
    // roku_PO.interceptAlias(
    //   'POST',
    //   '**/api/roku/gallery/uploadImage??product=twlght&imageNames=**',
    //   'image',
    // );
    cy.get('input[type=file]').attachFile('./images/1920x1080.jpg');
    // roku_PO.waitForAlias('@image',apiWaitTimeout);

    // cy.get(
    //   `[src="https://img.twlght.com/Buyflow/roku/samoc/gallery/samoc-dev-instance/roku/twlght/1920x1080.jpg"]`,
    // ).should('be.visible');

    // roku_PO.interceptAlias(
    //   'POST',
    //   '**api/roku/image/gallery/save??store=google&product=twlght',
    //   'image',
    // );

    // roku_PO.waitForAlias('@image', apiWaitTimeoutObj);
    cy.contains('.button-dialog-primary', ' UPLOAD ').click();
    roku_PO.interceptAlias('GET', '**/api/roku/image/**', 'collection');
    roku_PO.expectDialogMessage(
      `Roku ImageGallery module saved in DB successfully`,
    );
    roku_PO.waitForAlias('@collection', apiWaitTimeoutObj);
  });
  // skipped as deprecated, can be used to test on local
  it.skip('Upload image using api', () => {
    cy.fixture('Image').then((ImageFixture) => {
      cy.request({
        method: 'POST',
        url: `${ENV_SERVER_URL}/api/roku/image/gallery/save?store=google&product=twlght`,
        body: ImageFixture,
      }).then((response) => {
        // savedImageId = response.body.data.imageGalleryId;
      });
    });
  });

  it('Create bundle', () => {
    cy.contains('.mat-tab-label-content', 'BUNDLES').click();
    roku_PO.interceptAlias(
      'GET',
      '**/api/roku/image/placement**',
      'bundleForm',
    );
    cy.contains('.button-primary', 'CREATE NEW').click();
    roku_PO.waitForAlias('@bundleForm', apiWaitTimeoutObj);
    cy.contains('Bundle Name*')
      .parents('.mat-form-field-infix')
      .find('[type="text"]')
      .clear()
      .type(bundleName + randomString, typeDelay);
    cy.contains('US')
      .parents('.region-checkbox-container')
      .find('[type="checkbox"]')
      .check({ force: true });
    selectImage('TV BUYFLOW LANDSCAPE', '1920x1080');
    // cy.get('gallery-save-button').click();
    // cy.get('.component-container').click();
    roku_PO.interceptAlias(
      'POST',
      '**/api/roku/image/collection/save**',
      'collectionCopyPayload',
    );
    cy.contains('SAVE').click();
    roku_PO.expectDialogMessage('Do you wish to proceed with  SAVE ALL?');
    cy.wait('@collectionCopyPayload').then(({ response }) => {
      savedBundleId = response.body.data.imageCollectionId;
    });
    roku_PO.expectDialogMessage(
      `Roku ${bundleName}${randomString} ImageCollection module saved in DB successfully`,
    );
    roku_PO.interceptAlias(
      'GET',
      '**/api/roku/image/collection**',
      'collection',
    );
    cy.get('.backbtn').click();
    roku_PO.waitForAlias('@collection', apiWaitTimeoutObj);
  });

  it('Validate filter and edit created bundle', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'BUNDLE NAME')
      .should('be.visible')
      .click();
    cy.wait(500);
    roku_PO.clearThenFillPlaceholderForm('Enter Bundle Name', 'Invalid name');
    cy.contains('[role="gridcell"]', bundleName + randomString).should(
      'not.exist',
    );
    roku_PO.clearThenFillPlaceholderForm(
      'Enter Bundle Name',
      bundleName + `${randomString}`,
    );
    roku_PO.interceptAlias(
      'GET',
      '**/api/roku/image/placement**',
      'bundleForm',
    );
    roku_PO.clickDotMenuOption(bundleName + randomString, 'Edit');
    roku_PO.waitForAlias('@bundleForm', apiWaitTimeoutObj);
    selectImage('TV RENEW LANDSCAPE', '1920x1080');
    roku_PO.interceptAlias('PUT', '**/update**', 'collectionUpdate');
    cy.contains('UPDATE').should('not.be.disabled').click();
    roku_PO.expectDialogMessage('Do you wish to proceed with  UPDATE ALL?');
    roku_PO.waitForAlias('@collectionUpdate', apiWaitTimeoutObj);
    roku_PO.expectDialogMessage(
      `Roku ${bundleName}${randomString} ImageCollection module updated in DB successfully`,
    );
    roku_PO.interceptAlias(
      'GET',
      '**/api/roku/image/collection**',
      'collection',
    );
    cy.get('.backbtn').click();
    roku_PO.waitForAlias('@collection', apiWaitTimeoutObj);
  });
  it('Duplicate created bundle', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'BUNDLE NAME')
      .should('be.visible')
      .click();
    roku_PO.clearThenFillPlaceholderForm(
      'Enter Bundle Name',
      bundleName + randomString,
    );
    roku_PO.interceptAlias(
      'GET',
      '**/api/roku/image/placement**',
      'bundleForm',
    );
    roku_PO.clickDotMenuOption(bundleName + `${randomString}`, 'Duplicate');
    roku_PO.waitForAlias('@bundleForm', apiWaitTimeoutObj);
    cy.contains('Bundle Name*')
      .parents('.mat-form-field-infix')
      .find('[type="text"]')
      .clear()
      .type(bundleName + `${randomString}`, typeDelay);
    cy.contains('.regions-label', 'SUPPORTED REGIONS').click();
    cy.get('.mat-error').should(
      'have.text',
      ' This Bundle Name already exists ',
    );
    roku_PO.clearThenFillEmptyContain('Bundle Name*', bundleNameDuplicated);
    cy.contains('.regions-label', 'SUPPORTED REGIONS').click();
    roku_PO.interceptAlias(
      'POST',
      '**/api/roku/image/collection/save**',
      'collectionCopyPayload',
    );
    cy.contains('SAVE').click();
    roku_PO.expectDialogMessage('Do you wish to proceed with  SAVE ALL?');
    cy.wait('@collectionCopyPayload').then(({ response }) => {
      // duplicatedBundleId = response.body.data.imageCollectionId;
    });
    roku_PO.expectDialogMessage(
      `Roku ${bundleNameDuplicated} ImageCollection module saved in DB successfully`,
    );
    roku_PO.interceptAlias(
      'GET',
      '**/api/roku/image/collection**',
      'collection',
    );
    cy.get('.backbtn').click();
    roku_PO.waitForAlias('@collection', apiWaitTimeoutObj);
  });
  it('Delete created bundles', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'BUNDLE NAME')
      .should('be.visible')
      .click();
    roku_PO.clearThenFillPlaceholderForm(
      'Enter Bundle Name',
      `${bundleNameDuplicated}`,
    );
    cy.contains('[role="gridcell"]', bundleNameDuplicated).should('be.visible');
    roku_PO.clickDotMenuOption(bundleNameDuplicated, 'Delete');
    roku_PO.expectDialogMessage(
      `Do you wish to proceed with DELETE "${bundleNameDuplicated}"?`,
    );
    roku_PO.interceptAlias(
      'GET',
      '**/api/roku/image/collection**',
      'collection',
    );
    roku_PO.expectDialogMessage(
      `Roku ${bundleNameDuplicated} ImageCollection module deleted from DB successfully`,
    );
    roku_PO.waitForAlias('@collection', apiWaitTimeoutObj);
    roku_PO.deleteUsingAPI(ENV_SERVER_URL, 'image/collection', savedBundleId);
  });
  it('Delete uploaded image', () => {
    cy.contains('[role="tab"]', 'GALLERY').click();
    cy.contains('.gallery-image-name', '1920x1080')
      .siblings('.gallery-image-icon')
      .contains('delete')
      .click({ force: true });
    roku_PO.expectDialogMessage(
      `Do you wish to proceed with DELETE "${data.name}"?`,
    );
    roku_PO.expectDialogMessage(
      `Roku ${data.name} ImageGallery module deleted from DB successfully`,
    );
    // android_PO.deleteUsingAPI(ENV_SERVER_URL, 'image/gallery', savedImageId);
  });
});
