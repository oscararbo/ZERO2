import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environments';

export type ProgressResponse = {
  labels: string[];
  values: number[];
};

@Injectable({ providedIn: 'root' })
export class ProgressService {
  constructor(private http: HttpClient) {}

  getProgress() {
    return this.http.get<ProgressResponse>(`${environment.apiUrl}/api/progress/`);
  }
}
