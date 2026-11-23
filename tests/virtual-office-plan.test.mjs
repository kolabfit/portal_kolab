import { test } from 'node:test';
import assert from 'node:assert/strict';
import { overviewPlan } from '../lib/virtualOfficeScene.js';
import { floorAreas } from '../api/lib/virtualOfficeFloors.js';

const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-6, `${label}: ${actual} != ${expected}`);
const rounded = items => items.map(item => Object.values(item).map(value => Math.round(value * 1e4) / 1e4));

// Positions from the approved hand-placed plan (PR #2). The derived plan must keep them.
test('derived overview plan keeps the approved room positions and corridors', () => {
  const { layout, floors, walls } = overviewPlan();
  const approved = {
    ngolab: [-8.25, 0], coworking: [0, 0], redbox: [8.025, 0],
    jago: [14.82, -.18], studio: [21.895, -1.13], kroombox: [20.41, -7.08]
  };
  for (const [id, [x, z]] of Object.entries(approved)) {
    near(layout[id].x, x, id + '.x');
    near(layout[id].z, z, id + '.z');
  }
  assert.deepEqual(rounded(floors), [
    [8.5475, -3.4, 5.295, 1.36], // beside Redbox
    [10.6725, -2.29, 1.045, .86], // landing at the Ruang Diskusi door (was 0.90 deep, overshooting the door)
    [18.7575, -2.31, .625, 1.16], // Ruang Diskusi to Studio Kreatif
    [25.235, -2.26, 1.03, 1.04], // server corridor
    [25.18, -3.33, 1.12, 1.1]
  ]);
  assert.deepEqual(rounded(walls), [
    [8.5475, -4.08, 5.295, 0], [8.625, -2.72, 3.05, 0], [11.195, -3.52, 0, 1.12], [10.6725, -1.86, 1.045, 0],
    [18.7575, -2.89, .625, 0], [18.7575, -1.73, .625, 0],
    [25.75, -2.81, 0, 2.14], [25.235, -1.74, 1.03, 0], [24.62, -3.5675, 0, .625]
  ]);
});

test('API floor areas follow the shared room sizes', () => {
  assert.deepEqual(rounded(floorAreas.ngolab.map(([a, b, c, d]) => ({ a, b, c, d }))), [[-3.65, 3.65, -2.35, 2.35]]);
  assert.deepEqual(rounded(floorAreas.kroombox.map(([a, b, c, d]) => ({ a, b, c, d }))), [[-4.25, 4.25, -3.2, 6], [-6.09, -4.25, -3.2, -1.16]]);
});
