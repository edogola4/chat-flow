import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ChatRoutingModule } from './chat-routing.module';
import { ChatComponent } from './components/chat/chat.component';
import { ChatLayoutComponent } from './components/chat-layout/chat-layout.component';
import { RoomListComponent } from './components/room-list/room-list.component';
import { CreateRoomDialogComponent } from './components/create-room-dialog/create-room-dialog.component';
import { WebsocketService } from './services/websocket.service';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ChatRoutingModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatSelectModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatTooltipModule,
    // Import standalone components here
    ChatComponent,
    ChatLayoutComponent,
    RoomListComponent,
    CreateRoomDialogComponent
  ],
  providers: [
    WebsocketService
  ],
  exports: [
    RoomListComponent
  ]
})
export class ChatModule { 
  constructor(@Optional() @SkipSelf() parentModule?: ChatModule) {
    if (parentModule) {
      throw new Error(
        'ChatModule is already loaded. Import it in the AppModule only');
    }
  }
}
