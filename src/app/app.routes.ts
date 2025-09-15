import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'websocket-test',
    loadComponent: () => import('./features/websocket-test/websocket-test.component').then(m => m.WebsocketTestComponent),
    title: 'WebSocket Test'
  },
  { 
    path: '',
    redirectTo: 'websocket-test',
    pathMatch: 'full' 
  },
  { 
    path: '**',
    redirectTo: 'websocket-test'
  }
];
