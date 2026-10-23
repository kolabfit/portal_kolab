import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText, Award, Mail, BookOpen, Send, ClipboardSignature,
  Printer, Download, ZoomIn, ZoomOut, RotateCcw, RotateCw, ExternalLink,
  Plus, Trash2, Calendar, User, Building2, Search, ArrowLeft,
  Edit2, Image as ImageIcon, Upload, CheckCircle, GripVertical,
  Type, Hash, Table as TableIcon, Minus, PenTool, MoveVertical,
  Eye, EyeOff, Layers, Sliders, Layout as LayoutIcon, AlignLeft,
  AlignCenter, AlignRight, AlignJustify, Bold, Italic, Copy,
  RefreshCw, Loader2, Sparkles, AlertCircle, ChevronDown, ChevronUp,
  Maximize2, Minimize2, Check, Grid, Settings2
} from 'lucide-react';
import { UserRole, StartupTeam } from '../types';
import { api, API_BASE_URL } from '../api';
import DropZone from '../components/DropZone';
import {
  DocumentBlock,
  ElementType,
  getDefaultBlocksForType
} from './suratTemplateDefaults';


interface SuratAdministrasiViewProps {
  userRole: UserRole;
  startups: StartupTeam[];
  onShowAlert: (title: string, msg: string, type: 'success' | 'error') => void;
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void;
  /** Dipanggil true saat editor dibuka (mode fokus tanpa sidebar & header), false saat kembali ke galeri. */
  onFocusModeChange?: (focus: boolean) => void;
}

interface LetterTypeInfo {
  id: string;
  label: string;
  format: string;
  implemented: boolean;
  required: string[];
  manual: string[];
}

interface LetterMeta {
  lecturers: Array<{ nip: string; name: string; code?: string }>;
  students: Array<{ nim: string; name: string; startup_id?: string }>;
  events: Array<{ id: string; title: string; date?: string; time?: string; location_offline?: string }>;
  startups: Array<{ id: string; name: string }>;
}

const SURAT_DEFINITIONS = [
  {
    id: 'surat-keterangan',
    title: 'Surat Keterangan',
    subtitle: 'Penerimaan Magang Startup',
    description: 'Surat keterangan resmi penerimaan mahasiswa magang 2 semester pada skema startup binaan Research Alliance Ko+Lab.',
    icon: ClipboardSignature,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    isLandscape: false,
    paperFormat: 'A4 Portrait (210 × 297 mm)',
    templateFile: 'Surat Keterangan Penerimaan Magang Ko+Lab 2024.docx'
  },
  {
    id: 'surat-dispen',
    title: 'Surat Dispensasi',
    subtitle: 'Izin Kegiatan Mahasiswa',
    description: 'Surat izin dan dispensasi perkuliahan untuk mahasiswa yang mengikuti agenda intensif atau kompetisi binaan Ko+Lab.',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    isLandscape: false,
    paperFormat: 'A4 Portrait (210 × 297 mm)',
    templateFile: 'Surat Dispensasi Ko+Lab Oodo Training.docx'
  },
  {
    id: 'surat-rekognisi',
    title: 'Surat Rekognisi',
    subtitle: 'Pengajuan Nilai & SKS Proyek',
    description: 'Surat pengajuan konversi dan rekognisi nilai mata kuliah bagi mahasiswa tim program inkubasi & hibah seperti Innovillage.',
    icon: Award,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    isLandscape: false,
    paperFormat: 'A4 Portrait (210 × 297 mm)',
    templateFile: 'Surat-Rekognisi Innovillage.docx'
  },
  {
    id: 'surat-undangan',
    title: 'Surat Undangan',
    subtitle: 'Undangan Narasumber & Acara',
    description: 'Surat permohonan narasumber atau tamu undangan resmi pada Forum Group Discussion (FGD) atau agenda strategis Ko+Lab.',
    icon: Mail,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    isLandscape: false,
    paperFormat: 'A4 Portrait (210 × 297 mm)',
    templateFile: 'SURAT UNDANGAN KEGIATAN.docx'
  },
  {
    id: 'surat-komitmen-magang',
    title: 'Surat Komitmen',
    subtitle: 'Pernyataan SevenS Ko+Lab',
    description: 'Surat komitmen dan integritas mahasiswa magang terhadap tata tertib, kedisiplinan, dan etos kerja SevenS Ko+Lab.',
    icon: ClipboardSignature,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    isLandscape: false,
    paperFormat: 'A4 Portrait (210 × 297 mm)',
    templateFile: 'SURAT KOMITMEN MAGANG 2024.docx'
  },
  {
    id: 'surat-sertifikat',
    title: 'Sertifikat',
    subtitle: 'Penghargaan Inkubasi Resmi',
    description: 'Sertifikat penghargaan resmi atas partisipasi dan kontribusi mahasiswa dalam program inkubasi startup Research Alliance Ko+Lab.',
    icon: BookOpen,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    isLandscape: true,
    paperFormat: 'A4 Landscape (297 × 210 mm)',
    templateFile: 'Sertifikat idspora_3.pdf'
  },
  {
    id: 'surat-pengantar',
    title: 'Surat Pengantar',
    subtitle: 'Tim Startup Binaan Ko+Lab',
    description: 'Surat pengantar resmi pendelegasian dan verifikasi keanggotaan tim startup binaan Research Alliance Ko+Lab.',
    icon: Send,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    isLandscape: false,
    paperFormat: 'A4 Portrait (210 × 297 mm)',
    templateFile: 'SURAT-TIM-STARTUP-Sorgummi.docx'
  },
];

const AVAILABLE_PALETTE_ELEMENTS: Array<{
  type: ElementType;
  label: string;
  desc: string;
  icon: any;
  iconColor: string;
  iconBg: string;
}> = [
  {
    type: 'kop_surat',
    label: 'KOP SURAT',
    desc: 'Tambah komponen',
    icon: Building2,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50 border-amber-200'
  },
  {
    type: 'paragraf_teks',
    label: 'PARAGRAF TEKS',
    desc: 'Tambah komponen',
    icon: Type,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50 border-blue-200'
  },
  {
    type: 'judul_surat',
    label: 'JUDUL SURAT',
    desc: 'Tambah komponen',
    icon: Hash,
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50 border-purple-200'
  },
  {
    type: 'tabel_data',
    label: 'TABEL DATA',
    desc: 'Tambah komponen',
    icon: TableIcon,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50 border-emerald-200'
  },
  {
    type: 'garis_pembatas',
    label: 'GARIS PEMBATAS',
    desc: 'Tambah komponen',
    icon: Minus,
    iconColor: 'text-slate-600',
    iconBg: 'bg-slate-100 border-slate-200'
  },
  {
    type: 'tanda_tangan',
    label: 'TANDA TANGAN',
    desc: 'Tambah komponen',
    icon: PenTool,
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-50 border-rose-200'
  },
  {
    type: 'gambar',
    label: 'LOGO / GAMBAR',
    desc: 'Posisi bebas',
    icon: ImageIcon,
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-50 border-orange-200'
  },
  {
    type: 'spasi_kosong',
    label: 'SPASI KOSONG',
    desc: 'Tambah komponen',
    icon: MoveVertical,
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-50 border-orange-200'
  }
];

// Blok tanda tangan: lebar & tinggi slot sama dengan api/lib/renderers/dynamicBlockRenderer.js
// (SIGNATURE_BLOCK_WIDTH 240pt, tinggi gambar style.signatureHeight). Blok menempel kiri/tengah/kanan,
// teks di dalamnya rata kiri (rata tengah bila blok di tengah).
const SIGNATURE_BLOCK_WIDTH = 240;
// Tinggi gambar tanda tangan (style.signatureHeight, default 56); slot = gambar + jarak 4 atas-bawah
// Warna garis tabel (style.borderColor), default hitam — sama dengan dynamicBlockRenderer.js
const tableBorderColor = (style: DocumentBlock["style"]) => style.borderColor || "#000000";
const signatureImgHeight = (style: DocumentBlock["style"]) => style.signatureHeight || 56;
const signatureBoxStyle = (align?: string, width?: number): React.CSSProperties => ({
  width: width || SIGNATURE_BLOCK_WIDTH,
  maxWidth: '100%',
  marginLeft: align === 'left' ? 0 : 'auto',
  marginRight: align === 'center' ? 'auto' : 0,
  textAlign: align === 'center' ? 'center' : 'left',
});
// "**teks**" di paragraf = tebal (sama dengan renderTabbedText di PDF)
const richText = (text: string) => text.split(/\*\*([\s\S]+?)\*\*/).map((s, i) => (i % 2 ? <strong key={i}>{s}</strong> : s));
// Template sertifikat: latar, margin & font sama dengan CERTIFICATE_TYPE/CERT_MARGINS di dynamicBlockRenderer.js
const CERTIFICATE_TYPE = 'surat-sertifikat';
const CERT_PAPER: React.CSSProperties = {
  padding: '40px 60px 30px 177px',
  fontFamily: "'Poppins', sans-serif",
  backgroundImage: 'url(/sertifikat-bg.png)',
  backgroundSize: '100% 100%',
};
// Geometri blok = dynamicBlockRenderer.js. Tinggi baris alami font PDF (PDFKit currentLineHeight(true) / ukuran):
// Helvetica 1.156, Poppins (sertifikat) 1.5
const naturalLineHeight = (cert: boolean) => (cert ? 1.5 : 1.156);
// Jarak bawah bila style.marginBottom kosong = spaceAfter(n) di PDF: n × tinggi baris font terakhir di blok
const defaultSpaceAfter = (b: DocumentBlock, lh: number) => {
  const s = b.style, d = b.data;
  switch (b.type) {
    case 'kop_surat': return 0.8 * 8 * lh;
    case 'judul_surat': return 0.8 * (d.hal || d.lampiran ? 9.5 : d.nomor ? 10 : s.fontSize || 13) * lh;
    case 'paragraf_teks': return 0.6 * (s.fontSize || 11) * lh;
    case 'tabel_data': return d.headers?.length ? 0.8 * ((s.fontSize || 9.5) - (d.rows?.length ? 0.5 : 0)) * lh : 0;
    case 'tanda_tangan': return 0.8 * (s.fontSize || 11) * lh;
    default: return 0;
  }
};
const blockMarginBottom = (b: DocumentBlock, lh: number) =>
  typeof b.style.marginBottom === 'number' && b.style.marginBottom >= 0 ? b.style.marginBottom : defaultSpaceAfter(b, lh);
// Tinggi minimum baris tabel (pt), sama dengan PDF
const tableRowHeight = (s: DocumentBlock['style']) => Math.max(s.rowHeight || 28, 20);
// Textarea setinggi isinya (teks membungkus seperti di PDF). Native field-sizing bila didukung:
// scrollHeight ikut menghitung glyph yang melewati line-height kecil (judul besar) sehingga terlalu tinggi.
const FIELD_SIZING = typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content');
const fitTextarea = (el: HTMLTextAreaElement | null) => {
  if (!el || FIELD_SIZING) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

const SuratAdministrasiView: React.FC<SuratAdministrasiViewProps> = ({ userRole, startups, onShowAlert, showConfirm, onFocusModeChange }) => {
  const isLecturerOrAdmin = userRole === UserRole.LECTURER || userRole === UserRole.ADMIN;

  // View state: 'gallery' (landing card list) vs 'editor' (drag & drop visual document builder)
  const [currentView, setCurrentView] = useState<'gallery' | 'editor'>('gallery');
  const [gallerySearch, setGallerySearch] = useState('');

  // Editor = mode fokus (sidebar & header portal disembunyikan); keluar lewat tombol back ke galeri
  useEffect(() => {
    onFocusModeChange?.(currentView === 'editor');
    return () => onFocusModeChange?.(false);
  }, [currentView, onFocusModeChange]);

  // Custom templates created by user
  const [customTemplates, setCustomTemplates] = useState<Array<{
    id: string;
    title: string;
    subtitle: string;
    description: string;
    colorScheme: string;
    isLandscape: boolean;
    isCustom: true;
  }>>(() => {
    try {
      const saved = localStorage.getItem('kolab_custom_templates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal state for creating new template
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [newTemplateForm, setNewTemplateForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    colorScheme: 'blue',
    isLandscape: false,
  });
  const [newTemplateFormError, setNewTemplateFormError] = useState('');

  // Hidden/deleted templates
  const [deletedTemplateIds, setDeletedTemplateIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kolab_deleted_letters');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [types, setTypes] = useState<LetterTypeInfo[]>([]);
  const [meta, setMeta] = useState<LetterMeta>({ lecturers: [], students: [], events: [], startups: [] });
  const [activeTypeId, setActiveTypeId] = useState<string>('surat-keterangan');

  // Editor mode: 'visual' (interactive drag & drop canvas) vs 'preview' (live PDF iframe)
  const [editorMode, setEditorMode] = useState<'visual' | 'preview'>('visual');

  // Left sidebar tab: 'ELEMEN' vs 'LAYER'
  const [leftTab, setLeftTab] = useState<'ELEMEN' | 'LAYER'>('ELEMEN');

  // Right sidebar tab: 'GAYA' | 'LAYOUT' | 'HALAMAN' | 'FORM'
  const [rightTab, setRightTab] = useState<'GAYA' | 'LAYOUT' | 'HALAMAN' | 'FORM'>('GAYA');

  // Document Blocks state per letter type (persisted in localStorage or memory)
  const [documentBlocks, setDocumentBlocks] = useState<Record<string, DocumentBlock[]>>(() => {
    const initial: Record<string, DocumentBlock[]> = {};
    SURAT_DEFINITIONS.forEach(def => {
      try {
        const saved = localStorage.getItem(`kolab_blocks_${def.id}`);
        if (saved) {
          initial[def.id] = JSON.parse(saved);
        } else {
          initial[def.id] = getDefaultBlocksForType(def.id);
        }
      } catch {
        initial[def.id] = getDefaultBlocksForType(def.id);
      }
    });
    return initial;
  });

  // Selected block ID in canvas
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // History for Undo / Redo
  const [history, setHistory] = useState<Array<DocumentBlock[]>>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Pages count state per letter type (persisted in localStorage or derived from blocks)
  const [pagesCountByLetter, setPagesCountByLetter] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    SURAT_DEFINITIONS.forEach(def => {
      try {
        const saved = localStorage.getItem(`kolab_pages_${def.id}`);
        if (saved) {
          initial[def.id] = Math.max(1, parseInt(saved, 10) || 1);
        } else {
          initial[def.id] = 1;
        }
      } catch {
        initial[def.id] = 1;
      }
    });
    return initial;
  });

  // Active page number (for page switching and adding new elements)
  const [activePageNumber, setActivePageNumber] = useState<number>(1);

  // Canvas visual settings
  const [zoom, setZoom] = useState<number>(100);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [paperOrientation, setPaperOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showSidePanels, setShowSidePanels] = useState<boolean>(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const clampZoom = (z: number) => Math.max(40, Math.min(200, Math.round(z)));
  const isCert = activeTypeId === CERTIFICATE_TYPE;
  // Paragraf yang sedang diketik (paragraf lain berisi **tebal** tampil sebagai teks berformat)
  const [editingParaId, setEditingParaId] = useState<string | null>(null);
  // Kertas kanvas = ruang PDF (1px = 1pt): ukuran, margin & font sama dengan api/lib/renderers/dynamicBlockRenderer.js.
  // CSS zoom (bukan transform) agar tinggi/lebar layout ikut mengecil dan scroll tetap pas.
  const paperStyle = (z: number): React.CSSProperties => ({
    zoom: z / 100,
    width: paperOrientation === 'landscape' ? 842 : 595,
    minHeight: paperOrientation === 'landscape' ? 595 : 842,
    padding: paperOrientation === 'landscape' ? '40px 50px' : '50px 50px 50px 60px',
    fontFamily: 'Helvetica, Arial, sans-serif',
    ...(isCert ? CERT_PAPER : {}),
  });
  // Pas lebar: kertas memenuhi lebar area kanvas
  const fitZoom = () => {
    const w = canvasRef.current?.clientWidth;
    if (w) setZoom(clampZoom(((w - 64) / (paperOrientation === 'landscape' ? 842 : 595)) * 100));
  };
  useEffect(() => {
    if (currentView === 'editor' && editorMode === 'visual') fitZoom();
  }, [currentView, editorMode, paperOrientation, showSidePanels]);
  // Ctrl/⌘ + scroll di kanvas = zoom (listener native agar preventDefault berlaku)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom(z => clampZoom(z - Math.sign(e.deltaY) * 10));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [currentView, editorMode]);

  // Preview & Download states
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fullscreenTab, setFullscreenTab] = useState<'visual' | 'preview'>('visual');
  const [fullscreenZoom, setFullscreenZoom] = useState<number>(100);

  // Escape key listener to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Drag and drop state
  const [draggedBlockIndex, setDraggedBlockIndex] = useState<number | null>(null);
  const [dragOverBlockIndex, setDragOverBlockIndex] = useState<number | null>(null);

  // Color scheme maps for custom templates
  const COLOR_SCHEME_MAP: Record<string, { color: string; bgColor: string; borderColor: string }> = {
    blue: { color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    emerald: { color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
    purple: { color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
    orange: { color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
    rose: { color: 'text-rose-600', bgColor: 'bg-rose-50', borderColor: 'border-rose-200' },
    amber: { color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
    teal: { color: 'text-teal-600', bgColor: 'bg-teal-50', borderColor: 'border-teal-200' },
    indigo: { color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  };

  const allTemplates = useMemo(() => {
    const builtIn = SURAT_DEFINITIONS.map(def => ({ ...def, isCustom: false as const }));
    const custom = customTemplates.map(ct => {
      const scheme = COLOR_SCHEME_MAP[ct.colorScheme] || COLOR_SCHEME_MAP.blue;
      return {
        id: ct.id,
        title: ct.title,
        subtitle: ct.subtitle,
        description: ct.description,
        icon: FileText,
        color: scheme.color,
        bgColor: scheme.bgColor,
        borderColor: scheme.borderColor,
        isLandscape: ct.isLandscape,
        paperFormat: ct.isLandscape ? 'A4 Landscape (297 × 210 mm)' : 'A4 Portrait (210 × 297 mm)',
        templateFile: '(Template Kustom)',
        isCustom: true as const,
      };
    });
    return [...builtIn, ...custom];
  }, [customTemplates]);

  // Active definition & active blocks
  const activeDef = useMemo(() => {
    return allTemplates.find(s => s.id === activeTypeId) || allTemplates[0] || SURAT_DEFINITIONS[0];
  }, [allTemplates, activeTypeId]);

  const currentBlocks = useMemo(() => {
    return documentBlocks[activeTypeId] || getDefaultBlocksForType(activeTypeId);
  }, [documentBlocks, activeTypeId]);

  const currentPagesCount = useMemo(() => {
    const explicit = pagesCountByLetter[activeTypeId] || 1;
    const maxInBlocks = (currentBlocks || []).reduce((max, b) => Math.max(max, Number(b.pageNumber || 1)), 1);
    return Math.max(explicit, maxInBlocks);
  }, [pagesCountByLetter, activeTypeId, currentBlocks]);

  const selectedBlock = useMemo(() => {
    if (!selectedBlockId) return null;
    return currentBlocks.find(b => b.id === selectedBlockId) || null;
  }, [currentBlocks, selectedBlockId]);

  const activeStartups = useMemo(() => {
    return meta.startups.length > 0 ? meta.startups : startups;
  }, [meta.startups, startups]);

  const visibleTemplates = useMemo(() => {
    return allTemplates.filter(def => {
      if (deletedTemplateIds.includes(def.id)) return false;
      if (!gallerySearch.trim()) return true;
      const q = gallerySearch.toLowerCase();
      return def.title.toLowerCase().includes(q) ||
        def.subtitle.toLowerCase().includes(q) ||
        def.description.toLowerCase().includes(q);
    });
  }, [allTemplates, deletedTemplateIds, gallerySearch]);

  // Load types & meta on mount
  useEffect(() => {
    loadBaseMetadata();
  }, []);

  // Sync orientation & active page with active letter
  useEffect(() => {
    try {
      const savedOrient = localStorage.getItem(`kolab_orient_${activeTypeId}`);
      if (savedOrient === 'portrait' || savedOrient === 'landscape') {
        setPaperOrientation(savedOrient);
      } else {
        setPaperOrientation(activeDef.isLandscape ? 'landscape' : 'portrait');
      }
    } catch {
      setPaperOrientation(activeDef.isLandscape ? 'landscape' : 'portrait');
    }
    setActivePageNumber(1);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [activeTypeId, activeDef.isLandscape]);

  const loadBaseMetadata = async () => {
    try {
      const headers = { Authorization: `Bearer ${api.getToken()}` };
      const [resTypes, resMeta] = await Promise.all([
        fetch(`${API_BASE_URL}/letters/types`, { headers }),
        fetch(`${API_BASE_URL}/letters/meta`, { headers })
      ]);

      const jsonTypes = await resTypes.json();
      if (jsonTypes.status === 'success') setTypes(jsonTypes.data);

      const jsonMeta = await resMeta.json();
      if (jsonMeta.status === 'success') setMeta(jsonMeta.data);
    } catch (err) {
      console.error('Failed to load letter metadata', err);
    }
  };

  // ── Custom Template Handlers ──────────────────────────────────────────────
  const handleOpenNewTemplateModal = () => {
    setNewTemplateForm({ title: '', subtitle: '', description: '', colorScheme: 'blue', isLandscape: false });
    setNewTemplateFormError('');
    setShowNewTemplateModal(true);
  };

  const handleCloseNewTemplateModal = () => {
    setShowNewTemplateModal(false);
    setNewTemplateFormError('');
  };

  const handleCreateNewTemplate = () => {
    const title = newTemplateForm.title.trim();
    if (!title) {
      setNewTemplateFormError('Nama template tidak boleh kosong.');
      return;
    }
    const newId = `custom-${Date.now()}`;
    const newCustom = {
      id: newId,
      title,
      subtitle: newTemplateForm.subtitle.trim() || 'Template Kustom',
      description: newTemplateForm.description.trim() || 'Template surat kustom yang dibuat secara manual.',
      colorScheme: newTemplateForm.colorScheme,
      isLandscape: newTemplateForm.isLandscape,
      isCustom: true as const,
    };
    const updated = [...customTemplates, newCustom];
    setCustomTemplates(updated);
    try {
      localStorage.setItem('kolab_custom_templates', JSON.stringify(updated));
    } catch {}

    // Inisialisasi blok awal untuk template kustom
    const starterBlocks = getDefaultBlocksForType(newId).map(b => {
      if (b.type === 'judul_surat') {
        return {
          ...b,
          data: {
            ...b.data,
            title: title.toUpperCase()
          }
        };
      }
      return b;
    });

    setDocumentBlocks(prev => ({
      ...prev,
      [newId]: starterBlocks
    }));

    try {
      localStorage.setItem(`kolab_blocks_${newId}`, JSON.stringify(starterBlocks));
      localStorage.setItem(`kolab_orient_${newId}`, newTemplateForm.isLandscape ? 'landscape' : 'portrait');
      localStorage.setItem(`kolab_pages_${newId}`, '1');
    } catch {}

    setShowNewTemplateModal(false);
    // Buka editor langsung untuk template baru ini
    setActiveTypeId(newId);
    setPaperOrientation(newTemplateForm.isLandscape ? 'landscape' : 'portrait');
    setActivePageNumber(1);
    setCurrentView('editor');
    setEditorMode('visual');
    onShowAlert('Template Dibuat', `Template "${title}" berhasil dibuat! Anda sekarang berada di editor.`, 'success');
  };

  const handleDeleteCustomTemplate = (templateId: string) => {
    if (!showConfirm) {
      if (!window.confirm('Hapus template kustom ini? Tindakan ini tidak dapat dibatalkan.')) return;
      const updated = customTemplates.filter(ct => ct.id !== templateId);
      setCustomTemplates(updated);
      try { localStorage.setItem('kolab_custom_templates', JSON.stringify(updated)); } catch {}
      try { localStorage.removeItem(`kolab_blocks_${templateId}`); } catch {}
      onShowAlert('Template Dihapus', 'Template kustom berhasil dihapus.', 'success');
      return;
    }
    showConfirm('Hapus Template Kustom', 'Apakah Anda yakin ingin menghapus template ini? Semua blok yang telah dibuat akan hilang.', () => {
      const updated = customTemplates.filter(ct => ct.id !== templateId);
      setCustomTemplates(updated);
      try { localStorage.setItem('kolab_custom_templates', JSON.stringify(updated)); } catch {}
      try { localStorage.removeItem(`kolab_blocks_${templateId}`); } catch {}
      onShowAlert('Template Dihapus', 'Template kustom berhasil dihapus.', 'success');
    });
  };

  // Helper to commit new block list with history
  const updateBlocks = (newBlocks: DocumentBlock[]) => {
    setDocumentBlocks(prev => ({
      ...prev,
      [activeTypeId]: newBlocks
    }));

    // Push to undo stack
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newBlocks]);
    setHistoryIndex(prev => prev + 1);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setDocumentBlocks(prev => ({ ...prev, [activeTypeId]: target }));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setDocumentBlocks(prev => ({ ...prev, [activeTypeId]: target }));
    }
  };

  // Pintasan editor: Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z) undo-redo, Delete hapus blok terpilih, Esc batal pilih.
  // Diabaikan saat mengetik di input agar undo bawaan teks tetap jalan.
  useEffect(() => {
    if (currentView !== 'editor') return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable="true"]')) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      else if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId) {
        const b = currentBlocks.find(x => x.id === selectedBlockId);
        if (b) { e.preventDefault(); handleDeleteBlock(b.id, b.title); }
      }
      else if (e.key === 'Escape' && !isFullscreen) setSelectedBlockId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Add block from palette
  const handleAddBlock = (type: ElementType) => {
    const newId = `${type}-${Date.now()}`;
    let newBlock: DocumentBlock;

    switch (type) {
      case 'kop_surat':
        newBlock = {
          id: newId,
          type: 'kop_surat',
          title: 'Kop Surat Resmi Ko+Lab',
          data: {
            institution: 'RESEARCH ALLIANCE Ko+Lab',
            faculty: 'FAKULTAS ILMU TERAPAN — TELKOM UNIVERSITY',
            address: 'Gedung Selaru Lt.3, Telkom University, Bandung',
            logoUrl: ''
          },
          style: {
            fontSize: 12,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 16,
            isDoubleLine: true
          }
        };
        break;
      case 'judul_surat':
        newBlock = {
          id: newId,
          type: 'judul_surat',
          title: 'Judul Surat',
          data: {
            title: 'SURAT KETERANGAN RESMI',
            nomor: '001/SKET/RA-KOLABFIT/2026'
          },
          style: {
            fontSize: 13,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 16
          }
        };
        break;
      case 'paragraf_teks':
        newBlock = {
          id: newId,
          type: 'paragraf_teks',
          title: 'Paragraf Teks',
          data: {
            text: 'Tulis isi teks paragraf dokumen di sini. Anda dapat mengubah perataan, ukuran font, dan margin melalui panel properti di sebelah kanan.'
          },
          style: {
            fontSize: 11,
            textAlign: 'justify',
            lineHeight: 1.6,
            marginBottom: 16
          }
        };
        break;
      case 'tabel_data':
        newBlock = {
          id: newId,
          type: 'tabel_data',
          title: 'Tabel Data',
          data: {
            tableTitle: 'Daftar Data Terlampir',
            headers: ['No', 'Kolom 1', 'Kolom 2', 'Keterangan'],
            rows: [
              ['1', 'Data 1', 'Detail 1', 'Aktif'],
              ['2', 'Data 2', 'Detail 2', 'Aktif']
            ]
          },
          style: {
            fontSize: 10,
            marginBottom: 18
          }
        };
        break;
      case 'garis_pembatas':
        newBlock = {
          id: newId,
          type: 'garis_pembatas',
          title: 'Garis Pembatas',
          data: {},
          style: {
            borderThickness: 1,
            borderColor: '#0f172a',
            marginTop: 12,
            marginBottom: 16
          }
        };
        break;
      case 'tanda_tangan':
        newBlock = {
          id: newId,
          type: 'tanda_tangan',
          title: 'Tanda Tangan Pengesahan',
          data: {
            cityDate: 'Bandung, 16 Oktober 2026',
            salutation: 'Hormat Saya,',
            role: 'Ketua RA Ko+Lab Fakultas Ilmu Terapan',
            name: 'Robbi Hendriyanto, S.T., M.T.',
            nip: '25850011',
            signatureUrl: ''
          },
          style: {
            fontSize: 11,
            textAlign: 'right',
            marginBottom: 24
          }
        };
        break;
      case 'gambar':
        // Muncul di pojok kiri atas area isi; geser ke posisi yang diinginkan
        newBlock = { id: newId, type: 'gambar', title: 'Logo / Gambar', data: { imageUrl: '' }, style: { x: 60, y: 40, width: 100 } };
        break;
      case 'spasi_kosong':
      default:
        newBlock = {
          id: newId,
          type: 'spasi_kosong',
          title: 'Spasi Kosong',
          data: {},
          style: {
            height: 24
          }
        };
        break;
    }

    newBlock.pageNumber = activePageNumber;
    const nextBlocks = [...currentBlocks, newBlock];
    updateBlocks(nextBlocks);
    setSelectedBlockId(newId);
  };

  // ─── Multi-page handlers ───────────────────────────────────────────────────
  const handleAddPage = () => {
    const newCount = currentPagesCount + 1;
    setPagesCountByLetter(prev => ({
      ...prev,
      [activeTypeId]: newCount
    }));
    try {
      localStorage.setItem(`kolab_pages_${activeTypeId}`, String(newCount));
    } catch {}
    setActivePageNumber(newCount);
  };

  const handleDeletePage = (pageToDelete: number) => {
    if (currentPagesCount <= 1) {
      onShowAlert('Peringatan', 'Dokumen minimal harus memiliki 1 halaman.', 'error');
      return;
    }

    const blocksOnPage = currentBlocks.filter(b => (b.pageNumber || 1) === pageToDelete);
    const confirmMsg = blocksOnPage.length > 0
      ? `Halaman ${pageToDelete} berisi ${blocksOnPage.length} komponen. Yakin ingin menghapus halaman ini? Komponen akan dipindahkan ke Halaman ${Math.max(1, pageToDelete - 1)}.`
      : `Hapus Halaman ${pageToDelete}?`;

    // Konfirmasi hanya bila halaman berisi komponen; halaman kosong langsung dihapus
    if (blocksOnPage.length === 0 || window.confirm(confirmMsg)) {
      const nextBlocks = currentBlocks.map(b => {
        const p = b.pageNumber || 1;
        if (p === pageToDelete) {
          return { ...b, pageNumber: Math.max(1, pageToDelete - 1) };
        } else if (p > pageToDelete) {
          return { ...b, pageNumber: p - 1 };
        }
        return b;
      });

      const newCount = currentPagesCount - 1;
      setPagesCountByLetter(prev => ({ ...prev, [activeTypeId]: newCount }));
      try {
        localStorage.setItem(`kolab_pages_${activeTypeId}`, String(newCount));
      } catch {}
      updateBlocks(nextBlocks);
      setActivePageNumber(prev => Math.min(prev, newCount));
    }
  };

  const handleMoveBlockToPage = (blockId: string, targetPage: number) => {
    const nextBlocks = currentBlocks.map(b => {
      if (b.id === blockId) {
        return { ...b, pageNumber: targetPage };
      }
      return b;
    });
    updateBlocks(nextBlocks);
    setActivePageNumber(targetPage);
  };

  // Drag and drop reordering inside canvas
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedBlockIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverBlockIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number, targetPage?: number) => {
    e.preventDefault();
    if (draggedBlockIndex === null || draggedBlockIndex === targetIndex) {
      setDraggedBlockIndex(null);
      setDragOverBlockIndex(null);
      return;
    }

    const next = [...currentBlocks];
    const [moved] = next.splice(draggedBlockIndex, 1);
    if (targetPage !== undefined) {
      moved.pageNumber = targetPage;
    }
    next.splice(targetIndex, 0, moved);

    updateBlocks(next);
    setDraggedBlockIndex(null);
    setDragOverBlockIndex(null);
  };

  const handleDropOnPage = (e: React.DragEvent, targetPageNum: number) => {
    e.preventDefault();
    if (draggedBlockIndex === null) return;
    const next = [...currentBlocks];
    const moved = next[draggedBlockIndex];
    if (moved) {
      moved.pageNumber = targetPageNum;
      updateBlocks(next);
      setActivePageNumber(targetPageNum);
    }
    setDraggedBlockIndex(null);
    setDragOverBlockIndex(null);
  };

  // Move Up / Move Down
  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentBlocks.length) return;

    const next = [...currentBlocks];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);

    updateBlocks(next);
  };

  // Delete Block
  const handleDeleteBlock = (id: string, title: string) => {
    const next = currentBlocks.filter(b => b.id !== id);
    updateBlocks(next);
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  // Duplicate Block
  const handleDuplicateBlock = (block: DocumentBlock) => {
    const clone: DocumentBlock = {
      ...block,
      id: `${block.type}-${Date.now()}`,
      title: `${block.title} (Salinan)`,
      pageNumber: block.pageNumber || activePageNumber,
      data: JSON.parse(JSON.stringify(block.data)),
      style: JSON.parse(JSON.stringify(block.style))
    };
    const next = [...currentBlocks, clone];
    updateBlocks(next);
    setSelectedBlockId(clone.id);
  };

  // Update selected block style
  const updateSelectedStyle = (stylePatch: Partial<DocumentBlock['style']>) => {
    if (!selectedBlockId) return;
    const next = currentBlocks.map(b => {
      if (b.id === selectedBlockId) {
        return {
          ...b,
          style: {
            ...b.style,
            ...stylePatch
          }
        };
      }
      return b;
    });
    updateBlocks(next);
  };

  // Update selected block data/content
  const updateSelectedData = (dataPatch: Record<string, any>) => {
    if (!selectedBlockId) return;
    const next = currentBlocks.map(b => {
      if (b.id === selectedBlockId) {
        return {
          ...b,
          data: {
            ...b.data,
            ...dataPatch
          }
        };
      }
      return b;
    });
    updateBlocks(next);
  };

  // Update block data by ID (with optional history recording)
  const updateBlockDataById = (blockId: string, dataPatch: Record<string, any>, recordHistory = false) => {
    const next = currentBlocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          data: {
            ...b.data,
            ...dataPatch
          }
        };
      }
      return b;
    });

    if (recordHistory) {
      updateBlocks(next);
    } else {
      setDocumentBlocks(prev => ({
        ...prev,
        [activeTypeId]: next
      }));
    }
  };

  // Reusable signature image processor (Base64 Data URL)
  const handleProcessSignatureFile = (file: File, blockId?: string) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onShowAlert('Format Tidak Didukung', 'Silakan pilih file gambar (PNG, JPG, atau WEBP).', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      onShowAlert('Ukuran Terlalu Besar', 'Maksimal ukuran file tanda tangan adalah 2MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const targetId = blockId || selectedBlockId;
      if (targetId) {
        updateBlockDataById(targetId, { signatureUrl: dataUrl }, true);
      }
    };
    reader.readAsDataURL(file);
  };

  // Kop Surat Logo processor
  const handleProcessLogoFile = (file: File, blockId: string, key = 'logoUrl') => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onShowAlert('Format Tidak Didukung', 'Silakan pilih file gambar logo (PNG atau JPG).', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      onShowAlert('Ukuran Terlalu Besar', 'Maksimal ukuran logo adalah 2MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      updateBlockDataById(blockId, { [key]: dataUrl }, true);
    };
    reader.readAsDataURL(file);
  };

  // Table manipulation and column/row sizing helpers
  const getBlockColumnWidths = (block: DocumentBlock): number[] => {
    const colCount = block.data.headers?.length || 1;
    const raw = block.data.colWidths;
    if (Array.isArray(raw) && raw.length === colCount && raw.every(w => typeof w === 'number' && w > 0)) {
      return raw;
    }
    const base = Math.floor(100 / colCount);
    const remainder = 100 - (base * colCount);
    const widths = Array(colCount).fill(base);
    if (widths.length > 0) widths[0] += remainder;
    return widths;
  };

  const handleAddTableRow = (blockId: string) => {
    const block = currentBlocks.find(b => b.id === blockId);
    if (!block || block.type !== 'tabel_data') return;
    const colCount = block.data.headers?.length || 2;
    const newRow = Array(colCount).fill('');
    const nextRows = [...(block.data.rows || []), newRow];
    updateBlockDataById(blockId, { rows: nextRows }, true);
  };

  const handleDeleteTableRow = (blockId: string, rowIndex: number) => {
    const block = currentBlocks.find(b => b.id === blockId);
    if (!block || block.type !== 'tabel_data') return;
    const rows = block.data.rows || [];
    if (rows.length <= 1) {
      onShowAlert('Peringatan', 'Tabel harus memiliki minimal 1 baris data.', 'error');
      return;
    }
    const nextRows = rows.filter((_: any, idx: number) => idx !== rowIndex);
    updateBlockDataById(blockId, { rows: nextRows }, true);
  };

  const handleAddTableColumn = (blockId: string) => {
    const block = currentBlocks.find(b => b.id === blockId);
    if (!block || block.type !== 'tabel_data') return;
    const currentHeaders = block.data.headers || [];
    const nextHeaders = [...currentHeaders, `Kolom ${currentHeaders.length + 1}`];
    const nextRows = (block.data.rows || []).map((row: string[]) => [...row, '']);
    
    // Distribute widths evenly for new count
    const colCount = nextHeaders.length;
    const base = Math.floor(100 / colCount);
    const remainder = 100 - (base * colCount);
    const nextWidths = Array(colCount).fill(base);
    if (nextWidths.length > 0) nextWidths[0] += remainder;

    updateBlockDataById(blockId, { headers: nextHeaders, rows: nextRows, colWidths: nextWidths }, true);
  };

  const handleDeleteTableColumn = (blockId: string, colIndex: number) => {
    const block = currentBlocks.find(b => b.id === blockId);
    if (!block || block.type !== 'tabel_data') return;
    const currentHeaders = block.data.headers || [];
    if (currentHeaders.length <= 1) {
      onShowAlert('Peringatan', 'Tabel harus memiliki minimal 1 kolom.', 'error');
      return;
    }
    const nextHeaders = currentHeaders.filter((_: any, idx: number) => idx !== colIndex);
    const nextRows = (block.data.rows || []).map((row: string[]) => row.filter((_: any, idx: number) => idx !== colIndex));
    
    // Distribute remaining widths
    const colCount = nextHeaders.length;
    const base = Math.floor(100 / colCount);
    const remainder = 100 - (base * colCount);
    const nextWidths = Array(colCount).fill(base);
    if (nextWidths.length > 0) nextWidths[0] += remainder;

    updateBlockDataById(blockId, { headers: nextHeaders, rows: nextRows, colWidths: nextWidths }, true);
  };

  const handleSetColumnWidth = (blockId: string, colIndex: number, newWidthPercent: number) => {
    const block = currentBlocks.find(b => b.id === blockId);
    if (!block || block.type !== 'tabel_data') return;

    const currentWidths = getBlockColumnWidths(block);
    const colCount = currentWidths.length;
    if (colCount <= 1) return;

    const targetWidth = Math.max(5, Math.min(85, Math.round(newWidthPercent)));
    const diff = targetWidth - currentWidths[colIndex];
    const otherColsCount = colCount - 1;

    const nextWidths = currentWidths.map((w, idx) => {
      if (idx === colIndex) return targetWidth;
      const share = diff / otherColsCount;
      return Math.max(5, Math.round(w - share));
    });

    // Ensure sum is 100
    const total = nextWidths.reduce((a, b) => a + b, 0);
    if (total !== 100) {
      nextWidths[colIndex] += (100 - total);
    }

    updateBlockDataById(blockId, { colWidths: nextWidths }, true);
  };

  const handleDistributeColumnsEvenly = (blockId: string) => {
    const block = currentBlocks.find(b => b.id === blockId);
    if (!block || block.type !== 'tabel_data') return;

    const colCount = block.data.headers?.length || 1;
    const base = Math.floor(100 / colCount);
    const remainder = 100 - (base * colCount);
    const nextWidths = Array(colCount).fill(base);
    if (nextWidths.length > 0) nextWidths[0] += remainder;

    updateBlockDataById(blockId, { colWidths: nextWidths }, true);
  };

  // Update block style by ID (with optional history recording)
  const updateBlockStyleById = (blockId: string, stylePatch: Partial<DocumentBlock['style']>, recordHistory = false) => {
    const next = currentBlocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          style: {
            ...b.style,
            ...stylePatch
          }
        };
      }
      return b;
    });

    if (recordHistory) {
      updateBlocks(next);
    } else {
      setDocumentBlocks(prev => ({
        ...prev,
        [activeDef.id]: next
      }));
    }
  };

  // Tarik sudut gambar tanda tangan untuk mengubah tingginya (24–160pt)
  const handleStartSignatureResize = (e: React.MouseEvent, block: DocumentBlock) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startH = signatureImgHeight(block.style);
    const zoomFactor = Math.max(0.2, zoom / 100);
    let h = startH;
    const onMove = (m: MouseEvent) => {
      h = Math.max(24, Math.min(160, Math.round(startH + (m.clientY - startY) / zoomFactor)));
      updateBlockStyleById(block.id, { signatureHeight: h });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      updateBlockStyleById(block.id, { signatureHeight: h }, true);
    };
    document.body.style.cursor = 'nwse-resize';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Geser (move) atau tarik sudut (resize) logo/gambar posisi bebas; satu langkah undo per tarikan
  const handleStartImageDrag = (e: React.MouseEvent, block: DocumentBlock, mode: 'move' | 'resize') => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedBlockId(block.id);
    const z = Math.max(0.2, zoom / 100);
    const sx = e.clientX, sy = e.clientY;
    const { x = 0, y = 0, width = 100 } = block.style;
    const pageW = isCert || paperOrientation === 'landscape' ? 842 : 595;
    const pageH = pageW === 842 ? 595 : 842;
    const clamp = (v: number, lo: number, hi: number) => Math.round(Math.max(lo, Math.min(hi, v)) * 10) / 10;
    let patch: Partial<DocumentBlock['style']> | null = null;
    const onMove = (m: MouseEvent) => {
      const dx = (m.clientX - sx) / z, dy = (m.clientY - sy) / z;
      patch = mode === 'move'
        ? { x: clamp(x + dx, 0, pageW - width), y: clamp(y + dy, 0, pageH - 10) }
        : { width: clamp(width + dx, 16, pageW - x) };
      updateBlockStyleById(block.id, patch);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      if (patch) updateBlockStyleById(block.id, patch, true);
    };
    document.body.style.cursor = mode === 'move' ? 'move' : 'nwse-resize';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleStartColResize = (e: React.MouseEvent, blockId: string, colIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    const block = currentBlocks.find(b => b.id === blockId);
    if (!block || block.type !== 'tabel_data') return;

    const initialWidths = getBlockColumnWidths(block);
    const colCount = initialWidths.length;
    if (colCount <= 1) return;

    const targetEl = e.currentTarget as HTMLElement;
    const tableEl = targetEl.closest('table');
    if (!tableEl) return;

    const tableRect = tableEl.getBoundingClientRect();
    const dataTableWidthPx = Math.max(80, tableRect.width);
    const startX = e.clientX;
    let latestWidths = [...initialWidths];

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startX;
      const deltaPercent = (deltaPx / dataTableWidthPx) * 100;

      const nextWidths = [...initialWidths];
      if (colIndex < colCount - 1) {
        const totalPair = initialWidths[colIndex] + initialWidths[colIndex + 1];
        const newW1 = Math.max(5, Math.min(totalPair - 5, Math.round(initialWidths[colIndex] + deltaPercent)));
        const newW2 = totalPair - newW1;
        nextWidths[colIndex] = newW1;
        nextWidths[colIndex + 1] = newW2;
      } else {
        const prevCol = colIndex - 1;
        if (prevCol >= 0) {
          const totalPair = initialWidths[prevCol] + initialWidths[colIndex];
          const newW2 = Math.max(5, Math.min(totalPair - 5, Math.round(initialWidths[colIndex] + deltaPercent)));
          const newW1 = totalPair - newW2;
          nextWidths[prevCol] = newW1;
          nextWidths[colIndex] = newW2;
        }
      }

      latestWidths = nextWidths;
      updateBlockDataById(blockId, { colWidths: nextWidths }, false);
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      updateBlockDataById(blockId, { colWidths: latestWidths }, true);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleStartRowResize = (e: React.MouseEvent, blockId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const block = currentBlocks.find(b => b.id === blockId);
    if (!block || block.type !== 'tabel_data') return;

    const initialHeight = Number(block.style.rowHeight || 28);
    const initialPaddingY = Number(block.style.paddingY ?? 6);
    const startY = e.clientY;
    const zoomFactor = Math.max(0.2, zoom / 100);
    let latestHeight = initialHeight;
    let latestPaddingY = initialPaddingY;

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = (moveEvent.clientY - startY) / zoomFactor;
      const nextHeight = Math.max(18, Math.min(100, Math.round(initialHeight + deltaY)));
      const nextPaddingY = Math.max(2, Math.min(24, Math.round(initialPaddingY + deltaY * 0.2)));

      latestHeight = nextHeight;
      latestPaddingY = nextPaddingY;

      updateBlockStyleById(blockId, { rowHeight: nextHeight, paddingY: nextPaddingY }, false);
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      updateBlockStyleById(blockId, { rowHeight: latestHeight, paddingY: latestPaddingY }, true);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleSetRowDensity = (blockId: string, density: 'compact' | 'normal' | 'relaxed') => {
    let paddingY = 6;
    let rowHeight = 28;
    if (density === 'compact') {
      paddingY = 3;
      rowHeight = 20;
    } else if (density === 'relaxed') {
      paddingY = 12;
      rowHeight = 44;
    }

    const next = currentBlocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          style: {
            ...b.style,
            paddingY,
            rowHeight
          }
        };
      }
      return b;
    });
    updateBlocks(next);
  };

  // Save template configuration to localStorage
  const handleSaveTemplate = () => {
    try {
      localStorage.setItem(`kolab_blocks_${activeDef.id}`, JSON.stringify(currentBlocks));
      localStorage.setItem(`kolab_pages_${activeDef.id}`, String(currentPagesCount));
      localStorage.setItem(`kolab_orient_${activeDef.id}`, paperOrientation);
      onShowAlert('Template Disimpan', `Konfigurasi tata letak (${currentPagesCount} halaman) dan gaya ${activeDef.title} berhasil disimpan.`, 'success');
    } catch {
      onShowAlert('Penyimpanan Gagal', 'Gagal menyimpan konfigurasi ke browser.', 'error');
    }
  };

  // Reset template configuration back to default
  const handleResetToDefaultTemplate = () => {
    const defaultBlocks = getDefaultBlocksForType(activeDef.id);
    updateBlocks(defaultBlocks);
    setPagesCountByLetter(prev => ({ ...prev, [activeDef.id]: 1 }));
    setActivePageNumber(1);
    setPaperOrientation(activeDef.isLandscape ? 'landscape' : 'portrait');
    try {
      localStorage.removeItem(`kolab_blocks_${activeDef.id}`);
      localStorage.removeItem(`kolab_pages_${activeDef.id}`);
      localStorage.removeItem(`kolab_orient_${activeDef.id}`);
    } catch {}
    onShowAlert('Template Direset', `Tata letak ${activeDef.title} dikembalikan ke template resmi bawaan.`, 'success');
  };

  // Generate live PDF preview from current blocks data
  const handleGeneratePdfPreview = async () => {
    setIsGeneratingPreview(true);
    setLastError(null);

    // Extract dynamic fields from blocks to feed the official PDF generator
    const payload: Record<string, any> = {
      blocks: currentBlocks,
      pagesCount: currentPagesCount,
      paperOrientation: paperOrientation,
      nomor_surat: currentBlocks.find(b => b.type === 'judul_surat')?.data.nomor || '034/SKET/RA-KOLABFIT/2026',
      penandatangan_nip: currentBlocks.find(b => b.type === 'tanda_tangan')?.data.nip || '25850011',
      signature_image: currentBlocks.find(b => b.type === 'tanda_tangan')?.data.signatureUrl || '',
      kegiatan_nama: currentBlocks.find(b => b.type === 'paragraf_teks')?.data.kegiatan || 'Odoo Partner Recruitment 2025',
      kegiatan_tanggal: 'Selasa, 07 Oktober 2025',
      kelas: 'D3SI-48-01',
      student_nims: meta.students.slice(0, 3).map(s => s.nim),
      startup_id: activeStartups[0]?.id || ''
    };

    try {
      const res = await fetch(`${API_BASE_URL}/letters/${activeTypeId}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${api.getToken()}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let errMsg = 'Gagal membuat pratinjau dokumen';
        try {
          const errJson = await res.json();
          errMsg = errJson.message || errMsg;
        } catch (_) {}
        setLastError(errMsg);
        return;
      }

      const blob = await res.blob();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const newUrl = URL.createObjectURL(blob);
      setPreviewUrl(newUrl);
    } catch (err: any) {
      setLastError(err.message || 'Koneksi ke generator terputus');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!isLecturerOrAdmin) {
      onShowAlert('Akses Dibatasi', 'Hanya Dosen dan Admin yang dapat mencetak atau mengunduh surat resmi.', 'error');
      return;
    }
    setIsDownloading(true);
    try {
      const payload: Record<string, any> = {
        blocks: currentBlocks,
        pagesCount: currentPagesCount,
        paperOrientation: paperOrientation,
        nomor_surat: currentBlocks.find(b => b.type === 'judul_surat')?.data.nomor || '034/SKET/RA-KOLABFIT/2026',
        penandatangan_nip: currentBlocks.find(b => b.type === 'tanda_tangan')?.data.nip || '25850011',
        signature_image: currentBlocks.find(b => b.type === 'tanda_tangan')?.data.signatureUrl || '',
        startup_id: activeStartups[0]?.id || ''
      };

      const res = await fetch(`${API_BASE_URL}/letters/${activeTypeId}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${api.getToken()}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Gagal mengunduh dokumen resmi');

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.body.appendChild(document.createElement('a'));
      a.href = blobUrl;
      const nomorStr = currentBlocks.find(b => b.type === 'judul_surat')?.data.nomor || 'kolab';
      const cleanNomor = nomorStr.replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `${activeTypeId}_${cleanNomor}.pdf`;
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);

      onShowAlert('Berhasil Diunduh', `Dokumen ${activeDef.title} (${currentPagesCount} halaman) berhasil diunduh sesuai modifikasi.`, 'success');
    } catch (err: any) {
      onShowAlert('Unduh Gagal', err.message, 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  // Template Deletion
  const handleDeleteTemplate = (def: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (def.isCustom) {
      handleDeleteCustomTemplate(def.id);
      return;
    }
    if (!isLecturerOrAdmin) {
      onShowAlert('Akses Dibatasi', 'Hanya Dosen dan Admin yang dapat menghapus template surat.', 'error');
      return;
    }

    const executeDelete = () => {
      const nextDeleted = [...deletedTemplateIds, def.id];
      setDeletedTemplateIds(nextDeleted);
      try {
        localStorage.setItem('kolab_deleted_letters', JSON.stringify(nextDeleted));
      } catch (_) {}
      onShowAlert('Template Dihapus', `Template "${def.title} — ${def.subtitle}" telah dihapus dari galeri aktif.`, 'success');
    };

    if (showConfirm) {
      showConfirm(
        'Hapus Template Dokumen',
        `Apakah Anda yakin ingin menghapus template "${def.title} — ${def.subtitle}"? Template ini akan disembunyikan dari galeri aktif. Generator dokumen tetap dilindungi.`,
        executeDelete
      );
    } else if (window.confirm(`Yakin ingin menghapus template "${def.title}"?`)) {
      executeDelete();
    }
  };

  const handleRestoreAllTemplates = () => {
    setDeletedTemplateIds([]);
    try {
      localStorage.removeItem('kolab_deleted_letters');
    } catch (_) {}
    onShowAlert('Template Dipulihkan', 'Semua template surat resmi berhasil dipulihkan ke galeri.', 'success');
  };

  // ───────────────────────────────────────────────────────────────────────────
  // HELPER: ISI BLOK — dipakai kanvas editor (editable) & layar penuh (baca saja)
  // Ukuran mengikuti api/lib/renderers/dynamicBlockRenderer.js (1px = 1pt), jadi editor = PDF.
  // ───────────────────────────────────────────────────────────────────────────
  const lh = naturalLineHeight(isCert);
  const usableWidth = isCert ? 605 : paperOrientation === 'landscape' ? 742 : 485;
  const blockMargins = (block: DocumentBlock): React.CSSProperties => ({
    marginTop: Math.max(0, block.style.marginTop || 0),
    marginBottom: blockMarginBottom(block, lh),
  });

  // Logo/gambar posisi bebas: absolut terhadap kertas (= x/y/lebar pt di PDF), di atas latar, tidak ikut alur blok
  const renderFloatingImage = (block: DocumentBlock, editable: boolean, pageNum: number) => {
    const s = block.style, url = block.data.imageUrl;
    const sel = editable && selectedBlockId === block.id;
    const upload = (
      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleProcessLogoFile(e.target.files[0], block.id, 'imageUrl')} />
    );
    return (
      <div
        key={block.id}
        className={`absolute z-20 group/img ${editable ? 'cursor-move' : ''} ${sel ? 'ring-2 ring-orange-500' : editable ? 'hover:ring-1 hover:ring-orange-300' : ''}`}
        style={{ left: s.x || 0, top: s.y || 0, width: s.width || 100 }}
        onMouseDown={editable ? (e) => handleStartImageDrag(e, block, 'move') : undefined}
        onClick={editable ? (e) => { e.stopPropagation(); setSelectedBlockId(block.id); setActivePageNumber(pageNum); } : undefined}
        title={editable ? `${block.title} — geser untuk memindah, tarik sudut untuk ubah ukuran` : undefined}
      >
        {url ? (
          <img src={url} alt={block.title} draggable={false} className="block w-full h-auto select-none pointer-events-none" />
        ) : editable && (
          <label onMouseDown={(e) => e.stopPropagation()} className="h-12 border-2 border-dashed border-orange-300 hover:border-orange-500 bg-orange-50/80 rounded flex flex-col items-center justify-center cursor-pointer text-orange-600 text-[8px] font-bold">
            <Upload size={12} /> Unggah logo
            {upload}
          </label>
        )}
        {sel && (
          <>
            <div onMouseDown={(e) => e.stopPropagation()} className="absolute bottom-full left-0 mb-1.5 flex gap-1 whitespace-nowrap" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              <label className="px-2 py-0.5 bg-white hover:bg-orange-50 text-slate-800 border border-slate-200 rounded-md text-[9px] font-bold flex items-center gap-1 cursor-pointer shadow-sm">
                <Upload size={10} className="text-orange-600" /> Ganti
                {upload}
              </label>
              <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id, block.title); }} className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-[9px] font-bold flex items-center gap-1 shadow-sm">
                <Trash2 size={10} /> Hapus
              </button>
            </div>
            <div
              onMouseDown={(e) => handleStartImageDrag(e, block, 'resize')}
              className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-orange-600 border-2 border-white rounded-sm cursor-nwse-resize shadow"
              title={`Tarik untuk ubah ukuran (lebar ${s.width || 100}pt)`}
            />
          </>
        )}
      </div>
    );
  };

  const renderBlockContent = (block: DocumentBlock, isSelected: boolean, editable: boolean) => {
    const s = block.style, d = block.data;
    const stop = { draggable: false, onMouseDown: (e: React.MouseEvent) => e.stopPropagation() };
    const save = () => updateBlocks(currentBlocks);
    const fieldCls = 'bg-transparent outline-none border-0 p-0 m-0 rounded-sm hover:ring-1 hover:ring-slate-300 focus:ring-2 focus:ring-orange-400 focus:bg-white/90 placeholder:text-slate-300 transition-shadow';
    // Teks yang membungkus seperti di PDF: textarea setinggi isinya, tanpa border/padding
    const text = (value: string, onChange: (v: string) => void, style: React.CSSProperties, placeholder = '', onBlur = save) => !editable ? (
      <div className="whitespace-pre-wrap" style={{ lineHeight: lh, textAlign: 'inherit', ...style }}>{value}</div>
    ) : (
      <textarea
        {...stop}
        rows={1}
        ref={fitTextarea}
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); fitTextarea(e.target); }}
        onBlur={onBlur}
        className={`${fieldCls} w-full block resize-none overflow-hidden`}
        style={{ fontFamily: 'inherit', lineHeight: lh, textAlign: 'inherit', fieldSizing: 'content', ...style } as React.CSSProperties}
      />
    );
    const field = (key: string, style: React.CSSProperties, placeholder: string) =>
      text(d[key] || '', (v) => updateBlockDataById(block.id, { [key]: v }), style, placeholder);
    // Isian pendek di tengah kalimat ("Nomor: ___"), lebar mengikuti isi
    const inline = (key: string, placeholder: string) => !editable ? <span>{d[key]}</span> : (
      <input
        {...stop}
        type="text"
        value={d[key] || ''}
        placeholder={placeholder}
        size={Math.max(4, (d[key] || placeholder).length)}
        onChange={(e) => updateBlockDataById(block.id, { [key]: e.target.value })}
        onBlur={save}
        className={`${fieldCls} inline-block align-top`}
        style={{ font: 'inherit', color: 'inherit', height: `${lh}em`, fieldSizing: 'content' } as React.CSSProperties}
      />
    );
    // Isian kosong opsional tidak dicetak PDF, jadi hanya muncul saat blok dipilih
    const shown = (key: string) => !!d[key] || (editable && isSelected);

    switch (block.type) {
      case 'kop_surat': {
        // PDF: logo 44pt di x+10; teks mulai y+2 (geser 59pt bila ada logo); garis ganda 0.4 baris di bawah teks
        const logo = d.logoUrl;
        return (
          <div className="relative" style={{ textAlign: s.textAlign || 'center' }}>
            {(logo || editable) && (
              <div className={`absolute top-0 group/logo z-10 ${logo ? '' : 'opacity-0 group-hover:opacity-100'}`} style={{ left: 10, width: 44, height: 44 }}>
                {logo ? (
                  <img src={logo} alt="Logo" className="w-full h-full object-contain object-left-top" />
                ) : (
                  <div className="w-full h-full rounded border border-dashed border-orange-300 bg-orange-50/80 flex items-center justify-center text-orange-600 text-[8px] font-bold">Logo</div>
                )}
                {editable && (
                  <label {...stop} className="absolute inset-0 bg-slate-900/60 rounded opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white" title="Klik untuk Ganti Logo Kop Surat">
                    <Upload size={12} />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleProcessLogoFile(e.target.files[0], block.id)} />
                  </label>
                )}
              </div>
            )}
            <div style={{ paddingTop: 2, marginLeft: logo ? 59 : 0, marginRight: logo ? 10 : 0, minHeight: logo ? 48 : undefined }}>
              {field('institution', { fontSize: s.fontSize || 12, fontWeight: 700, color: '#0f172a' }, 'Nama Institusi / Lembaga')}
              <div style={{ height: 1 }} />
              {field('faculty', { fontSize: 9.5, fontWeight: 700, color: '#1e293b' }, 'Fakultas / Universitas')}
              <div style={{ height: 2 }} />
              {field('address', { fontSize: 8, color: '#64748b' }, 'Alamat & Kontak Lembaga')}
            </div>
            <div style={{ height: 0.4 * 8 * lh }} />
            {/* Garis 1pt di y & 2pt di y+2; seperti PDF, garis tidak menambah tinggi blok */}
            <div className="relative h-0">
              <div className="absolute inset-x-0 bg-[#0f172a]" style={{ top: -0.5, height: 1 }} />
              <div className="absolute inset-x-0 bg-[#0f172a]" style={{ top: 1, height: 2 }} />
            </div>
          </div>
        );
      }

      case 'judul_surat': {
        const meta = (['hal', 'lampiran'] as const).filter(k => d[k] || (editable && isSelected && d[k] !== undefined));
        return (
          <div style={{ textAlign: s.textAlign || 'center' }}>
            {field('title', { fontSize: s.fontSize || 13, fontWeight: s.fontWeight === 'normal' ? 400 : 700, color: s.color || '#0f172a' }, 'JUDUL SURAT RESMI')}
            {shown('nomor') && (
              <div style={{ marginTop: 2, fontSize: 10, lineHeight: lh, color: '#334155' }}>Nomor: {inline('nomor', '001/SKET/RA-KOLABFIT/2026')}</div>
            )}
            {meta.length > 0 && (
              <div style={{ marginTop: 2, fontSize: 9.5, lineHeight: lh, color: '#475569', whiteSpace: 'pre' }}>
                {meta.map((k, i) => (
                  <React.Fragment key={k}>
                    {i > 0 && '     |     '}
                    {k === 'hal' ? 'Hal: ' : 'Lampiran: '}{inline(k, k === 'hal' ? 'Perihal' : 'Lampiran')}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'paragraf_teks': {
        const paraStyle: React.CSSProperties = {
          tabSize: 24, // = TAB_SPACES di dynamicBlockRenderer.js
          fontSize: s.fontSize || 11,
          fontWeight: s.fontWeight === 'bold' ? 700 : 400,
          textAlign: s.textAlign || 'justify',
          lineHeight: s.lineHeight || 1.6,
          fontStyle: s.fontStyle || 'normal',
          color: s.color || '#0f172a'
        };
        if (!editable || (editingParaId !== block.id && (d.text || '').includes('**'))) return (
          <div
            onClick={editable ? () => { setSelectedBlockId(block.id); setEditingParaId(block.id); } : undefined}
            className={`whitespace-pre-wrap ${editable ? 'rounded-sm hover:ring-1 hover:ring-slate-300 cursor-text' : ''}`}
            style={paraStyle}
            title={editable ? 'Klik untuk mengedit (**teks** = tebal)' : undefined}
          >
            {richText(d.text || '')}
          </div>
        );
        return (
          <textarea
            {...stop}
            autoFocus={editingParaId === block.id}
            rows={1}
            ref={fitTextarea}
            value={d.text || ''}
            onChange={(e) => { updateBlockDataById(block.id, { text: e.target.value }); fitTextarea(e.target); }}
            onBlur={() => { save(); setEditingParaId(null); }}
            onKeyDown={(e) => {
              // Tab = sisipkan tab (rata kolom "Nama<Tab>: ..."), bukan pindah fokus
              if (e.key !== 'Tab' || e.shiftKey) return;
              e.preventDefault();
              const t = e.currentTarget, a = t.selectionStart, z = t.selectionEnd;
              updateBlockDataById(block.id, { text: t.value.slice(0, a) + '\t' + t.value.slice(z) });
              requestAnimationFrame(() => t.setSelectionRange(a + 1, a + 1));
            }}
            onFocus={() => setSelectedBlockId(block.id)}
            placeholder="Ketik teks paragraf surat di sini... (Tab untuk merapikan kolom, mis. Nama[Tab]: ...)"
            className={`${fieldCls} w-full block resize-none overflow-hidden`}
            style={{ ...paraStyle, fontFamily: 'inherit', fieldSizing: 'content' } as React.CSSProperties}
          />
        );
      }

      case 'tabel_data': {
        // PDF: judul 10pt + 0.3 baris; header min 22pt; baris min rowHeight (default 28); garis tidak menambah ukuran
        const colWidths = getBlockColumnWidths(block);
        const headers: string[] = d.headers || [];
        const rows: string[][] = d.rows || [];
        const fs = s.fontSize || 9.5;
        const padY = s.paddingY ?? 6, padX = s.paddingX ?? 8;
        const rowH = tableRowHeight(s);
        const sum = colWidths.reduce((a, b) => a + b, 0) || 100;
        const cell = (bw: number): React.CSSProperties => ({
          padding: `${padY}px ${padX}px`, verticalAlign: 'top',
          outline: `${bw}px solid var(--tb)`, outlineOffset: -bw / 2,
        });
        const btn = 'px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer';
        return (
          <div className="relative" style={{ '--tb': tableBorderColor(s) } as React.CSSProperties}>
            {editable && isSelected && (
              <div {...stop} className="absolute bottom-full left-0 right-0 mb-4 z-30 flex flex-wrap items-center justify-between gap-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-md" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                <input
                  type="text"
                  value={d.tableTitle || ''}
                  onChange={(e) => updateBlockDataById(block.id, { tableTitle: e.target.value })}
                  onBlur={save}
                  placeholder="Judul Tabel Data (Opsional)"
                  className="font-bold text-xs text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-orange-500 outline-none px-1 py-0.5 flex-1 min-w-[140px]"
                />
                <div className="flex items-center flex-wrap gap-1">
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-[10px]">
                    <span className="px-1 text-[9px] font-bold text-slate-400">Tinggi:</span>
                    {([['compact', 'Rapat', rowH <= 22], ['normal', 'Standar', rowH > 22 && rowH < 40], ['relaxed', 'Lega', rowH >= 40]] as const).map(([k, label, active]) => (
                      <button key={k} type="button" onClick={() => handleSetRowDensity(block.id, k)} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${active ? 'bg-orange-100 text-orange-700' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
                    ))}
                  </div>
                  <button type="button" onClick={() => handleDistributeColumnsEvenly(block.id)} className={`${btn} bg-white hover:bg-slate-100 text-slate-600 border border-slate-200`} title="Atur Semua Lebar Kolom Sama Rata">Bagi Rata</button>
                  <button type="button" onClick={() => handleAddTableColumn(block.id)} className={`${btn} bg-white hover:bg-slate-100 text-slate-700 border border-slate-200`} title="Tambah Kolom Baru"><Plus size={10} /> Kolom</button>
                  <button type="button" onClick={() => handleAddTableRow(block.id)} className={`${btn} bg-orange-600 hover:bg-orange-700 text-white`} title="Tambah Baris Baru"><Plus size={10} /> Baris</button>
                </div>
              </div>
            )}
            {d.tableTitle && (
              <div style={{ fontSize: 10, fontWeight: 700, lineHeight: lh, color: '#0f172a', marginBottom: 0.3 * 10 * lh }}>{d.tableTitle}</div>
            )}
            {headers.length > 0 && (
              <table className="w-full" style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0, lineHeight: lh }}>
                <colgroup>
                  {colWidths.map((w, i) => <col key={i} style={{ width: `${(w / sum) * 100}%` }} />)}
                </colgroup>
                <thead>
                  <tr>
                    {headers.map((h, hi) => (
                      <th key={hi} className="relative group/th font-bold" style={{ ...cell(0.8), height: 22, background: '#f1f5f9', color: '#0f172a', fontSize: fs, textAlign: 'center' }}>
                        {editable ? text(h, (v) => {
                          const next = [...headers]; next[hi] = v;
                          updateBlockDataById(block.id, { headers: next });
                        }, { fontWeight: 700 }) : h}
                        {editable && (
                          <>
                            {headers.length > 1 && (
                              <button
                                type="button"
                                {...stop}
                                onClick={(e) => { e.stopPropagation(); handleDeleteTableColumn(block.id, hi); }}
                                className="absolute -top-2 right-1 opacity-0 group-hover/th:opacity-100 bg-white text-slate-400 hover:text-red-600 border border-slate-200 p-0.5 rounded shadow-sm z-20"
                                title={`Hapus Kolom "${h || `Kolom ${hi + 1}`}"`}
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                            <span className="absolute left-0 right-0 -bottom-3 text-center text-[8px] font-mono font-normal text-slate-400 opacity-0 group-hover/th:opacity-100 pointer-events-none">{colWidths[hi]}%</span>
                            <div
                              draggable={false}
                              onMouseDown={(e) => handleStartColResize(e, block.id, hi)}
                              className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-orange-500 group-hover/th:bg-slate-300/70 z-20"
                              title="Tarik ke kiri/kanan untuk mengubah lebar kolom"
                            />
                          </>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri} className="group/tr">
                      {headers.map((_, ci) => (
                        <td
                          key={ci}
                          className="relative"
                          style={{
                            ...cell(0.6), height: rowH, fontSize: fs - 0.5, color: '#334155',
                            background: ri % 2 ? '#f8fafc' : undefined,
                            textAlign: ci === 0 && (colWidths[ci] / sum) * usableWidth < 45 ? 'center' : 'left'
                          }}
                        >
                          {editable ? text(row[ci] || '', (v) => {
                            const next = rows.map((r, rIdx) => rIdx === ri ? Object.assign([...r], { [ci]: v }) : r);
                            updateBlockDataById(block.id, { rows: next });
                          }, {}) : row[ci]}
                          {/* Tombol hapus baris di luar tabel (di margin kanan), tidak memakan lebar kolom */}
                          {editable && ci === headers.length - 1 && rows.length > 1 && (
                            <button
                              type="button"
                              {...stop}
                              onClick={(e) => { e.stopPropagation(); handleDeleteTableRow(block.id, ri); }}
                              className="absolute left-full top-1/2 -translate-y-1/2 ml-1.5 opacity-0 group-hover/tr:opacity-100 text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-md"
                              title={`Hapus Baris #${ri + 1}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      }

      case 'garis_pembatas': {
        // PDF: 4pt + garis + 4pt; style.width = panjang garis dari kiri
        const t = s.borderThickness || 1;
        return (
          <div style={{ padding: '4px 0' }}>
            <div style={{ height: t, background: s.borderColor || '#cbd5e1', width: s.width ? Math.min(s.width, usableWidth) : '100%' }} />
          </div>
        );
      }

      case 'tanda_tangan': {
        const fs = s.fontSize || 11;
        const sigH = signatureImgHeight(s);
        const center = s.textAlign === 'center';
        const sigField = (key: string, placeholder: string, style: React.CSSProperties = {}) =>
          field(key, { lineHeight: 1.3, ...style }, placeholder);
        return (
          <div style={{ fontSize: fs, lineHeight: 1.3, color: '#0f172a' }}>
            <div style={signatureBoxStyle(s.textAlign, s.width)}>
              {shown('cityDate') && sigField('cityDate', 'Bandung, 16 Oktober 2026')}
              {shown('salutation') && sigField('salutation', 'Hormat Saya,')}

              {/* Slot tanda tangan: 4 + tinggi gambar + 4, sama dengan PDF */}
              <div
                className={`flex items-center ${center ? 'justify-center' : 'justify-start'}`}
                style={{ height: sigH + 8 }}
                {...(editable ? {
                  ...stop,
                  onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); },
                  onDrop: (e: React.DragEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files?.[0]) handleProcessSignatureFile(e.dataTransfer.files[0], block.id);
                  }
                } : {})}
              >
                {d.signatureUrl ? (
                  <div className="relative group/sig h-full flex items-center">
                    <img src={d.signatureUrl} alt="Tanda Tangan Digital" style={{ height: sigH, width: 'auto', maxWidth: '100%' }} className="object-contain" />
                    {editable && (
                      <>
                        <div className="absolute inset-0 bg-slate-900/60 rounded-lg opacity-0 group-hover/sig:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <label className="px-2 py-1 bg-white hover:bg-orange-50 text-slate-800 rounded-md text-[9px] font-bold flex items-center gap-1 cursor-pointer">
                            <Upload size={10} className="text-orange-600" /> Ganti
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleProcessSignatureFile(e.target.files[0], block.id)} />
                          </label>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); updateBlockDataById(block.id, { signatureUrl: '' }, true); }}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-[9px] font-bold flex items-center gap-1"
                          >
                            <Trash2 size={10} /> Hapus
                          </button>
                        </div>
                        <div
                          draggable={false}
                          onMouseDown={(e) => handleStartSignatureResize(e, block)}
                          className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-orange-600 border-2 border-white rounded-sm cursor-nwse-resize shadow z-10 opacity-0 group-hover/sig:opacity-100"
                          title={`Tarik untuk ubah ukuran (${sigH}pt)`}
                        />
                      </>
                    )}
                  </div>
                ) : editable && (
                  <label className="h-full w-[160px] border-2 border-dashed border-orange-300 hover:border-orange-500 bg-orange-50/40 hover:bg-orange-50/80 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all text-center">
                    <Upload size={13} className="text-orange-600" />
                    <span className="text-[9px] font-bold text-slate-700">Unggah / seret tanda tangan</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleProcessSignatureFile(e.target.files[0], block.id)} />
                  </label>
                )}
              </div>

              {sigField('name', 'Nama Lengkap & Gelar', { fontWeight: 700, textDecoration: s.signatureLine ? 'none' : 'underline' })}
              {/* signatureLine: garis 0.75pt selebar blok + jarak 2pt (PDF) */}
              {s.signatureLine && <div style={{ height: 0.75, marginBottom: 1.25, background: '#231f20' }} />}
              {shown('nip') && <div>NIP. {inline('nip', '25850011')}</div>}
              {shown('role') && sigField('role', 'Jabatan Resmi')}
            </div>
          </div>
        );
      }

      case 'spasi_kosong':
        return (
          <div style={{ height: s.height || 24 }} className="w-full flex items-center justify-center">
            {editable && isSelected && (
              <span className="text-[9px] font-mono text-slate-400">Spasi ({s.height || 24}px)</span>
            )}
          </div>
        );

      default:
        return null;
    }
  };
  // ───────────────────────────────────────────────────────────────────────────
  // ACCESS GUARD: MAHASISWA (STUDENT) DILARANG MENGAKSES SURAT ADMINISTRASI
  // ───────────────────────────────────────────────────────────────────────────
  if (userRole === UserRole.STUDENT || !isLecturerOrAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-4 shadow-sm animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Akses Terbatas</h3>
          <p className="text-xs text-slate-500 max-w-md leading-relaxed">
            Halaman Surat Administrasi hanya dapat diakses oleh Dosen (Lecturer) dan Administrator. Mahasiswa (Student) tidak diizinkan mengakses fitur surat administrasi.
          </p>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VIEW 1: GALERI CARD TEMPLATE SURAT
  // ───────────────────────────────────────────────────────────────────────────
  if (currentView === 'gallery') {
    return (
      <div className="space-y-8 pb-20 animate-in fade-in duration-300">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 border border-orange-100">
                <Sparkles size={12} /> Galeri Template Resmi
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Surat <span className="text-orange-600">Administrasi</span>
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mt-2 max-w-2xl">
              Pilih template dokumen resmi Research Alliance Ko+Lab untuk membuat, mengatur komponen drag-and-drop, dan menerbitkan surat
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari jenis surat..."
                value={gallerySearch}
                onChange={(e) => setGallerySearch(e.target.value)}
                className="pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold w-full sm:w-64 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all"
              />
            </div>

            {/* Tombol Buat Template Baru */}
            <button
              type="button"
              onClick={handleOpenNewTemplateModal}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 transition-all shrink-0 cursor-pointer"
              title="Buat template surat baru"
            >
              <Plus size={16} className="stroke-[2.5]" />
              <span>Buat template baru</span>
            </button>

            {deletedTemplateIds.length > 0 && isLecturerOrAdmin && (
              <button
                type="button"
                onClick={handleRestoreAllTemplates}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-2xl font-bold text-xs transition-colors shrink-0"
                title="Pulihkan template yang disembunyikan"
              >
                <RotateCcw size={14} /> Pulihkan ({deletedTemplateIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-2">
          <span>Menampilkan {visibleTemplates.length} dari {allTemplates.length} template surat</span>
          <span className="hidden sm:inline">Editor Visual Drag and Drop & Pratinjau PDF Baku</span>
        </div>

        {/* Gallery Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
          {visibleTemplates.map((def) => {
            const IconComponent = def.icon;
            return (
              <div
                key={def.id}
                onClick={() => {
                  setActiveTypeId(def.id);
                  setCurrentView('editor');
                  setEditorMode('visual');
                }}
                className="bg-white rounded-[2rem] p-6 sm:p-7 border border-slate-100 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  {/* Top: Icon + Format Badge */}
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-14 h-14 rounded-2xl ${def.bgColor} ${def.color} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                      <IconComponent size={26} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(def as any).isCustom && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200">
                          Kustom
                        </span>
                      )}
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-200/60">
                        {def.paperFormat.split(' ')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Titles */}
                  <h2 className="text-xl font-black text-slate-900 group-hover:text-orange-600 transition-colors tracking-tight leading-snug">
                    {def.title}
                  </h2>
                  <p className="text-xs font-black text-orange-600 uppercase tracking-wider mt-1">
                    {def.subtitle}
                  </p>

                  {/* Description */}
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mt-3 line-clamp-3">
                    {def.description}
                  </p>

                  {/* Template Source File Tag */}
                  <div className="mt-4 pt-3 border-t border-slate-100/80">
                    <span className="text-[10px] font-bold text-slate-400 block truncate" title={def.templateFile}>
                      📄 {def.templateFile}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTypeId(def.id);
                      setCurrentView('editor');
                      setEditorMode('visual');
                    }}
                    className="flex-1 py-2.5 bg-slate-900 text-white hover:bg-orange-600 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Edit2 size={13} />
                    <span>Buka Editor Template</span>
                  </button>

                  {(isLecturerOrAdmin || (def as any).isCustom) && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTemplate(def, e)}
                      title="Hapus Template"
                      className="p-2.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Modal Buat Template Baru ── */}
        {showNewTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Buat Template Baru</h3>
                    <p className="text-xs text-slate-400 font-medium">Buat template surat kustom dengan komponen visual</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseNewTemplateModal}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Error Alert */}
              {newTemplateFormError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{newTemplateFormError}</span>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama / Judul Surat <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Surat Pengantar Lomba Inovasi"
                    value={newTemplateForm.title}
                    onChange={(e) => {
                      setNewTemplateForm(prev => ({ ...prev, title: e.target.value }));
                      if (newTemplateFormError) setNewTemplateFormError('');
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Sub-judul / Kategori
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Pendelegasian Tim Kompetisi"
                    value={newTemplateForm.subtitle}
                    onChange={(e) => setNewTemplateForm(prev => ({ ...prev, subtitle: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Deskripsi Singkat
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Jelaskan kegunaan template surat ini..."
                    value={newTemplateForm.description}
                    onChange={(e) => setNewTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all resize-none"
                  />
                </div>

                {/* Color Theme Selector */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Warna Aksen Kartu
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { id: 'blue', bg: 'bg-blue-500', name: 'Biru' },
                      { id: 'emerald', bg: 'bg-emerald-500', name: 'Hijau' },
                      { id: 'purple', bg: 'bg-purple-500', name: 'Ungu' },
                      { id: 'orange', bg: 'bg-orange-500', name: 'Oranye' },
                      { id: 'rose', bg: 'bg-rose-500', name: 'Merah' },
                      { id: 'amber', bg: 'bg-amber-500', name: 'Kuning' },
                      { id: 'teal', bg: 'bg-teal-500', name: 'Toska' },
                      { id: 'indigo', bg: 'bg-indigo-500', name: 'Nila' },
                    ].map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setNewTemplateForm(prev => ({ ...prev, colorScheme: col.id }))}
                        className={`w-8 h-8 rounded-xl ${col.bg} transition-all flex items-center justify-center ${
                          newTemplateForm.colorScheme === col.id ? 'ring-4 ring-orange-500/40 scale-110 shadow-md' : 'opacity-80 hover:opacity-100 hover:scale-105'
                        }`}
                        title={col.name}
                      >
                        {newTemplateForm.colorScheme === col.id && <Check size={14} className="text-white stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paper Orientation */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Orientasi Kertas
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewTemplateForm(prev => ({ ...prev, isLandscape: false }))}
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        !newTemplateForm.isLandscape
                          ? 'border-orange-500 bg-orange-50/50 text-orange-950 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="w-5 h-7 border-2 border-current rounded-sm shrink-0" />
                      <div>
                        <div className="text-xs font-black">Portrait</div>
                        <div className="text-[10px] text-slate-400">A4 (210 × 297 mm)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewTemplateForm(prev => ({ ...prev, isLandscape: true }))}
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        newTemplateForm.isLandscape
                          ? 'border-orange-500 bg-orange-50/50 text-orange-950 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="w-7 h-5 border-2 border-current rounded-sm shrink-0" />
                      <div>
                        <div className="text-xs font-black">Landscape</div>
                        <div className="text-[10px] text-slate-400">A4 (297 × 210 mm)</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseNewTemplateModal}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewTemplate}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Simpan & Buka Editor</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VIEW 2: DRAG & DROP VISUAL DOCUMENT EDITOR & PREVIEW (MATCHING REFERENCE UI)
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-16">
      {/* ─── 1. TOP APP BAR ─────────────────────────────────────────────────── */}
      <header className="bg-white rounded-2xl border border-slate-200/80 px-4 py-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Document Icon & Letter Title & Selector */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setCurrentView('gallery')}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
            title="Kembali ke Galeri Template"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
            <FileText size={18} />
          </div>

          <div className="min-w-0 flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-black text-slate-900 truncate">
              {activeDef.title}
            </h1>
            <div className="relative shrink-0">
              <select
                value={activeTypeId}
                onChange={(e) => {
                  setActiveTypeId(e.target.value);
                  setSelectedBlockId(null);
                }}
                className="pl-3 pr-7 py-1 text-[11px] font-black uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border-none outline-none appearance-none cursor-pointer"
              >
                {allTemplates.map(d => (
                  <option key={d.id} value={d.id}>{d.title} — {d.subtitle}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <span className="hidden xl:inline text-xs text-slate-400 truncate max-w-xs">
              {activeDef.description}
            </span>
          </div>
        </div>

        {/* Right: Undo/Redo, Preview, Batal, Simpan Template */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {/* Undo / Redo */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-colors disabled:opacity-30"
              title="Undo"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-colors disabled:opacity-30"
              title="Redo"
            >
              <RotateCw size={14} />
            </button>
          </div>

          {/* Preview Mode Toggle */}
          <button
            onClick={() => {
              if (editorMode === 'visual') {
                handleGeneratePdfPreview();
                setEditorMode('preview');
              } else {
                setEditorMode('visual');
              }
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              editorMode === 'preview'
                ? 'bg-orange-100 text-orange-700 border border-orange-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Eye size={14} />
            <span>{editorMode === 'preview' ? 'Kembali ke Editor' : 'Preview PDF'}</span>
          </button>

          {/* Fullscreen View Button */}
          <button
            onClick={() => {
              setIsFullscreen(true);
              setFullscreenTab(editorMode === 'preview' ? 'preview' : 'visual');
              setFullscreenZoom(100);
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            title="Lihat Dokumen Hasil Edit Layar Penuh (Fullscreen)"
          >
            <Maximize2 size={14} />
            <span>Fullscreen</span>
          </button>

          {/* Batal */}
          <button
            onClick={handleResetToDefaultTemplate}
            className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Batal
          </button>

          {/* Simpan Template */}
          <button
            onClick={handleSaveTemplate}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-orange-500/25 active:scale-95 transition-all"
          >
            <Check size={14} />
            <span>Simpan Template</span>
          </button>

          {/* Cetak PDF Button */}
          {isLecturerOrAdmin && (
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs transition-colors"
              title="Cetak & Unduh Dokumen Resmi"
            >
              {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
            </button>
          )}
        </div>
      </header>

      {/* ─── 2. SUB-TOOLBAR ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 px-4 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left Tabs: ELEMEN / LAYER */}
        <div className="flex items-center gap-1 border-b border-slate-100 sm:border-none pb-2 sm:pb-0">
          <button
            onClick={() => setLeftTab('ELEMEN')}
            className={`px-3.5 py-1.5 rounded-xl font-black uppercase tracking-wider transition-all text-[11px] ${
              leftTab === 'ELEMEN'
                ? 'bg-orange-50 text-orange-600 border border-orange-200/80 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Elemen
          </button>
          <button
            onClick={() => setLeftTab('LAYER')}
            className={`px-3.5 py-1.5 rounded-xl font-black uppercase tracking-wider transition-all text-[11px] flex items-center gap-1.5 ${
              leftTab === 'LAYER'
                ? 'bg-orange-50 text-orange-600 border border-orange-200/80 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Layer</span>
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center font-bold">
              {currentBlocks.length}
            </span>
          </button>
        </div>

        {/* Center: Canvas controls: A4, Potret/Lanskap, Zoom, Grid, Dimensions */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg text-[11px]">
            A4
          </span>

          <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
            <button
              onClick={() => setPaperOrientation('portrait')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                paperOrientation === 'portrait' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Potret
            </button>
            <button
              onClick={() => setPaperOrientation('landscape')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                paperOrientation === 'landscape' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Lanskap
            </button>
          </div>

          <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
            <button
              onClick={() => setZoom(prev => clampZoom(prev - 10))}
              className="p-1 hover:bg-white rounded-md text-slate-600"
              title="Perkecil"
            >
              <ZoomOut size={13} />
            </button>
            <span className="px-2 font-mono font-bold text-slate-700 text-[11px]">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom(prev => clampZoom(prev + 10))}
              className="p-1 hover:bg-white rounded-md text-slate-600"
              title="Perbesar"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors ${
              showGrid ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Grid size={13} />
            <span>Grid</span>
          </button>

          <button
            onClick={fitZoom}
            className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Sesuaikan kertas dengan lebar area kerja (Ctrl + scroll untuk zoom)"
          >
            Pas Lebar
          </button>

          <button
            onClick={() => setShowSidePanels(v => !v)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors ${
              showSidePanels ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-orange-50 text-orange-600 border border-orange-200'
            }`}
            title="Sembunyikan/tampilkan panel samping agar kanvas lebih lebar"
          >
            {showSidePanels ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
            <span>{showSidePanels ? 'Kanvas Penuh' : 'Tampilkan Panel'}</span>
          </button>

          {/* Page Counter & Add Page Quick Button */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5 ml-1">
            <button
              onClick={() => setRightTab('HALAMAN')}
              className="px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:text-slate-900 transition-colors"
              title="Kelola Halaman Surat"
            >
              {currentPagesCount} Hal
            </button>
            <button
              onClick={handleAddPage}
              className="px-2 py-0.5 bg-white hover:bg-orange-50 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs transition-colors"
              title="Tambah Halaman Baru"
            >
              <Plus size={11} />
              <span>Halaman</span>
            </button>
          </div>

          <span className="hidden lg:inline text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
            {paperOrientation === 'landscape' ? '297×210mm' : '210×297mm'} • {currentBlocks.length} blok
          </span>
        </div>

        {/* Right: Tabs GAYA / LAYOUT / HALAMAN / FORM */}
        <div className="flex items-center gap-1">
          {(['GAYA', 'LAYOUT', 'HALAMAN', 'FORM'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setRightTab(tab)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase transition-colors ${
                rightTab === tab
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 3. THREE-PANEL WORKSPACE ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ─── A. LEFT PANEL: ELEMEN DOKUMEN & LAYER ────────────────────────── */}
        <div className={`${showSidePanels ? "lg:col-span-3 xl:col-span-2" : "hidden"} bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-4 max-h-[calc(100vh-130px)] overflow-y-auto`}>
          {leftTab === 'ELEMEN' ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Elemen Dokumen
                </span>
                <span className="text-[10px] font-bold text-orange-600">
                  Klik untuk Tambah
                </span>
              </div>

              {/* Element Palette Items */}
              <div className="space-y-2.5">
                {AVAILABLE_PALETTE_ELEMENTS.map(item => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.type}
                      onClick={() => handleAddBlock(item.type)}
                      className="p-3 bg-slate-50/70 hover:bg-white border border-slate-100 hover:border-orange-300 rounded-xl transition-all cursor-pointer group flex items-center justify-between shadow-2xs hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg border ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                          <Icon size={17} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 tracking-tight leading-tight">
                            {item.label}
                          </h4>
                          <span className="text-[10px] font-medium text-slate-400 mt-0.5 block">
                            {item.desc}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="w-6 h-6 rounded-lg bg-white group-hover:bg-orange-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-colors shadow-2xs"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Tips Card */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1 mt-4">
                <div className="flex items-center gap-1.5 text-blue-700 font-black text-[10px] uppercase tracking-wider">
                  <Sparkles size={12} /> TIPS
                </div>
                <p className="text-[10px] font-medium text-blue-900/80 leading-relaxed">
                  Seret handle di samping elemen untuk mengatur urutan. Tekan tombol Preview di kanan atas untuk pratinjau PDF final.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Layer Panel */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Daftar Blok Layer ({currentBlocks.length})
                </span>
              </div>

              <div className="space-y-1.5">
                {currentBlocks.map((block, i) => (
                  <div
                    key={block.id}
                    onClick={() => setSelectedBlockId(block.id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      selectedBlockId === block.id
                        ? 'bg-orange-50/80 border-orange-300 text-orange-950 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[9px] font-mono font-bold text-slate-400 w-4">
                        #{i + 1}
                      </span>
                      <span className="text-xs font-bold truncate max-w-[130px]">
                        {block.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveBlock(i, 'up'); }}
                        disabled={i === 0}
                        className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveBlock(i, 'down'); }}
                        disabled={i === currentBlocks.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20"
                      >
                        <ChevronDown size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id, block.title); }}
                        className="p-1 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ─── B. CENTER CANVAS: INTERACTIVE A4 DOCUMENT SHEET ───────────────── */}
        <div ref={canvasRef} className={`${showSidePanels ? "lg:col-span-6 xl:col-span-7" : "lg:col-span-12"} bg-slate-100/90 rounded-2xl border border-slate-200/80 p-3 sm:p-4 overflow-auto max-h-[calc(100vh-130px)] min-h-[580px] relative`}>
          {editorMode === 'visual' ? (
            /* Visual Interactive Canvas with Multi-Page Support */
            <div className="flex flex-col items-center gap-10 min-w-full w-max py-4 px-8">
              {Array.from({ length: currentPagesCount }, (_, idx) => idx + 1).map((pageNum) => {
                const pageBlocks = currentBlocks.filter(b => (b.pageNumber || 1) === pageNum);
                const isCurrentActivePage = activePageNumber === pageNum;

                return (
                  <div key={`page-wrapper-${pageNum}`} className="flex flex-col items-center gap-2 w-full">
                    {/* Page Header Bar */}
                    <div
                      style={{
                        width: paperOrientation === 'landscape' ? `${842 * (zoom / 100)}px` : `${595 * (zoom / 100)}px`
                      }}
                      className="flex items-center justify-between px-2 text-xs text-slate-500 font-semibold max-w-full"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActivePageNumber(pageNum)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                            isCurrentActivePage
                              ? 'bg-orange-600 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          Halaman {pageNum} dari {currentPagesCount} {isCurrentActivePage ? '• Aktif' : ''}
                        </button>
                        <span className="text-[10px] text-slate-400 font-medium">
                          ({pageBlocks.length} komponen)
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {currentPagesCount > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeletePage(pageNum)}
                            className="text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded-lg flex items-center gap-1 font-bold transition-colors"
                            title={`Hapus Halaman ${pageNum}`}
                          >
                            <Trash2 size={11} />
                            <span>Hapus Halaman</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Single A4 Paper Sheet for this page */}
                    <div
                      onClick={() => setActivePageNumber(pageNum)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        if (pageBlocks.length === 0) {
                          handleDropOnPage(e, pageNum);
                        }
                      }}
                      style={paperStyle(zoom)}
                      className={`bg-white rounded-sm shadow-2xl relative text-slate-900 outline outline-1 outline-slate-200/70 shrink-0 ${
                        showGrid ? 'bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:16px_16px]' : ''
                      } ${isCurrentActivePage ? 'ring-2 ring-orange-500/50' : ''}`}
                    >
                      {/* Batas bawah area cetak PDF: isi yang melewati garis ini pindah ke halaman berikutnya di PDF */}
                      <div
                        className="absolute inset-x-0 border-t border-dashed border-red-300/80 pointer-events-none"
                        style={{ top: (paperOrientation === 'landscape' ? 595 : 842) - (isCert ? 30 : paperOrientation === 'landscape' ? 40 : 50) }}
                        title="Batas bawah halaman PDF"
                      />
                      {pageBlocks.filter(b => b.type === 'gambar').map(b => renderFloatingImage(b, true, pageNum))}
                      {pageBlocks.length === 0 ? (
                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDropOnPage(e, pageNum)}
                          className="h-72 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-2 select-none"
                        >
                          <Layers size={28} className="text-slate-300" />
                          <p className="text-xs font-bold text-slate-600">Halaman {pageNum} masih kosong</p>
                          <p className="text-[11px] text-slate-400 max-w-xs">
                            Pilih elemen dari panel sebelah kiri untuk menambahkan konten ke halaman ini atau seret elemen ke sini.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleAddBlock('paragraf_teks')}
                            className="mt-2 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                          >
                            <Plus size={12} />
                            <span>Tambah Paragraf</span>
                          </button>
                        </div>
                      ) : (
                        // flex-col: margin antar blok dijumlah (tidak "collapse"), sama seperti PDF
                        <div className="flex flex-col">
                          {pageBlocks.filter(b => b.type !== 'gambar').map((block) => {
                            const index = currentBlocks.findIndex(b => b.id === block.id);
                            const isSelected = selectedBlockId === block.id;
                            const isDragged = draggedBlockIndex === index;
                            const isDragOver = dragOverBlockIndex === index;

                            return (
                              <div
                                key={block.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDrop={(e) => handleDrop(e, index, pageNum)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBlockId(block.id);
                                  setActivePageNumber(pageNum);
                                }}
                      className={`relative group rounded-sm transition-shadow cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-orange-500 bg-orange-50/20'
                          : 'hover:ring-1 hover:ring-slate-300'
                      } ${isDragged ? 'opacity-40' : ''} ${
                        isDragOver ? 'shadow-[0_-2px_0_#f97316]' : ''
                      }`}
                      style={{
                        ...blockMargins(block),
                        paddingLeft: `${block.style.paddingX || 8}px`,
                        paddingRight: `${block.style.paddingX || 8}px`,
                        // Padding sorotan tidak menggeser isi dari margin kertas (agar sejajar PDF)
                        marginLeft: `-${block.style.paddingX || 8}px`,
                        marginRight: `-${block.style.paddingX || 8}px`
                      }}
                    >
                      {/* Drag Handle & Quick Actions on Left & Right */}
                      <div className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex flex-col items-center gap-0.5 text-slate-400 transition-opacity">
                        <GripVertical size={16} className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-900" />
                      </div>

                      {isSelected && (
                        <div className="absolute -top-3.5 left-2 bg-orange-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm z-10 flex items-center gap-1">
                          <span>{block.title}</span>
                        </div>
                      )}

                      {/* Isi blok: sama dengan layar penuh & PDF */}
                      {renderBlockContent(block, isSelected, true)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    })}

    {/* Bottom Add Page Button */}
    <div className="pt-2 pb-6">
      <button
        type="button"
        onClick={handleAddPage}
        className="px-5 py-2.5 bg-white hover:bg-orange-50 border-2 border-dashed border-orange-300 hover:border-orange-500 text-orange-600 hover:text-orange-700 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
      >
        <Plus size={15} />
        <span>Tambah Halaman Baru (Halaman {currentPagesCount + 1})</span>
      </button>
    </div>
  </div>
) : (
            /* Live PDF Preview Mode */
            <div className="w-full h-full flex flex-col items-center justify-center min-h-[520px]">
              {previewUrl ? (
                <iframe
                  src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="w-full h-[680px] rounded-lg shadow-xl border border-slate-200"
                  title="PDF Live Document Preview"
                />
              ) : (
                <div className="p-8 text-center">
                  <Loader2 size={32} className="animate-spin text-orange-600 mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-600">Membuat Pratinjau Dokumen PDF Resmi...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── C. RIGHT PANEL: GAYA, LAYOUT, HALAMAN, FORM ───────────────────── */}
        <div className={`${showSidePanels ? "lg:col-span-3" : "hidden"} bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-4 max-h-[calc(100vh-130px)] overflow-y-auto`}>
          {rightTab === 'HALAMAN' ? (
            /* Dedicated Halaman tab: accessible whether an element is selected or not */
            <div className="space-y-4 text-xs animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Pengaturan Dokumen
                  </span>
                  <h3 className="text-xs font-black text-slate-900 mt-0.5">
                    Halaman & Tata Letak
                  </h3>
                </div>
              </div>

              {/* Standar Dokumen */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Standar Dokumen</span>
                <p className="font-bold text-slate-800">Telkom University (A4 ISO 216)</p>
                <p className="text-[11px] text-slate-500">210 mm × 297 mm</p>
              </div>

              {/* Orientasi Dokumen */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-600">Orientasi Dokumen</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaperOrientation('portrait')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      paperOrientation === 'portrait' ? 'bg-orange-50 border-orange-300 text-orange-600 shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Potret (Tegak)
                  </button>
                  <button
                    onClick={() => setPaperOrientation('landscape')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      paperOrientation === 'landscape' ? 'bg-orange-50 border-orange-300 text-orange-600 shadow-2xs' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Lanskap (Mendatar)
                  </button>
                </div>
              </div>

              {/* Kelola Daftar Halaman */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-600">
                    Daftar Halaman ({currentPagesCount})
                  </label>
                  <button
                    onClick={handleAddPage}
                    className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs transition-colors"
                  >
                    <Plus size={11} />
                    <span>Tambah</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {Array.from({ length: currentPagesCount }, (_, i) => i + 1).map((p) => {
                    const countOnPage = currentBlocks.filter(b => (b.pageNumber || 1) === p).length;
                    const isActive = activePageNumber === p;

                    return (
                      <div
                        key={p}
                        onClick={() => setActivePageNumber(p)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                          isActive
                            ? 'bg-orange-50/80 border-orange-300 text-orange-950 font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isActive ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {p}
                          </span>
                          <div>
                            <p className="text-xs font-bold">Halaman {p} {isActive ? '(Aktif)' : ''}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{countOnPage} komponen terpasang</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {currentPagesCount > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePage(p);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={`Hapus Halaman ${p}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Jika ada elemen yang dipilih, sediakan opsi pemindahan cepat */}
              {selectedBlock && (
                <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200 space-y-2 pt-2.5 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-800">
                      Pindah Elemen Terpilih
                    </span>
                    <span className="text-[9px] font-bold text-orange-600 truncate max-w-[120px]">
                      {selectedBlock.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Posisikan komponen ini pada halaman:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: currentPagesCount }, (_, i) => i + 1).map((p) => {
                      const isCurrentPage = (selectedBlock.pageNumber || 1) === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleMoveBlockToPage(selectedBlock.id, p)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isCurrentPage
                              ? 'bg-orange-600 text-white shadow-xs'
                              : 'bg-white hover:bg-orange-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          Hal {p} {isCurrentPage ? '✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : selectedBlock ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Header: Selected Block info */}
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Properti Elemen
                    </span>
                    <span className="px-1.5 py-0.2 bg-orange-100 text-orange-700 rounded text-[9px] font-bold">
                      Hal {selectedBlock.pageNumber || 1}
                    </span>
                  </div>
                  <h3 className="text-xs font-black text-slate-900 mt-0.5">
                    {selectedBlock.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedBlockId(null)}
                  className="text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                >
                  Tutup
                </button>
              </div>

              {/* TAB GAYA */}
              {rightTab === 'GAYA' && (
                <div className="space-y-4 text-xs">
                  {/* Font Size */}
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                      <span>Ukuran Font</span>
                      <span className="font-mono">{selectedBlock.style.fontSize || 11}pt</span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={28}
                      value={selectedBlock.style.fontSize || 11}
                      onChange={(e) => updateSelectedStyle({ fontSize: Number(e.target.value) })}
                      className="w-full accent-orange-600"
                    />
                  </div>

                  {/* Text Alignment */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      Perataan Teks
                    </label>
                    <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl">
                      {(['left', 'center', 'right', 'justify'] as const).map(align => (
                        <button
                          key={align}
                          onClick={() => updateSelectedStyle({ textAlign: align })}
                          className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${
                            selectedBlock.style.textAlign === align
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {align === 'left' && <AlignLeft size={14} />}
                          {align === 'center' && <AlignCenter size={14} />}
                          {align === 'right' && <AlignRight size={14} />}
                          {align === 'justify' && <AlignJustify size={14} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bold & Italic */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      Format Karakter
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateSelectedStyle({ fontWeight: selectedBlock.style.fontWeight === 'bold' ? 'normal' : 'bold' })}
                        className={`flex-1 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1 border ${
                          selectedBlock.style.fontWeight === 'bold'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Bold size={13} /> Tebal
                      </button>
                      <button
                        onClick={() => updateSelectedStyle({ fontStyle: selectedBlock.style.fontStyle === 'italic' ? 'normal' : 'italic' })}
                        className={`flex-1 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1 border ${
                          selectedBlock.style.fontStyle === 'italic'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Italic size={13} /> Miring
                      </button>
                    </div>
                  </div>

                  {/* Text Color */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      Warna Teks
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedBlock.style.color || '#0f172a'}
                        onChange={(e) => updateSelectedStyle({ color: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0"
                      />
                      <input
                        type="text"
                        value={selectedBlock.style.color || '#0f172a'}
                        onChange={(e) => updateSelectedStyle({ color: e.target.value })}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Table Row Height & Cell Padding in GAYA Tab */}
                  {selectedBlock.type === 'tabel_data' && (
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                          <span>Warna Garis Tabel</span>
                          <span className="font-mono">{tableBorderColor(selectedBlock.style)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={tableBorderColor(selectedBlock.style)}
                            onChange={(e) => updateSelectedStyle({ borderColor: e.target.value })}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0"
                            title="Pilih warna garis"
                          />
                          {[['Hitam', '#000000'], ['Abu Gelap', '#475569'], ['Abu Muda', '#cbd5e1']].map(([label, c]) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => updateSelectedStyle({ borderColor: c })}
                              className={`flex-1 px-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${
                                tableBorderColor(selectedBlock.style) === c ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              <span className="w-2.5 h-2.5 rounded-sm border border-slate-300" style={{ background: c }} />
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                          <span>Tinggi Minimal Baris</span>
                          <span className="font-mono">{selectedBlock.style.rowHeight || 28}px</span>
                        </div>
                        <input
                          type="range"
                          min={18}
                          max={64}
                          value={selectedBlock.style.rowHeight || 28}
                          onChange={(e) => updateSelectedStyle({ rowHeight: Number(e.target.value) })}
                          className="w-full accent-orange-600"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                          <span>Padding Vertikal Sel</span>
                          <span className="font-mono">{selectedBlock.style.paddingY ?? 6}px</span>
                        </div>
                        <input
                          type="range"
                          min={2}
                          max={24}
                          value={selectedBlock.style.paddingY ?? 6}
                          onChange={(e) => updateSelectedStyle({ paddingY: Number(e.target.value) })}
                          className="w-full accent-orange-600"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                          <span>Padding Horizontal Sel</span>
                          <span className="font-mono">{selectedBlock.style.paddingX ?? 8}px</span>
                        </div>
                        <input
                          type="range"
                          min={4}
                          max={24}
                          value={selectedBlock.style.paddingX ?? 8}
                          onChange={(e) => updateSelectedStyle({ paddingX: Number(e.target.value) })}
                          className="w-full accent-orange-600"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB LAYOUT */}
              {rightTab === 'LAYOUT' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                      <span>Margin Atas (Spacing Top)</span>
                      <span className="font-mono">{selectedBlock.style.marginTop || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={60}
                      value={selectedBlock.style.marginTop || 0}
                      onChange={(e) => updateSelectedStyle({ marginTop: Number(e.target.value) })}
                      className="w-full accent-orange-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                      <span>Margin Bawah (Spacing Bottom)</span>
                      <span className="font-mono">{selectedBlock.style.marginBottom || 16}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={80}
                      value={selectedBlock.style.marginBottom || 16}
                      onChange={(e) => updateSelectedStyle({ marginBottom: Number(e.target.value) })}
                      className="w-full accent-orange-600"
                    />
                  </div>

                  {selectedBlock.type === 'spasi_kosong' && (
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                        <span>Tinggi Spasi</span>
                        <span className="font-mono">{selectedBlock.style.height || 24}px</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={120}
                        value={selectedBlock.style.height || 24}
                        onChange={(e) => updateSelectedStyle({ height: Number(e.target.value) })}
                        className="w-full accent-orange-600"
                      />
                    </div>
                  )}

                  {selectedBlock.type === 'tanda_tangan' && (
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                        <span>Ukuran Tanda Tangan</span>
                        <span className="font-mono">{signatureImgHeight(selectedBlock.style)}pt</span>
                      </div>
                      <input
                        type="range"
                        min={24}
                        max={160}
                        value={signatureImgHeight(selectedBlock.style)}
                        onChange={(e) => updateSelectedStyle({ signatureHeight: Number(e.target.value) })}
                        className="w-full accent-orange-600"
                      />
                      <div className="flex gap-1 mt-1.5">
                        {([['Kecil', 40], ['Sedang', 56], ['Besar', 80], ['Sangat Besar', 110]] as const).map(([label, h]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => updateSelectedStyle({ signatureHeight: h })}
                            className={`flex-1 px-1 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                              signatureImgHeight(selectedBlock.style) === h ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Bisa juga tarik kotak oranye di sudut gambar tanda tangan pada kanvas.</p>
                    </div>
                  )}

                  {selectedBlock.type === 'gambar' && (
                    <div className="grid grid-cols-3 gap-2">
                      {([['x', 'X (kiri)'], ['y', 'Y (atas)'], ['width', 'Lebar']] as const).map(([k, label]) => (
                        <label key={k} className="block text-[11px] font-bold text-slate-600">
                          {label} (pt)
                          <input
                            type="number"
                            step={1}
                            min={k === 'width' ? 16 : 0}
                            value={selectedBlock.style[k] ?? (k === 'width' ? 100 : 0)}
                            onChange={(e) => updateSelectedStyle({ [k]: Number(e.target.value) })}
                            className="mt-1 w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </label>
                      ))}
                    </div>
                  )}

                  {selectedBlock.type === 'garis_pembatas' && (
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                        <span>Ketebalan Garis</span>
                        <span className="font-mono">{selectedBlock.style.borderThickness || 1}px</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={6}
                        value={selectedBlock.style.borderThickness || 1}
                        onChange={(e) => updateSelectedStyle({ borderThickness: Number(e.target.value) })}
                        className="w-full accent-orange-600"
                      />
                    </div>
                  )}

                  {/* Posisi Halaman Komponen di Tab Layout */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Posisikan pada Halaman
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: currentPagesCount }, (_, i) => i + 1).map((p) => {
                        const isCurrentPage = (selectedBlock.pageNumber || 1) === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleMoveBlockToPage(selectedBlock.id, p)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              isCurrentPage
                                ? 'bg-orange-600 text-white shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            Halaman {p} {isCurrentPage ? '✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB FORM / KONTEN BLOK */}
              {rightTab === 'FORM' && (
                <div className="space-y-3 text-xs">
                  {selectedBlock.type === 'paragraf_teks' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Isi Teks Paragraf
                      </label>
                      <textarea
                        rows={6}
                        value={selectedBlock.data.text || ''}
                        onChange={(e) => updateSelectedData({ text: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500 outline-none leading-relaxed"
                      />
                    </div>
                  )}

                  {selectedBlock.type === 'judul_surat' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Judul Surat
                        </label>
                        <input
                          type="text"
                          value={selectedBlock.data.title || ''}
                          onChange={(e) => updateSelectedData({ title: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Nomor Surat
                        </label>
                        <input
                          type="text"
                          value={selectedBlock.data.nomor || ''}
                          onChange={(e) => updateSelectedData({ nomor: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Hal / Perihal
                        </label>
                        <input
                          type="text"
                          value={selectedBlock.data.hal || ''}
                          onChange={(e) => updateSelectedData({ hal: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                          placeholder="Perihal surat"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Lampiran
                        </label>
                        <input
                          type="text"
                          value={selectedBlock.data.lampiran || ''}
                          onChange={(e) => updateSelectedData({ lampiran: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                          placeholder="Lampiran surat"
                        />
                      </div>
                    </>
                  )}

                  {selectedBlock.type === 'tabel_data' && (() => {
                    const colWidths = getBlockColumnWidths(selectedBlock);
                    const headers = selectedBlock.data.headers || [];
                    const rows = selectedBlock.data.rows || [];

                    return (
                      <div className="space-y-3.5">
                        {/* Table Title */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Judul Tabel Data
                          </label>
                          <input
                            type="text"
                            value={selectedBlock.data.tableTitle || ''}
                            onChange={(e) => updateSelectedData({ tableTitle: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                            placeholder="Contoh: Lampiran Data Mahasiswa"
                          />
                        </div>

                        {/* Row Height & Density Controls */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                              Tinggi & Kerapatan Baris
                            </label>
                            <span className="text-[11px] font-mono font-bold text-orange-600">
                              {selectedBlock.style.rowHeight || 28}px
                            </span>
                          </div>

                          {/* Quick Presets */}
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSetRowDensity(selectedBlock.id, 'compact')}
                              className={`py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                (selectedBlock.style.rowHeight || 28) <= 22
                                  ? 'bg-orange-50 border-orange-300 text-orange-700 font-black shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              Rapat (20px)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetRowDensity(selectedBlock.id, 'normal')}
                              className={`py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                (selectedBlock.style.rowHeight || 28) > 22 && (selectedBlock.style.rowHeight || 28) < 40
                                  ? 'bg-orange-50 border-orange-300 text-orange-700 font-black shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              Standar (28px)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetRowDensity(selectedBlock.id, 'relaxed')}
                              className={`py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                (selectedBlock.style.rowHeight || 28) >= 40
                                  ? 'bg-orange-50 border-orange-300 text-orange-700 font-black shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              Lega (44px)
                            </button>
                          </div>

                          {/* Slider for exact row height */}
                          <div>
                            <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                              <span>Tinggi Minimal Baris</span>
                              <span className="font-mono">{selectedBlock.style.rowHeight || 28}px</span>
                            </div>
                            <input
                              type="range"
                              min={18}
                              max={64}
                              value={selectedBlock.style.rowHeight || 28}
                              onChange={(e) => updateSelectedStyle({ rowHeight: Number(e.target.value) })}
                              className="w-full accent-orange-600"
                            />
                          </div>

                          {/* Slider for vertical cell padding */}
                          <div>
                            <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                              <span>Padding Vertikal Baris</span>
                              <span className="font-mono">{selectedBlock.style.paddingY ?? 6}px</span>
                            </div>
                            <input
                              type="range"
                              min={2}
                              max={24}
                              value={selectedBlock.style.paddingY ?? 6}
                              onChange={(e) => updateSelectedStyle({ paddingY: Number(e.target.value) })}
                              className="w-full accent-orange-600"
                            />
                          </div>
                        </div>

                        {/* Column Management & Width Controls */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                              Kelola Kolom & Lebar ({headers.length})
                            </label>
                            <button
                              type="button"
                              onClick={() => handleDistributeColumnsEvenly(selectedBlock.id)}
                              className="text-[10px] font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
                            >
                              Bagi Rata
                            </button>
                          </div>

                          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                            {headers.map((h: string, hi: number) => (
                              <div key={hi} className="p-2 bg-white rounded-lg border border-slate-200 space-y-1.5 shadow-2xs">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {hi + 1}
                                  </span>
                                  <input
                                    type="text"
                                    value={h}
                                    onChange={(e) => {
                                      const nextH = [...headers];
                                      nextH[hi] = e.target.value;
                                      updateSelectedData({ headers: nextH });
                                    }}
                                    className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold"
                                    placeholder={`Kolom ${hi + 1}`}
                                  />
                                  <button
                                    type="button"
                                    disabled={headers.length <= 1}
                                    onClick={() => handleDeleteTableColumn(selectedBlock.id, hi)}
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                      headers.length <= 1
                                        ? 'text-slate-300 cursor-not-allowed'
                                        : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                    }`}
                                    title={headers.length <= 1 ? 'Minimal 1 kolom' : 'Hapus Kolom'}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>

                                {/* Width Slider for this column */}
                                <div className="flex items-center gap-2 pt-0.5">
                                  <span className="text-[10px] text-slate-400 shrink-0">Lebar:</span>
                                  <input
                                    type="range"
                                    min={5}
                                    max={80}
                                    value={colWidths[hi] || 25}
                                    onChange={(e) => handleSetColumnWidth(selectedBlock.id, hi, Number(e.target.value))}
                                    className="flex-1 accent-orange-600 h-1"
                                  />
                                  <span className="text-[10px] font-mono font-bold text-slate-700 w-8 text-right shrink-0">
                                    {colWidths[hi] || 25}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddTableColumn(selectedBlock.id)}
                            className="w-full py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus size={12} /> Tambah Kolom Baru
                          </button>
                        </div>

                        {/* Row Management */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                              Daftar Baris ({rows.length})
                            </label>
                            <button
                              type="button"
                              onClick={() => handleAddTableRow(selectedBlock.id)}
                              className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5 cursor-pointer"
                            >
                              <Plus size={11} /> Baris
                            </button>
                          </div>

                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {rows.map((row: string[], ri: number) => (
                              <div key={ri} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                                <div className="flex items-center gap-2 overflow-hidden flex-1">
                                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                    #{ri + 1}
                                  </span>
                                  <span className="text-[11px] text-slate-600 truncate">
                                    {row.filter(Boolean).join(' • ') || 'Baris kosong'}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  disabled={rows.length <= 1}
                                  onClick={() => handleDeleteTableRow(selectedBlock.id, ri)}
                                  className={`p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
                                    rows.length <= 1
                                      ? 'text-slate-300 cursor-not-allowed'
                                      : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                  }`}
                                  title={rows.length <= 1 ? 'Minimal 1 baris data' : `Hapus Baris #${ri + 1}`}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {selectedBlock.type === 'tanda_tangan' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Kota & Tanggal
                        </label>
                        <input
                          type="text"
                          value={selectedBlock.data.cityDate || ''}
                          onChange={(e) => updateSelectedData({ cityDate: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Salam Penutup
                        </label>
                        <input
                          type="text"
                          value={selectedBlock.data.salutation || ''}
                          onChange={(e) => updateSelectedData({ salutation: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Nama Penandatangan
                        </label>
                        <input
                          type="text"
                          value={selectedBlock.data.name || ''}
                          onChange={(e) => updateSelectedData({ name: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          NIP
                        </label>
                        <input
                          type="text"
                          value={selectedBlock.data.nip || ''}
                          onChange={(e) => updateSelectedData({ nip: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Jabatan
                        </label>
                        <input
                          type="text"
                          value={selectedBlock.data.role || ''}
                          onChange={(e) => updateSelectedData({ role: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>

                      {/* Signature Upload in Inspector */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Gambar Tanda Tangan
                        </label>
                        {selectedBlock.data.signatureUrl ? (
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                            <img src={selectedBlock.data.signatureUrl} alt="TTD" className="h-10 object-contain drop-shadow-2xs" />
                            <div className="flex items-center gap-2">
                              <label className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-colors">
                                Ganti
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleProcessSignatureFile(e.target.files[0], selectedBlock.id);
                                    }
                                  }}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  updateSelectedData({ signatureUrl: '' });
                                }}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="border-2 border-dashed border-slate-200 hover:border-orange-400 p-4 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-50/50 hover:bg-orange-50/30 transition-all text-center">
                            <Upload size={18} className="text-orange-600" />
                            <span className="text-xs font-bold text-slate-700">Unggah Gambar Tanda Tangan</span>
                            <span className="text-[10px] text-slate-400">PNG, JPG, atau WEBP (Maks. 2MB)</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleProcessSignatureFile(e.target.files[0], selectedBlock.id);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </>
                  )}

                  {selectedBlock.type === 'kop_surat' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Logo Lembaga
                        </label>
                        <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
                          {selectedBlock.data.logoUrl ? (
                            <img src={selectedBlock.data.logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                              Ko+Lab
                            </div>
                          )}
                          <label className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-colors">
                            {selectedBlock.data.logoUrl ? 'Ganti Logo' : 'Unggah Logo'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleProcessLogoFile(e.target.files[0], selectedBlock.id);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Nama Lembaga / Research Alliance
                        </label>
                        <input
                          type="text"
                          value={selectedBlock.data.institution || ''}
                          onChange={(e) => updateSelectedData({ institution: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Fakultas / Universitas
                        </label>
                        <input
                          type="text"
                          value={selectedBlock.data.faculty || ''}
                          onChange={(e) => updateSelectedData({ faculty: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Alamat / Kontak
                        </label>
                        <textarea
                          rows={2}
                          value={selectedBlock.data.address || ''}
                          onChange={(e) => updateSelectedData({ address: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Quick Actions at bottom */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => handleDuplicateBlock(selectedBlock)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Copy size={13} /> Duplikat
                </button>
                <button
                  onClick={() => handleDeleteBlock(selectedBlock.id, selectedBlock.title)}
                  className="p-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 rounded-xl transition-colors"
                  title="Hapus Elemen"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mb-3">
                <Sliders size={24} />
              </div>
              <h4 className="text-xs font-black text-slate-700">Pilih Elemen</h4>
              <p className="text-[11px] font-medium text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                Klik salah satu elemen di kanvas dokumen untuk mengatur gaya, layout, dan kontennya.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── FULLSCREEN DOCUMENT PREVIEW MODAL ─── */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col text-slate-100 animate-in fade-in duration-200">
          {/* Top Fullscreen Toolbar */}
          <div className="h-16 px-4 sm:px-6 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 shadow-lg">
            {/* Left: Back Button & Title */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-white/10 shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer"
                title="Kembali ke Mode Editor (Tekan Esc)"
              >
                <ArrowLeft size={16} />
                <span>Kembali</span>
              </button>

              <div className="h-6 w-px bg-slate-800 hidden sm:block" />

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-white truncate max-w-[180px] sm:max-w-md">
                    {activeDef.title}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-600/30 text-orange-400 border border-orange-500/30">
                    Fullscreen
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {currentPagesCount} Halaman • {paperOrientation === 'landscape' ? 'Lanskap' : 'Potret'} (A4)
                </p>
              </div>
            </div>

            {/* Center: Mode Switcher & Zoom */}
            <div className="flex items-center gap-3">
              {/* Mode Toggle */}
              <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
                <button
                  type="button"
                  onClick={() => setFullscreenTab('visual')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    fullscreenTab === 'visual'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tampilan Surat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!previewUrl) handleGeneratePdfPreview();
                    setFullscreenTab('preview');
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    fullscreenTab === 'preview'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pratinjau PDF
                </button>
              </div>

              {/* Zoom Controls (Active in visual mode) */}
              {fullscreenTab === 'visual' && (
                <div className="hidden md:flex items-center bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-700/60 text-xs gap-1">
                  <button
                    type="button"
                    onClick={() => setFullscreenZoom(z => Math.max(50, z - 10))}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Perkecil"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span className="font-mono px-1.5 text-xs text-slate-300 min-w-[45px] text-center font-bold">
                    {fullscreenZoom}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setFullscreenZoom(z => Math.min(160, z + 10))}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Perbesar"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFullscreenZoom(100)}
                    className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-white rounded hover:bg-slate-700 font-bold ml-1 transition-colors cursor-pointer"
                    title="Skala Asli 100%"
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() => setFullscreenZoom(85)}
                    className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-white rounded hover:bg-slate-700 font-bold transition-colors cursor-pointer"
                    title="Sesuaikan Ukuran Layar"
                  >
                    Pas Layar
                  </button>
                </div>
              )}
            </div>

            {/* Right: Download & Exit */}
            <div className="flex items-center gap-2">
              {isLecturerOrAdmin && (
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-600/30 transition-all cursor-pointer disabled:opacity-50"
                  title="Unduh PDF Resmi"
                >
                  {isDownloading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Printer size={14} />
                  )}
                  <span className="hidden sm:inline">Cetak Dokumen</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Keluar Fullscreen (Esc)"
              >
                <Minimize2 size={18} />
              </button>
            </div>
          </div>

          {/* Fullscreen Body View */}
          <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start">
            {fullscreenTab === 'visual' ? (
              <div className="flex flex-col items-center gap-8 py-4">
                {Array.from({ length: currentPagesCount }, (_, idx) => idx + 1).map((pageNum) => {
                  const pageBlocks = currentBlocks.filter(b => (b.pageNumber || 1) === pageNum);

                  return (
                    <div key={`fs-page-${pageNum}`} className="flex flex-col items-center gap-2">
                      <div
                        style={{
                          width: paperOrientation === 'landscape' ? `${842 * (fullscreenZoom / 100)}px` : `${595 * (fullscreenZoom / 100)}px`
                        }}
                        className="flex items-center justify-between px-2 text-xs text-slate-400 font-medium"
                      >
                        <span>Halaman {pageNum} dari {currentPagesCount}</span>
                        <span className="text-[11px] text-slate-500 font-mono">A4 • 210 × 297 mm</span>
                      </div>

                      {/* Clean Paper Sheet */}
                      <div
                        style={paperStyle(fullscreenZoom)}
                        className="bg-white rounded-sm shadow-2xl relative text-slate-900 outline outline-1 outline-slate-300/40 pointer-events-auto"
                      >
                        {/* Render document blocks cleanly */}
                        {pageBlocks.length === 0 ? (
                          <div className="h-64 flex items-center justify-center text-slate-300 italic text-sm">
                            Halaman {pageNum} kosong.
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            {pageBlocks.filter(b => b.type === 'gambar').map(b => renderFloatingImage(b, false, pageNum))}
                            {pageBlocks.filter(b => b.type !== 'gambar').map((block) => (
                              <div key={block.id} inert style={blockMargins(block)}>
                                {renderBlockContent(block, false, false)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="w-full max-w-5xl h-full min-h-[600px] flex items-center justify-center">
                {previewUrl ? (
                  <iframe
                    src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full min-h-[calc(100vh-120px)] rounded-xl shadow-2xl border border-slate-700"
                    title="PDF Fullscreen Live Preview"
                  />
                ) : (
                  <div className="p-12 text-center">
                    <Loader2 size={36} className="animate-spin text-orange-500 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-300">Memuat Pratinjau Dokumen PDF Resmi...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuratAdministrasiView;
