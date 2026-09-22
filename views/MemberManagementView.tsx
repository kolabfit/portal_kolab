import { STARTUP_POSITIONS, STARTUP_POSITION_LABELS, startupPositionLabel } from '../startupPositions';
import StartupPositionSelect from '../components/StartupPositionSelect';
import type { StartupPosition } from '../types';

import React, { useEffect, useState } from 'react';
import { 
  Trash2, Search, Rocket, HardDrive, 
  Plus, X, Save, UserPlus, Edit3, Loader2, CheckCircle2, UserCircle, Globe, Instagram, Lock, Unlock, Users, ShieldAlert, Fingerprint, BookOpen, User, Filter, Briefcase, Building2, RefreshCw, Upload, Download, FileSpreadsheet, FileText, ListChecks
} from 'lucide-react';
import { api } from '../api';
import { StartupTeam, UserRole, UserProfile, StudentJobDesk } from '../types';
import DropZone from '../components/DropZone';
import InternshipManagement from '../components/InternshipManagement';
import WorkloadManagement from '../components/WorkloadManagement';
import { TablePagination } from '../components/TableControls';

interface MemberManagementViewProps {
  userRole: UserRole;
  startups: StartupTeam[];
  onRefresh?: () => void;
  onShowAlert: (title: string, msg: string, type: any) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

type TransferRole = 'STUDENT' | 'LECTURER';
type TransferFormat = 'xlsx' | 'pdf';
type ImportStep = 'select' | 'preview' | 'result';
type BulkAction = 'approve' | 'unapprove' | 'activate' | 'deactivate' | 'delete' | 'edit' | 'assignInternship' | 'internshipStatus' | 'completeInternship' | 'removeInternship';

const MemberManagementView: React.FC<MemberManagementViewProps> = ({ userRole, startups, onRefresh, onShowAlert, showConfirm }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'LECTURER'>('STUDENT');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [lecturerSearch, setLecturerSearch] = useState('');
  const [activeView, setActiveView] = useState<'members' | 'startups' | 'internships' | 'workloads'>('members');
  const [internshipFilter, setInternshipFilter] = useState<'ALL' | 'NONE' | 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [studentPage, setStudentPage] = useState(1);
  const [lecturerPage, setLecturerPage] = useState(1);
  const [studentColumnFilters, setStudentColumnFilters] = useState({ name: '', id: '', startup: '', startupPosition: '', internship: '', workload: '', status: '' });
  const [lecturerColumnFilters, setLecturerColumnFilters] = useState({ name: '', id: '', jobDesk: '', supervision: '', workload: '', status: '' });
  
  // Modal & Popup States
  const [showAddMember, setShowAddMember] = useState(false);
  const [showStartupModal, setShowStartupModal] = useState<{ isOpen: boolean; mode: 'add' | 'edit'; item?: StartupTeam }>({ isOpen: false, mode: 'add' });
  const [editingQuota, setEditingQuota] = useState<any | null>(null);
  const [editingIdentity, setEditingIdentity] = useState<any | null>(null);
  
  // New User Lifecycle State
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.STUDENT);
  const [newStudentType, setNewStudentType] = useState<'STARTUP' | 'NON_STARTUP'>('NON_STARTUP');

  // Operation Latency States
  const [newStartupId, setNewStartupId] = useState('');
  const [newStartupPosition, setNewStartupPosition] = useState<StartupPosition | '' | null>(null);
  const [isProcessingStartup, setIsProcessingStartup] = useState(false);
  const [isProcessingAdd, setIsProcessingAdd] = useState(false);
  const [startupLogoPreview, setStartupLogoPreview] = useState<string | null>(null);
  const [transferMode, setTransferMode] = useState<'import' | 'export' | null>(null);
  const [transferRole, setTransferRole] = useState<TransferRole>('STUDENT');
  const [transferFormat, setTransferFormat] = useState<TransferFormat>('xlsx');
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'update'>('skip');
  const [importStep, setImportStep] = useState<ImportStep>('select');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [isTransferProcessing, setIsTransferProcessing] = useState(false);
  const [selectedMemberKeys, setSelectedMemberKeys] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkAction | ''>('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    name: '', email: '', password: '', studentType: '', startupId: '', startupPosition: '', studentJobDesk: '', lecturerCode: '', lecturerJobDesks: ''
  });
  const [showInternshipBulk, setShowInternshipBulk] = useState(false);
  const [internshipBulkPreview, setInternshipBulkPreview] = useState<any[] | null>(null);
  const [internshipBulkStatus, setInternshipBulkStatus] = useState<'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'>('PLANNED');
  const [internshipBulkDraft, setInternshipBulkDraft] = useState({ startupId: '', startDate: '', endDate: '', fieldSupervisor: '', academicSupervisorNip: '', academicSupervisor2Nip: '', status: 'PLANNED' as const });

  const closeTransfer = () => {
    setTransferMode(null);
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    setImportStep('select');
  };

  const downloadBlob = (blob: Blob, fallbackName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fallbackName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleTemplateDownload = async () => {
    try {
      setIsTransferProcessing(true);
      const blob = await api.downloadMemberTemplate(transferRole);
      downloadBlob(blob, `template-${transferRole === 'STUDENT' ? 'mahasiswa' : 'dosen'}-kolab.xlsx`);
    } catch (error) {
      onShowAlert('Template Gagal', error instanceof Error ? error.message : 'Template tidak dapat diunduh.', 'error');
    } finally {
      setIsTransferProcessing(false);
    }
  };

  const handleImportPreview = async () => {
    if (!importFile) return;
    try {
      setIsTransferProcessing(true);
      const result = await api.memberImportPreview(importFile, transferRole, duplicateMode);
      setImportPreview(result);
      setImportStep('preview');
    } catch (error) {
      onShowAlert('Preview Gagal', error instanceof Error ? error.message : 'File tidak dapat diproses.', 'error');
    } finally {
      setIsTransferProcessing(false);
    }
  };

  const handleImportCommit = async () => {
    if (!importPreview) return;
    try {
      setIsTransferProcessing(true);
      const result = await api.memberImportCommit(transferRole, importPreview.rows);
      setImportResult(result);
      setImportStep('result');
      await fetchMembers();
      onRefresh?.();
    } catch (error) {
      onShowAlert('Import Gagal', error instanceof Error ? error.message : 'Data tidak dapat disimpan.', 'error');
    } finally {
      setIsTransferProcessing(false);
    }
  };

  const handleMemberExport = async () => {
    try {
      setIsTransferProcessing(true);
      const blob = await api.downloadMemberFile(transferRole, transferFormat, transferRole === 'STUDENT' ? studentSearch : lecturerSearch);
      const label = transferRole === 'STUDENT' ? 'mahasiswa' : 'dosen';
      downloadBlob(blob, `data-${label}-kolab-${new Date().toISOString().slice(0, 10)}.${transferFormat}`);
      onShowAlert('Export Berhasil', `Data ${label} berhasil diunduh.`, 'success');
      closeTransfer();
    } catch (error) {
      onShowAlert('Export Gagal', error instanceof Error ? error.message : 'Data tidak dapat diekspor.', 'error');
    } finally {
      setIsTransferProcessing(false);
    }
  };

  const handleRefresh = async () => {
    setIsSyncing(true);
    await fetchMembers();
    if (onRefresh) await onRefresh();
    setTimeout(() => setIsSyncing(false), 600);
  };

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const [studentsRes, lecturersRes] = await Promise.all([
        api.postData('getStudents', {}),
        api.postData('getLecturers', {})
      ]);
      const parse = (arr: any[]) => Array.isArray(arr) ? arr.map(m => ({
        ...m,
        isActive: m.isActive === true || String(m.isActive).toUpperCase() === 'TRUE' || m.isActive === 1 || String(m.isActive) === '1',
        isApproved: m.isApproved === true || String(m.isApproved).toUpperCase() === 'TRUE' || m.isApproved === 1 || String(m.isApproved) === '1'
      })) : [];
      setStudents(parse(studentsRes));
      setLecturers(parse(lecturersRes));
    } catch (err) {
      console.error("Critical failure during member directory pull", err);
      setStudents([]);
      setLecturers([]);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const filteredStudents = students.filter(m => {
    const matchesSearch = m.name?.toLowerCase().includes(studentSearch.toLowerCase()) || 
                         m.studentId?.toString().toLowerCase().includes(studentSearch.toLowerCase());
    const matchesInternship = internshipFilter === 'ALL' || (internshipFilter === 'NONE' ? !m.internshipStatus : m.internshipStatus === internshipFilter);
    const startupName = startups.find(s => s.id === m.startupId)?.name || '';
    const status = `${m.isActive ? 'active' : 'inactive'} ${m.isApproved ? 'approved' : 'unapproved'}`;
    return matchesSearch && matchesInternship &&
      m.name?.toLowerCase().includes(studentColumnFilters.name.toLowerCase()) &&
      String(m.studentId || '').toLowerCase().includes(studentColumnFilters.id.toLowerCase()) &&
      startupName.toLowerCase().includes(studentColumnFilters.startup.toLowerCase()) &&
      (!studentColumnFilters.startupPosition || (m.studentType === 'STARTUP' && m.startupId && m.startupPosition === studentColumnFilters.startupPosition)) &&
      String(m.internshipStatus || 'Tidak Magang').toLowerCase().includes(studentColumnFilters.internship.toLowerCase()) &&
      `${m.workload?.activeLoad || 0} ${m.workload?.totalHistory || 0}`.includes(studentColumnFilters.workload.toLowerCase()) &&
      status.includes(studentColumnFilters.status.toLowerCase());
  });

  const filteredLecturers = lecturers.filter(m => {
    const matchesSearch = m.name?.toLowerCase().includes(lecturerSearch.toLowerCase()) || 
                         m.studentId?.toString().toLowerCase().includes(lecturerSearch.toLowerCase());
    const status = `${m.isActive ? 'active' : 'inactive'} ${m.isApproved ? 'approved' : 'unapproved'}`;
    return matchesSearch &&
      m.name?.toLowerCase().includes(lecturerColumnFilters.name.toLowerCase()) &&
      String(m.studentId || '').toLowerCase().includes(lecturerColumnFilters.id.toLowerCase()) &&
      String(m.lecturerCode || '').toLowerCase().includes(lecturerColumnFilters.jobDesk.toLowerCase()) &&
      String(m.supervisionCount || 0).includes(lecturerColumnFilters.supervision.toLowerCase()) &&
      `${m.workload?.activeLoad || 0} ${m.workload?.totalHistory || 0}`.includes(lecturerColumnFilters.workload.toLowerCase()) &&
      status.includes(lecturerColumnFilters.status.toLowerCase());
  });

  const pageSize = 10;
  const pagedStudents = filteredStudents.slice((studentPage - 1) * pageSize, studentPage * pageSize);
  const pagedLecturers = filteredLecturers.slice((lecturerPage - 1) * pageSize, lecturerPage * pageSize);
  const studentTotalPages = Math.ceil(filteredStudents.length / pageSize);
  const lecturerTotalPages = Math.ceil(filteredLecturers.length / pageSize);

  useEffect(() => { setStudentPage(1); }, [studentSearch, internshipFilter, studentColumnFilters]);
  useEffect(() => { setLecturerPage(1); }, [lecturerSearch, lecturerColumnFilters]);
  const memberDirectoryView = activeTab === 'STUDENT' ? 'students' : 'lecturers';
  const changeDirectoryTab = (tab: 'STUDENT' | 'LECTURER') => {
    if (tab === activeTab) return;
    setSelectedMemberKeys([]);
    setBulkAction('');
    setShowBulkEdit(false);
    setShowInternshipBulk(false);
    setInternshipBulkPreview(null);
    setActiveTab(tab);
  };

  const memberKey = (member: any) => `${member.role}:${member.studentId}`;
  
  const currentFiltered = activeTab === 'STUDENT' ? filteredStudents : filteredLecturers;
  const allVisibleSelected = currentFiltered.length > 0 && currentFiltered.every(member => selectedMemberKeys.includes(memberKey(member)));

  const toggleMemberSelection = (member: any) => {
    const key = memberKey(member);
    setSelectedMemberKeys(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);
  };

  const toggleVisibleSelection = () => {
    const visibleKeys = currentFiltered.map(memberKey);
    setSelectedMemberKeys(current => allVisibleSelected
      ? current.filter(key => !visibleKeys.includes(key))
      : Array.from(new Set([...current, ...visibleKeys])));
  };

  const openBulkEdit = () => {
    setBulkEditData({ name: '', email: '', password: '', studentType: '', startupId: '', startupPosition: '', studentJobDesk: '', lecturerCode: '', lecturerJobDesks: '' });
    setShowBulkEdit(true);
  };

  const selectedStudentMembers = () => students
    .filter(member => selectedMemberKeys.includes(memberKey(member)));

  const openInternshipBulk = () => {
    const students = selectedStudentMembers();
    if (!students.length || students.length !== selectedMemberKeys.length) {
      onShowAlert('Aksi Magang', 'Pilih mahasiswa saja. Lecturer tidak dapat diproses dengan aksi magang.', 'error');
      return;
    }
    setShowInternshipBulk(true);
  };

  const prepareInternshipBulkPreview = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!internshipBulkDraft.startupId || !internshipBulkDraft.startDate || !internshipBulkDraft.endDate) {
      onShowAlert('Data Magang', 'Startup, tanggal mulai, dan tanggal selesai wajib diisi.', 'error');
      return;
    }
    setInternshipBulkPreview(selectedStudentMembers().map(member => ({
      role: member.role, studentNim: member.studentId,
      studentName: member.name,
      ...internshipBulkDraft
    })));
  };

  const commitInternshipBulk = async () => {
    if (!internshipBulkPreview) return;
    setIsBulkProcessing(true);
    const result = await api.postData('manageInternshipsBulk', { operation: 'create', internships: internshipBulkPreview });
    setIsBulkProcessing(false);
    if (result?.status === 'success') {
      setShowInternshipBulk(false);
      setInternshipBulkPreview(null);
      setSelectedMemberKeys([]);
      await fetchMembers();
      onShowAlert('Magang Berhasil', `${result.affected || 0} data magang berhasil dibuat.`, 'success');
    } else onShowAlert('Magang Gagal', result?.message || 'Data magang gagal disimpan.', 'error');
  };

  const handleBulkAction = async () => {
    if (!bulkAction || isBulkProcessing) return;
    if (memberDirectoryView !== 'students' && ['assignInternship', 'internshipStatus', 'completeInternship', 'removeInternship'].includes(bulkAction)) return;
    const selectedMembers = (activeTab === 'STUDENT' ? students : lecturers)
      .filter(member => selectedMemberKeys.includes(memberKey(member)))
      .map(member => ({ role: member.role, id: member.studentId }));
    if (!selectedMembers.length) return;
    if (['assignInternship', 'internshipStatus', 'completeInternship', 'removeInternship'].includes(bulkAction)) {
      if (bulkAction === 'assignInternship') {
        openInternshipBulk();
        return;
      }
      const students = selectedStudentMembers();
      if (students.length !== selectedMembers.length) {
        onShowAlert('Aksi Magang', 'Pilih mahasiswa saja. Lecturer tidak dapat diproses dengan aksi magang.', 'error');
        return;
      }
      if (bulkAction === 'internshipStatus') {
        const nextStatus = window.prompt('Masukkan status: PLANNED, ONGOING, COMPLETED, atau CANCELLED', 'ONGOING')?.toUpperCase();
        if (!nextStatus) return;
        if (!['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(nextStatus)) {
          onShowAlert('Aksi Magang', 'Status magang tidak valid.', 'error');
          return;
        }
        setInternshipBulkStatus(nextStatus as typeof internshipBulkStatus);
        const rows = students.map(member => ({ role: member.role, studentNim: member.studentId, status: nextStatus }));
        showConfirm('Konfirmasi Aksi Magang', `Ubah status ${students.length} data magang?`, async () => {
          setIsBulkProcessing(true);
          const result = await api.postData('manageInternshipsBulk', { operation: 'status', internships: rows });
          setIsBulkProcessing(false);
          if (result?.status === 'success') { setSelectedMemberKeys([]); await fetchMembers(); onShowAlert('Aksi Berhasil', 'Status magang berhasil diperbarui.', 'success'); }
          else onShowAlert('Aksi Gagal', result?.message || 'Status magang gagal diproses.', 'error');
        });
        return;
      }
      const operation = bulkAction === 'removeInternship' ? 'delete' : 'status';
      const rows = students.map(member => ({ role: member.role, studentNim: member.studentId, status: 'COMPLETED' }));
      showConfirm('Konfirmasi Aksi Magang', `Proses ${students.length} data magang?`, async () => {
        setIsBulkProcessing(true);
        const result = await api.postData('manageInternshipsBulk', { operation, internships: rows });
        setIsBulkProcessing(false);
        if (result?.status === 'success') { setSelectedMemberKeys([]); await fetchMembers(); onShowAlert('Aksi Berhasil', 'Data magang berhasil diperbarui.', 'success'); }
        else onShowAlert('Aksi Gagal', result?.message || 'Data magang gagal diproses.', 'error');
      });
      return;
    }
    if (bulkAction === 'edit') {
      openBulkEdit();
      return;
    }
    const actionLabel = {
      approve: 'menyetujui',
      unapprove: 'membatalkan persetujuan',
      activate: 'mengaktifkan',
      deactivate: 'menonaktifkan',
      delete: 'menghapus'
    }[bulkAction];
    showConfirm('Konfirmasi Bulk Action', `Anda akan ${actionLabel} ${selectedMembers.length} member. Lanjutkan?`, async () => {
      setIsBulkProcessing(true);
      const result = await api.postData('bulkManageMembers', { bulkAction, members: selectedMembers });
      setIsBulkProcessing(false);
      if (result?.status === 'success') {
        setSelectedMemberKeys([]);
        onShowAlert('Bulk Action Berhasil', `${result.affected || 0} member berhasil diproses.`, 'success');
        await fetchMembers();
      } else {
        onShowAlert('Bulk Action Gagal', result?.message || 'Aksi bulk tidak dapat diproses.', 'error');
      }
    });
  };

  const submitBulkEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedMembers = (activeTab === 'STUDENT' ? students : lecturers)
      .filter(member => selectedMemberKeys.includes(memberKey(member)))
      .map(member => ({ role: member.role, id: member.studentId }));
    const data: Record<string, string> = {};
    Object.entries(bulkEditData).forEach(([key, value]) => {
      if (typeof value === 'string' && value.trim() !== '') data[key] = value.trim();
    });
    if (!selectedMembers.length || !Object.keys(data).length) {
      onShowAlert('Bulk Edit', 'Pilih minimal satu member dan satu field yang akan diubah.', 'error');
      return;
    }
    setIsBulkProcessing(true);
    const result = await api.postData('bulkManageMembers', { bulkAction: 'edit', members: selectedMembers, data });
    setIsBulkProcessing(false);
    if (result?.status === 'success') {
      setShowBulkEdit(false);
      setSelectedMemberKeys([]);
      setBulkEditData({ name: '', email: '', password: '', studentType: '', startupId: '', startupPosition: '', studentJobDesk: '', lecturerCode: '', lecturerJobDesks: '' });
      onShowAlert('Bulk Edit Berhasil', `${result.affected || 0} member berhasil diperbarui.`, 'success');
      await fetchMembers();
    } else {
      onShowAlert('Bulk Edit Gagal', result?.message || 'Detail member tidak dapat diperbarui.', 'error');
    }
  };

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessingAdd(true);
    const fd = new FormData(e.currentTarget);
    const data = {
      role: newUserRole,
      id: fd.get('id'),
      name: fd.get('name'),
      password: fd.get('password'),
      lecturerCode: fd.get('lecturerCode'),
      studentType: newUserRole === UserRole.STUDENT ? newStudentType : undefined,
      startupId: newUserRole === UserRole.STUDENT && newStudentType === 'STARTUP' ? newStartupId : null,
      ...(newUserRole === UserRole.STUDENT ? { startupPosition: newStudentType === 'STARTUP' ? newStartupPosition : null } : {}),
      studentJobDesk: newUserRole === UserRole.STUDENT ? fd.get('studentJobDesk') : ''
    };

    const res = await api.postData('register', data);
    if(res?.status === 'success') {
      onShowAlert('User Registered', 'User baru telah berhasil diindeks ke mainframe database.', 'success');
      setShowAddMember(false);
      fetchMembers();
    } else {
      onShowAlert('Registry Error', res?.message || 'Gagal mendaftarkan user.', 'error');
    }
    setIsProcessingAdd(false);
  };

  const handleStartupAction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessingStartup(true);
    const fd = new FormData(e.currentTarget);
    
    let logoUrl = startupLogoPreview || showStartupModal.item?.logoUrl || '';
    if (startupLogoPreview && startupLogoPreview.startsWith('data:')) {
       const uploadRes = await api.postData('uploadFile', { 
         data: startupLogoPreview.split(',')[1], 
         fileName: `logo-startup-${Date.now()}.png`, 
         mimeType: startupLogoPreview.match(/^data:([^;]+);/)?.[1] || 'image/png',
         folderType: 'asetweb'
       });
       if (uploadRes?.status === 'success') logoUrl = uploadRes.url;
       else { onShowAlert('Upload gagal', uploadRes?.message || 'Logo belum tersimpan.', 'error'); setIsProcessingStartup(false); return; }
    }

    const payload = {
      ...showStartupModal.item,
      name: fd.get('name'),
      website: fd.get('website'),
      ig: fd.get('ig'),
      logoUrl: logoUrl
    };

    const res = await api.postData('manageStartup', { 
      type: showStartupModal.mode, 
      id: showStartupModal.item?.id, 
      data: payload 
    });

    if(res?.status === 'success') {
      onShowAlert('Startup Synced', `Data startup berhasil disinkronkan.`, 'success');
      setShowStartupModal({ isOpen: false, mode: 'add' });
      setStartupLogoPreview(null);
      onRefresh?.();
    }
    setIsProcessingStartup(false);
  };

  const handleUpdateIdentity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    const isS = editingIdentity.role === UserRole.STUDENT;
    const data: any = {
      name: fd.get('name'),
      password: fd.get('password') || undefined, 
    };

    if (isS) {
      data.studentType = fd.get('studentType');
      data.startupId = editingIdentity.studentType === 'STARTUP' ? editingIdentity.startupId : null;
      data.startupPosition = editingIdentity.studentType === 'STARTUP' ? editingIdentity.startupPosition : null;
      data.studentJobDesk = fd.get('studentJobDesk');
    } else {
      data.lecturerCode = fd.get('lecturerCode');
    }

    const res = await api.postData('manageMember', { 
      type: 'updateIdentity', 
      targetId: editingIdentity.studentId, 
      role: editingIdentity.role,
      data
    });

    if(res?.status === 'success') {
      onShowAlert('Identity Synchronized', 'Identitas user telah diperbarui.', 'success');
      setEditingIdentity(null);
      fetchMembers();
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Management User</h2>
          <div className="flex flex-wrap gap-4 mt-6">
            <button onClick={() => setActiveView('members')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'members' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100'}`}>User Directory</button>
            <button onClick={() => setActiveView('startups')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'startups' ? 'bg-orange-600 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100'}`}>Startup Cluster</button>
            {userRole === UserRole.ADMIN && <button onClick={() => setActiveView('internships')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'internships' ? 'bg-orange-600 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100'}`}>Kelola Magang</button>}
            {userRole === UserRole.ADMIN && <button onClick={() => setActiveView('workloads')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'workloads' ? 'bg-indigo-600 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100'}`}>Kelola Workload</button>}
          </div>
        </div>
        
        {(activeView === 'members' || activeView === 'startups') && <div className="flex flex-wrap gap-4 items-center">
          <button 
            onClick={handleRefresh}
            className="p-3.5 bg-white border border-slate-100 text-slate-400 hover:text-orange-600 rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95 group"
            title="Sync Node"
          >
            <RefreshCw size={20} className={isSyncing ? 'animate-spin text-orange-600' : 'group-hover:rotate-180 transition-transform duration-500'} />
          </button>
          <div className="flex gap-3">
            
            {activeView === 'members' && activeTab === 'STUDENT' && (
              <select value={internshipFilter} onChange={e => setInternshipFilter(e.target.value as typeof internshipFilter)} className="px-5 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none font-bold text-xs focus:ring-4 focus:ring-orange-100">
                <option value="ALL">Semua Status Magang</option>
                <option value="NONE">Tidak Magang</option>
                <option value="PLANNED">Akan Magang</option>
                <option value="ONGOING">Sedang Magang</option>
                <option value="COMPLETED">Selesai</option>
                <option value="CANCELLED">Dibatalkan</option>
              </select>
            )}

            {showBulkEdit && (
              <div className="fixed inset-0 z-[185] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
                <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 lg:p-10 my-auto">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">Bulk Edit Detail User</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{selectedMemberKeys.length} member dipilih · field kosong tidak diubah</p>
                    </div>
                    <button type="button" onClick={() => setShowBulkEdit(false)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500"><X size={24} /></button>
                  </div>
                  <form onSubmit={submitBulkEdit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input value={bulkEditData.name} onChange={e => setBulkEditData({ ...bulkEditData, name: e.target.value })} placeholder="Nama baru (opsional)" className="px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                      <input type="email" value={bulkEditData.email} onChange={e => setBulkEditData({ ...bulkEditData, email: e.target.value })} placeholder="Email baru (opsional)" className="px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                      <input type="password" value={bulkEditData.password} onChange={e => setBulkEditData({ ...bulkEditData, password: e.target.value })} placeholder="Password baru (opsional)" className="px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                      <input value={bulkEditData.lecturerCode} onChange={e => setBulkEditData({ ...bulkEditData, lecturerCode: e.target.value })} placeholder="Kode dosen (dosen)" className="px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                      <select value={bulkEditData.studentType} onChange={e => setBulkEditData({ ...bulkEditData, studentType: e.target.value })} className="px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none">
                        <option value="">Ecosystem Routing (tidak diubah)</option>
                        <option value="STARTUP">STARTUP</option>
                        <option value="NON_STARTUP">NON_STARTUP</option>
                      </select>
                      <select value={bulkEditData.startupId} onChange={e => setBulkEditData({ ...bulkEditData, startupId: e.target.value })} className="px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none">
                        <option value="">Pertahankan startup masing-masing</option>
                        {startups.map(startup => <option key={startup.id} value={startup.id}>{startup.name} ({startup.id})</option>)}
                      </select>
                      {activeTab === 'STUDENT' && <select aria-label="Tetapkan Posisi Startup" value={bulkEditData.startupPosition} onChange={e => setBulkEditData({ ...bulkEditData, startupPosition: e.target.value })} className="px-5 py-4 bg-slate-50 rounded-2xl font-bold"><option value="">Pertahankan posisi</option><option value="MEMBER">Tetapkan Posisi Startup: Anggota</option></select>}
                      <input value={bulkEditData.studentJobDesk} onChange={e => setBulkEditData({ ...bulkEditData, studentJobDesk: e.target.value })} placeholder="Job desk mahasiswa" className="px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                      <input value={bulkEditData.lecturerJobDesks} onChange={e => setBulkEditData({ ...bulkEditData, lecturerJobDesks: e.target.value })} placeholder="Job desk dosen, pisahkan koma" className="px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                    </div>
                    <p className="text-xs text-slate-500 font-bold">Field yang tidak relevan dengan role member akan diabaikan. Password akan di-hash oleh backend.</p>
                    <button type="submit" disabled={isBulkProcessing} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50">
                      {isBulkProcessing ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Simpan Bulk Edit
                    </button>
                  </form>
                </div>
              </div>
            )}

            {showInternshipBulk && (
              <div className="fixed inset-0 z-[190] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
                <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl p-8 lg:p-10 my-auto max-h-[92vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-8">
                    <div><h3 className="text-3xl font-black text-slate-900 tracking-tight">Tambah Magang Massal</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{selectedStudentMembers().length} mahasiswa dipilih</p></div>
                    <button type="button" onClick={() => { setShowInternshipBulk(false); setInternshipBulkPreview(null); }} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500"><X size={24} /></button>
                  </div>
                  {!internshipBulkPreview ? (
                    <form onSubmit={prepareInternshipBulkPreview} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select required value={internshipBulkDraft.startupId} onChange={e => setInternshipBulkDraft({ ...internshipBulkDraft, startupId: e.target.value })} className="px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none"><option value="">Startup tempat magang *</option>{startups.map(startup => <option key={startup.id} value={startup.id}>{startup.name}</option>)}</select>
                        <select value={internshipBulkDraft.academicSupervisorNip} onChange={e => setInternshipBulkDraft({ ...internshipBulkDraft, academicSupervisorNip: e.target.value })} className="px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none"><option value="">Pembimbing akademik 1</option>{lecturers.map(lecturer => <option key={lecturer.studentId} value={lecturer.studentId}>{lecturer.name} — {lecturer.studentId}</option>)}</select>
                        <select value={internshipBulkDraft.academicSupervisor2Nip} onChange={e => setInternshipBulkDraft({ ...internshipBulkDraft, academicSupervisor2Nip: e.target.value })} className="px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none"><option value="">Pembimbing akademik 2 (opsional)</option>{lecturers.map(lecturer => <option key={lecturer.studentId} value={lecturer.studentId}>{lecturer.name} — {lecturer.studentId}</option>)}</select>
                        <input required type="date" value={internshipBulkDraft.startDate} onChange={e => setInternshipBulkDraft({ ...internshipBulkDraft, startDate: e.target.value })} className="px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                        <input required type="date" value={internshipBulkDraft.endDate} min={internshipBulkDraft.startDate} onChange={e => setInternshipBulkDraft({ ...internshipBulkDraft, endDate: e.target.value })} className="px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                        <input value={internshipBulkDraft.fieldSupervisor} onChange={e => setInternshipBulkDraft({ ...internshipBulkDraft, fieldSupervisor: e.target.value })} placeholder="Pembimbing lapangan" className="px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                        <select value={internshipBulkDraft.status} onChange={e => setInternshipBulkDraft({ ...internshipBulkDraft, status: e.target.value as typeof internshipBulkDraft.status })} className="px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none"><option value="PLANNED">Akan Magang</option><option value="ONGOING">Sedang Magang</option><option value="COMPLETED">Selesai</option><option value="CANCELLED">Dibatalkan</option></select>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-5 space-y-2 max-h-48 overflow-auto">{selectedStudentMembers().map(member => <div key={member.studentId} className="font-bold text-sm text-slate-700">✓ {member.name} <span className="font-mono text-xs text-slate-400">{member.studentId}</span></div>)}</div>
                      <button type="submit" className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest">Lanjut Preview</button>
                    </form>
                  ) : (
                    <div className="space-y-5">
                      <div className="overflow-auto rounded-2xl border border-slate-100"><table className="w-full text-left text-xs"><thead className="bg-slate-50"><tr><th className="p-3">Mahasiswa</th><th className="p-3">Startup</th><th className="p-3">Periode</th><th className="p-3">Status</th></tr></thead><tbody>{internshipBulkPreview.map(row => <tr key={row.studentNim} className="border-t border-slate-100"><td className="p-3 font-bold">{row.studentName}<div className="font-mono text-slate-400">{row.studentNim}</div></td><td className="p-3">{startups.find(startup => startup.id === row.startupId)?.name || row.startupId}</td><td className="p-3">{row.startDate} s/d {row.endDate}</td><td className="p-3">{row.status}</td></tr>)}</tbody></table></div>
                      <div className="flex gap-3"><button type="button" onClick={() => setInternshipBulkPreview(null)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black uppercase tracking-widest">Kembali</button><button type="button" disabled={isBulkProcessing} onClick={commitInternshipBulk} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest disabled:opacity-50">{isBulkProcessing ? 'Menyimpan...' : `Simpan ${internshipBulkPreview.length} Data Magang`}</button></div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="relative w-full md:w-64 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Cari nama / NIM/NIP..." value={activeTab === 'STUDENT' ? studentSearch : lecturerSearch} onChange={e => activeTab === 'STUDENT' ? setStudentSearch(e.target.value) : setLecturerSearch(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none font-bold focus:ring-4 focus:ring-orange-100 transition-all" />
            </div>
          </div>

          {activeView === 'members' ? (
            <button onClick={() => { setNewStudentType('NON_STARTUP'); setNewStartupId(''); setNewStartupPosition(null); setShowAddMember(true); }} className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-black transition-all active:scale-95"><UserPlus size={18}/> New User</button>
          ) : (
            <button onClick={() => { setStartupLogoPreview(null); setShowStartupModal({ isOpen: true, mode: 'add' }); }} className="px-6 py-4 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-orange-700 transition-all active:scale-95"><Rocket size={18}/> New Startup</button>
          )}
        </div>}
      </div>

      {activeView === 'internships' ? (userRole === UserRole.ADMIN && <InternshipManagement onShowAlert={onShowAlert} showConfirm={showConfirm} />) : activeView === 'workloads' ? (userRole === UserRole.ADMIN && <WorkloadManagement onShowAlert={onShowAlert} showConfirm={showConfirm} />) : <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]"> 
        {activeView === 'members' ? (
          <>
          <div className="px-10 pt-8 flex flex-wrap gap-3 items-center">
            <button onClick={() => { setTransferMode('import'); setTransferRole(activeTab); }} className="px-5 py-3 bg-orange-50 text-orange-700 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-orange-100"><Upload size={16} /> Import Data</button>
            <button onClick={() => { setTransferMode('export'); setTransferRole(activeTab); setTransferFormat('xlsx'); }} className="px-5 py-3 bg-emerald-50 text-emerald-700 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-100"><Download size={16} /> Export Data</button>
            <select aria-label="Pilih aksi bulk" value={bulkAction} onChange={e => setBulkAction(e.target.value as BulkAction | '')} disabled={!selectedMemberKeys.length || isBulkProcessing} className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest outline-none disabled:opacity-50">
              <option value="" disabled>PILIH AKSI...</option>
              <option value="activate">Aktifkan</option>
              <option value="deactivate">Nonaktifkan</option>
              <option value="approve">Setujui</option>
              <option value="unapprove">Batalkan Persetujuan</option>
              <option value="edit">Edit Detail</option>
              {memberDirectoryView === 'students' && <>
              <option value="assignInternship">Tetapkan Magang</option>
              <option value="internshipStatus">Ubah Status Magang</option>
              <option value="completeInternship">Selesaikan Magang</option>
              <option value="removeInternship">Hapus dari Magang</option>
              </>}
              <option value="delete">Hapus</option>
            </select>
            <button onClick={handleBulkAction} disabled={!bulkAction || !selectedMemberKeys.length || isBulkProcessing} className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"><ListChecks size={16} /> {isBulkProcessing ? 'Processing...' : `Bulk Action (${selectedMemberKeys.length})`}</button>
            <button type="button" onClick={openBulkEdit} disabled={!selectedMemberKeys.length || isBulkProcessing} className="px-5 py-3 bg-indigo-50 text-indigo-700 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"><Edit3 size={16} /> Edit Detail Terpilih</button>
          </div>
          
          <div className="px-10 pt-4 flex gap-2 border-b border-slate-100 mb-4">
             <button onClick={() => changeDirectoryTab('STUDENT')} className={`px-6 py-3 rounded-t-2xl font-black text-xs transition-all ${activeTab === 'STUDENT' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>MAHASISWA {students.length}</button>
             <button onClick={() => changeDirectoryTab('LECTURER')} className={`px-6 py-3 rounded-t-2xl font-black text-xs transition-all ${activeTab === 'LECTURER' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>DOSEN {lecturers.length}</button>
          </div>
          {activeTab === 'STUDENT' && <button type="button" onClick={() => { setStudentColumnFilters({ name: '', id: '', startup: '', startupPosition: '', internship: '', workload: '', status: '' }); setStudentSearch(''); setInternshipFilter('ALL'); }} className="mx-6 my-3 text-xs font-bold text-slate-500">Reset filter mahasiswa</button>}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-6 text-left"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleSelection} aria-label="Pilih semua" className="h-4 w-4 accent-orange-600" /></th>
                  <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeTab === 'STUDENT' ? 'NIM' : 'NIP'}</th>
                  {activeTab === 'LECTURER' && <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">KODE DOSEN</th>}
                  {activeTab === 'STUDENT' && <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Startup</th>}
                  <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeTab === 'STUDENT' ? 'POSISI STARTUP' : 'Job Desk'}</th>
                  {activeTab === 'STUDENT' && <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Magang</th>}
                  {activeTab === 'LECTURER' && <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Bimbingan</th>}
                  <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Workload</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Operations</th>
                </tr>
                <tr className="bg-white border-b border-slate-100">
                  <th className="px-6 py-3"></th>
                  {activeTab === 'STUDENT' ? (
                    <>
                      {[['name', 'Filter nama'], ['id', 'Filter NIM'], ['startup', 'Filter startup'], ['startupPosition', 'Posisi Startup'], ['internship', 'Filter magang'], ['workload', 'Filter workload'], ['status', 'Filter status']].map(([key, placeholder]) => <th key={key} className="px-10 py-3">{key === 'startupPosition' ? <select aria-label="Posisi Startup" value={studentColumnFilters.startupPosition} onChange={e => setStudentColumnFilters(filters => ({ ...filters, startupPosition: e.target.value }))} className="px-3 py-2 rounded-xl bg-slate-50 text-xs font-bold"><option value="">Semua Posisi</option>{STARTUP_POSITIONS.map(p => <option key={p} value={p}>{STARTUP_POSITION_LABELS[p]}</option>)}</select> : <input aria-label={placeholder} placeholder="Filter..." value={(studentColumnFilters as any)[key]} onChange={e => setStudentColumnFilters(filters => ({ ...filters, [key]: e.target.value }))} className="w-full min-w-[90px] px-3 py-2 rounded-xl bg-slate-50 text-xs font-bold outline-none" />}</th>)}
                    </>
                  ) : (
                    <>
                      {[['name', 'Filter nama'], ['id', 'Filter NIP'], ['jobDesk', 'Filter kode/job'], ['supervision', 'Filter bimbingan'], ['workload', 'Filter workload'], ['status', 'Filter status']].map(([key, placeholder]) => <th key={key} className="px-10 py-3"><input placeholder="Filter..." value={(lecturerColumnFilters as any)[key]} onChange={e => setLecturerColumnFilters(filters => ({ ...filters, [key]: e.target.value }))} className="w-full min-w-[90px] px-3 py-2 rounded-xl bg-slate-50 text-xs font-bold outline-none" /></th>)}
                    </>
                  )}
                  <th className="px-10 py-3"></th>
                </tr>
              </thead>

              
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={10} className="py-32 text-center text-[10px] font-black uppercase text-slate-300 animate-pulse tracking-[0.3em]">Accessing Identity Mainframe...</td></tr>
                ) : currentFiltered.length === 0 ? (
                  <tr><td colSpan={10} className="py-32 text-center text-[10px] font-black uppercase text-slate-300 tracking-[0.3em]">Belum ada data {activeTab === 'STUDENT' ? 'mahasiswa' : 'dosen'}.</td></tr>
                ) : (activeTab === 'STUDENT' ? pagedStudents : pagedLecturers).map(m => {
                  const isAccountActive = m.isActive && m.isApproved;
                  const startupName = startups.find(s => s.id === m.startupId)?.name || 'Global Registry';
                  return (
                    <tr key={m.studentId} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-6"><input type="checkbox" checked={selectedMemberKeys.includes(memberKey(m))} onChange={() => toggleMemberSelection(m)} aria-label={`Pilih ${m.name}`} className="h-4 w-4 accent-orange-600" /></td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-[11px] text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500 shadow-sm">{m.name ? m.name[0] : '?'}</div>
                           <div className="flex flex-col">
                              <span className="font-black text-slate-900 tracking-tight leading-none">{m.name}</span>
                              <span className="text-[8px] font-bold text-orange-600 uppercase tracking-widest mt-1">{m.role}</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest font-mono">{m.studentId}</td>
                      {activeTab === 'LECTURER' && <td className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">{m.lecturerCode || '-'}</td>}
                      {activeTab === 'STUDENT' && <td className="px-10 py-6">
                         <span className={`text-[10px] font-black uppercase tracking-tight ${m.studentType === 'STARTUP' ? 'text-indigo-600' : 'text-slate-300'}`}>
                           {m.studentType === 'STARTUP' ? startupName : 'NON-STARTUP'}
                         </span>
                      </td>}
                      <td className="px-10 py-6 text-[11px] font-bold text-slate-500">{activeTab === 'STUDENT' ? (<span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black uppercase">{startupPositionLabel(m.studentType === 'STARTUP' && m.startupId ? m.startupPosition : null)}</span>) : (Array.isArray(m.lecturerJobDesks) ? m.lecturerJobDesks.join(', ') : '-')}</td>
                      {activeTab === 'STUDENT' && <td className="px-10 py-6">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest inline-flex border ${m.internshipStatus === 'ONGOING' ? 'bg-orange-50 text-orange-600 border-orange-100' : m.internshipStatus === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : m.internshipStatus === 'PLANNED' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                          {m.internshipStatus || 'Tidak Magang'}
                        </span>
                      </td>}
                      {activeTab === 'LECTURER' && <td className="px-10 py-6">
                        <span className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100">{m.supervisionCount || 0} Mahasiswa</span>
                      </td>}
                      <td className="px-10 py-6"><span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest inline-flex border ${Number(m.workload?.activeLoad || 0) >= 3 ? 'bg-red-50 text-red-600 border-red-100' : Number(m.workload?.activeLoad || 0) === 2 ? 'bg-amber-50 text-amber-600 border-amber-100' : Number(m.workload?.activeLoad || 0) === 1 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{m.workload?.activeLoad || 0} · {Number(m.workload?.activeLoad || 0) >= 3 ? 'TINGGI' : Number(m.workload?.activeLoad || 0) === 2 ? 'SEDANG' : Number(m.workload?.activeLoad || 0) === 1 ? 'RINGAN' : 'KOSONG'}</span></td>
                      <td className="px-10 py-6">
                         <span className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isAccountActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {isAccountActive ? <CheckCircle2 size={14}/> : <Lock size={14}/>}
                            {m.isActive ? 'Active' : 'Inactive'} · {m.isApproved ? 'Approved' : 'Pending'}
                         </span>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button aria-label={`Edit ${m.name}`} onClick={() => { setEditingIdentity(m); }} className="p-2.5 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-xl transition-colors text-slate-400"><Edit3 size={16} /></button>
                          {userRole === UserRole.ADMIN && <button onClick={() => { setEditingQuota(m); }} className="p-2.5 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-xl transition-colors text-slate-400"><HardDrive size={16} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
          <div className="px-10 py-6 border-t border-slate-100 flex justify-end">
             <TablePagination page={activeTab === 'STUDENT' ? studentPage : lecturerPage} totalPages={activeTab === 'STUDENT' ? studentTotalPages : lecturerTotalPages} totalRows={currentFiltered.length} pageSize={pageSize} onPageChange={activeTab === 'STUDENT' ? setStudentPage : setLecturerPage} />
          </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-10 gap-8">
            {startups.map(s => (
              <div key={s.id} className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 hover:bg-white hover:shadow-2xl transition-all group">
                 <div className="flex items-start justify-between mb-8">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm overflow-hidden text-orange-600 group-hover:bg-slate-900 group-hover:text-white transition-all border border-slate-100">
                       {s.logoUrl ? <img src={s.logoUrl} className="w-full h-full object-contain p-2" /> : <Rocket size={40} />}
                    </div>
                    <span className="text-[11px] font-black text-slate-900 uppercase">{s.id}</span>
                 </div>
                 <h4 className="text-2xl font-black text-slate-900 tracking-tighter mb-2 leading-tight">{s.name}</h4>
                 <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">
                    <Users size={14} className="text-orange-600" /> {students.filter(m => m.studentType === 'STARTUP' && m.startupId === s.id).length} Members
                 </div>
                 <details className="mb-6"><summary className="cursor-pointer font-bold text-sm">Struktur Tim</summary><div className="mt-4 space-y-4">{STARTUP_POSITIONS.map(position => <section key={position}><h5 className="text-xs font-black uppercase text-slate-500">{STARTUP_POSITION_LABELS[position]}</h5><ul className="mt-1 text-sm text-slate-800">{students.filter(m => m.studentType === 'STARTUP' && m.startupId === s.id && m.startupPosition === position).map(m => <li key={m.studentId}>{m.name}</li>)}{!students.some(m => m.studentType === 'STARTUP' && m.startupId === s.id && m.startupPosition === position) && <li className="text-slate-400">Belum diisi</li>}</ul></section>)}</div></details>
                 <div className="flex gap-2">
                    <button onClick={() => { setStartupLogoPreview(s.logoUrl || null); setShowStartupModal({ isOpen: true, mode: 'edit', item: s }); }} className="flex-1 py-3.5 bg-white text-slate-900 border border-slate-200 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm">Edit</button>
                    <button onClick={() => {
                       showConfirm('Purge Startup?', `Hapus tim "${s.name}"?`, async () => {
                          await api.postData('manageStartup', { type: 'delete', id: s.id });
                          onRefresh?.();
                       });
                    }} className="p-3.5 bg-red-50 text-red-400 hover:bg-red-600 hover:text-white rounded-xl transition-all active:scale-95 shadow-sm"><Trash2 size={16} /></button>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>}

      {showAddMember && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300 my-auto">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">Add New HUB Member</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry Initial Protocol V7.3</p>
                </div>
                <button onClick={() => setShowAddMember(false)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 transition-all"><X size={24} /></button>
             </div>
             
             <div className="p-1.5 bg-slate-50 rounded-[1.5rem] flex gap-2 mb-8">
                <button type="button" onClick={() => setNewUserRole(UserRole.STUDENT)} className={`flex-1 py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest ${newUserRole === UserRole.STUDENT ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>Mahasiswa</button>
                <button type="button" onClick={() => setNewUserRole(UserRole.LECTURER)} className={`flex-1 py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest ${newUserRole === UserRole.LECTURER ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>Dosen</button>
              </div>

             <form onSubmit={handleAddMember} className="space-y-6">
                <div className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Name</label>
                        <input name="name" required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">{newUserRole === UserRole.STUDENT ? "NIM" : "NIP"}</label>
                        <input name="id" required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 transition-all" />
                      </div>
                   </div>

                   {newUserRole === UserRole.STUDENT && (
                     <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100/50 space-y-4">
                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-orange-600 uppercase ml-2">Student Ecosystem Tier</label>
                           <div className="flex bg-white p-1 rounded-xl shadow-sm border border-orange-100">
                              <button type="button" onClick={() => { setNewStudentType('STARTUP'); setNewStartupPosition('MEMBER'); }} className={`flex-1 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${newStudentType === 'STARTUP' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Rocket size={14}/> Startup</button>
                              <button type="button" onClick={() => { setNewStudentType('NON_STARTUP'); setNewStartupId(''); setNewStartupPosition(null); }} className={`flex-1 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${newStudentType === 'NON_STARTUP' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><User size={14}/> Non-Startup</button>
                           </div>
                        </div>

                        {newStudentType === 'STARTUP' && (
                          <div className="space-y-1 animate-in slide-in-from-top-2">
                             <label className="text-[9px] font-black text-orange-600 uppercase ml-2">Startup Cluster</label>
                             <select name="startupId" value={newStartupId} onChange={e => { setNewStartupId(e.target.value); setNewStartupPosition('MEMBER'); }} required className="w-full px-6 py-4 bg-white border border-orange-100 rounded-2xl font-bold outline-none">
                                <option value="">-- Pilih Tim --</option>
                                {startups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                             </select>
                          </div>
                        )}

                        {newStudentType === 'STARTUP' && <StartupPositionSelect value={newStartupPosition} onChange={setNewStartupPosition} />}
                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-orange-600 uppercase ml-2">Official JobDesk</label>
                           <select name="studentJobDesk" className="w-full px-6 py-4 bg-white border border-orange-100 rounded-2xl font-bold outline-none appearance-none">
                              <option value="Non Jobdesk">Member Biasa</option>
                              <option value="Asisten Lab">Asisten Lab (ASLAB)</option>
                              <option value="PIC Lab">PIC Lab (PIC)</option>
                           </select>
                        </div>
                     </div>
                   )}

                   {newUserRole === UserRole.LECTURER && (
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Faculty Identifier (ASD)</label>
                        <input name="lecturerCode" required placeholder="e.g. ASD" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 transition-all" />
                     </div>
                   )}

                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Mainframe Security Token (Password)</label>
                      <input name="password" type="password" placeholder="Kosongkan untuk default password" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-orange-100 transition-all" />
                   </div>
                </div>
                <button type="submit" disabled={isProcessingAdd} className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-black mt-4">
                  {isProcessingAdd ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />} 
                  Registry Identity Mainframe
                </button>
             </form>
          </div>
        </div>
      )}

      {editingIdentity && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300 my-auto max-h-[90vh] overflow-y-auto scrollbar-hide">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-5">
                   <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl"><ShieldAlert size={28} /></div>
                   <div className="flex flex-col">
                      <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{editingIdentity.role === UserRole.STUDENT ? 'Edit Detail Mahasiswa' : 'Identity Override'}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Authority Control Protocol V7.3</p>
                   </div>
                </div>
                <button onClick={() => setEditingIdentity(null)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 transition-all"><X size={24} /></button>
             </div>
             
             <form onSubmit={handleUpdateIdentity} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block px-2">Authorized Full Name</label>
                      <input name="name" defaultValue={editingIdentity.name} required className="w-full px-7 py-5 bg-slate-50 rounded-[1.8rem] font-bold outline-none focus:ring-4 focus:ring-orange-100/50 transition-all" />
                   </div>
                   
                   {editingIdentity.role === UserRole.STUDENT ? (
                     <>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase px-2">Ecosystem Routing</label>
                          <select name="studentType" value={editingIdentity.studentType || 'NON_STARTUP'} onChange={e => setEditingIdentity({ ...editingIdentity, studentType: e.target.value, startupId: null, startupPosition: e.target.value === 'STARTUP' ? 'MEMBER' : null })} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-orange-100/50">
                             <option value="NON_STARTUP">Non-Startup Member</option>
                             <option value="STARTUP">Startup Member</option>
                          </select>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase px-2">Startup Assignment</label>
                          <select name="startupId" required={editingIdentity.studentType === 'STARTUP'} disabled={editingIdentity.studentType !== 'STARTUP'} value={editingIdentity.startupId || ''} onChange={e => setEditingIdentity({ ...editingIdentity, startupId: e.target.value || null, startupPosition: 'MEMBER' })} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none">
                             <option value="">Pilih startup</option>
                             {startups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        {editingIdentity.studentType === 'STARTUP' && <StartupPositionSelect value={editingIdentity.startupPosition ?? 'MEMBER'} onChange={startupPosition => setEditingIdentity({ ...editingIdentity, startupPosition })} />}
                        <div className="md:col-span-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block px-2">Official JobDesk Assignment</label>
                           <input name="studentJobDesk" defaultValue={editingIdentity.studentJobDesk || ''} placeholder="Job Desk operasional" className="w-full px-7 py-5 bg-slate-50 rounded-[1.8rem] font-bold outline-none" />
                        </div>
                     </>
                   ) : (
                     <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block px-2">Lecturer Identifier Code</label>
                        <input name="lecturerCode" defaultValue={editingIdentity.lecturerCode} className="w-full px-7 py-5 bg-slate-50 rounded-[1.8rem] font-bold outline-none" />
                     </div>
                   )}

                   <div className="md:col-span-2">
                      <label className="text-[10px] font-black text-red-500 uppercase mb-3 block px-2 flex items-center gap-1.5"><Lock size={12}/> Security Override Token</label>
                      <input name="password" type="password" placeholder="Leave blank to maintain current" className="w-full px-7 py-5 bg-slate-50 border-l-8 border-red-500 rounded-[1.8rem] font-bold outline-none shadow-sm" />
                   </div>
                </div>
                
                <button type="submit" className="w-full py-7 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 transition-all hover:bg-black"><Save size={22} /> Commit Identity Overrides</button>
             </form>
          </div>
        </div>
      )}

      {editingQuota && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">Storage Cluster Control</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Binary Capacity Allocation</p>
                </div>
                <button onClick={() => setEditingQuota(null)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500"><X size={24} /></button>
             </div>
             
             <form onSubmit={async (e) => {
               e.preventDefault();
               const fd = new FormData(e.currentTarget);
               const qMB = Number(fd.get('q'));
               const mMB = Number(fd.get('m'));
               const res = await api.postData('updateMemberStorage', {
                 targetId: editingQuota.studentId, role: editingQuota.role,
                 customQuota: qMB * 1024 * 1024, customMaxUpload: mMB * 1024 * 1024
               });
               if(res?.status === 'success') {
                 onShowAlert('Storage Sync', 'Kebijakan penyimpanan diperbarui.', 'success');
                 setEditingQuota(null);
                 fetchMembers();
               }
             }} className="space-y-8">
                <div className="space-y-6">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block px-2">Total Disk Allocation (MB)</label>
                      <input name="q" type="number" defaultValue={(editingQuota.customQuota || 0) / (1024 * 1024)} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-blue-400 transition-all" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block px-2">Max Transfer Rate / File (MB)</label>
                      <input name="m" type="number" defaultValue={(editingQuota.customMaxUpload || 0) / (1024 * 1024)} className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border border-transparent focus:border-blue-400 transition-all" />
                   </div>
                </div>
                <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"><Save size={18} /> Sync Storage Policy</button>
             </form>
          </div>
        </div>
      )}

      {showStartupModal.isOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 lg:p-12 animate-in zoom-in-95 duration-300">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">{showStartupModal.mode === 'add' ? 'New Startup' : 'Startup Identity'}</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ecosystem Branding Terminal</p>
                </div>
                <button onClick={() => setShowStartupModal({ isOpen: false, mode: 'add' })} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500"><X size={24} /></button>
             </div>
             
             <form onSubmit={handleStartupAction} className="space-y-8">
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase px-2">Visual Branding (Sector: asetweb)</label>
                   <DropZone 
                     onFileSelect={(f) => {
                       const r = new FileReader();
                       r.onload = (ev) => setStartupLogoPreview(ev.target?.result as string);
                       r.readAsDataURL(f);
                     }}
                     currentValue={startupLogoPreview || undefined}
                     isImage
                     className="min-h-[140px]"
                   />
                </div>
                
                <div className="space-y-5">
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Team Identifier</label>
                     <input name="name" defaultValue={showStartupModal.item?.name} required placeholder="Startup Narrative Name" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none focus:border-orange-400" />
                   </div>
                   <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Official Website</label>
                        <input name="website" defaultValue={showStartupModal.item?.website} placeholder="HTTPS://" className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Social Hub</label>
                        <input name="ig" defaultValue={showStartupModal.item?.ig} placeholder="@Handle" className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none text-xs" />
                      </div>
                   </div>
                </div>
                
                <button type="submit" disabled={isProcessingStartup} className="w-full py-6 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all hover:bg-orange-700 mt-2">
                  {isProcessingStartup ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
                  {showStartupModal.mode === 'add' ? 'Deploy Startup' : 'Commit Changes'}
                </button>
             </form>
          </div>
        </div>
      )}

      {transferMode && (
        <div className="fixed inset-0 z-[180] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl p-8 lg:p-10 animate-in zoom-in-95 duration-300 my-auto max-h-[92vh] overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{transferMode === 'import' ? 'Import Data Member' : 'Export Data Member'}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Secure Admin Data Transfer</p>
              </div>
              <button onClick={closeTransfer} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Jenis Data</label>
                <select value={transferRole} onChange={e => setTransferRole(e.target.value as TransferRole)} disabled={importStep === 'preview' || importStep === 'result'} className="w-full mt-2 px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none">
                  <option value="STUDENT">Mahasiswa</option>
                  <option value="LECTURER">Dosen</option>
                </select>
              </div>
              {transferMode === 'export' ? (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Format</label>
                  <select value={transferFormat} onChange={e => setTransferFormat(e.target.value as TransferFormat)} className="w-full mt-2 px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none">
                    <option value="xlsx">Excel (.xlsx)</option>
                    <option value="pdf">PDF (.pdf)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Data Existing</label>
                  <select value={duplicateMode} onChange={e => setDuplicateMode(e.target.value as 'skip' | 'update')} disabled={importStep !== 'select'} className="w-full mt-2 px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none">
                    <option value="skip">Skip data existing</option>
                    <option value="update">Update data existing</option>
                  </select>
                </div>
              )}

            </div>

            {transferMode === 'export' ? (
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 text-sm font-bold text-emerald-800">
                  Export mengikuti pencarian aktif: <span className="font-black">{(activeTab === 'STUDENT' ? studentSearch : lecturerSearch) || 'Semua data'}</span>. Password dan hash password tidak pernah diekspor.
                </div>
                <button onClick={handleMemberExport} disabled={isTransferProcessing} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3">
                  {isTransferProcessing ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />} Download {transferFormat.toUpperCase()}
                </button>
              </div>
            ) : (
              <>
                {importStep === 'select' && (
                  <div className="space-y-6">
                    <div className="p-6 rounded-3xl bg-orange-50 border border-orange-100 text-sm font-bold text-orange-800">
                      Upload file maksimal 10 MB. Header dibaca berdasarkan nama kolom, bukan urutan. Kolom yang tidak dikenal akan diabaikan.
                    </div>
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={e => setImportFile(e.target.files?.[0] || null)} className="w-full px-5 py-5 bg-slate-50 rounded-2xl font-bold" />
                    <div className="flex flex-wrap gap-3">
                      <button onClick={handleTemplateDownload} disabled={isTransferProcessing} className="px-5 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2"><FileSpreadsheet size={16} /> Download Template</button>
                      <button onClick={handleImportPreview} disabled={!importFile || isTransferProcessing} className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50">{isTransferProcessing ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />} Parse & Preview</button>
                    </div>
                  </div>
                )}
                {importStep === 'preview' && importPreview && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        ['Total', importPreview.totalRows, 'bg-slate-50 text-slate-700'],
                        ['Valid', importPreview.rows.filter((row: any) => row.status === 'VALID').length, 'bg-emerald-50 text-emerald-700'],
                        ['Duplicate', importPreview.rows.filter((row: any) => row.status === 'DUPLICATE').length, 'bg-amber-50 text-amber-700'],
                        ['Invalid', importPreview.rows.filter((row: any) => row.status === 'INVALID').length, 'bg-red-50 text-red-700']
                      ].map(([label, value, style]) => <div key={String(label)} className={`p-4 rounded-2xl ${style}`}><div className="text-[9px] font-black uppercase tracking-widest">{label}</div><div className="text-2xl font-black">{String(value)}</div></div>)}
                    </div>
                    {importPreview.ignored?.length > 0 && <div className="text-xs font-bold text-slate-500">Ignored Column: {importPreview.ignored.join(', ')}</div>}
                    <div className="overflow-auto max-h-80 border border-slate-100 rounded-2xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 sticky top-0"><tr><th className="p-3">Baris</th><th className="p-3">Identifier</th><th className="p-3">Nama</th><th className="p-3">Status</th><th className="p-3">Alasan</th></tr></thead>
                        <tbody>{importPreview.rows.map((row: any) => <tr key={row.rowNumber} className="border-t border-slate-50"><td className="p-3">{row.rowNumber}</td><td className="p-3 font-mono">{row.identifier}</td><td className="p-3 font-bold">{row.name}</td><td className="p-3"><span className={`px-2 py-1 rounded-lg font-black ${row.status === 'VALID' ? 'bg-emerald-50 text-emerald-700' : row.status === 'DUPLICATE' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{row.status}</span></td><td className="p-3 text-red-600">{row.errors?.join('; ') || (row.status === 'DUPLICATE' ? `Existing (${duplicateMode})` : '-')}</td></tr>)}</tbody>
                      </table>
                    </div>
                    <div className="flex gap-3"><button onClick={() => setImportStep('select')} className="px-6 py-4 bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest">Back</button><button onClick={handleImportCommit} disabled={isTransferProcessing} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3">{isTransferProcessing ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} Confirm Import</button></div>
                  </div>
                )}
                {importStep === 'result' && importResult && (
                  <div className="space-y-6">
                    <div className="p-8 rounded-3xl bg-emerald-50 border border-emerald-100 text-center"><CheckCircle2 className="mx-auto text-emerald-600 mb-3" size={42} /><h4 className="text-2xl font-black text-emerald-800">Import Completed</h4></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[['Imported', importResult.imported], ['Updated', importResult.updated], ['Skipped', importResult.skipped], ['Failed', importResult.failed]].map(([label, value]) => <div key={String(label)} className="p-4 rounded-2xl bg-slate-50"><div className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</div><div className="text-2xl font-black text-slate-900">{String(value)}</div></div>)}</div>
                    {importResult.failures?.length > 0 && <div className="p-4 rounded-2xl bg-red-50 text-red-700 text-xs font-bold">{importResult.failures.map((failure: any) => <div key={`${failure.row_number}-${failure.identifier}`}>Row {failure.row_number}: {failure.error_message}</div>)}</div>}
                    <button onClick={closeTransfer} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest">Close</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberManagementView;
