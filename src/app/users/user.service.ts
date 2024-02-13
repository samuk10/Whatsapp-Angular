import { LocalUserImage } from './../local-db/local-user-image.model';
import { environment } from '@@environment/environment';
import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User } from './user.model';
import { catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { LocalDb } from '../local-db/local-db';
import { UserImage } from './user-image.model';
import { UserStorageInfo } from './user-storage-info.model';
import { AuthLoginResponse } from './auth-login-response.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private urlApi = `${environment.urlApi}/user`;
  private authUrlApi = `${environment.urlApi}/auth`;
  private userInfo = signal<UserStorageInfo | null>(null);
  private router = inject(Router);
  private localDb = new LocalDb();

  constructor() {
    effect(() => this.syncUserInfoLocalStorage());
  }

  syncUserInfoLocalStorage() {
    localStorage.setItem('UserData', JSON.stringify(this.userInfo()));
  }

  // consulta todos users do backend, com o switchMap para cada user que voltar
  // dispara um getUserImage, pega a imagem, e junta com o map user, image
  getUsers() {
    return this.http.get<User[]>(`${this.urlApi}`).pipe(
      // Após executar a busca de usuarios, estou executando outra requisicao
      switchMap(users => {
        // Montando uma requisição para cada usuario mas não estou executando
        const userImageRequests = users.map(user =>
          // Pra cada user, estou criando uma requisicao de imagem
          this.getUserImage(user.id).pipe(
            // Caso a image não exista, estou interceptando pra não quebrar
            catchError(_ => of(null)),

            // Estou obtendo a image, e criando um novo obj com os dados do usuario e imagem
            map(image => ({
              user,
              image,
            }))
          )
        );

        // SwitchMap obriga a retornar um observable, o forkJoin, funciona como um Promisse.All
        // Ele executa um array de observable ao mesmo tempo.
        return forkJoin(userImageRequests);
      }),
      // Salvando aS imagens no banco local (indexedDb)
      tap(userImages => {
        new LocalDb().addUsers(
          userImages.map(userImage => ({
            id: userImage.user.id,
            name: userImage.user.name,
            imageBlob: userImage.image,
          }))
        );
      }),
      // Transformando as imagens em URLs
      map(userImages =>
        userImages.map(userImageBlob => {
          return {
            user: userImageBlob.user,
            imageUrl:
              userImageBlob.image && URL.createObjectURL(userImageBlob.image),
          };
        })
      )
    );
  }

  private getUserImage(userId: string) {
    return this.http.get(`${this.urlApi}/${userId}/image`, {
      responseType: 'blob',
    });
  }

  uploadUserImage(userId: string, image: ArrayBuffer) {
    const blobImage = new Blob([image]);
    const formData = new FormData();

    formData.append('file', blobImage);
    return this.http.put(`${this.urlApi}/${userId}/image`, formData);
  }

  login(userID: string) {
    return this.http.post<AuthLoginResponse>(this.authUrlApi, {
      userId: userID,
    });
  }

  setCurrentUser(user: UserStorageInfo) {
    this.userInfo.set(user);
  }

  getUserInfoSignal() {
    return this.userInfo.asReadonly();
  }

  isUserLogged() {
    return !!this.userInfo();
  }

  trySyncLocalStorage() {
    const localStorageData = localStorage.getItem('UserData');

    if (!localStorageData) return;

    const userData: UserStorageInfo = JSON.parse(localStorageData);
    this.userInfo.set(userData);
  }

  getCurrentUserImageUrl() {
    return this.localDb
      .getUserImage(this.userInfo()!.id)
      .pipe(map(blob => (!!blob ? URL.createObjectURL(blob) : '')));
  }

  getLocalUsers() {
    return this.localDb.getUsers().pipe(
      map(localUsers =>
        localUsers.map(
          localUser =>
            ({
              user: {
                id: localUser.id,
                name: localUser.name,
              },
              imageUrl:
                localUser.imageBlob && URL.createObjectURL(localUser.imageBlob),
            }) as UserImage
        )
      )
    );
  }

  getLocalUserById(userId: string) {
    return this.localDb.getUserById(userId).pipe(
      map(
        localUserImage =>
          ({
            user: {
              id: localUserImage!.id,
              name: localUserImage!.name,
            },
            imageUrl: !!localUserImage?.imageBlob
              ? URL.createObjectURL(localUserImage.imageBlob)
              : null,
          }) as UserImage
      )
    );
  }

  logout() {
    this.userInfo.set(null);
    this.router.navigate(['login']);
  }
}
