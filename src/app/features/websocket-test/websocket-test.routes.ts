import { Routes } from '@angular/router';
import { WebsocketTestComponent } from './websocket-test.component';

export const WEBSOCKET_TEST_ROUTES: Routes = [
  {
    path: '',
    component: WebsocketTestComponent,
    title: 'WebSocket Test'
  }
];
