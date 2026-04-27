import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';

export interface JournalEntry {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class MindsetService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/journal/`;

  constructor() { }

  // Get all journal entries for the current user
  getJournalEntries(): Observable<JournalEntry[]> {
    return this.http.get<JournalEntry[]>(this.apiUrl);
  }

  // Create a new journal entry
  createJournalEntry(content: string): Observable<JournalEntry> {
    return this.http.post<JournalEntry>(this.apiUrl, { content });
  }

  // Update a journal entry
  updateJournalEntry(id: number, content: string): Observable<JournalEntry> {
    return this.http.put<JournalEntry>(`${this.apiUrl}${id}/`, { content });
  }

  // Delete a journal entry
  deleteJournalEntry(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.apiUrl}${id}/`);
  }
}
