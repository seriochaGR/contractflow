import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({ providedIn: "root" })
export class UserService {
  private readonly baseUrl = "/api/users";
  private readonly http = inject(HttpClient);

  readonly items = signal<IUserDto[]>([]);
  readonly loading = signal(false);

  list(): Observable<IUserDto[]> {
    return this.http.get<IUserDto[]>(this.baseUrl);
  }
}
