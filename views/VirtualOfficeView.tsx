import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Box, ChevronLeft, RotateCcw, RotateCw, Settings2 } from 'lucide-react';
import { api } from '../api';
import {
  virtualOfficeRoomIds, virtualOfficeRooms,
  type VirtualOfficeArea, type VirtualOfficePerson, type VirtualOfficePoint,
  type VirtualOfficeRoomId, type VirtualOfficeRoomText, type VirtualOfficeSettings
} from '../lib/virtualOfficeRooms';

const overviewTitle = 'Denah Gabungan Ko+Lab';
const inputStyle = 'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-orange-700 focus:outline-none focus:ring-1 focus:ring-orange-700';
const secondary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50';
const primary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800 disabled:opacity-50';

type Scene = ReturnType<typeof import('../lib/virtualOfficeScene.js').mountVirtualOffice>;
type Overrides = NonNullable<VirtualOfficeSettings['rooms']>;
type ProjectedPoint = { id: string; x: number; y: number; visible: boolean };
const emptyPeople: VirtualOfficePerson[] = [];

function requestError(error: unknown, fallback: string) {
  return error instanceof Error && error.name === 'Error' ? error.message : fallback;
}

function Viewer({ rooms, fixedArea, onPick, selectedPerson }: {
  rooms: Overrides;
  fixedArea?: VirtualOfficeRoomId;
  onPick?: (point: VirtualOfficePoint) => void;
  selectedPerson?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<Scene | null>(null);
  const pickHandler = useRef(onPick);
  const [area, setArea] = useState<VirtualOfficeArea>(fixedArea ?? 'overview');
  const [zoom, setZoom] = useState(100);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [showImage, setShowImage] = useState(false);
  const [mapUrl, setMapUrl] = useState('');
  const [mapError, setMapError] = useState('');
  const [projection, setProjection] = useState<ProjectedPoint[]>([]);
  const staticView = showImage || status === 'fallback';
  const people = area === 'overview' ? emptyPeople : rooms[area]?.people ?? emptyPeople;

  const changeArea = useCallback((selected: VirtualOfficeArea) => {
    setArea(selected);
    setZoom(100);
    scene.current?.show(selected);
  }, []);

  useEffect(() => {
    pickHandler.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let mounted = true;
    import('../lib/virtualOfficeScene.js').then(({ mountVirtualOffice }) => {
      if (!mounted || !canvas.current) return;
      scene.current = mountVirtualOffice(canvas.current, {
        onSelect: changeArea,
        onUnavailable: () => { if (mounted) setStatus('fallback'); },
        onPick: (point: VirtualOfficePoint) => pickHandler.current?.(point),
        onProjection: setProjection
      }, fixedArea ?? 'overview');
      setStatus('ready');
    }).catch(() => {
      if (mounted) setStatus('fallback');
    });

    return () => {
      mounted = false;
      scene.current?.dispose();
      scene.current = null;
    };
  }, [changeArea, fixedArea]);

  useEffect(() => {
    if (status !== 'ready') return;
    scene.current?.setMarkers(people.flatMap(person => person.point ? [{ id: person.id, ...person.point }] : []));
  }, [people, status]);

  useEffect(() => {
    if (!staticView) return;
    const request = new AbortController();
    let url = '';
    setMapError('');
    api.getVirtualOfficeMap(request.signal).then(blob => {
      if (request.signal.aborted) return;
      url = URL.createObjectURL(blob);
      setMapUrl(url);
    }).catch(error => {
      if (!request.signal.aborted) setMapError(requestError(error, 'Gambar denah belum dapat dimuat.'));
    });

    return () => {
      request.abort();
      if (url) URL.revokeObjectURL(url);
      setMapUrl('');
    };
  }, [staticView]);

  const roomName = (id: VirtualOfficeRoomId) => rooms[id]?.name || virtualOfficeRooms[id].name;
  const name = area === 'overview' ? overviewTitle : roomName(area);
  const description = area === 'overview'
    ? [roomName('ngolab'), roomName('coworking'), 'lorong di samping ' + roomName('redbox'),
      roomName('jago'), roomName('studio'), 'lorong server', roomName('kroombox')].join(' → ')
    : rooms[area]?.description || virtualOfficeRooms[area].description;

  return (
    <section aria-label="Penjelajah denah Ko+Lab" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">{name}</h2>
        {!fixedArea && (
          <label className="block w-full max-w-xs space-y-1 text-sm font-semibold">
            <span>Area</span>
            <select className={inputStyle} value={area} disabled={status === 'loading'}
              onChange={event => changeArea(event.target.value as VirtualOfficeArea)}>
              <option value="overview">{overviewTitle}</option>
              {virtualOfficeRoomIds.map(id => (
                <option key={id} value={id}>{roomName(id)}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="relative isolate aspect-[5/4] min-h-56 overflow-hidden rounded-xl bg-stone-100 sm:aspect-[16/10]">
        <canvas ref={canvas} aria-label={'Model 3D ' + name} role="img" hidden={staticView}
          className={'absolute inset-0 h-full w-full touch-pan-y ' + (onPick ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing')} />
        {status === 'ready' && !staticView && projection.map(marker => {
          const person = people.find(person => person.id === marker.id);
          if (!person || !marker.visible) return null;
          return (
            <div key={marker.id} aria-hidden="true"
              className="pointer-events-none absolute max-w-[9rem] -translate-x-1/2 -translate-y-full text-center sm:max-w-[13rem]"
              style={{ left: marker.x + '%', top: marker.y + '%' }}>
              <div className={'rounded-md px-2 py-1 leading-tight shadow ' +
                (selectedPerson === marker.id ? 'bg-orange-950 text-white ring-2 ring-orange-400' : 'bg-slate-900 text-white')}>
                <span className="block truncate text-xs font-semibold">{person.name || 'Posisi baru'}</span>
                {person.title && <span className="block truncate text-xs font-normal text-white/90">{person.title}</span>}
              </div>
              <div className="mx-auto h-2 w-2 rounded-full bg-orange-500 ring-1 ring-white" />
            </div>
          );
        })}
        {status === 'loading' && !staticView && (
          <p role="status" className="absolute inset-0 grid place-items-center p-4 text-sm text-slate-700">Memuat denah 3D…</p>
        )}
        {staticView && (mapUrl
          ? <img src={mapUrl} alt="Denah gabungan enam area Ko+Lab" className="h-full w-full object-contain" />
          : <p role={mapError ? 'alert' : 'status'} className="absolute inset-0 grid place-items-center p-4 text-sm text-slate-700">
              {mapError || 'Memuat gambar denah…'}
            </p>)}
      </div>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-[1_1_24rem]" aria-live="polite">
          <p className="text-sm text-slate-700">{description}</p>
          {status === 'ready' && !staticView && <p className="mt-1 text-sm text-slate-600">
            {onPick ? 'Klik lantai untuk menaruh penanda. Geser untuk memutar.' : area === 'overview'
              ? 'Geser untuk memutar. Klik ruang pada denah untuk melihat detailnya.'
              : 'Geser untuk memutar model ruang.'}
          </p>}
          {status === 'fallback' && <p role="status" className="mt-1 text-sm text-slate-600">Tampilan 3D tidak tersedia di browser ini. Denah statis ditampilkan.</p>}
        </div>
        {status === 'ready' && !staticView && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button type="button" className={secondary} aria-label="Putar ke kiri" onClick={() => scene.current?.rotate(-1)}><RotateCcw aria-hidden size={17} /></button>
            <button type="button" className={secondary} aria-label="Putar ke kanan" onClick={() => scene.current?.rotate(1)}><RotateCw aria-hidden size={17} /></button>
            <label className="ml-1 flex items-center gap-2 text-sm">
              Zoom
              <input className="w-24 accent-orange-700" type="range" value={zoom} min={75} max={160}
                onChange={event => {
                  const next = Number(event.target.value);
                  setZoom(next);
                  scene.current?.setZoom(next);
                }} />
            </label>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {!fixedArea && area !== 'overview' && (
          <button type="button" className={secondary} onClick={() => changeArea('overview')}>
            <ChevronLeft aria-hidden size={17} /> Denah gabungan
          </button>
        )}
        {status === 'ready' && !fixedArea && (
          <button type="button" className={secondary} onClick={() => setShowImage(previous => !previous)}>
            {showImage ? 'Kembali ke 3D' : 'Lihat gambar denah'}
          </button>
        )}
        <span className="text-slate-600">Ukuran ruang dan lebar lorong masih perkiraan.</span>
      </div>
      {!fixedArea && area !== 'overview' && people.length > 0 && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <h3 className="mb-2 text-sm font-semibold">Orang di ruang ini</h3>
          <ul className="flex flex-wrap gap-2">
            {people.map(person => (
              <li key={person.id} className="max-w-full break-words rounded-lg bg-slate-100 px-3 py-2 text-sm">
                <span className="font-semibold">{person.name}</span>
                <span className="block text-slate-700">{person.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PeopleEditor({ rooms, update }: {
  rooms: Overrides;
  update: (room: VirtualOfficeRoomId, people: VirtualOfficePerson[]) => void;
}) {
  const [room, setRoom] = useState<VirtualOfficeRoomId>(virtualOfficeRoomIds[0]);
  const [selectedId, setSelectedId] = useState<string>();
  const people = rooms[room]?.people ?? emptyPeople;
  const selected = people.find(person => person.id === selectedId);

  function edit(change: Partial<VirtualOfficePerson>) {
    if (!selected) return;
    update(room, people.map(person => person.id === selected.id ? { ...person, ...change } : person));
  }

  return (
    <section aria-label="Posisi orang di denah" className="space-y-4 rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-bold">Posisi orang di denah</h3>
          <label className="mt-2 block max-w-xs space-y-1 text-sm">
            <span>Ruang untuk penanda</span>
            <select className={inputStyle} value={room} onChange={event => {
              setRoom(event.target.value as VirtualOfficeRoomId);
              setSelectedId(undefined);
            }}>
              {virtualOfficeRoomIds.map(id => (
                <option key={id} value={id}>{rooms[id]?.name || virtualOfficeRooms[id].name}</option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" className={secondary} disabled={people.length >= 40} onClick={() => {
          const id = crypto.randomUUID();
          update(room, [...people, { id, name: '', title: '' }]);
          setSelectedId(id);
        }}>Tambah orang</button>
      </div>
      {people.length === 0 && <p className="text-sm text-slate-600">Belum ada penanda di ruang ini.</p>}
      {people.length > 0 && (
        <ul className="divide-y divide-slate-200">
          {people.map(person => (
            <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <p className="min-w-0 break-words text-sm">
                <span className="font-semibold">{person.name || 'Orang baru'}</span>
                {person.title && <span className="block text-slate-700">{person.title}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={secondary} aria-pressed={selectedId === person.id}
                  onClick={() => setSelectedId(person.id)}>Edit penanda</button>
                <button type="button" className={secondary} onClick={() => {
                  if (selectedId === person.id) setSelectedId(undefined);
                  update(room, people.filter(candidate => candidate.id !== person.id));
                }}>Hapus penanda</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span>Nama orang</span>
              <input className={inputStyle} value={selected.name} maxLength={100}
                onChange={event => edit({ name: event.target.value })} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Jabatan</span>
              <input className={inputStyle} value={selected.title} maxLength={120}
                onChange={event => edit({ title: event.target.value })} />
            </label>
          </div>
          <p className="text-sm text-slate-600" role="status">
            {selected.point ? 'Posisi terpilih. Klik lantai lagi untuk memindahkan penanda.' : 'Klik lantai denah untuk menentukan posisi orang ini.'}
          </p>
          <Viewer key={room} rooms={rooms} fixedArea={room} selectedPerson={selected.id} onPick={point => edit({ point })} />
          <details className="text-sm text-slate-700">
            <summary>Atur koordinat posisi</summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(['x', 'z'] as const).map(axis => (
                <label key={axis} className="space-y-1">
                  <span>Koordinat {axis.toUpperCase()}</span>
                  <input className={inputStyle} type="number" step="any"
                    value={selected.point?.[axis] ?? ''} onChange={event => {
                      const value = event.target.valueAsNumber;
                      if (Number.isFinite(value)) edit({ point: { x: 0, z: 0, ...selected.point, [axis]: value } });
                    }} />
                </label>
              ))}
            </div>
          </details>
        </>
      )}
    </section>
  );
}

function Settings({
  initial, close, onSave
}: {
  initial: VirtualOfficeSettings;
  close: () => void;
  onSave: (settings: VirtualOfficeSettings) => void;
}) {
  const [published, setPublished] = useState(initial.published);
  const [rooms, setRooms] = useState<Overrides>(initial.rooms ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const version = useRef(initial.version);

  function edit(id: VirtualOfficeRoomId, field: keyof VirtualOfficeRoomText, value: string) {
    setRooms(previous => ({
      ...previous,
      [id]: { name: '', description: '', ...previous[id], [field]: value }
    }));
    setNotice('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    const incomplete = virtualOfficeRoomIds.find(id => rooms[id]?.people?.some(person =>
      !person.name.trim() || !person.title.trim() || !person.point
    ));
    if (incomplete) {
      setError(`Lengkapi nama, jabatan, dan posisi untuk setiap penanda di ${virtualOfficeRooms[incomplete].name}.`);
      return;
    }
    setSaving(true);
    try {
      const settings = await api.virtualOfficeRequest({ published, rooms, version: version.current });
      version.current = settings.version;
      setRooms(settings.rooms ?? {});
      onSave(settings);
      setNotice('Pengaturan tersimpan.');
    } catch (error) {
      setError(requestError(error, 'Pengaturan belum dapat disimpan.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-bold">Pengaturan Virtual Office</h2>
        <button type="button" className={secondary} disabled={saving} onClick={close}>Kembali ke denah</button>
      </div>
      <fieldset disabled={saving} className="min-w-0 space-y-5">
        <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 font-semibold">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-orange-700" checked={published}
            onChange={event => { setPublished(event.target.checked); setNotice(''); }} />
          <span>Tampilkan Virtual Office untuk mahasiswa dan dosen</span>
        </label>
        <p className="text-sm text-slate-600">Kosongkan kolom untuk memakai nama atau deskripsi bawaan.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {virtualOfficeRoomIds.map(id => (
            <fieldset key={id} className="min-w-0 space-y-2 rounded-xl border border-slate-200 p-4">
              <legend className="px-1 text-sm font-semibold">{virtualOfficeRooms[id].name}</legend>
              <label className="block space-y-1 text-sm">
                <span>Nama area</span>
                <input className={inputStyle} value={rooms[id]?.name ?? ''} maxLength={100}
                  placeholder={virtualOfficeRooms[id].name} onChange={event => edit(id, 'name', event.target.value)} />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Deskripsi</span>
                <textarea className={inputStyle} rows={3} value={rooms[id]?.description ?? ''} maxLength={600}
                  placeholder={virtualOfficeRooms[id].description} onChange={event => edit(id, 'description', event.target.value)} />
              </label>
            </fieldset>
          ))}
        </div>
        <PeopleEditor rooms={rooms} update={(id, people) => {
          setRooms(previous => ({
            ...previous, [id]: { name: '', description: '', ...previous[id], people }
          }));
          setNotice('');
        }} />
        <button type="submit" className={primary}>{saving ? 'Menyimpan…' : 'Simpan pengaturan'}</button>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-sm font-medium text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-3 text-sm font-medium text-emerald-800">{notice}</p>}
    </form>
  );
}

export default function VirtualOfficeView({ isAdmin }: { isAdmin: boolean }) {
  const [settings, setSettings] = useState<VirtualOfficeSettings | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    let mounted = true;
    setError('');
    api.virtualOfficeRequest().then(result => {
      if (mounted) setSettings(result);
    }).catch(error => {
      if (mounted) setError(requestError(error, 'Virtual Office belum dapat dimuat.'));
    });
    return () => { mounted = false; };
  }, [attempt]);

  const canManage = isAdmin && settings?.version !== undefined;
  return (
    <div className="min-w-0 space-y-5 text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
          <Box aria-hidden size={25} /> Virtual Office 3D
        </h1>
        {canManage && !managing && (
          <button type="button" className={secondary} onClick={() => setManaging(true)}>
            <Settings2 aria-hidden size={18} /> Kelola Virtual Office
          </button>
        )}
      </header>
      {error && (
        <div>
          <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>
          <button type="button" className={secondary} onClick={() => setAttempt(value => value + 1)}>Coba lagi</button>
        </div>
      )}
      {!settings && !error && <p role="status" className="text-sm text-slate-600">Memuat Virtual Office…</p>}
      {settings && (
        managing && canManage
          ? <Settings initial={settings} close={() => setManaging(false)} onSave={setSettings} />
          : settings.published || canManage
            ? <>{!settings.published && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Pratinjau admin. Denah sedang disembunyikan untuk mahasiswa dan dosen.</p>}
              <Viewer rooms={settings.rooms ?? {}} /></>
            : <p role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">Virtual Office belum ditayangkan.</p>
      )}
    </div>
  );
}
