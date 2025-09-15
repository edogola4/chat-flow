import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'chat',
    loadComponent: () => import('./features/chat/components/chat-room/chat-room.component')
      .then(m => m.ChatRoomComponent),
    title: 'Chat Room'
  },
  {
    path: 'websocket-demo',
    loadComponent: () => import('./features/websocket-demo/websocket-demo.component')
      .then(m => m.WebsocketDemoComponent),
    title: 'WebSocket Demo'
  },
  {
    path: 'websocket-test',
    loadComponent: () => import('./features/websocket-test/websocket-test.component')
      .then(m => m.WebsocketTestComponent),
    title: 'WebSocket Test'
  },
  { 
    path: '',
    redirectTo: 'websocket-demo',
    pathMatch: 'full' 
  },
  { 
    path: '**',
    redirectTo: 'websocket-demo'
  }
];
