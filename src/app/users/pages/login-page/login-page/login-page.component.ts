import { Observable, catchError, of, take, tap } from 'rxjs';
import { UserService } from './../../../user.service';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { User } from '../../../user.model';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  imports: [AsyncPipe],
  template: `
    <div class="container">
      <div>Escolha um Login</div>
      <h1>PAREI EM 1:00:00</h1>
      <h2>add img to conversations</h2>

      <input
        type="file"
        #input
        (change)="onFileSelected($event)"
        accept="image/*" />

      @for (userImage of users$ | async; track userImage.user.id) {
        <div class="user" (click)="login(userImage.user)">
          @if (userImage.imageUrl) {
            <img [src]="userImage.imageUrl" alt="userImage.user.name" />
          } @else {
            <span>N/A</span>
          }
          <span> {{ userImage.user.name }} </span>
          <button (click)="onImageButtonClicked($event, userImage.user.id)">
            IM
          </button>
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
  private router = inject(Router);
  private lastUserIdClicked = '';

  protected users$ = this.UserService.getUsers();

  refreshUsers() {
    this.users$ = this.UserService.getUsers().pipe(
      catchError(err => {
        alert('DEU ERRO');
        return of([]);
      }),
      take(1),
      tap(console.log)
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
      this.UserService.uploadUserImage(this.lastUserIdClicked, fileInBytes)
        .pipe(take(1))
        .subscribe(() => {
          this.inputFile.nativeElement.value = '';
          this.refreshUsers();
        });
    };
  }

  onImageButtonClicked(event: Event, userId: any) {
    event.stopPropagation();
    this.lastUserIdClicked = userId;
    this.inputFile.nativeElement.click();
  }

  login(user: User) {
    this.UserService.login(user.id)
      .pipe(take(1))
      .subscribe(res => {
        this.UserService.setCurrentUSer({
          ...user,
          token: res.token,
        });
        this.router.navigate(['conversations']);
      });
  }
}
