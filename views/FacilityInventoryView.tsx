import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Building2, Package, Plus, RefreshCw, Search } from 'lucide-react';
import { api } from '../api';

const conditions = { GOOD: 'Baik', MINOR_DAMAGE: 'Rusak ringan', MAJOR_DAMAGE: 'Rusak berat' };
const statuses = { AVAILABLE: 'Tersedia', IN_USE: 'Digunakan', MAINTENANCE: 'Dalam perawatan', RETIRED: 'Tidak aktif' };

type Room = { id: string; code: string; name: string; floor: string | null; notes: string | null };
type AssetState = { roomId: string; condition: keyof typeof conditions; status: keyof typeof statuses };
type Asset = AssetState & {
  id: string; code: string; name: string; category: string;
  custodian: string | null; notes: string | null; version: number;
};
type Snapshot = AssetState & { roomCode: string; roomName: string };
type HistoryEntry = { id: string; previousState: Snapshot | null; currentState: Snapshot; changedBy: string; changedAt: number };
type Inventory = { rooms: Room[]; assets: Asset[] };
type Panel = { type: 'room'; room?: Room } | { type: 'asset'; asset?: Asset } | { type: 'history'; asset: Asset };
type Props = { showConfirm: (title: string, message: string, action: () => void) => void };

const inputStyle = 'w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-orange-600 focus:outline-none focus:ring-1 focus:ring-orange-600';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl bg-orange-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-800 disabled:opacity-50';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50';
const rowButton = 'rounded-md px-2 py-1 text-sm font-semibold text-orange-800 hover:bg-orange-50 disabled:opacity-50';
const sectionStyle = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-6';

function formError(error: unknown) {
  if (error instanceof Error && error.name !== 'TypeError' && error.name !== 'TimeoutError') return error.message;
  return 'Koneksi ke server terputus atau melebihi batas waktu. Periksa koneksi dan muat ulang daftar.';
}

function TextField({ label, name, value, length, required }: {
  label: string; name: string; value?: string | null; length: number; required?: boolean;
}) {
  return (
    <label className="block space-y-1.5 text-sm font-semibold">
      <span>{label}{required && <span className="text-orange-800"> *</span>}</span>
      <input name={name} defaultValue={value ?? ''} required={required} maxLength={length} className={inputStyle} />
    </label>
  );
}

function History({ asset, close, heading }: { asset: Asset; close: () => void; heading: React.RefObject<HTMLHeadingElement | null> }) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.facilityInventoryRequest<HistoryEntry[]>(`/assets/${asset.id}/history`).then(result => {
      if (active) setEntries(result);
    }).catch(error => {
      if (active) setError(formError(error));
    });
    return () => { active = false; };
  }, [asset.id]);

  return (
    <section className={sectionStyle} aria-label="Riwayat aset">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 ref={heading} tabIndex={-1} className="scroll-mt-6 text-lg font-bold">Riwayat aset</h2>
          <p className="mt-1 text-sm text-slate-600">{asset.code} · {asset.name}</p>
        </div>
        <button type="button" className={secondaryButton} onClick={close}>Tutup riwayat</button>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      {entries === null && !error && <p role="status" className="mt-4 text-sm text-slate-600">Memuat riwayat…</p>}
      {entries?.length === 0 && <p className="mt-4 text-sm text-slate-600">Belum ada riwayat.</p>}
      {entries && entries.length > 0 && (
        <ol className="mt-4 divide-y divide-slate-200">
          {entries.map(({ id, previousState: before, currentState: after, changedBy, changedAt }) => (
            <li key={id} className="space-y-1 py-3 text-sm">
              <p className="font-semibold">{before ? 'Pembaruan aset' : 'Pencatatan aset'}</p>
              <p className="text-slate-600">{new Date(changedAt).toLocaleString('id-ID', {
                dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta'
              })} WIB · {changedBy}</p>
              {(!before || before.roomId !== after.roomId) && (
                <p>Ruang <span className="text-slate-600">{before && `${before.roomName} (${before.roomCode}) → `}{after.roomName} ({after.roomCode})</span></p>
              )}
              {(!before || before.condition !== after.condition) && (
                <p>Kondisi <span className="text-slate-600">{before && `${conditions[before.condition]} → `}{conditions[after.condition]}</span></p>
              )}
              {(!before || before.status !== after.status) && (
                <p>Status <span className="text-slate-600">{before && `${statuses[before.status]} → `}{statuses[after.status]}</span></p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function FacilityInventoryView({ showConfirm }: Props) {
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [section, setSection] = useState<'assets' | 'rooms'>('assets');
  const [panel, setPanel] = useState<Panel | null>(null);
  const [query, setQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const panelHeading = useRef<HTMLHeadingElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setInventory(await api.facilityInventoryRequest<Inventory>());
    } catch (error) {
      setLoadError(formError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (panel) {
      panelHeading.current?.focus({ preventScroll: true });
      panelHeading.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [panel]);
  const rooms = inventory?.rooms ?? [];
  const assets = inventory?.assets ?? [];
  const roomById = new Map(rooms.map(room => [room.id, room]));
  const roomCounts = new Map<string, number>();
  for (const asset of assets) roomCounts.set(asset.roomId, (roomCounts.get(asset.roomId) ?? 0) + 1);
  const categories = [...new Set(assets.map(asset => asset.category))].sort((a, b) => a.localeCompare(b, 'id'));
  const search = query.trim().toLocaleLowerCase('id');
  const matches = (...values: (string | null | undefined)[]) =>
    values.some(value => value?.toLocaleLowerCase('id').includes(search));
  const filteredAssets = assets.filter(asset => (
    (!roomFilter || roomFilter === asset.roomId) &&
    (!statusFilter || statusFilter === asset.status) &&
    (!categoryFilter || categoryFilter === asset.category) &&
    matches(asset.code, asset.name, asset.category, asset.custodian, roomById.get(asset.roomId)?.name)
  ));
  const filteredRooms = rooms.filter(room => matches(room.name, room.code, room.floor));

  function openPanel(next: Panel | null) {
    setSaveError('');
    setNotice('');
    setPanel(next);
  }

  function changeSection(next: 'assets' | 'rooms') {
    setSection(next);
    setQuery('');
    openPanel(null);
  }

  function startRoom() {
    changeSection('rooms');
    openPanel({ type: 'room' });
  }

  async function mutate(path: string, method: string, message: string, body?: unknown) {
    setSaving(true);
    setSaveError('');
    setNotice('');
    try {
      await api.facilityInventoryRequest(path, method, body);
      setPanel(null);
      setNotice(message);
      await load();
    } catch (error) {
      setSaveError(formError(error));
    } finally {
      setSaving(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !panel || panel.type === 'history') return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    if (panel.type === 'room') {
      const path = panel.room ? `/rooms/${panel.room.id}` : '/rooms';
      void mutate(path, panel.room ? 'PUT' : 'POST', 'Ruang tersimpan.', fields);
    } else {
      const path = panel.asset ? `/assets/${panel.asset.id}` : '/assets';
      void mutate(path, panel.asset ? 'PUT' : 'POST', 'Aset tersimpan.', { ...fields, version: panel.asset?.version });
    }
  }

  const busy = loading || saving;
  const openAsset = panel?.type === 'asset' ? panel.asset : undefined;
  const openRoom = panel?.type === 'room' ? panel.room : undefined;

  return (
    <div className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Kelola Aset Sarana</h1>
          <p className="mt-1 text-sm text-slate-600">Inventaris ruang dan aset fisik Ko+Lab.</p>
        </div>
        <button type="button" className={secondaryButton} disabled={busy} onClick={() => void load()}>
          <RefreshCw size={16} aria-hidden /> Muat ulang
        </button>
      </header>
      <div className="flex flex-wrap gap-2" aria-label="Bagian inventaris">
        <button type="button" aria-pressed={section === 'assets'} disabled={saving}
          className={section === 'assets' ? primaryButton : secondaryButton} onClick={() => changeSection('assets')}>
          <Package size={17} aria-hidden /> Aset {inventory && `(${assets.length})`}
        </button>
        <button type="button" aria-pressed={section === 'rooms'} disabled={saving}
          className={section === 'rooms' ? primaryButton : secondaryButton} onClick={() => changeSection('rooms')}>
          <Building2 size={17} aria-hidden /> Ruang {inventory && `(${rooms.length})`}
        </button>
      </div>
      {loadError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{loadError}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {saveError && !panel && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{saveError}</p>}
      {loading && !inventory && <p role="status" className="text-sm text-slate-600">Memuat inventaris…</p>}

      {panel?.type === 'history' && <History key={panel.asset.id} asset={panel.asset} heading={panelHeading} close={() => openPanel(null)} />}
      {panel && panel.type !== 'history' && (
        <section className={sectionStyle}>
          <h2 ref={panelHeading} tabIndex={-1} className="mb-4 scroll-mt-6 text-lg font-bold">
            {panel.type === 'room' ? (openRoom ? 'Edit ruang' : 'Tambah ruang') : (openAsset ? 'Edit aset' : 'Tambah aset')}
          </h2>
          <form key={openRoom?.id ?? openAsset?.id ?? panel.type} onSubmit={submit}>
            <fieldset disabled={saving} className="grid min-w-0 gap-4 sm:grid-cols-2">
              <TextField label={panel.type === 'room' ? 'Kode ruang' : 'Kode aset'} name="code" value={(openRoom ?? openAsset)?.code} length={40} required />
              <TextField label={panel.type === 'room' ? 'Nama ruang' : 'Nama aset'} name="name" value={(openRoom ?? openAsset)?.name} length={120} required />
              {panel.type === 'room' ? (
                <TextField label="Lantai atau area" name="floor" length={60} value={openRoom?.floor} />
              ) : (
                <>
                  <label className="block space-y-1.5 text-sm font-semibold">
                    <span>Kategori <span className="text-orange-800">*</span></span>
                    <input name="category" list="facility-categories" defaultValue={openAsset?.category}
                      required maxLength={80} className={inputStyle} />
                    <datalist id="facility-categories">{categories.map(category => <option key={category} value={category} />)}</datalist>
                  </label>
                  <label className="block space-y-1.5 text-sm font-semibold">
                    <span>Ruang <span className="text-orange-800">*</span></span>
                    <select name="roomId" defaultValue={openAsset?.roomId ?? ''} required className={inputStyle}>
                      <option value="" disabled>Pilih ruang</option>
                      {rooms.map(room => <option key={room.id} value={room.id}>{room.name} ({room.code})</option>)}
                    </select>
                  </label>
                  <label className="block space-y-1.5 text-sm font-semibold">
                    <span>Kondisi</span>
                    <select name="condition" defaultValue={openAsset?.condition ?? 'GOOD'} className={inputStyle}>
                      {Object.entries(conditions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="block space-y-1.5 text-sm font-semibold">
                    <span>Status</span>
                    <select name="status" defaultValue={openAsset?.status ?? 'AVAILABLE'} className={inputStyle}>
                      {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <TextField label="Penanggung jawab" name="custodian" length={120} value={openAsset?.custodian} />
                </>
              )}
              <label className="block space-y-1.5 text-sm font-semibold sm:col-span-2">
                <span>Catatan</span>
                <textarea name="notes" rows={3} maxLength={500} defaultValue={(openRoom ?? openAsset)?.notes ?? ''} className={inputStyle} />
              </label>
            </fieldset>
            {saveError && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{saveError}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className={primaryButton}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
              <button type="button" disabled={saving} className={secondaryButton} onClick={() => openPanel(null)}>Batal</button>
            </div>
          </form>
        </section>
      )}

      {inventory && (
        <section className={sectionStyle}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">{section === 'assets' ? 'Daftar aset' : 'Daftar ruang'}</h2>
            <button type="button" className={primaryButton} disabled={busy}
              onClick={() => section === 'rooms' || !rooms.length ? startRoom() : openPanel({ type: 'asset' })}>
              <Plus size={17} aria-hidden /> {section === 'rooms' || !rooms.length ? 'Tambah ruang' : 'Tambah aset'}
            </button>
          </div>
          {section === 'assets' && rooms.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">Inventaris masih kosong. Tambahkan ruang pertama sebelum mencatat aset.</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <label className="relative min-w-40 flex-1">
                <span className="sr-only">{section === 'assets' ? 'Cari aset' : 'Cari ruang'}</span>
                <Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-500" aria-hidden />
                <input value={query} onChange={event => setQuery(event.target.value)} className={inputStyle + ' pl-9'}
                  placeholder={section === 'assets' ? 'Cari aset' : 'Cari ruang'} />
              </label>
              {section === 'assets' && (
                <>
                  <select aria-label="Filter ruang" value={roomFilter} onChange={event => setRoomFilter(event.target.value)} className={inputStyle + ' sm:w-auto'}>
                    <option value="">Semua ruang</option>
                    {rooms.map(room => <option key={room.id} value={room.id}>{room.name} ({room.code})</option>)}
                  </select>
                  <select aria-label="Filter kategori" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className={inputStyle + ' sm:w-auto'}>
                    <option value="">Semua kategori</option>
                    {categories.map(category => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <select aria-label="Filter status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className={inputStyle + ' sm:w-auto'}>
                    <option value="">Semua status</option>
                    {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </>
              )}
            </div>
          )}
          {section === 'assets' && rooms.length > 0 && (
            filteredAssets.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">{assets.length ? 'Tidak ada aset yang sesuai dengan pencarian atau filter.' : 'Belum ada aset. Pilih Tambah aset untuk mencatat aset pertama.'}</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[42rem] text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>{['Aset', 'Ruang', 'Kondisi', 'Status', 'Penanggung jawab', 'Tindakan'].map(label => (
                      <th scope="col" className="px-3 py-3 font-semibold" key={label}>{label}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredAssets.map(asset => (
                      <tr key={asset.id}>
                        <td className="px-3 py-3">
                          <p className="font-bold">{asset.name}</p>
                          <p className="text-xs text-slate-600">{asset.code} · {asset.category}</p>
                        </td>
                        <td className="px-3 py-3">{roomById.get(asset.roomId)?.name}</td>
                        <td className="px-3 py-3">{conditions[asset.condition]}</td>
                        <td className="px-3 py-3">{statuses[asset.status]}</td>
                        <td className="px-3 py-3">{asset.custodian ?? '—'}</td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <button type="button" aria-label={`Edit aset ${asset.name}`} className={rowButton} disabled={busy} onClick={() => openPanel({ type: 'asset', asset })}>Edit</button>
                          <button type="button" aria-label={`Riwayat aset ${asset.name}`} className={rowButton} disabled={busy} onClick={() => openPanel({ type: 'history', asset })}>Riwayat</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
          {section === 'rooms' && (
            filteredRooms.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">{rooms.length ? 'Tidak ada ruang yang sesuai dengan pencarian.' : 'Belum ada ruang yang dicatat.'}</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-200">
                {filteredRooms.map(room => (
                  <li key={room.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                    <div className="min-w-0 break-words">
                      <p className="font-bold">{room.name}</p>
                      <p className="text-sm text-slate-600">{room.code}{room.floor && ` · ${room.floor}`} · {roomCounts.get(room.id) ?? 0} aset</p>
                      {room.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{room.notes}</p>}
                    </div>
                    <div>
                      <button type="button" aria-label={`Edit ruang ${room.name}`} className={rowButton} disabled={busy} onClick={() => openPanel({ type: 'room', room })}>Edit</button>
                      <button type="button" aria-label={`Hapus ruang ${room.name}`} className={rowButton} disabled={busy || roomCounts.has(room.id)}
                        title={roomCounts.has(room.id) ? 'Pindahkan aset dari ruang ini sebelum menghapusnya' : undefined}
                        onClick={() => showConfirm('Hapus ruang', `Hapus ${room.name} dari daftar ruang?`, () => {
                          openPanel(null);
                          if (roomFilter === room.id) setRoomFilter('');
                          void mutate(`/rooms/${room.id}`, 'DELETE', 'Ruang dihapus.');
                        })}>Hapus</button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </section>
      )}
    </div>
  );
}
