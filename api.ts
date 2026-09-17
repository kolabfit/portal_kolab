/**
 * PORTAL KOLAB API GATEWAY
 * Version: 3.0.0 - Node.js & MySQL Implementation
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://portal.kolab.top/api');

const SESSION_KEY = 'portal-kolab.auth-token';

export const api = {
  getToken(): string | null {
    return localStorage.getItem(SESSION_KEY);
  },
  saveToken(token: string) {
    localStorage.setItem(SESSION_KEY, token);
  },
  clearSession() {
    localStorage.removeItem(SESSION_KEY);
  },
  async restoreSession() {
    const token = this.getToken();
    if (!token) return null;
    const response = await fetch(API_BASE_URL + '/auth/session', {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000)
    });
    if (response.status === 401) {
      this.clearSession();
      return null;
    }
    if (!response.ok) throw new Error('Unable to restore session');
    const result = await response.json();
    if (result.status !== 'success' || !result.profile) throw new Error('Invalid session response');
    return result.profile;
  },
  /**
   * Mengambil data dari Backend via GET.
   */
  async getData(action: string) {
    try {
      // Mapping action to specialized endpoints if needed
      let endpoint = '';
      switch (action) {
        case 'getAssets': endpoint = '/data/assets'; break;
        case 'getNotifications': endpoint = '/data/notifications'; break;
        case 'getAnnouncements': endpoint = '/data/announcements'; break;
        case 'getStartups': endpoint = '/data/startups'; break;
        case 'getInformasi': endpoint = '/data/informasi'; break;
        case 'getSchedules': endpoint = '/data/schedules'; break;
        case 'getEvents': endpoint = '/data/events'; break;
        case 'getArticles': endpoint = '/data/articles'; break;
        case 'getCategories': endpoint = '/data/categories'; break;
        default: endpoint = `/data/${action}`;
      }

      const url = `${API_BASE_URL}${endpoint}?t=${Date.now()}`;
      
      const response = await fetch(url, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`GET request failed for [${action}]:`, error);
      return null;
    }
  },

  /**
   * Mengirim data ke Backend via POST.
   */
  async postData(action: string, payload: any) {
    try {
      let endpoint = '/bridge';
      if (action === 'login') endpoint = '/auth/login';
      if (action === 'register') endpoint = '/auth/register';

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.getToken() ? { Authorization: 'Bearer ' + this.getToken() } : {}),
        },
        body: JSON.stringify({ action, ...payload })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`POST request failed for [${action}]:`, error);
      const message = error instanceof Error ? error.message : 'Unknown network error';
      if (!['login', 'register'].includes(action)) window.dispatchEvent(new CustomEvent('portal-api-error', { detail: message }));
      return { status: 'error', message };
    }
  },

  /**
   * Helper khusus untuk upload biner profile (avatar/KTM)
   */
  async uploadFile(base64: string, fileName: string, oldUrl?: string, folderType: string = 'asetweb') {
    const data = base64.includes(',') ? base64.split(',')[1] : base64;
    return await this.postData('uploadFile', {
      data, 
      fileName, 
      mimeType: base64.match(/^data:([^;]+);/)?.[1] || 'image/png',
      oldUrl, folderType,
      label: fileName,
      parentId: 'ROOT'
    });
  },

  /**
   * AI Content Generation
   */
  async generateMeetLink(title: string, startTime: string, description: string) {
    return this.postData('generateMeetLink', { title, startTime, description });
  },
  async autoInviteToMeet(meetLink: string, email: string) {
    return this.postData('autoInviteToMeet', { meetLink, email });
  },
  async generateAI(prompt: string, model?: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.getToken() ? { Authorization: 'Bearer ' + this.getToken() } : {}),
        },
        body: JSON.stringify({ prompt, model })
      });
      return await response.json();
    } catch (error) {
      console.error('AI generation failed:', error);
      return { status: 'error', message: error instanceof Error ? error.message : 'AI error' };
    }
  }
};