import { Observable, catchError, of } from 'rxjs';
import { UserService } from './../../../user.service';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';

@Component({
  standalone: true,
  imports: [AsyncPipe],
  template: `
    <div class="container">
      <div>Escolha um Login</div>
      <h1>PAREI EM 1:07:00</h1>
      <h2>no primeiro load da pagina já vai pegar o nome e imagem</h2>

      <input
        type="file"
        #input
        (change)="onFileSelected($event)"
        accept="image/*" />

      @for (userImage of users$ | async; track userImage.user.id) {
        <div class="user">
          @if (userImage.imageUrl) {
            <img [src]="userImage.imageUrl" alt="userImage.user.name" />
          } @else {
            <span>N/A</span>
          }
          <span> {{ userImage.user.name }} </span>
          <button (click)="onImageButtonClicked(userImage.user.id)">IM</button>
        </div>
      }
    </div>
  `,
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  @ViewChild('input', { static: true, read: ElementRef })
  inputFile!: ElementRef;
  private UserService = inject(UserService);
  private lastUserIdClicked = '';

  protected users$ = this.UserService.getUsers();

  refreshUsers() {
    this.users$ = this.UserService.getUsers().pipe(
      catchError(err => {
        alert('DEU ERRO');
        return of([]);
      })
    );
  }

  onFileSelected(event: any) {
    const selectedFiles = event.target.files as FileList;

    if (selectedFiles.length == 0) return;

    const file = selectedFiles[0];

    const reader = new FileReader();
    reader.readAsArrayBuffer(file);

    reader.onloadend = () => {
      const fileInBytes = reader.result as ArrayBuffer;
      this.UserService.uploadUserImage(
        this.lastUserIdClicked,
        fileInBytes
      ).subscribe(() => this.refreshUsers());
    };
  }

  onImageButtonClicked(userId: any) {
    this.lastUserIdClicked = userId;
    this.inputFile.nativeElement.click();
  }
}
