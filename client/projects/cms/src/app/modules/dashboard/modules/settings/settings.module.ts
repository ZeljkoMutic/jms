import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {RouterModule, Routes} from '@angular/router';
import {SettingsComponent} from './settings.component';
import {ReactiveFormsModule} from '@angular/forms';
import {FormBuilderSharedModule} from '../../../../shared/modules/fb/form-builder-shared.module';
import {LoadClickModule} from '@jaspero/ng-helpers';
import {TranslocoModule} from '@ngneat/transloco';
import {MatRadioModule} from '@angular/material/radio';
import {MatButtonModule} from '@angular/material/button';

const routes: Routes = [{
  path: '',
  component: SettingsComponent
}];

@NgModule({
  declarations: [
    SettingsComponent
  ],
  imports: [
    /**
     * Angular
     */
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),

    /**
     * Material
     */
    MatButtonModule,

    /**
     * External
     */
    FormBuilderSharedModule,
    LoadClickModule,
    TranslocoModule,
  ]
})
export class SettingsModule { }
