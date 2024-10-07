import {AbstractControl, FormControl, ValidationErrors, ValidatorFn} from '@angular/forms';
import * as moment from 'moment';

export function validateEndDate(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value && !isNaN(Date.parse(control.value))) {
      const endDate = moment(control.value).endOf('day');
      const tomorrow = moment().add(1, 'day').endOf('day');
      if (endDate < tomorrow) {
        return {
          todayOrEarlierErr:
            'Please select an end date at least one day later than today',
        };
      }
    }

    // field is valid
    return null;
  };
}

export function validateLaunchDate(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value && !isNaN(Date.parse(control.value))) {
      const launchDate = moment(control.value).endOf('day');
      const tomorrow = moment().add(1, 'day').endOf('day');
      if (launchDate < tomorrow) {
        return {
          todayOrEarlierErr:
            'Please select a launch date at least one day later than today',
        };
      }
    }

    // field is valid
    return null;
  };
}

export function validateDate(control: FormControl): {[key: string]: boolean} {
  const selectedDate = moment(control.value).endOf('day');
  const tomorrow = moment().add(1, 'day').endOf('day');

  if (!control.value) {
    return {dateIsNotValid: true};
  } else if (selectedDate < tomorrow) {
    return {todayOrEarlierErr: true};
  }
  return null;
}
