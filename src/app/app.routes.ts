import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'chat',
        pathMatch: 'full'
      },
      {
        path: 'chat',
        loadChildren: () => import('./features/chat/chat.module')
          .then(m => m.ChatModule),
        title: 'Chat | ChatFlow'
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/components/profile-view/profile-view.component')
          .then(m => m.ProfileViewComponent),
        title: 'Profile | ChatFlow'
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component')
          .then(m => m.SettingsComponent),
        title: 'Settings | ChatFlow'
      },
      {
        path: 'websocket-demo',
        loadComponent: () => import('./features/websocket-demo/websocket-demo.component')
          .then(m => m.WebsocketDemoComponent),
        title: 'WebSocket Demo | ChatFlow'
      },
      {
        path: 'websocket-test',
        loadComponent: () => import('./features/websocket-test/websocket-test.component')
          .then(m => m.WebsocketTestComponent),
        title: 'WebSocket Test | ChatFlow'
      }
    ]
  },
  { 
    path: '**',
    redirectTo: 'chat'
  }
];
