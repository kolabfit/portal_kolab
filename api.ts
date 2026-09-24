import type { StudentMemberOverview } from './types';
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
      if (action.startsWith('lecturer/')) endpoint = `/${action}`;
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
        case 'getTags': endpoint = '/data/tags'; break;
        case 'getInternships': endpoint = '/data/internships'; break;
        case 'getLecturerOverview': endpoint = '/lecturer/overview'; break;
        case 'getLecturerStudents': endpoint = '/lecturer/students'; break;
        case 'getLecturerSupervisions': endpoint = '/lecturer/supervisions'; break;
        case 'getLecturerWorkloads': endpoint = '/lecturer/workloads'; break;
        case 'getLecturerStartups': endpoint = '/lecturer/startups'; break;
        default: if (!endpoint) endpoint = `/data/${action}`;
      }

      const url = `${API_BASE_URL}${endpoint}?t=${Date.now()}`;
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        method: 'GET',
        headers: this.getToken() ? { Authorization: 'Bearer ' + this.getToken() } : {}
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
  async getStudentStatus(signal?: AbortSignal): Promise<StudentMemberOverview> {
    const response = await fetch(API_BASE_URL + '/student/me/status', {
      headers: { Authorization: 'Bearer ' + this.getToken() }, cache: 'no-store', signal
    });
    if (!response.ok) throw new Error('Data status belum dapat dimuat.');
    return response.json();
  },
  async getWorkloads() {
    const response = await fetch(`${API_BASE_URL}/workloads?t=${Date.now()}`, { headers: this.getToken() ? { Authorization: 'Bearer ' + this.getToken() } : {} });
    if (!response.ok) throw new Error('Data workload gagal dimuat.');
    return response.json();
  },
  async getWorkloadSummary() {
    const response = await fetch(`${API_BASE_URL}/workloads/member-summary?t=${Date.now()}`, { headers: this.getToken() ? { Authorization: 'Bearer ' + this.getToken() } : {} });
    if (!response.ok) throw new Error('Ringkasan workload gagal dimuat.');
    return response.json();
  },
  async workloadRequest(path: string, method: string, body?: unknown) {
    const response = await fetch(`${API_BASE_URL}/workloads${path}`, { method, headers: { 'Content-Type': 'application/json', ...(this.getToken() ? { Authorization: 'Bearer ' + this.getToken() } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Operasi workload gagal.');
    return result;
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
        body: JSON.stringify({ action, ...payload }),
        ...(['manageArticle', 'articleAction'].includes(action) ? { signal: AbortSignal.timeout(30000) } : {})
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
  async memberImportPreview(file: File, role: 'STUDENT' | 'LECTURER', duplicateMode: 'skip' | 'update') {
    const form = new FormData();
    form.append('file', file);
    form.append('role', role);
    form.append('duplicateMode', duplicateMode);
    const response = await fetch(`${API_BASE_URL}/admin/members/import/preview`, {
      method: 'POST',
      headers: this.getToken() ? { Authorization: 'Bearer ' + this.getToken() } : {},
      body: form
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Preview import gagal.');
    return result;
  },
  async memberImportCommit(role: 'STUDENT' | 'LECTURER', rows: unknown[]) {
    const response = await fetch(`${API_BASE_URL}/admin/members/import/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.getToken() ? { Authorization: 'Bearer ' + this.getToken() } : {})
      },
      body: JSON.stringify({ role, rows })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Import gagal disimpan.');
    return result;
  },
  async downloadMemberFile(role: 'STUDENT' | 'LECTURER', format: 'xlsx' | 'pdf', search = '') {
    const params = new URLSearchParams({ format });
    if (search.trim()) params.set('search', search.trim());
    const response = await fetch(`${API_BASE_URL}/admin/members/export/${role.toLowerCase()}?${params}`, {
      headers: this.getToken() ? { Authorization: 'Bearer ' + this.getToken() } : {}
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || 'Export gagal.');
    }
    return response.blob();
  },
  async downloadMemberTemplate(role: 'STUDENT' | 'LECTURER') {
    const response = await fetch(`${API_BASE_URL}/admin/members/template/${role}`, {
      headers: this.getToken() ? { Authorization: 'Bearer ' + this.getToken() } : {}
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || 'Template gagal diunduh.');
    }
    return response.blob();
  },
  async downloadInternshipTemplate() {
    const response = await fetch(`${API_BASE_URL}/admin/internships/template`, {
      headers: this.getToken() ? { Authorization: 'Bearer ' + this.getToken() } : {}
    });
    if (!response.ok) throw new Error('Template magang gagal diunduh.');
    return response.blob();
  },
  async internshipImportPreview(file: File) {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`${API_BASE_URL}/admin/internships/import/preview`, {
      method: 'POST',
      headers: this.getToken() ? { Authorization: 'Bearer ' + this.getToken() } : {},
      body: form
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Preview import magang gagal.');
    return result;
  },
  async internshipImportCommit(rows: unknown[]) {
    const response = await fetch(`${API_BASE_URL}/admin/internships/import/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.getToken() ? { Authorization: 'Bearer ' + this.getToken() } : {})
      },
      body: JSON.stringify({ rows })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Import magang gagal.');
    return result;
  },

  /**
  /**
   * Upload file via Portal Backend -> Kroombox CDN (multipart/form-data).
   * No API key is exposed to the frontend.
   * @param file - File object from input[type=file]
   * @param featureType - e.g. 'PROFILE_AVATAR', 'ARTICLE_THUMBNAIL', 'REPOSITORY_FILE'
   * @param featureId - Optional ID of the parent resource
   * @param visibility - 'public' | 'private'
   */
  async uploadFileCdn(
    file: File,
    featureType: string = 'OTHER',
    featureId?: string,
    visibility: 'public' | 'private' = 'public'
  ) {
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('featureType', featureType);
      if (featureId) form.append('featureId', featureId);
      form.append('visibility', visibility);
      const response = await fetch(`${API_BASE_URL}/assets/upload`, {
        method: 'POST',
        headers: this.getToken() ? { Authorization: 'Bearer ' + this.getToken() } : {},
        body: form,
        signal: AbortSignal.timeout(75000)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Upload gagal.');
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload gagal.';
      window.dispatchEvent(new CustomEvent('portal-api-error', { detail: message }));
      return { status: 'error', message };
    }
  },

  /** Wait at most 30 seconds; callers retain the upload ID on timeout. */
  async waitForAssetReady(assetId: string) {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      const response = await fetch(`${API_BASE_URL}/assets/${encodeURIComponent(assetId)}`, {
        headers: this.getToken() ? { Authorization: 'Bearer ' + this.getToken() } : {},
        signal: AbortSignal.timeout(Math.min(10000, Math.max(1, deadline - Date.now()))), cache: 'no-store'
      });
      const asset = await response.json();
      if (!response.ok) throw new Error(asset.message || 'Status file belum dapat diperiksa. Silakan coba kembali.');
      if (asset.cdnStatus === 'READY') return asset;
      if (['FAILED', 'DELETED', 'DELETE_PENDING'].includes(asset.cdnStatus)) throw new Error('File gagal diproses storage. Pilih ulang file.');
      await new Promise(resolve => setTimeout(resolve, Math.min(2000, Math.max(0, deadline - Date.now()))));
    }
    throw new Error('File belum selesai diproses oleh storage. Silakan coba kembali; file yang sudah diunggah tetap tersimpan.');
  },

  /** @deprecated Use uploadFileCdn() instead. */
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

