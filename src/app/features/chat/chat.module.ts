import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ChatRoutingModule } from './chat-routing.module';
import { WebsocketService } from './services/websocket.service';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ChatRoutingModule
  ],
  providers: [WebsocketService]
})
export class ChatModule { }
