// Single source for Virtual Office floor sizes, shared by the 3D scene and API validation.
// Sizes are estimates in metres (local X width, local Z depth) until the rooms are measured.
export const roomSizes = {
  ngolab: [7.3, 4.7],
  coworking: [11.8, 6.10],
  redbox: [5.55, 4.25],
  jago: [5.4, 7.25],
  studio: [4.25, 5.65],
  kroombox: [8.5, 6.4]
};

// Lab DBP extends past its front wall (lounge) and has the server corridor on its left side.
export const dbpLoungeDepth = 2.80;
export const dbpCorridor = { width: 1.84, depth: 2.04, z: -2.18 };

// Clickable floor rectangles per room, as [xMin, xMax, zMin, zMax] in local coordinates.
export const floorAreas = Object.fromEntries(Object.entries(roomSizes).map(([id, [w, d]]) => [id, [[-w / 2, w / 2, -d / 2, d / 2]]]));
{
  const [w, d] = roomSizes.kroombox;
  const { width, depth, z } = dbpCorridor;
  floorAreas.kroombox = [
    [-w / 2, w / 2, -d / 2, d / 2 + dbpLoungeDepth],
    [-w / 2 - width, -w / 2, z - depth / 2, z + depth / 2]
  ];
}
