export const virtualOfficeRooms = {
  "ngolab": {
    "name": "Ruang Ngolab / Dapur Coworking",
    "description": "Meja kompor di sisi kiri, jalur di antara konter dan kasir, serta showcase di sebelah kanan kasir."
  },
  "coworking": {
    "name": "Area Coworking",
    "description": "Meja kerja dan meja komunal, Pojok UMKM, sisi semi terbuka dengan tanaman, dan bukaan Redbox di ujung."
  },
  "redbox": {
    "name": "Redbox",
    "description": "Bukaan merah tebal, panggung kayu rendah, panel terang di belakang, dan kipas di kedua sisi."
  },
  "jago": {
    "name": "Ruang Diskusi",
    "description": "Papan tulis panjang, meja komputer, jendela bertirai, dan beanbag. Putar model untuk melihat mural bohlam."
  },
  "studio": {
    "name": "Studio Kreatif",
    "description": "Dua printer 3D di samping meja kerja, sofa dan rak berjajar di sisi kanan, serta satu meja tambahan dengan dua kursi."
  },
  "kroombox": {
    "name": "Lab DBP",
    "description": "Area tambahan berisi sofa biru, kursi pijat, TV Android portable, dispenser, printer 3D besar, dan rak buku putih. Putar ke kiri untuk melihat jalur terbuka dari lorong PC dan server."
  }
} as const;

export type VirtualOfficeRoomId = keyof typeof virtualOfficeRooms;
export type VirtualOfficeArea = 'overview' | VirtualOfficeRoomId;
export type VirtualOfficePoint = { x: number; z: number };
export type VirtualOfficePerson = { id: string; name: string; title: string; point?: VirtualOfficePoint };
export type VirtualOfficeRoomText = { name: string; description: string; people?: VirtualOfficePerson[] };
export type VirtualOfficeSettings = { published: boolean; rooms?: Partial<Record<VirtualOfficeRoomId, VirtualOfficeRoomText>>; version?: number };
export const virtualOfficeRoomIds = Object.keys(virtualOfficeRooms) as VirtualOfficeRoomId[];
