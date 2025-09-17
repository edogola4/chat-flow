import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

// Components
import { ProfileViewComponent } from './components/profile-view/profile-view.component';
import { ProfileEditComponent } from './components/profile-edit/profile-edit.component';

const routes: Routes = [
  {
    path: '',
    component: ProfileViewComponent,
    canActivate: [authGuard],
    data: { title: 'My Profile' }
  },
  {
    path: 'edit',
    component: ProfileEditComponent,
    canActivate: [authGuard],
    data: { title: 'Edit Profile' }
  },
  {
    path: ':id',
    component: ProfileViewComponent,
    data: { title: 'User Profile' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProfileRoutingModule { }
