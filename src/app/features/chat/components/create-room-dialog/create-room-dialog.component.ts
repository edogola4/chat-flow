import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CreateRoomDto } from '../../models/room.model';

@Component({
  selector: 'app-create-room-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './create-room-dialog.component.html',
  styleUrls: ['./create-room-dialog.component.scss']
})
export class CreateRoomDialogComponent {
  roomForm: FormGroup;
  roomTypes = [
    { value: 'public', viewValue: 'Public' },
    { value: 'private', viewValue: 'Private' },
    { value: 'direct', viewValue: 'Direct Message' }
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CreateRoomDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.roomForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      type: ['public', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.roomForm.valid) {
      const roomData: CreateRoomDto = {
        name: this.roomForm.value.name,
        description: this.roomForm.value.description,
        type: this.roomForm.value.type
      };
      this.dialogRef.close(roomData);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
