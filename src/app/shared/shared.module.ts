import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeToggleComponent } from '../core/theme/theme-toggle/theme-toggle.component';

const MATERIAL_MODULES = [
  MatButtonModule,
  MatIconModule,
  MatTooltipModule
];

const STANDALONE_COMPONENTS = [
  ThemeToggleComponent
];

@NgModule({
  imports: [
    CommonModule,
    ...MATERIAL_MODULES,
    ...STANDALONE_COMPONENTS
  ],
  exports: [
    ...MATERIAL_MODULES,
    ...STANDALONE_COMPONENTS
  ]
})
export class SharedModule { }
