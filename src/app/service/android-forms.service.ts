import { Injectable } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { AndroidService } from './android.service';
import { HttpClient } from '@angular/common/http';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AndroidFormsService {
  public status = {
    DEFAULT: 'default',
    RED: 'incomplete',
    DUPLICATE: 'duplicate',
    UNSAVED: 'unsaved',
    SAVED: 'saved',
    PUBLISHED: 'published',
  } as const;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private androidService: AndroidService,
    private http: HttpClient,
  ) {}

  fillRegionPositionArray(regionsLanguagesBinding, regionPositionArray): void {
    regionsLanguagesBinding.forEach(() => {
      if (regionPositionArray.length < 1) {
        regionPositionArray.push(true);
      } else {
        regionPositionArray.push(false);
      }
    });
  }

  getLanguageFormGroup(fields): FormGroup {
    const languageFormGroup: FormGroup = this.formBuilder.group({});
    fields.forEach((field) => {
      if (field.dataType === 'boolean') {
        languageFormGroup.addControl(field.fieldName, new FormControl(false));
      } else {
        languageFormGroup.addControl(field.fieldName, new FormControl(null));
      }
    });
    return languageFormGroup;
  }

  setFormGroup(formGroup: FormGroup, fields, regionsLanguagesBinding): void {
    regionsLanguagesBinding.forEach((region) => {
      formGroup.addControl(region.code, this.formBuilder.group({}));
      region.languages.forEach((language) => {
        (formGroup.controls[region.code] as FormGroup).addControl(
          language.code,
          this.getLanguageFormGroup(fields),
        );
      });
    });
  }

  fillModule(
    data,
    formGroup: FormGroup,
    fields,
    status: string,
    regionsLanguagesBinding,
    moduleType: string,
    defaultData?,
    action?: string,
  ): void {
    regionsLanguagesBinding.forEach((region, index) => {
      const isDefault: boolean = this.isRegionDefault(
        region,
        defaultData,
        formGroup,
        fields,
      );

      region.languages.forEach((language) => {
        fields.forEach((field) => {
          if (field.fieldName !== 'price' && field.fieldName !== 'currency') {
            const fieldControl = ((formGroup.controls[region.code] as FormGroup)
              .controls[language.code] as FormGroup).controls[field.fieldName];
            if (
              data[region.code]?.['languages'][language.code]?.[field.fieldName]
            ) {
              fieldControl.setValue(
                data[region.code]['languages'][language.code][field.fieldName],
              );
            } else {
              if (field.dataType !== 'boolean') {
                fieldControl.reset();
              } else {
                fieldControl.setValue(false);
              }
            }
          }
        });
      });

      this.changeRegionStatus(
        index,
        formGroup,
        fields,
        status,
        regionsLanguagesBinding,
      );

      if (data[region.code] && region[status] !== this.status.RED) {
        if (moduleType !== 'sku') {
          if (action !== 'clear') {
            if (this.isRegionDefault(region, defaultData, formGroup, fields)) {
              region[status] = this.status.DEFAULT;
            } else {
              region[status] = this.status.DUPLICATE;
            }
          } else {
            if (!isDefault) {
              region[status] = this.status.UNSAVED;
            } else {
              region[status] = this.status.DEFAULT;
            }
          }
        } else {
          region[status] = this.status.DEFAULT;
        }
      } else {
        region[status] = this.status.RED;
      }
    });
  }

  modifiedFillModule(
    data,
    formGroup: FormGroup,
    nonTranslatableFields,
    translatableFields,
    status: string,
    regionsLanguagesBinding,
    moduleType: string,
    defaultData?,
    action?: string,
  ): void {
    regionsLanguagesBinding.forEach((region, index) => {
      const isDefault: boolean = this.modifiedIsRegionDefault(
        region,
        defaultData,
        formGroup,
        nonTranslatableFields,
        translatableFields,
      );
      const importedRegion = data[region.code];
      if (!!importedRegion) {
        nonTranslatableFields.forEach((field) => {
          const fieldControl = (formGroup.controls[region.code] as FormGroup)
            .controls[field.fieldName];
          const importedLanguages = importedRegion['languages'];
          if (!!importedLanguages) {
            const firstLanguage = Object.values(importedLanguages)[0];
            if (!!firstLanguage) {
              const importedValue = firstLanguage?.[field.fieldName];
              if (!!importedValue) {
                fieldControl.setValue(importedValue);
              }
            }
          }
        });

        region.languages.forEach((language) => {
          const importedLanguage = importedRegion['languages'][language.code];
          translatableFields.forEach((field) => {
            const fieldControl = ((formGroup.controls[region.code] as FormGroup)
              .controls[language.code] as FormGroup).controls[field.fieldName];
            if (!!importedLanguage && !!importedLanguage[field.fieldName]) {
              fieldControl.setValue(importedLanguage[field.fieldName]);
            } else {
              if (field.dataType !== 'boolean') {
                fieldControl.reset();
              } else {
                fieldControl.setValue(false);
              }
            }
          });
        });

        this.modifiedChangeRegionStatus(
          index,
          formGroup,
          nonTranslatableFields,
          translatableFields,
          status,
          regionsLanguagesBinding,
        );

        if (!!importedRegion && region[status] !== this.status.RED) {
          if (moduleType !== 'sku') {
            if (action !== 'clear') {
              if (
                this.modifiedIsRegionDefault(
                  region,
                  defaultData,
                  formGroup,
                  nonTranslatableFields,
                  translatableFields,
                )
              ) {
                region[status] = this.status.DEFAULT;
              } else {
                region[status] = this.status.DUPLICATE;
              }
            } else {
              if (!isDefault) {
                region[status] = this.status.UNSAVED;
              } else {
                region[status] = this.status.DEFAULT;
              }
            }
          } else {
            region[status] = this.status.DEFAULT;
          }
        } else {
          region[status] = this.status.RED;
        }
      }
    });
  }

  fillRegion(
    region,
    fields,
    formGroup: FormGroup,
    status: string,
    data,
    regionsLanguagesBinding,
    index: number,
  ): void {
    const importedRegionData = data[region.code];
    region.languages.forEach((language) => {
      if (importedRegionData) {
        if (language.code in importedRegionData?.['languages']) {
          fields.forEach((field) => {
            const fieldControl = ((formGroup.controls[region.code] as FormGroup)
              .controls[language.code] as FormGroup).controls[field.fieldName];
            if (
              field.fieldName in importedRegionData['languages'][language.code]
            ) {
              fieldControl.setValue(
                importedRegionData['languages'][language.code][field.fieldName],
              );
            } else {
              if (field.dataType !== 'boolean') {
                fieldControl.reset();
              } else {
                fieldControl.setValue(false);
              }
            }
          });
        }
      } else {
        const languageControl = (formGroup.controls[region.code] as FormGroup)
          .controls[language.code];
        languageControl.reset();
      }
    });
    this.changeRegionStatus(
      index,
      formGroup,
      fields,
      status,
      regionsLanguagesBinding,
    );
    if (data[region.code] && region[status] !== this.status.RED) {
      region[status] = this.status.UNSAVED;
    } else {
      region[status] = this.status.RED;
    }
  }

  isModuleDataDefault(
    regionsLanguagesBinding,
    defaultData,
    formGroup: FormGroup,
    fields,
  ): boolean {
    let flag = true;
    regionsLanguagesBinding.forEach((region) => {
      region.languages.forEach((language) => {
        fields.forEach((field) => {
          const fieldValue =
            formGroup.value[region.code][language.code][field.fieldName];
          const defaultFieldValue =
            defaultData?.[region.code]?.['languages'][language.code]?.[
              field.fieldName
            ];
          if (fieldValue || defaultFieldValue) {
            if (fieldValue != defaultFieldValue) {
              flag = false;
            }
          }
        });
      });
    });
    return flag;
  }

  isRegionDefault(region, defaultData, formGroup: FormGroup, fields): boolean {
    let flag = true;
    region.languages.forEach((language) => {
      fields.forEach((field) => {
        const fieldValue =
          formGroup.value[region.code][language.code][field.fieldName];
        const defaultFieldValue =
          defaultData?.[region.code]?.['languages'][language.code]?.[
            field.fieldName
          ];
        if (fieldValue || defaultFieldValue) {
          if (fieldValue != defaultFieldValue) {
            flag = false;
          }
        }
      });
    });
    return flag;
  }

  modifiedIsRegionDefault(
    region,
    defaultData,
    formGroup: FormGroup,
    nonTranslatableFields,
    translatableFields,
  ): boolean {
    let flag = true;
    nonTranslatableFields.forEach((field) => {
      const fieldValue = formGroup.value[region.code][field.fieldName];
      const defaultFieldValue = defaultData?.[region.code]?.[field.fieldName];
      if (fieldValue || defaultFieldValue) {
        if (fieldValue != defaultFieldValue) {
          flag = false;
        }
      }
    });
    region.languages.forEach((language) => {
      translatableFields.forEach((field) => {
        const fieldValue =
          formGroup.value[region.code][language.code][field.fieldName];
        const defaultFieldValue =
          defaultData?.[region.code]?.['languages'][language.code]?.[
            field.fieldName
          ];
        if (fieldValue || defaultFieldValue) {
          if (fieldValue != defaultFieldValue) {
            flag = false;
          }
        }
      });
    });
    return flag;
  }

  isModuleEmpty(
    regionsLanguagesBinding,
    formGroup: FormGroup,
    fields,
  ): boolean {
    let empty = true;
    regionsLanguagesBinding.forEach((region) => {
      region.languages.forEach((language) => {
        fields.forEach((field) => {
          const fieldValue =
            formGroup.value[region.code][language.code][field.fieldName];
          if (fieldValue?.toString().replace(/\s/g, '').length) {
            empty = false;
          }
        });
      });
    });
    return empty;
  }

  modifiedIsModuleEmpty(
    regionsLanguagesBinding,
    formGroup: FormGroup,
    nonTranslatableFields,
    translatableFields,
  ): boolean {
    let empty = true;
    regionsLanguagesBinding.forEach((region) => {
      nonTranslatableFields.forEach((field) => {
        const fieldValue = formGroup.value[region.code][field.fieldName];
        if (
          fieldValue?.toString().replace(/\s/g, '').length ||
          (field.dataType === 'boolean' && !fieldValue)
        ) {
          empty = false;
        }
      });
      region.languages.forEach((language) => {
        translatableFields.forEach((field) => {
          const fieldValue =
            formGroup.value[region.code][language.code][field.fieldName];
          if (
            fieldValue?.toString().replace(/\s/g, '').length ||
            (field.dataType === 'boolean' && !fieldValue)
          ) {
            empty = false;
          }
        });
      });
    });
    return empty;
  }

  isRegionEmpty(region, formGroup: FormGroup, fields): boolean {
    let empty = true;
    region.languages.forEach((language) => {
      fields.forEach((field) => {
        const fieldValue =
          formGroup.value[region.code][language.code][field.fieldName];
        if (fieldValue?.toString().replace(/\s/g, '').length) {
          empty = false;
        }
      });
    });
    return empty;
  }

  copyFields(
    copyFieldsObject,
    fields,
    formGroup: FormGroup,
    regionCode: string,
    language: string,
  ): void {
    fields.forEach((field) => {
      const fieldValue = ((formGroup.controls[regionCode] as FormGroup)
        .controls[language] as FormGroup).controls[field.fieldName].value;
      copyFieldsObject[field.fieldName] = this.getProperValue(
        fieldValue,
        field.dataType,
      );
    });
  }

  pasteFields(
    regionsLanguagesBinding,
    copyFieldsObject,
    fields,
    formGroup: FormGroup,
    index: number,
    regionCode: string,
    language: string,
    status: string,
  ) {
    if (Object.keys(copyFieldsObject).length > 0) {
      fields.forEach((field) => {
        if (field.fieldName !== 'price' && field.fieldName !== 'currency') {
          const fieldControl = ((formGroup.controls[regionCode] as FormGroup)
            .controls[language] as FormGroup).controls[field.fieldName];
          fieldControl.setValue(copyFieldsObject[field.fieldName]);
        }
      });
      formGroup.controls[regionCode].markAsDirty();
    }
    this.changeRegionStatus(
      index,
      formGroup,
      fields,
      status,
      regionsLanguagesBinding,
    );
  }

  makeFormDataKeys(formData, regionsLanguagesBinding): void {
    regionsLanguagesBinding.forEach((region) => {
      formData[region.code] = {};
      formData[region.code]['languages'] = {};
      region.languages.forEach((language) => {
        formData[region.code]['languages'][language.code] = {};
      });
    });
  }

  fillFormData(
    fields,
    formData,
    formGroup,
    regionsLanguagesBinding,
    status: string,
    importedData?,
    pageQuery?: string,
  ): void {
    regionsLanguagesBinding.forEach((region) => {
      region.languages.forEach((language) => {
        const formDataLanguage =
          formData[region.code]['languages'][language.code];
        fields.forEach((field) => {
          const fieldValue =
            formGroup.value[region.code][language.code][field.fieldName];
          if (fieldValue?.toString().replace(/\s/g, '').length && fieldValue) {
            formDataLanguage[field.fieldName] = fieldValue;
          }
        });
        if (Object.keys(formDataLanguage).length < 1) {
          delete formData[region.code]['languages'][language.code];
        }
      });
      if (Object.keys(formData[region.code]['languages']).length < 1) {
        delete formData[region.code];
      } else {
        if (region[status] === this.status.RED) {
          formData[region.code].status = this.status.RED;
        } else {
          if (importedData?.status === 'live' && pageQuery === 'view') {
            formData[region.code].status = this.status.PUBLISHED;
            region[status] = this.status.PUBLISHED;
          } else {
            formData[region.code].status = this.status.SAVED;
            region[status] = this.status.SAVED;
          }
        }
      }
    });
  }

  modifiedFillFormData(
    nonTranslatableFields,
    translatableFields,
    formData,
    formGroup,
    regionsLanguagesBinding,
    status: string,
    importedData?,
    pageQuery?: string,
  ): void {
    regionsLanguagesBinding.forEach((region) => {
      if (!!formData[region.code] && !!region.languages) {
        region.languages.forEach((language) => {
          const formDataLanguage =
            formData[region.code]['languages'][language.code];
          nonTranslatableFields.forEach((field) => {
            const fieldValue = formGroup.value[region.code][field.fieldName];
            formDataLanguage[field.fieldName] =
              fieldValue || this.getEmptyValue(field.dataType);
          });
          translatableFields.forEach((field) => {
            const fieldValue =
              formGroup.value[region.code][language.code][field.fieldName];
            formDataLanguage[field.fieldName] =
              fieldValue || this.getEmptyValue(field.dataType);
          });
          if (Object.keys(formDataLanguage).length < 1) {
            delete formData[region.code]['languages'][language.code];
          }
        });
        if (Object.keys(formData[region.code]['languages']).length < 1) {
          delete formData[region.code];
        } else {
          if (region[status] === this.status.RED) {
            formData[region.code].status = this.status.RED;
          } else {
            if (importedData?.status === 'live' && pageQuery === 'view') {
              formData[region.code].status = this.status.PUBLISHED;
              region[status] = this.status.PUBLISHED;
            } else {
              formData[region.code].status = this.status.SAVED;
              region[status] = this.status.SAVED;
            }
          }
        }
      }
    });
  }

  getSelectedRegionData(
    fields,
    formGroup: FormGroup,
    region,
    status: string,
    importedData?,
  ) {
    const regionData = {};
    regionData['languages'] = {};
    region.languages.forEach((language) => {
      regionData['languages'][language.code] = {};
      fields.forEach((field) => {
        let fieldValue;
        if (!!field.translatable) {
          fieldValue =
            formGroup.value[region.code][language.code][field.fieldName];
        } else {
          fieldValue = formGroup.value[region.code][field.fieldName];
        }
        if (fieldValue?.toString().replace(/\s/g, '').length && fieldValue) {
          regionData['languages'][language.code][field.fieldName] = fieldValue;
        }
      });
      if (Object.keys(regionData['languages'][language.code]).length < 1) {
        delete regionData['languages'][language.code];
      }
    });
    if (region[status] === this.status.RED) {
      regionData['status'] = this.status.RED;
    } else {
      if (importedData?.status === 'live') {
        regionData['status'] = this.status.PUBLISHED;
        region[status] = this.status.PUBLISHED;
      } else {
        regionData['status'] = this.status.SAVED;
        region[status] = this.status.SAVED;
      }
    }
    return regionData;
  }

  getModifiedSelectedRegionData(
    nonTranslatableFields,
    translatableFields,
    formGroup: FormGroup,
    region,
    status: string,
    importedData?,
  ) {
    const regionData = {};
    regionData['languages'] = {};
    region.languages.forEach((language) => {
      nonTranslatableFields.forEach((field) => {
        const fieldValue = formGroup.value[region.code][field.fieldName];
        regionData[field.fieldName] = !!fieldValue
          ? fieldValue
          : this.getEmptyValue(field.dataType);
      });
      regionData['languages'][language.code] = {};
      translatableFields.forEach((field) => {
        const fieldValue =
          formGroup.value[region.code][language.code][field.fieldName];
        regionData['languages'][language.code][field.fieldName] = !!fieldValue
          ? fieldValue
          : this.getEmptyValue(field.dataType);
      });
      if (Object.keys(regionData['languages'][language.code]).length < 1) {
        delete regionData['languages'][language.code];
      }
    });
    if (region[status] === this.status.RED) {
      regionData['status'] = this.status.RED;
    } else {
      if (importedData?.status === 'live') {
        regionData['status'] = this.status.PUBLISHED;
        region[status] = this.status.PUBLISHED;
      } else {
        regionData['status'] = this.status.SAVED;
        region[status] = this.status.SAVED;
      }
    }
    return regionData;
  }

  changeRegionStatus(
    index: number,
    formGroup: FormGroup,
    fields,
    status: string,
    regionsLanguagesBinding,
  ) {
    const region = regionsLanguagesBinding[index];
    let red = false;

    region.languages.forEach((language) => {
      fields.forEach((field) => {
        const fieldValue =
          formGroup.value[region.code][language.code][field.fieldName];
        if (!fieldValue?.toString().replace(/\s/g, '').length) {
          if (field.required) {
            red = true;
          }
        }
      });
    });
    if (red) {
      region[status] = this.status.RED;
    } else {
      region[status] = this.status.UNSAVED;
    }
  }

  modifiedChangeRegionStatus(
    index: number,
    formGroup: FormGroup,
    nonTranslatableFields,
    translatableFields,
    status: string,
    regionsLanguagesBinding,
  ) {
    const region = regionsLanguagesBinding[index];
    let red = false;

    nonTranslatableFields.forEach((field) => {
      const fieldValue = this.getProperValue(
        formGroup.value[region.code][field.fieldName],
        field.dataType,
      );
      if (!fieldValue && !!field.required && fieldValue !== false) {
        red = true;
      }
    });

    region.languages.forEach((language) => {
      translatableFields.forEach((field) => {
        const fieldValue = this.getProperValue(
          formGroup.value[region.code][language.code][field.fieldName],
          field.dataType,
        );
        if (!fieldValue && !!field.required && fieldValue !== false) {
          red = true;
        }
      });
    });
    if (red) {
      region[status] = this.status.RED;
    } else {
      region[status] = this.status.UNSAVED;
    }
  }

  editCampaignObjectInLocalStorage(idType: string, id: number): void {
    const campaignObject = JSON.parse(
      localStorage.getItem('campaign') as string,
    );
    campaignObject[idType] = id;
    localStorage.setItem('campaign', JSON.stringify(campaignObject));
  }

  navigateBack(moduleType: string): void {
    if (JSON.parse(localStorage.getItem('campaign') as string)) {
      this.router.navigate(['android/campaigns/create']);
    } else {
      this.router.navigate(['android/' + moduleType]);
    }
  }

  getNavigateBackUrl(moduleGridUrl: string): string {
    if (JSON.parse(localStorage.getItem('campaign') as string)) {
      return '/#/android/campaigns/create';
    } else {
      return '/#/android/' + moduleGridUrl;
    }
  }

  setProperHistory(moduleGridUrl: string, router: any): void {
    if (moduleGridUrl.includes('campaign')) {
      history.pushState('', '', '/#/android/campaigns');
    } else {
      history.pushState('', '', this.getNavigateBackUrl(moduleGridUrl));
    }
    history.pushState('', '', `/#${router.url}`);
  }

  navigateBackOrOpenDialog(openResponseDialog, res, context): void {
    if (JSON.parse(localStorage.getItem('campaign') as string)) {
      this.router.navigate(['android/campaigns/create']);
    } else {
      openResponseDialog.call(context, res);
    }
  }

  getPublishRequests(
    importedModuleData,
    moduleID: number,
    publishModule: any,
    changeActive?: boolean,
  ): Observable<any> {
    const deployedTo = importedModuleData['deployedTo'];

    if (deployedTo.includes('dev') && deployedTo.includes('prod')) {
      return publishModule
        .call(this, moduleID, 'dev', null, !!changeActive)
        .pipe(
          switchMap(() => {
            return publishModule.call(
              this,
              moduleID,
              'prod',
              null,
              !!changeActive,
            );
          }),
        );
    } else if (deployedTo.includes('dev')) {
      return publishModule.call(this, moduleID, 'dev', null, !!changeActive);
    } else if (deployedTo.includes('prod')) {
      return publishModule.call(this, moduleID, 'prod', null, !!changeActive);
    }
  }

  getEmptyValue(type: string) {
    switch (type) {
      case 'string':
        return '';
      case 'boolean':
        return false;
      case 'number':
        return null;
      default:
        return null;
    }
  }

  getProperValue = (value: any, dataType: string) => {
    switch (dataType) {
      case 'boolean':
        if (value === '0' || value === 0 || value === false || !value) {
          return false;
        } else {
          return true;
        }
      case 'number':
        return !!Number(value) ? Number(value) : null;
      case 'string':
        return value === '' || !value ? '' : value;
      default:
        return !!value ? value : null;
    }
  };
}
