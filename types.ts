export type StartupPosition = 'CEO' | 'COO' | 'CTO' | 'CFO' | 'CMO' | 'MEMBER';

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
  startupId?: string | null;
  startupPosition?: StartupPosition | null;
  studentJobDesk?: StudentJobDesk;
  studentStatuses?: string[];
  lecturerCode?: string;
  lecturerJobDesks?: LecturerJobDesk[];
  isApproved: boolean;
  isActive: boolean;
  youtube?: string;
  spotify?: string;
}

export interface LecturerOverview {
  lecturer: { nip: string; name: string; code?: string; isActive: boolean; isApproved: boolean; jobDesks: string[] };
  summary: { totalStudents: number; totalSupervisions: number; activeSupervisions: number; workloadsAsPic: number; activeWorkloads: number };
}

export interface LecturerStudentSummary {
  nim: string;
  name: string;
  startup: { id: string; name: string; logoUrl?: string; position?: string } | null;
  internship: { status: InternshipStatus; startupName?: string; startDate?: string; endDate?: string; fieldSupervisor?: string } | null;
  activeWorkload: number;
  memberStatus: string;
  type?: string;
  jobDesk?: string;
}

export interface LecturerWorkload {
  id: string;
  name: string;
  category: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  member_count?: number;
  job_desk?: string;
  pic_name?: string;
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
  tagList?: { id: string; name: string; slug: string }[];
  attachments?: { id: string; fileId: string; originalName: string; mimeType: string; size: number; url: string }[];
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

export interface StudentInternshipSummary {
 id: string; status: InternshipStatus; startupId: string; startupName: string | null;
 startDate: string; endDate: string; fieldSupervisor: string | null;
 academicSupervisorNip: string | null; academicSupervisorName: string | null;
 academicSupervisor2Nip: string | null; academicSupervisor2Name: string | null;
}
export type StudentWorkloadCategory = 'PKM' | 'PROJECT' | 'RESEARCH' | 'COMPETITION';
export interface StudentWorkloadSummary {
 id: string; name: string; category: StudentWorkloadCategory; description: string | null;
 status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'; jobDesk: string | null;
 startDate: string | null; endDate: string | null; picName: string | null; picRole: 'STUDENT' | 'LECTURER' | null;
}
export interface StudentMemberOverview {
 profile: { nim: string; name: string };
 membership: { isActive: boolean; isApproved: boolean; studentType: string | null; jobDesk: string | null };
 startup: { position: StartupPosition | null; id: string; name: string; logoUrl: string | null; website: string | null; instagram: string | null } | null;
 internship: { current: StudentInternshipSummary | null; history: StudentInternshipSummary[] };
 workload: { activeLoad: number; totalHistory: number; categoryLoad: Record<StudentWorkloadCategory, number>;
 active: StudentWorkloadSummary[]; history: StudentWorkloadSummary[]; planned: StudentWorkloadSummary[] };
}

export interface MitraMember {
  name: string;
  role: string;
}

export interface MitraApp {
  name: string;
  url: string;
}

export interface Mitra {
  id: string;
  name: string;
  address: string;
  phone: string;
  description: string;
  headName: string;
  logo: string;
  website: string;
  members: MitraMember[];
  apps: MitraApp[];
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}
