class Web_PO {
  getOffers() {
    cy.intercept('GET', '**/api/offers**').as('loadedOffers');
  }
  waitOffers(timeout) {
    cy.wait('@loadedOffers', timeout)
      .its('response.statusCode')
      .should('exist');
  }
  setHeaders(timeout) {
    cy.intercept('GET', '**/api/offers**').as('loadedOffers');
    cy.get('[mattooltip="Select App"]').click();
    cy.contains('[role="menuitem"]', 'WEB').click();
    cy.wait('@loadedOffers', timeout)
      .its('response.statusCode')
      .should('exist');
  }
  clickButton(text) {
    cy.get('button').contains(text).should('not.be.disabled');
    cy.get('button').contains(text).click();
  }
  waitForLoad(block, selector, element?) {
    cy.waitUntil(() => {
      if (element) {
        return cy
          .xpath(`//${block}[@class="${selector}"]//${element}`)
          .should('exist');
      } else {
        return cy.xpath(`//${block}[@class="${selector}"]`).should('exist');
      }
    });
  }
  fillTextInput(element, value, expect?) {
    cy.get(`[formControlName="${element}"]`)
      .type(value, { delay: 0 })
      .should('have.value', expect || value);
  }
  urlShouldContain(str) {
    cy.waitUntil(() => cy.url().should('contain', str));
  }
  waitForDialogContent(text) {
    cy.waitUntil(() => cy.get('mat-dialog-content').should('contain', text));
  }
  navigateToAddCampaign(interURL, campaign, timeout) {
    cy.intercept('GET', '**/api/offers').as('loadedOffers');
    cy.url().then((url) => {
      if (url != interURL) {
        cy.visit(interURL);
      } else {
        cy.reload();
      }
    });
    cy.wait('@loadedOffers', timeout)
      .its('response.statusCode')
      .should('exist');
    cy.intercept('GET', '**/api/offers').as('loadedOffers');
    cy.get('[mattooltip="Select App"]').click();
    cy.contains('[role="menuitem"]', 'WEB').click();
    cy.wait('@loadedOffers', timeout)
      .its('response.statusCode')
      .should('exist');
    cy.get('.add-inter-offer-container').contains('ADD CAMPAIGN').click();
    cy.get('[role="menuitem"]').contains(campaign).click();
  }
  checkDisabledElement(selector) {
    cy.get(selector).should('be.disabled');
  }
  checkDisabledAriaElement(selector) {
    cy.get(selector).should('have.attr', 'aria-disabled').should('eq', 'true');
  }
  formHasValue(form, value) {
    cy.wait(200);
    cy.get(`[formcontrolname="${form}"]`).should('have.value', value);
  }
  formContains(form, value) {
    cy.wait(200);
    cy.get(`[formcontrolname="${form}"]`).should('contain', value);
  }
  fillTextField(selector, text) {
    cy.get(selector).type(text).should('have.value', text);
  }
  validateTextField(selector, text) {
    cy.wait(200);
    cy.get(selector).should('have.value', text);
  }
  chooseFirstDayNextMonth(numberInArray) {
    cy.get('[aria-label="Open calendar"]').eq(numberInArray).click();
    cy.get('.mat-calendar-next-button').click();
    cy.get('[class="mat-calendar-body-cell-content mat-focus-indicator"]')
      .contains('1')
      .click();
  }
  validateCodes() {
    cy.get('.offer-code-loader').each(($el) => {
      cy.wrap($el).invoke('text').should('eq', 'check');
    });
  }
  editAllCodes() {
    cy.get('[role="grid"]')
      .find('.action-button')
      .each(($el) => {
        if ($el.text().match('Edit')) {
          cy.wrap($el).contains('Edit').click();
        }
      });
  }
  addRndCharToCode(fiveRandomCharacters) {
    cy.get('.cdk-column-offerCode')
      .find('.mat-input-element')
      .each(($el) => {
        cy.wait(500);
        cy.wrap($el).type('_' + fiveRandomCharacters);
      });
  }
  updateAllCodes() {
    cy.get('[role="grid"]')
      .find('.action-button')
      .each(($el) => {
        if ($el.text().match('Update')) {
          cy.wait(750);
          cy.wrap($el).contains('Update').click();
        }
      });
  }
  validateDurationOnGrid(duration) {
    cy.get('.cdk-column-duration')
      .find('.table-cell-left')
      .each(($el) => {
        cy.wrap($el).should('have.text', duration);
      });
  }
  validateLanguageFields(selectorText, value) {
    cy.get('.language-item-content-container').each(($el) => {
      cy.wait(200);
      cy.wrap($el)
        .find('.language-item-content-block-label')
        .contains(selectorText)
        .siblings('.language-item-content-block-data')
        .should('contain', value);
    });
  }
  validateLanguageFieldsDetail(selectorText, value) {
    cy.get('.tab-content-block-languages-item').each(($el) => {
      cy.wait(200);
      cy.wrap($el)
        .find('.tab-content-block-languages-data-item-title')
        .contains(selectorText)
        .siblings('.tab-content-block-languages-data-item-content')
        .should('contain', value);
    });
  }
  validateDetailPageFields(selectorText, value) {
    cy.wait(200);
    cy.get('.mat-tab-body-wrapper')
      .find('.tab-content-block-row-title')
      .contains(selectorText)
      .siblings('.tab-content-block-data')
      .should('have.text', value);
  }
  validateOfferNamesOnGrid(offerNames) {
    cy.get('.cdk-column-offerName')
      .find('.table-cell-left')
      .each(($el) => {
        cy.wrap($el).should('have.text', offerNames);
      });
  }
  expectMessage(text) {
    cy.get('mat-dialog-content', { timeout: 110000 })
      .should('contain', text)
      .then(() => {
        cy.get('button').contains('OK').click();
      });
  }
  gridCellisnotEmpty(selector) {
    cy.get(selector)
      .find('.table-cell-left')
      .each(($el) => {
        cy.wrap($el).should('not.be.empty');
      });
  }
}
export default Web_PO;
