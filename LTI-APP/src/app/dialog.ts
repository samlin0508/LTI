import { Component, inject } from '@angular/core';
import {
    MAT_DIALOG_DATA,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'dialog',
    templateUrl: 'dialog.html',
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatDialogClose,
        MatButtonModule
    ],
})
export class Dialog {
    data = inject(MAT_DIALOG_DATA);
}