import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatLayoutComponent } from './components/chat-layout/chat-layout.component';
import { ChatComponent } from './components/chat/chat.component';
import { RoomListComponent } from './components/room-list/room-list.component';

export const chatRoutes: Routes = [
  {
    path: 'room/:id',
    component: ChatComponent
  },
  {
    path: '',
    redirectTo: 'room/general',
    pathMatch: 'full'
  }
];

const routes: Routes = [
  {
    path: '',
    component: ChatLayoutComponent,
    children: [
      ...chatRoutes,
      {
        path: '**',
        redirectTo: 'room/general',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChatRoutingModule { }
