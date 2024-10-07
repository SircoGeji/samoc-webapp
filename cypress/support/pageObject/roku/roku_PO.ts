class Roku_PO {
  navigateToSamocSkuPage(apiWaitTimeout) {
      cy.intercept('GET', '/health').as('health');
      cy.visit(Cypress.env('ENV_URL') + Cypress.env('SKU_URL'));
      cy.wait('@health', { timeout: apiWaitTimeout })
        .its('response.statusCode')
        .should('exist');
    }

setHeaders(app, product, tab) {
    cy.get('[mattooltip="Select App"]').click();
    cy.contains('[role="menuitem"]', app)
      .should('be.visible')
      .click({ force: true });
    cy.get('[mattooltip="Select Product"]').click();
    cy.contains('[role="menuitem"]', product)
      .should('be.visible')
      .click({ force: true });
    cy.contains('.mat-tab-link', tab).should('be.visible').click();
}
interceptAlias(method, request, alias) {
    cy.intercept(method, request).as(alias);
  }
  waitForAlias(alias, timeout) {
    cy.wait(alias, timeout).its('response.statusCode').should('exist');
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
  expectDialogMessage(text) {
    cy.get('.mat-dialog-container').should('contain', text);
    cy.contains('.button-dialog-primary', 'OK').click();
  }
  expectOverlayMessage(text) {
    cy.get('.mat-snack-bar-container').should('contain', text)
  }
  clearThenFillEmptyForm(form, text, typeDelay) {
    // if(form === 'name'){
    //   setTimeout(() => {
    //     cy.get(`[formcontrolname="${form}"]`)
    //     .clear().focus()
    //     .wait(5000)
    //     .should('be.empty')
    //     .type(text, typeDelay)
    //     .should('have.value', text);
    //     console.log('mdav')
    //   },5000)
    // } else {
      cy.get(`[formcontrolname="${form}"]`)
      .clear()
      .should('be.empty')
      .type(text, typeDelay)
      .should('have.value', text);
    // }
}
clearThenFillEmptyTableForm($el, arrayNumber, value, typeDelay) {
  cy.wrap($el)
    .eq(arrayNumber)
    .clear({ force: true })
    .should('be.empty')
    .type(value, typeDelay);
}
clearThenFillEmptyContain(contain, value) {
  cy.contains(contain)
    .parent()
    .parent()
    .find('.mat-input-element')
    .clear()
    .type(value);
}
clearThenFillPlaceholderForm(placeholder, value) {
  cy.get(`[placeholder="${placeholder}"]`).clear().type(value);
}
validateGridCellContains(name, index, value) {
  cy.contains('[role="gridcell"]', name)
    .parent('[role="row"]')
    .find('[role="gridcell"]')
    .eq(index)
    .should('contain', value);
}
validateFormControlContains(name, value) {
  cy.get(`[formcontrolname="${name}"]`).should('have.value', value);
}
validateErrorHaveText(index, text) {
  cy.get('.error-container').eq(index).should('have.text', text);
}
deleteUsingAPI(ENV_SERVER_URL, module, id) {
  cy.request({
    method: 'DELETE',
    url: `${ENV_SERVER_URL}/api/roku/${module}/${id}/delete`,
  })
    .its('body')
    .then((response) => {
      expect(response.success).to.eq(true);
      expect(response.status).to.be.lessThan(400);
      expect(response.message).to.contain('deleted from DB successfully');
    });
}

clickDotMenuOption(name, option) {
  cy.wait(500);
  cy.contains('[role="gridcell"]', name).should('be.visible');
  cy.contains('[role="gridcell"]', name)
    .parent()
    .find('.mat-menu-trigger')
    .click();
  cy.wait(500);
  cy.contains('.mat-menu-item', option).click();
}
}
export default Roku_PO;