import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from './theme.service';
import { ThemeToggleComponent } from './theme-toggle/theme-toggle.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ThemeToggleComponent
  ],
  exports: [
    ThemeToggleComponent
  ],
  providers: [
    ThemeService
  ]
})
export class ThemeModule { }
