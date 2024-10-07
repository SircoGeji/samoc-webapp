/// <reference types="cypress-xpath" />

import 'cypress-localstorage-commands';
import 'cypress-real-events';
import Android_PO from '../../support/pageObject/android/android_PO';
import 'cypress-file-upload';

context('Images flow', () => {
  const android_PO = new Android_PO();
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
    return result;1
  };
   let randomString = generateRandomString(3)
  before(() => {
    cy.setLocalStorageClear();
    cy.customPostUserData();
    cy.saveLocalStorage();
    cy.fixture('Image-Android').then((data) => {
      globalThis.data = data;
    });
  });
  beforeEach(() => {
    cy.setViewPort();
  });
  it('Set headers', () => {
    android_PO.navigateToSamocSkuPage(apiWaitTimeout);
    android_PO.setHeaders('ANDROID', 'GOOGLE', 'twlght ', 'IMAGES');
    android_PO.interceptAlias(
      'GET',
      '**/api/android/image/collection**',
      'collection',
    );
    cy.contains('[role="tab"]', 'GALLERY').click();
    android_PO.waitForAlias('@collection', apiWaitTimeoutObj);
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
    android_PO.interceptAlias(
      'POST',
      '**/api/android/gallery/uploadImage?store=google&product=twlght&imageNames=**',
      'image',
    );
    cy.get('input[type=file]').attachFile('./images/CypressImage.jpg');
    cy.wait(5000)
    android_PO.waitForAlias('@image', apiWaitTimeoutObj);
    cy.get(
      `[src="https://img.twlght.com/Buyflow/android/samoc/gallery/${instance}/google/twlght/CypressImage.jpeg"]`,
    ).should('be.visible');
    android_PO.interceptAlias(
      'POST',
      '**api/android/image/gallery/save?store=google&product=twlght',
      'image',
    );
    cy.contains('.button-dialog-primary', ' UPLOAD ').click();
    android_PO.interceptAlias('GET', '**/api/android/image/**', 'collection');
    android_PO.waitForAlias('@image', apiWaitTimeoutObj);
    android_PO.expectDialogMessage(
      `Android ImageGallery module saved in DB successfully`,
    );
    android_PO.waitForAlias('@collection', apiWaitTimeoutObj);
  });
  // skipped as deprecated, can be used to test on local
  it.skip('Upload image using api', () => {
    cy.fixture('Image').then((ImageFixture) => {
      cy.request({
        method: 'POST',
        url: `${ENV_SERVER_URL}/api/android/image/gallery/save?store=google&product=twlght`,
        body: ImageFixture,
      }).then((response) => {
        // savedImageId = response.body.data.imageGalleryId;
      });
    });
  });
  it('Create bundle', () => {
    cy.contains('.mat-tab-label-content', 'BUNDLES').click();
    android_PO.interceptAlias(
      'GET',
      '**/api/android/image/placement**',
      'bundleForm',
    );
    cy.contains('.button-primary', 'CREATE NEW').click();
    android_PO.waitForAlias('@bundleForm', apiWaitTimeoutObj);
    cy.contains('Bundle Name*')
      .parents('.mat-form-field-infix')
      .find('[type="text"]')
      .clear()
      .type(bundleName + randomString, typeDelay);
    cy.contains('US')
      .parents('.region-checkbox-container')
      .find('[type="checkbox"]')
      .check({ force: true });
    selectImage('MOBILE BUYFLOW PORTRAIT', 'CypressImage');
    android_PO.interceptAlias(
      'POST',
      '**/api/android/image/collection/save**',
      'collectionCopyPayload',
    );
    cy.contains('SAVE').click();
    android_PO.expectDialogMessage('Do you wish to proceed with  SAVE ALL?');
    cy.wait('@collectionCopyPayload').then(({ response }) => {
      savedBundleId = response.body.data.imageCollectionId;
    });
    android_PO.expectDialogMessage(
      `Android ${bundleName}${randomString} ImageCollection module saved in DB successfully`,
    );
    android_PO.interceptAlias(
      'GET',
      '**/api/android/image/collection**',
      'collection',
    );
    cy.get('.backbtn').click();
    android_PO.waitForAlias('@collection', apiWaitTimeoutObj);
  });
  it('Validate filter and edit created bundle', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'BUNDLE NAME')
      .should('be.visible')
      .click();
    cy.wait(500);
    android_PO.clearThenFillPlaceholderForm(
      'Enter Bundle Name',
      'Invalid name',
    );
    cy.contains('[role="gridcell"]', bundleName + randomString).should('not.exist');
    android_PO.clearThenFillPlaceholderForm('Enter Bundle Name', bundleName+`${randomString}`);
    android_PO.interceptAlias(
      'GET',
      '**/api/android/image/placement**',
      'bundleForm',
    );
    android_PO.clickDotMenuOption(bundleName + randomString, 'Edit');
    android_PO.waitForAlias('@bundleForm', apiWaitTimeoutObj);
    selectImage('MOBILE RENEW PORTRAIT', 'CypressImage');
    android_PO.interceptAlias('PUT', '**/update**', 'collectionUpdate');
    cy.contains('UPDATE').should('not.be.disabled').click();
    android_PO.expectDialogMessage('Do you wish to proceed with  UPDATE ALL?');
    android_PO.waitForAlias('@collectionUpdate', apiWaitTimeoutObj);
    android_PO.expectDialogMessage(
      `Android ${bundleName}${randomString} ImageCollection module updated in DB successfully`,
    );
    android_PO.interceptAlias(
      'GET',
      '**/api/android/image/collection**',
      'collection',
    );
    cy.get('.backbtn').click();
    android_PO.waitForAlias('@collection', apiWaitTimeoutObj);
  });
  it('Duplicate created bundle', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'BUNDLE NAME')
      .should('be.visible')
      .click();
    android_PO.clearThenFillPlaceholderForm('Enter Bundle Name', bundleName + randomString);
    android_PO.interceptAlias(
      'GET',
      '**/api/android/image/placement**',
      'bundleForm',
    );
    android_PO.clickDotMenuOption(bundleName +`${randomString}`, 'Duplicate');
    android_PO.waitForAlias('@bundleForm', apiWaitTimeoutObj);
    cy.contains('Bundle Name*')
      .parents('.mat-form-field-infix')
      .find('[type="text"]')
      .clear()
      .type(bundleName+`${randomString}`, typeDelay);
    cy.contains('.regions-label', 'SUPPORTED REGIONS').click();
    cy.get('.mat-error').should(
      'have.text',
      ' This Bundle Name already exists ',
    );
    android_PO.clearThenFillEmptyContain('Bundle Name*', bundleNameDuplicated);
    cy.contains('.regions-label', 'SUPPORTED REGIONS').click();
    android_PO.interceptAlias(
      'POST',
      '**/api/android/image/collection/save**',
      'collectionCopyPayload',
    );
    cy.contains('SAVE').click();
    android_PO.expectDialogMessage('Do you wish to proceed with  SAVE ALL?');
    cy.wait('@collectionCopyPayload').then(({ response }) => {
      // duplicatedBundleId = response.body.data.imageCollectionId;
    });
    android_PO.expectDialogMessage(
      `Android ${bundleNameDuplicated} ImageCollection module saved in DB successfully`,
    );
    android_PO.interceptAlias(
      'GET',
      '**/api/android/image/collection**',
      'collection',
    );
    cy.get('.backbtn').click();
    android_PO.waitForAlias('@collection', apiWaitTimeoutObj);
  });
  it('Delete created bundles', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'BUNDLE NAME')
      .should('be.visible')
      .click();
    android_PO.clearThenFillPlaceholderForm(
      'Enter Bundle Name',
      `${bundleNameDuplicated}`,
    );
    cy.contains('[role="gridcell"]', bundleNameDuplicated).should('be.visible');
    android_PO.clickDotMenuOption(bundleNameDuplicated, 'Delete');
    android_PO.expectDialogMessage(
      `Do you wish to proceed with DELETE "${bundleNameDuplicated}"?`,
    );
    android_PO.interceptAlias(
      'GET',
      '**/api/android/image/collection**',
      'collection',
    );
    android_PO.expectDialogMessage(
      `Android ${bundleNameDuplicated} ImageCollection module deleted from DB successfully`,
    );
    android_PO.waitForAlias('@collection', apiWaitTimeoutObj);
    android_PO.deleteUsingAPI(
      ENV_SERVER_URL,
      'image/collection',
      savedBundleId,
    );
  });
  it('Delete uploaded image', () => {
    cy.contains('[role="tab"]', 'GALLERY').click();
    cy.contains('.gallery-image-name', 'CypressImage')
      .siblings('.gallery-image-icon')
      .contains('delete')
      .click({ force: true });
    android_PO.expectDialogMessage(
      `Do you wish to proceed with DELETE "${data.name}"?`,
    );
    android_PO.expectDialogMessage(
      `Android ${data.name} ImageGallery module deleted from DB successfully`,
    );
    // android_PO.deleteUsingAPI(ENV_SERVER_URL, 'image/gallery', savedImageId);
  });
});
