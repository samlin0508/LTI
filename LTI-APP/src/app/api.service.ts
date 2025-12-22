import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = 'https://storage.googleapis.com/lti-assets';

  constructor(private http: HttpClient) { }

  getEps(id: string): Observable<any[]> { 
    if(!id) return EMPTY;
    
    return this.http.get<any[]>(
      `${this.apiUrl}/${id}-eps.json?${crypto.randomUUID()}`
    );
  }

  getDividends(id: string): Observable<any[]> { 
    if(!id) return EMPTY;
    
    return this.http.get<any[]>(
      `${this.apiUrl}/${id}-dividends.json?${crypto.randomUUID()}`
    );
  }

  getEntities(): Observable<any[]> { 
    return this.http.get<any[]>(
      `${this.apiUrl}/entities.json?${crypto.randomUUID()}`
    );
  }
}
