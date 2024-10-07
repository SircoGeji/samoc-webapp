import * as Mustache from 'mustache';

export type Country = 'US';

export enum Template {
  LEGAL_DISCLAIMER,
  BANNER,
}

// Base class to format currency and format offer and plan prices with terms
abstract class Locale {
  // format currency
  abstract formatCurrency(price: number): string;

  // format offer price with term, e.g. "$1.99/month for 3 months" or "$10.99 for 6 months"
  abstract formatOfferPriceWithTerm(
    offerPrice: number,
    offerDuration: number,
    planTerm: number,
  ): string;

  // format plan price with term, e.g. "$1.99/month" or "$10.99/6 months"
  abstract formatPlanPriceWithTerm(planPrice: number, planTerm: number): string;
}

// English (without currency formatting)
abstract class EN extends Locale {
  formatOfferPriceWithTerm(
    offerPrice: number,
    offerDuration: number,
    planTerm: number,
  ): string {
    const formattedPrice = this.formatCurrency(offerPrice);
    if (offerDuration == planTerm) {
      if (planTerm == 1) {
        return `${formattedPrice}/month`;
      } else {
        return `${formattedPrice} for ${offerDuration} months`;
      }
    } else if (planTerm == 1) {
      return `${formattedPrice}/month for ${offerDuration} months`;
    } else {
      return `${formattedPrice}/${planTerm} months for ${offerDuration} months`;
    }
  }

  formatPlanPriceWithTerm(planPrice: number, planTerm: number): string {
    const formattedPrice = this.formatCurrency(planPrice);
    if (planTerm == 1) {
      return `${formattedPrice}/month`;
    } else {
      return `${formattedPrice}/${planTerm} months`;
    }
  }
}

// en-us locale (english formatting + USD for currency)
class EN_US extends EN {
  formatCurrency(price: number): string {
    return `$` + price.toFixed(2);
  }
}

export class OfferTemplates {
  country: Country;
  offerDuration: number;
  planTerm: number;
  planPrice: number;
  offerPrice: number;

  isValid(template: Template) {
    return (
      this.country &&
      this.offerDuration &&
      this.planTerm &&
      this.planPrice &&
      this.offerPrice
    );
  }

  // render template
  render(template: Template) {
    const locale = OfferTemplates.locales.get(this.country);
    const context = {
      offer_duration: this.offerDuration,
      plan_term: this.planTerm,
      plan_price: this.planPrice,
      offer_price: this.offerPrice,
      offer_price_with_term: locale.formatOfferPriceWithTerm(
        this.offerPrice,
        this.offerDuration,
        this.planTerm,
      ),
      plan_price_with_term: locale.formatPlanPriceWithTerm(
        this.planPrice,
        this.planTerm,
      ),
      format_currency: () => {
        return (text, render): string => {
          return locale.formatCurrency(parseFloat(render(text)));
        };
      },
      upper: () => {
        return (text, render): string => {
          return render(text).toUpperCase();
        };
      },
    };
    return Mustache.render(
      OfferTemplates.templates[this.country][template],
      context,
    );
  }

  static locales = new Map<Country, Locale>([['US', new EN_US()]]);

  static templates = {
    US: {
      [Template.LEGAL_DISCLAIMER]: `Limited time offer. Offer available to new and previous twlght App subscribers who subscribe or re-subscribe via twlght.com.
Offer does not include free trial.
After completion of {{offer_duration}} month offer, service automatically renews for additional {{plan_term}} month terms at {{#format_currency}}{{plan_price}}{{/format_currency}} per {{plan_term}} month term unless cancelled.
Subscription fee is non-refundable.`,
      [Template.BANNER]: `{{#upper}}{{{offer_price_with_term}}} promo applied{{/upper}}, ({{{plan_price_with_term}}} after promo period)`,
    },
  };
}
