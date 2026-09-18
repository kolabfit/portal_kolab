
export enum UserRole {
  STUDENT = 'STUDENT',
  LECTURER = 'LECTURER',
  ADMIN = 'ADMIN'
}

export type InternshipStatus = 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface Internship {
  id: string;
  studentNim: string;
  studentName: string | null;
  startupId: string;
  startupName: string | null;
  startDate: string;
  endDate: string;
  fieldSupervisor: string | null;
  academicSupervisorNip: string | null;
  academicSupervisorName: string | null;
  academicSupervisorCode: string | null;
  academicSupervisor2Nip: string | null;
  academicSupervisor2Name: string | null;
  academicSupervisor2Code: string | null;
  status: InternshipStatus;
}

export enum StudentJobDesk {
  ASLAB = 'Asisten Lab',
  PIC = 'PIC Lab',
  NONE = 'Non Jobdesk'
}

export enum LecturerJobDesk {
  PENGURUS = 'Pengurus',
  PEMBINA = 'Pembina'
}

export interface StartupTeam {
  id: string;
  name: string;
  website: string;
  ig: string;
  tiktok: string;
  linkedin: string;
  logoUrl?: string;
  memberCount?: number;
}

export type FileCategory = 'image' | 'document' | 'pdf' | 'spreadsheet' | 'archive' | 'video' | 'sound' | 'folder' | 'other';

export interface RepoItem {
  id: string;
  name: string;
  url: string;
  date: string;
  size: number;
  mimeType: string;
  ownerName?: string;
  ownerId?: string;
  category: FileCategory;
  parentId: string;
  type: 'FILE' | 'FOLDER';
  role?: UserRole;
}

export interface CategoryStat {
  count: number;
  size: number;
}

export interface GlobalRepoStats {
  usedSpace: number;
  clusterSpace: number;
  totalQuota: number;
  fileCount: number;
  folderCount: number;
  topFiles: RepoItem[];
  categoryStats: Record<FileCategory, CategoryStat>;
}

export interface TrashItem extends RepoItem {
  deletedAt: string;
  originalParentId: string;
}

export interface StoragePolicy {
  defaultQuota: number;
  maxUploadSize: number;
  allowedCategories: FileCategory[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  password?: string;
  photoIdCard?: string;
  customQuota?: number;
  customMaxUpload?: number;
  studentType?: 'STARTUP' | 'NON_STARTUP';
  startupId?: string;
  studentJobDesk?: StudentJobDesk;
  studentStatuses?: string[];
  lecturerCode?: string;
  lecturerJobDesks?: LecturerJobDesk[];
  isApproved: boolean;
  isActive: boolean;
  youtube?: string;
  spotify?: string;
}

export interface YoutubePlaylist {
  playlistId: string;
  title: string;
  thumbnail: string;
  publishedAt?: string;
  channelTitle?: string;
}

export interface TvChannel {
  id: string;
  title: string;
  videoId: string;
  thumbnail: string;
}

export interface AppAssets {
  bgFront?: string;
  bgBack?: string;
  logoUrl?: string;
  studentPolicy?: StoragePolicy;
  lecturerPolicy?: StoragePolicy;
  adminYoutube?: string;
  adminSpotify?: string;
  memberCount?: number;
  yPlaylists?: YoutubePlaylist[];
  tvChannels?: TvChannel[];
}

export interface Schedule {
  id: string;
  title: string;
  date: string;
  time: string;
  endTime?: string;
  locationOffline?: string;
  locationOnline?: boolean;
  meetLink?: string;
  organizer: string;
  description: string;
  author?: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time?: string;
  image: string;
  category: string;
  description: string;
  locationOffline?: string;
  locationOnline?: string; 
  meetLink?: string; 
  maxParticipants?: number;
  status?: 'OPEN' | 'CLOSED';
  tags?: string[];
  author?: string;
}

export interface NewsInfo {
  id: string;
  title: string;
  content: string;
  date: string;
  tags: string[];
}

export interface Article {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  tags: string[];
  categoryId: string;
  imageUrl?: string;
  videoUrl?: string;
  otherUrl?: string;
}

export interface ArticleCategory {
  id: string;
  name: string;
}

export interface Informasi {
  id: string;
  title: string;
  date: string;
  description: string;
  author: string;
  targetType: 'ALL' | 'ROLE_LECTURER' | 'ROLE_STUDENT' | 'STARTUP_ALL' | 'STARTUP_SPECIFIC';
  targetValue?: string;
}

export interface Announcement {
  id: string;
  author: string;
  title: string;
  content: string;
  createdAt: string;
  target: {
    type: 'ALL' | 'ROLE' | 'STARTUP' | 'INDIVIDUAL';
    value?: string;
  };
}

export interface AppNotification {
  id: string;
  type: 'SCHEDULE' | 'INFO' | 'ANNOUNCEMENT' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
}
