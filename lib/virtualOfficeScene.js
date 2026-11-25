import * as T from 'three';
import { roomSizes, dbpLoungeDepth, dbpCorridor } from '../api/lib/virtualOfficeFloors.js';

// Door offsets inside each room (local X), used to line the corridors up with the doors.
const diskusiSideDoor = { x: 2.23, width: .92 };
const studioBackDoorX = 1.18;
const studioServerExitX = 1.13;
const dbpEntranceX = .40; // from the centre line of the Lab DBP server corridor

const halfX = (id, angle) => roomSizes[id][Math.abs(Math.sin(angle)) > .5 ? 1 : 0] / 2;
const halfZ = (id, angle) => roomSizes[id][Math.abs(Math.sin(angle)) > .5 ? 0 : 1] / 2;
const span = (x0, x1, z0, z1) => ({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: Math.abs(x1 - x0), d: Math.abs(z1 - z0) });

// Combined plan along the approved route. Rooms are chained from their (estimated) sizes, so resizing
// one room moves its neighbours and corridors instead of opening gaps. Corridor widths are estimates too.
export function overviewPlan() {
  const layout = { coworking: { x: 0, z: 0, angle: 0 } };
  const left = id => layout[id].x - halfX(id, layout[id].angle);
  const right = id => layout[id].x + halfX(id, layout[id].angle);
  const after = (id, previous, gap, z, angle) => {
    layout[id] = { x: right(previous) + gap + halfX(id, angle), z, angle };
  };
  layout.ngolab = { x: -halfX('coworking', 0) - halfX('ngolab', Math.PI / 2), z: 0, angle: Math.PI / 2 };
  after('redbox', 'coworking', 0, 0, -Math.PI / 2);
  after('jago', 'redbox', 1.045, -.18, -Math.PI / 2);
  after('studio', 'jago', .625, -1.13, Math.PI / 2);

  const floors = [], walls = [];
  const wallX = (x, z0, z1) => walls.push(span(x, x, z0, z1));
  const wallZ = (z, x0, x1) => walls.push(span(x0, x1, z, z));

  // Corridor beside Redbox, ending at the side door of Ruang Diskusi.
  const sideOuter = -4.08, sideInner = -2.72, redboxOpening = 1.2;
  const doorZ = layout.jago.z - diskusiSideDoor.x;
  const doorBottom = doorZ - diskusiSideDoor.width / 2 - .09, doorTop = doorZ + diskusiSideDoor.width / 2 + .09;
  floors.push(span(right('coworking'), left('jago'), sideOuter, sideInner), span(right('redbox'), left('jago'), sideInner, doorTop));
  wallZ(sideOuter, right('coworking'), left('jago'));
  wallZ(sideInner, right('coworking') + redboxOpening, right('redbox'));
  wallX(left('jago'), sideOuter, doorBottom);
  wallZ(doorTop, right('redbox'), left('jago'));

  // Short corridor from Ruang Diskusi into the back door of Studio Kreatif.
  const studioDoorZ = layout.studio.z - studioBackDoorX;
  floors.push(span(right('jago'), left('studio'), studioDoorZ - .58, studioDoorZ + .58));
  wallZ(studioDoorZ - .58, right('jago'), left('studio'));
  wallZ(studioDoorZ + .58, right('jago'), left('studio'));

  // Server corridor from the far end of Studio Kreatif down to the Lab DBP entrance.
  const exitZ = layout.studio.z - studioServerExitX;
  const studioBottom = layout.studio.z - halfZ('studio', Math.PI / 2);
  const dbpTop = studioBottom - .625;
  const outer = right('studio') + 1.03, dbpDoorX = right('studio') + .46;
  floors.push(span(right('studio'), outer, exitZ - .52, exitZ + .52), span(dbpDoorX - .56, dbpDoorX + .56, dbpTop, exitZ - .52));
  wallX(outer, dbpTop, exitZ + .52);
  wallZ(exitZ + .52, right('studio'), outer);
  wallX(dbpDoorX - .56, dbpTop, studioBottom);

  // Lab DBP is turned around so its corridor entrance meets the server corridor.
  const [dbpWidth] = roomSizes.kroombox;
  layout.kroombox = {
    x: dbpDoorX - (dbpWidth / 2 + dbpCorridor.width / 2 - dbpEntranceX),
    z: dbpTop + dbpCorridor.z - dbpCorridor.depth / 2,
    angle: Math.PI
  };
  return { layout, floors, walls };
}

// Room geometry and door alignments come from the approved Ko+Lab floor plan.
export function mountVirtualOffice(canvas, { onSelect, onUnavailable, onPick, onProjection }, initialArea = 'overview') {
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-6, 6, 4, -4, .1, 140);
  const renderer = new T.WebGLRenderer({canvas, antialias:true, alpha:true});
  renderer.setClearColor(0, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  scene.add(new T.HemisphereLight(0xfff3e2, 0x69778b, 2.1));
  const key = new T.DirectionalLight(0xffe3bf, 2.75);
  key.position.set(9, 18, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {left:-17, right:17, top:15, bottom:-15, near:.5, far:60});
  key.shadow.normalBias = .025;
  key.shadow.bias = -.00025;
  scene.add(key);
  const fill = new T.DirectionalLight(0xb8d7ff, .8);
  fill.position.set(-6, 9, -8);
  scene.add(fill);
  const shadow = new T.Mesh(new T.PlaneGeometry(90, 90), new T.ShadowMaterial({opacity:.18}));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -.245;
  shadow.receiveShadow = true;
  scene.add(shadow);

  // These colors reproduce the materials visible in the reference video.
  const c = {
    base:0x29303a, ivory:0xe5ded0, wall:0xd3cbbb, chalk:0xeee9db, edge:0xb7b9ba,
    steel:0x707e87, graphite:0x363e44, ink:0x1c2631, black:0x161a23, tile:0x202932,
    red:0xa72834, orange:0xd26529, yellow:0xd69642, oak:0x8e5c3f, lightOak:0xb68555,
    warmFloor:0x947657, grayFloor:0x767778, paving:0xa5a4a0, glass:0x9bbdc9,
    blind:0x88a4be, blue:0x365972, mint:0x55ccb7, cream:0xefdbc0, green:0x526e4e
  };
  const materialCache = new Map();
  function solid(color) {
    if (!materialCache.has(color)) materialCache.set(color, new T.MeshStandardMaterial({color, roughness:.79}));
    return materialCache.get(color);
  }
  function mesh(group, geometry, x, y, z, material, cast = true) {
    const object = new T.Mesh(geometry, typeof material === 'number' ? solid(material) : material);
    object.position.set(x,y,z);
    object.castShadow = cast;
    object.receiveShadow = true;
    group.add(object);
    return object;
  }
  const unitCube = new T.BoxGeometry(1,1,1);
  function box(group,x,y,z,w,h,d,color,cast = true) {
    const object=mesh(group,unitCube,x,y,z,color,cast);
    object.scale.set(w,h,d);
    return object;
  }
  function cylinder(group,x,y,z,r,h,color,sides=16) {
    return mesh(group,new T.CylinderGeometry(r,r,h,sides),x,y,z,color);
  }
  function sphere(group,x,y,z,r,color) {
    return mesh(group,new T.SphereGeometry(r,18,12),x,y,z,color);
  }
  function cluster(group,x,z,angle=0,y=0) {
    const object=new T.Group();
    object.position.set(x,y,z);
    object.rotation.y=angle;
    group.add(object);
    return object;
  }
  function graphic(paint,w=480,h=240) {
    const surface=document.createElement('canvas');
    surface.width=w; surface.height=h;
    paint(surface.getContext('2d'),w,h);
    const texture=new T.CanvasTexture(surface);
    texture.colorSpace=T.SRGBColorSpace;
    texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    return new T.MeshBasicMaterial({map:texture,toneMapped:false});
  }
  const dashboard=graphic((ctx,w,h) => {
    ctx.fillStyle='#111c27'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#1c2e3b'; ctx.fillRect(0,0,w,28); ctx.fillRect(12,41,95,184);
    ctx.font='600 12px sans-serif'; ctx.fillStyle='#96ffdb'; ctx.fillText('KROOMBOX  /  MONITORING',14,19);
    ctx.fillStyle='#20414a'; ctx.fillRect(122,41,214,90); ctx.fillRect(349,41,115,90);
    ctx.strokeStyle='#6ffac9'; ctx.lineWidth=2; ctx.beginPath();
    for(let i=0;i<83;i++) {
      const x=130+i*2.4, y=111-8*Math.sin(i*.42)-8*Math.cos(i*.91)-(i%7===0?18:0);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    for(let i=0;i<10;i++) {
      ctx.fillStyle=i%3===0?'#59daba':'#385b69';
      ctx.fillRect(22,52+i*15,28+(i*11)%43,3);
      ctx.fillRect(126,146+i*7.5,205,2);
      ctx.fillRect(358,53+i*7,75+(i%3)*6,2);
    }
  });
  const codeScreen=graphic((ctx,w,h) => {
    ctx.fillStyle='#142238'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#2b3f5a'; ctx.fillRect(0,0,w,21); ctx.fillRect(10,31,73,192);
    for(let i=0;i<14;i++) {
      ctx.fillStyle=['#76a7eb','#7fd6b9','#dba985','#a3afd7'][i%4];
      ctx.fillRect(100+i%4*11,39+i*12,45+(i*19)%150,3);
      ctx.fillStyle='#536e8f'; ctx.fillRect(17,39+i*12,32+i%4*5,3);
    }
  });
  const editingScreen=graphic((ctx,w,h) => {
    ctx.fillStyle='#1d2631'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#f19b62'; ctx.fillRect(137,20,205,89);
    ctx.fillStyle='#273648'; ctx.fillRect(15,126,w-30,100);
    for(let j=0;j<4;j++) for(let i=0;i<7;i++) {
      ctx.fillStyle=['#9578bd','#df9e64','#70c4b4','#6886ad'][j];
      ctx.fillRect(33+i*58,138+j*20,38+(i%3)*5,10);
    }
  });
  const ngolabSign=graphic((ctx,w,h) => {
    ctx.fillStyle='#f8d49a'; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#a4412f'; ctx.lineWidth=6; ctx.strokeRect(12,12,w-24,h-24);
    for(let i=0;i<17;i++) {
      const x=26+(i*81)%(w-45), y=27+(i*43)%(h-49);
      ctx.fillStyle=['#ab4937','#50805b','#db9845'][i%3];
      ctx.beginPath(); ctx.arc(x,y,12+i%5,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle='#a82e32'; ctx.beginPath(); ctx.ellipse(w/2,h/2,132,77,0,0,Math.PI*2); ctx.fill();
    ctx.textAlign='center'; ctx.fillStyle='#fff4dc';
    ctx.font='700 49px sans-serif'; ctx.fillText('Ko+Lab',w/2,113);
    ctx.font='italic 36px sans-serif'; ctx.fillText('Ngolab',w/2,156);
  });
  const poster=graphic((ctx,w,h) => {
    ctx.fillStyle='#27384b'; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#e8a869'; ctx.lineWidth=7; ctx.strokeRect(9,9,w-18,h-18);
    ctx.fillStyle='#6d939b'; ctx.beginPath(); ctx.arc(w/2,h*.43,h*.22,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#f4d3a2'; ctx.fillRect(w*.26,h*.72,w*.48,h*.045);
  },110,140);
  const lightbulb=graphic((ctx,w,h) => {
    ctx.strokeStyle='#434735'; ctx.fillStyle='#b2b94d'; ctx.lineWidth=5;
    ctx.beginPath(); ctx.moveTo(w*.36,h*.71); ctx.bezierCurveTo(w*.34,h*.54,w*.12,h*.47,w*.24,h*.25);
    ctx.bezierCurveTo(w*.35,h*.04,w*.73,h*.09,w*.78,h*.32);
    ctx.bezierCurveTo(w*.81,h*.49,w*.65,h*.56,w*.64,h*.71); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeRect(w*.36,h*.72,w*.28,h*.13);
    ctx.beginPath(); ctx.moveTo(w*.43,h*.72); ctx.lineTo(w*.40,h*.41); ctx.lineTo(w*.60,h*.41);
    ctx.lineTo(w*.55,h*.72); ctx.stroke();
    for(const [x,y,dx,dy] of [[.12,.12,.09,.1],[.5,0,0,.09],[.89,.11,-.1,.1],[.98,.42,-.12,0],[0,.42,.12,0]]) {
      ctx.beginPath();ctx.moveTo(w*x,h*y);ctx.lineTo(w*(x+dx),h*(y+dy));ctx.stroke();
    }
  },180,180);
  lightbulb.transparent=true;
  const beanbagCloth=graphic((ctx,w,h) => {
    ctx.fillStyle='#403c36';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#d8c8a6';ctx.lineWidth=2.5;
    for(let y=0;y<h;y+=12) for(let x=0;x<w;x+=18) {
      ctx.beginPath();ctx.moveTo(x,y+10);ctx.lineTo(x+8,y+10);
      ctx.lineTo(x+8,y+2);ctx.lineTo(x+16,y+2);ctx.stroke();
    }
  },144,96);
  const coworkingSign=graphic((ctx,w,h) => {
    ctx.fillStyle='#242b27';ctx.fillRect(0,0,w,h);
    ctx.font='700 53px sans-serif';ctx.textAlign='center';ctx.fillStyle='#f3e8cd';
    ctx.fillText('POJOK UMKM',w/2,h*.72);
  },480,90);
  const androidScreen=graphic((ctx,w,h) => {
    ctx.fillStyle='#152439';ctx.fillRect(0,0,w,h);
    ctx.font='600 34px sans-serif';ctx.fillStyle='#eef2ff';ctx.fillText('Android TV',22,53);
    for(const [index,color] of ['#46728c','#9a554e','#4e7d58','#6c5595'].entries()) {
      ctx.fillStyle=color;ctx.fillRect(22+index*112,85,95,60);
      ctx.fillStyle='#edf2f4';ctx.fillRect(27+index*112,158,67,5);
    }
  });

  function cutaway(group, x, z, angle) {
    const part=cluster(group,x,z,angle);
    part.userData.cutaway=true;
    return part;
  }
  function picture(g,x,y,z,w,h,m) {
    return mesh(g,new T.PlaneGeometry(w,h),x,y,z,m,false);
  }
  function floor(g,w,d,tone,grain='tiles') {
    box(g,0,-.115,0,w+.26,.23,d+.26,c.base);
    box(g,0,.014,0,w,.028,d,tone).userData.officeFloor = true;
    if(grain==='carpet') return;
    const line = grain==='wood'?0x8a684b:grain==='terracotta'?0xb59a7e:0xa2a09b;
    const step=grain==='wood'?.25:grain==='terracotta'?.64:1;
    for(let x=-w/2+step;x<w/2-.04;x+=step) box(g,x,.031,0,.012,.004,d,line,false);
    if(grain!=='wood') for(let z=-d/2+step;z<d/2-.04;z+=step) box(g,0,.032,z,w,.004,.012,line,false);
  }
  function wall(g,x,z,w,d,color,height=2.64) {
    box(g,x,height/2+.025,z,w,height,d,color);
    box(g,x,.09,z,w+.018,.12,d+.018,c.graphite);
  }
  function frame(g,x,y,z,w,h,panes=2,glass=c.glass) {
    const unit=cluster(g,x,z,0,y);
    box(unit,0,0,0,w-.045,h-.045,.035,glass);
    for(let i=0;i<=panes;i++) box(unit,(i/panes-.5)*w,0,.026,.058,h+.056,.07,c.steel);
    for(const a of [-1,1]) box(unit,0,a*h/2,.026,w+.065,.059,.07,c.steel);
    return unit;
  }
  function tallDoor(g,x,z,w=1.16) {
    const door=frame(g,x,1.17,z,w,2.28,1,0x829da9);
    box(door,.31,-.08,.10,.031,.29,.05,c.edge);
    return door;
  }
  function linkedDoor(g,x,z,w) {
    tallDoor(g,x,z,w).userData.detailOnly=true;
    const open=cluster(g,x,z);
    open.userData.overviewOnly=true;
    for(const side of [-1,1]) box(open,side*w/2,1.17,0,.057,2.28,.09,c.steel);
    box(open,0,2.31,0,w+.06,.057,.09,c.steel);
    const leaf=cluster(open,-w/2+.04,0,-1.38);
    box(leaf,w/2-.035,1.17,0,w-.07,2.22,.043,0x829da9);
    box(leaf,w-.19,1.08,.036,.028,.26,.039,c.edge);
  }
  function table(g,x,z,w,d,h=.75,color=c.chalk,angle=0) {
    const f=cluster(g,x,z,angle);
    box(f,0,h,0,w,.085,d,color);
    for(const a of [-1,1]) for(const b of [-1,1]) box(f,a*(w/2-.10),h/2,b*(d/2-.10),.055,h,.055,c.graphite);
    return f;
  }
  function chair(g,x,z,angle=0,color=c.red,office=false) {
    const f=cluster(g,x,z,angle);
    box(f,0,.49,0,.47,.074,.46,color);
    box(f,0,.76,.19,.45,.47,.075,color);
    if(office) {
      cylinder(f,0,.24,0,.047,.44,c.graphite);
      for(let i=0;i<5;i++) {
        const foot=cluster(f,0,0,i*Math.PI*2/5);
        box(foot,0,.087,.155,.045,.045,.33,c.graphite);
        cylinder(foot,0,.059,.284,.041,.072,c.black,10);
      }
      for(const i of [-1,1]) {
        box(f,i*.235,.59,.07,.033,.19,.03,c.graphite);
        box(f,i*.235,.68,.01,.049,.035,.27,c.graphite);
      }
    } else {
      for(const a of [-1,1]) for(const b of [-1,1]) box(f,a*.183,.251,b*.168,.034,.45,.034,c.graphite);
    }
  }
  function monitor(g,x,z,y=.76,w=.62,angle=0,screen=codeScreen,stand=true) {
    const f=cluster(g,x,z,angle,y);
    const h=w*.58;
    const bottom=stand?.12:0;
    if(stand) {
      box(f,0,.035,0,w*.43,.032,.15,c.black);
      box(f,0,.116,0,.047,.20,.055,c.graphite);
    }
    box(f,0,bottom+h/2,0,w,h,.075,c.black);
    if(screen) picture(f,0,bottom+h/2,.039,w*.92,h*.885,screen);
    return f;
  }
  function laptop(g,x,z,y=.81,angle=0) {
    const f=cluster(g,x,z,angle,y);
    box(f,0,.022,0,.37,.037,.28,c.steel);
    box(f,0,.045,.019,.31,.012,.18,c.black);
    const lid=box(f,0,.136,-.126,.37,.24,.034,c.graphite);
    lid.rotation.x=-.17;
    const display=picture(f,0,.137,-.107,.335,.20,codeScreen);
    display.rotation.x=-.17;
  }
  function divider(g,x,z,w,panes) {
    const glass=frame(g,x,1.33,z,w,2.55,panes,0x94b2ba);
    box(glass,0,-.93,.015,w-.03,.61,.047,0xaebec0);
    return glass;
  }
  function cabinet(g,x,z,w=.62,h=1.36,base=c.steel) {
    box(g,x,h/2,z,w,h,.48,base);
    for(let i=1;i<=3;i++) {
      box(g,x,h*i/4,z+.244,w-.03,.012,.012,c.graphite);
      box(g,x,h*i/4+.07,z+.27,.108,.022,.038,c.edge);
    }
  }
  function ac(g,x,z,y=2.27) {
    box(g,x,y,z,.95,.26,.21,c.ivory);
    box(g,x,y-.071,z+.111,.75,.045,.014,c.graphite);
  }
  function stool(g,x,z,color=c.red) {
    const f=cluster(g,x,z);
    cylinder(f,0,.52,0,.21,.075,color);
    cylinder(f,0,.27,0,.033,.49,c.graphite);
    cylinder(f,0,.046,0,.19,.025,c.graphite);
  }
  function plant(g,x,z) {
    cylinder(g,x,.19,z,.18,.35,c.grayFloor);
    for(let i=0;i<6;i++) {
      const angle=i*2.4;
      const leaf=sphere(g,x+Math.cos(angle)*.12,.44+i*.035,z+Math.sin(angle)*.12,.11,c.green);
      leaf.scale.set(.68,1.7,1);
      leaf.rotation.set(angle*.36,angle,angle*.18);
    }
  }
  function armchair(g,x,z,angle,color) {
    const f=cluster(g,x,z,angle);
    box(f,0,.36,0,.72,.22,.69,color);
    sphere(f,0,.73,.28,.40,color).scale.set(.95,.76,.24);
    box(f,0,.57,.27,.73,.50,.15,color);
    for(const a of [-1,1]) {
      sphere(f,a*.31,.58,-.02,.25,color).scale.set(.32,.46,1.30);
      box(f,a*.31,.50,-.02,.13,.21,.60,color);
      for(const z of [-.24,.23]) box(f,a*.26,.14,z,.052,.26,.052,c.oak);
    }
  }
  function ladderShelf(g,x,z,color,angle=0) {
    const f=cluster(g,x,z,angle);
    for(const x of [-.28,.28]) {
      const front=box(f,x,.94,.095,.043,1.89,.044,color);
      front.rotation.x=-.16;
      box(f,x,.94,-.155,.043,1.87,.044,color);
    }
    for(const [i,y] of [.26,.63,1.00,1.37,1.73].entries()) {
      box(f,0,y,-.023,.61,.044,.42-i*.054,color);
      box(f,-.098,y+.082,-.045,.20,.12,.14,[c.oak,c.cream,c.steel,c.red,c.green][i]);
      box(f,.13,y+.066,-.048,.13,.089,.13,i%2?c.orange:c.chalk);
    }
  }
  function filamentPrinter(g,x,z,scale,angle=-Math.PI/2,base=.81) {
    const f=cluster(g,x,z,angle,base);
    f.scale.setScalar(scale);
    box(f,0,.06,0,.64,.10,.63,c.graphite);
    box(f,0,.15,.015,.47,.055,.47,c.black);
    box(f,0,.187,.015,.42,.016,.42,c.steel);
    for(const x of [-.27,.27]) box(f,x,.39,-.065,.049,.60,.057,c.ink);
    box(f,0,.69,-.065,.60,.055,.058,c.ink);
    box(f,0,.43,-.067,.56,.042,.048,c.steel);
    box(f,.065,.404,-.025,.12,.109,.082,c.graphite);
    cylinder(f,.065,.339,-.025,.017,.033,c.cream,10);
    const spool=cylinder(f,-.12,.82,-.068,.102,.057,c.yellow,24);
    spool.rotation.z=Math.PI/2;
    const spindle=cylinder(f,-.12,.82,-.068,.038,.068,c.ink,16);
    spindle.rotation.z=Math.PI/2;
    box(f,.22,.105,.28,.12,.065,.055,c.blue);
  }
  function dbpLounge(g,w,d) {
    const joint=d/2;
    const depth=dbpLoungeDepth;
    const end=joint+depth;
    const extension=cluster(g,0,joint+depth/2);
    floor(extension,w,depth,0xb3a38c,'wood');

    // Keep the lower portions visible when a nearer wall is cut away.
    const nearWall=cutaway(g,0,end,Math.PI);
    wall(g,1.00,end,6.50,.14,c.ivory,.31);
    wall(g,-4.00,end,.50,.14,c.ivory,.31);
    box(nearWall,-1.00,1.50,0,6.50,2.33,.14,c.ivory);
    box(nearWall,4.00,1.50,0,.50,2.33,.14,c.ivory);
    const rightWall=cutaway(g,w/2,(end-joint)/2,-Math.PI/2);
    wall(g,w/2,(end-joint)/2,.14,end+joint,c.ivory,.30);
    box(rightWall,0,1.495,0,end+joint,2.34,.14,c.ivory);
    const partition=cutaway(g,0,joint,Math.PI);
    for(const [x,width] of [[-2.25,4.00],[2.79,2.92]]) {
      wall(g,x,joint,width,.13,c.wall,.30);
      box(partition,-x,1.495,0,width,2.34,.13,c.wall);
    }

    const annexEntrance=cluster(g,-3.00,end);
    for(const x of [-.69,.69]) box(annexEntrance,x,1.15,0,.076,2.25,.15,c.steel);
    box(annexEntrance,0,2.30,0,1.45,.077,.15,c.steel);
    box(annexEntrance,0,.049,0,1.45,.033,.20,c.steel);
    const leaf=cluster(annexEntrance,-.64,.01,1.23);
    box(leaf,.61,1.16,0,1.22,2.16,.062,0x8099a2);
    box(leaf,1.05,1.05,.052,.03,.22,.036,c.edge);

    const sofa=cluster(g,2.77,5.44);
    box(sofa,0,.35,0,2.53,.24,.76,0x205176);
    box(sofa,0,.69,.30,2.51,.54,.21,0x235c85);
    for(const x of [-.76,0,.76]) {
      box(sofa,x,.50,-.04,.73,.105,.57,0x2b6894);
      box(sofa,x,.735,.24,.73,.36,.13,0x2b6894);
    }
    for(const side of [-1,1]) {
      box(sofa,side*1.19,.55,-.025,.16,.37,.72,0x235c85);
      for(const z of [-.26,.26]) box(sofa,side*1.06,.141,z,.068,.24,.068,c.graphite);
    }
    const massage=cluster(g,3.06,3.84,Math.PI);
    box(massage,0,.18,0,.72,.30,.78,c.ink);
    box(massage,0,.39,-.03,.60,.20,.63,0x665448);
    const backrest=box(massage,0,.73,.27,.67,.72,.19,0x55443b);
    backrest.rotation.x=.27;
    for(const x of [-.34,.34]) box(massage,x,.53,-.01,.14,.30,.74,0x665448);
    const legRest=box(massage,0,.28,-.42,.54,.40,.23,0x55443b);
    legRest.rotation.x=-.22;
    box(massage,0,.99,.36,.29,.14,.12,0x665448);

    const tv=cluster(g,.86,5.49,Math.PI);
    monitor(tv,0,0,1.08,.91,0,androidScreen,false);
    box(tv,0,.59,0,.07,1.09,.07,c.graphite);
    box(tv,0,.14,0,.62,.045,.06,c.graphite);
    for(const x of [-.28,.28]) {
      box(tv,x,.14,0,.045,.045,.46,c.graphite);
      for(const z of [-.19,.19]) cylinder(tv,x,.074,z,.042,.086,c.black,12);
    }
    box(g,.02,.47,5.52,.34,.86,.37,c.chalk);
    box(g,.02,.66,5.32,.27,.21,.04,c.graphite);
    for(const x of [-.05,.09]) box(g,x,.73,5.29,.048,.029,.043,x<0?c.blue:c.red);
    cylinder(g,.02,1.01,5.52,.13,.25,0x6aabc4,20);
    cylinder(g,.02,1.15,5.52,.069,.042,0x4387a1,16);

    table(g,-1.20,5.43,1.14,.75,.64,c.steel);
    filamentPrinter(g,-1.20,5.43,1.40,Math.PI,.687);
    const shelf=cluster(g,-2.48,3.50);
    for(const x of [-1.09,1.09]) box(shelf,x,.62,0,.077,1.19,.38,c.chalk);
    box(shelf,0,.61,-.165,2.18,1.12,.045,c.chalk);
    for(const [i,y] of [.16,.51,.86,1.20].entries()) {
      box(shelf,0,y,0,2.24,.059,.39,c.chalk);
      if(i===3) continue;
      for(let j=0;j<7;j++) {
        const color=[c.steel,c.blue,c.oak,c.green,c.red][(i+2*j)%5];
        box(shelf,-.84+j*.25,y+.154,.014,.115,.245,.22,color);
      }
    }
  }
  function fan(g,x,z,angle=0,base=.03) {
    const f=cluster(g,x,z,angle,base);
    cylinder(f,0,.037,0,.23,.04,c.graphite);
    cylinder(f,0,.32,0,.028,.55,c.black);
    const housing=cylinder(f,0,.67,0,.20,.075,c.graphite,24);
    housing.rotation.x=Math.PI/2;
    const grille=mesh(f,new T.TorusGeometry(.196,.014,6,24),0,.67,.045,c.steel);
    grille.castShadow=false;
    for(let i=0;i<5;i++) {
      const blade=box(f,0,.67,.05,.029,.36,.012,c.steel,false);
      blade.rotation.z=i*Math.PI/5;
    }
  }
  function guitar(g,x,y,z) {
    for(const [offset,r] of [[0,.14],[.14,.11]]) {
      sphere(g,x,y+offset,z,r,c.lightOak).scale.set(.9,1.03,.34);
    }
    box(g,x,y+.31,z,.055,.28,.036,c.oak);
    box(g,x,y+.48,z,.075,.09,.039,c.lightOak);
    const hole=cylinder(g,x,y+.08,z+.047,.047,.009,c.black,16);
    hole.rotation.x=Math.PI/2;
  }
  function fridge(g,x,z,w,h,color) {
    box(g,x,h/2,z,w,h,.64,color);
    box(g,x,h*.69,z+.324,w-.035,.012,.014,c.graphite,false);
    box(g,x-w*.29,h*.51,z+.365,.033,.24,.05,c.graphite);
    box(g,x-w*.29,h*.80,z+.365,.033,.19,.05,c.graphite);
  }
  function foodShelf(g,x,z,wide=1.32) {
    const f=cluster(g,x,z);
    for(const a of [-1,1]) for(const b of [-1,1]) box(f,a*(wide/2-.04),.97,b*.204,.055,1.88,.055,c.yellow);
    for(const h of [.28,.68,1.08,1.48]) {
      box(f,0,h,0,wide,.045,.48,c.lightOak);
      for(let i=0;i<5;i++) {
        const color=[0xab4840,0xd99148,0x8c9c68,0xe3bc71,0x587b84][i];
        box(f,(i-2)*wide/5,h+.108,.01,wide*.125,.159,.14,color);
      }
    }
  }

  const data = {
    ngolab: {size:roomSizes.ngolab, yaw:-.13, build(g,w,d) {
      floor(g,w,d,0x8d7563);
      wall(g,0,-d/2,w,.13,c.ivory);
      const openSide=cluster(g,-w/2,-.56,Math.PI/2);
      frame(openSide,0,1.49,0,2.93,2.36,3,0x9cb3a2);
      box(openSide,-.49,1.55,.056,1.62,1.93,.038,c.lightOak);
      for(let i=0;i<15;i++) box(openSide,-.49,.67+i*.13,.08,1.6,.018,.015,c.oak,false);
      frame(g,2.10,2.05,-d/2+.09,2.74,.96,3,0x547580);
      box(g,2.10,1.55,-d/2+.14,2.76,.18,.14,c.red);
      box(g,-1.27,1.83,-d/2+.087,3.48,1.65,.055,0xdcdad0);
      for(let i=0;i<8;i++) box(g,-1.27,.97+i*.112,-d/2+.122,3.46,.009,.009,0xa6a59f,false);
      for(let row=0;row<7;row++) for(let i=0;i<12;i++) {
        box(g,-2.91+i*.278+(row%2)*.10,1.025+row*.112,-d/2+.122,.009,.105,.010,0xa6a59f,false);
      }
      picture(g,-1.29,2.10,-d/2+.131,2.39,1.06,ngolabSign);
      for(const x of [-2.70,-1.74,-.78,.18]) {
        box(g,x,.46,-1.83,.93,.85,.56,c.steel);
        box(g,x,.66,-1.534,.35,.023,.029,c.graphite);
      }
      box(g,-1.27,.927,-1.82,3.89,.094,.69,0xa8aeab);
      box(g,-1.05,.98,-1.72,.55,.027,.37,c.graphite);
      box(g,-1.05,1.10,-1.97,.034,.24,.04,c.steel);
      box(g,-1.05,1.218,-1.89,.04,.035,.18,c.steel);
      for(const x of [-2.53,-1.98]) {
        cylinder(g,x,1.103,-1.83,.18,.30,c.steel);
        cylinder(g,x,1.267,-1.83,.19,.026,c.edge);
      }
      box(g,-2.69,.75,-1.09,.63,.72,.52,0x346887);
      table(g,-3.12,-.35,.64,.90,.78,c.steel);
      box(g,-3.12,.87,-.56,.51,.10,.36,c.graphite);
      cylinder(g,-3.12,.935,-.58,.095,.027,c.black);
      for(const side of [-1,1]) {
        box(g,-3.12+side*.105,.936,-.58,.024,.022,.24,c.black);
        box(g,-3.12,.936,-.58+side*.105,.24,.022,.024,c.black);
      }
      const knob=cylinder(g,-3.12,.871,-.369,.026,.032,c.black,12);
      knob.rotation.x=Math.PI/2;
      box(g,-3.12,.851,-.11,.48,.063,.37,c.ink);
      const ring=mesh(g,new T.TorusGeometry(.115,.008,6,32),-3.12,.886,-.145,c.steel,false);
      ring.rotation.x=-Math.PI/2;
      box(g,-3.12,.884,.023,.10,.005,.029,c.mint,false);
      for(const h of [1.30,1.63]) {
        box(g,-.06,h,-2.00,1.09,.042,.49,c.graphite);
        for(const x of [-.35,-.06,.23]) cylinder(g,x,h+.10,-1.94,.09,.17,c.cream);
      }
      fridge(g,1.02,-1.78,.72,1.95,c.steel);
      fridge(g,1.73,-1.80,.56,1.69,c.steel);
      foodShelf(g,2.83,-1.94,1.17);
      box(g,3.31,1.0,1.20,.64,1.85,.68,c.graphite);
      frame(g,3.31,1.05,1.556,.51,1.54,1,0x9dd4d1);
      box(g,-.81,.55,.57,4.98,.99,.74,c.graphite);
      box(g,-.81,1.07,.57,5.07,.09,.86,c.ink);
      box(g,2.79,.52,.33,1.04,.94,.82,0x6c777b);
      box(g,2.79,1.02,.33,1.13,.08,.91,c.graphite);
      monitor(g,2.78,.37,1.06,.56,.20,editingScreen);
      for(const x of [-2.42,-1.11,.22]) stool(g,x,1.51,c.steel);
    }},
    kroombox: {size:roomSizes.kroombox, yaw:.44, pitch:.72, build(g,w,d) {
      floor(g,w,d,0xb3a38c,'wood');
      wall(g,-1.74,-d/2,5.02,.17,c.graphite);
      wall(g,3.23,-d/2,2.04,.17,c.ivory);
      divider(g,1.51,-d/2+.11,1.39,2);
      box(g,.80,1.33,-d/2+.15,.37,2.62,.21,c.yellow);
      picture(g,.81,1.76,-d/2+.265,.27,.37,poster);

      const left=-w/2;
      const corridor=cluster(g,left-dbpCorridor.width/2,dbpCorridor.z);
      floor(corridor,dbpCorridor.width,dbpCorridor.depth,0x9e9d93,'tiles');
      wall(corridor,-.50,-1.02,.84,.13,c.wall,1.04);
      const outerEntrance=cluster(corridor,dbpEntranceX,-dbpCorridor.depth/2);
      for(const x of [-.48,.48]) box(outerEntrance,x,1.18,0,.073,2.30,.15,c.steel);
      box(outerEntrance,0,2.35,0,1.03,.077,.15,c.steel);
      box(outerEntrance,0,.049,0,1.03,.038,.20,c.steel);
      const outerDoor=cluster(outerEntrance,.44,0,1.34);
      box(outerDoor,-.445,1.19,0,.89,2.23,.061,0x8099a2);
      box(outerDoor,-.77,1.07,.055,.035,.24,.045,c.edge);
      wall(corridor,-.92,0,.13,2.04,c.wall,.31);
      wall(corridor,-.33,1.02,1.16,.13,c.wall,.31);
      const corridorSide=cutaway(g,left-dbpCorridor.width,dbpCorridor.z,Math.PI/2);
      box(corridorSide,0,1.50,0,2.04,2.33,.13,c.wall);
      const corridorEnd=cutaway(g,left-1.25,-1.16,Math.PI);
      box(corridorEnd,0,1.50,0,1.16,2.33,.13,c.wall);
      box(corridor,-.50,.83,-.61,.59,1.59,.56,c.graphite);
      box(corridor,-.50,.83,-.314,.53,1.47,.042,c.ink);
      for(let i=0;i<7;i++) {
        box(corridor,-.50,.25+i*.175,-.284,.44,.091,.017,c.steel);
        box(corridor,-.64,.25+i*.175,-.27,.045,.021,.011,i%2?c.mint:c.blue,false);
      }
      box(corridor,-.52,.075,.38,.56,.086,.41,c.grayFloor);
      for(const x of [-.67,-.37]) {
        box(corridor,x,.36,.38,.20,.49,.35,c.black);
        box(corridor,x,.44,.56,.086,.026,.013,c.steel);
        box(corridor,x,.34,.567,.025,.025,.012,c.mint,false);
      }
      wall(g,left,-3.00,.15,.40,c.ivory);
      const leftWall=cutaway(g,left,.54,Math.PI/2);
      wall(leftWall,0,0,4.43,.15,c.ivory);
      for(const z of [-1.03,.43,1.89]) {
        table(g,left+.45,z,1.29,.63,.75,c.chalk,Math.PI/2);
        monitor(g,left+.30,z,.80,.50,Math.PI/2,codeScreen);
        chair(g,left+1.16,z,Math.PI/2,0x384a54,true);
      }

      box(g,-2.00,1.65,-d/2+.125,2.72,1.57,.07,c.black);
      picture(g,-2.00,1.65,-d/2+.164,2.57,1.43,dashboard);
      ac(g,-.76,-d/2+.17,2.31);
      table(g,-1.92,-2.51,2.85,.66,.75,c.graphite);
      monitor(g,-2.67,-2.59,.80,.58,0,codeScreen);
      monitor(g,-1.27,-2.58,.80,.53,0,codeScreen);
      chair(g,-1.89,-1.83,0,c.ivory,true);
      cabinet(g,-3.69,-2.79,.62,1.43,0xb2bcbc);
      const longTable=cluster(g,1.30,.34,-Math.PI/2);
      table(longTable,0,0,3.39,1.52,.76,c.chalk);
      for(const x of [-1.17,-.01,1.14]) {
        chair(longTable,x,1.12,0);
        chair(longTable,x,-1.07,Math.PI,c.red);
      }
      laptop(longTable,-1.19,.27,.82);
      laptop(longTable,-.21,.26,.82,-.14);
      laptop(longTable,.81,-.32,.82,Math.PI);
      monitor(longTable,.50,-.55,.82,.65,Math.PI,codeScreen);

      table(g,3.87,.63,1.31,.61,.74,c.chalk,-Math.PI/2);
      chair(g,3.20,.63,-Math.PI/2,c.graphite,true);
      table(g,3.34,2.81,1.48,.61,.74,c.chalk);
      chair(g,3.35,2.12,Math.PI,c.graphite,true);
      for(const x of [-.96,-.56]) picture(g,x,1.89,-d/2+.1,.22,.29,poster);
      dbpLounge(g,w,d);
    }},
    studio: {size:roomSizes.studio, yaw:-.52, build(g,w,d) {
      const back=-d/2;
      floor(g,w,d,0xb69a72,'wood');
      wall(g,-.65,back,2.95,.14,c.ivory);
      wall(g,1.95,back,.34,.14,c.ivory);
      box(g,1.15,2.54,back,1.23,.27,.15,c.ivory);
      for(const x of [.72,1.65]) box(g,x,1.17,back+.068,.062,2.28,.085,c.steel);
      box(g,1.185,2.32,back+.072,.99,.062,.08,c.steel);
      box(g,1.18,1.12,back+.006,.88,2.20,.04,c.ink,false);
      const openedDoor=tallDoor(g,1.73,back+.39,.91);
      openedDoor.rotation.y=-1.08;
      ac(g,-.27,back+.14,2.34);

      const serverExit=cluster(g,studioServerExitX,d/2);
      serverExit.userData.overviewOnly=true;
      for(const x of [-.50,.50]) box(serverExit,x,1.16,0,.065,2.26,.10,c.steel);
      box(serverExit,0,2.31,0,1.06,.07,.10,c.steel);
      box(serverExit,0,.053,0,1.06,.036,.18,c.steel);

      const orange=cutaway(g,w/2,0,-Math.PI/2);
      wall(orange,0,0,d,.14,0xd7794b);
      box(orange,-.56,1.79,.093,2.04,1.05,.044,c.steel);
      box(orange,-.56,1.79,.12,1.98,.99,.025,0xf4f5ef);
      box(orange,-.65,1.28,.152,1.45,.036,.087,c.steel);
      const opposite=cutaway(g,-w/2,0,Math.PI/2);
      wall(opposite,.73,0,4.18,.14,c.ivory);
      wall(opposite,-2.09,0,1.47,.14,0xcb6848);
      box(opposite,.18,1.83,.20,.95,.058,.26,c.lightOak);
      for(const [x,h,tone] of [[-.13,.16,c.green],[.15,.22,c.cream],[.43,.15,c.green]]) {
        cylinder(opposite,x,1.89,.21,.047,.073,c.ivory,10);
        sphere(opposite,x,1.95,.21,.075,tone).scale.y=h/.14;
      }
      box(opposite,.18,1.69,.152,.82,.041,.12,c.graphite);

      armchair(g,-1.48,2.40,0,0x419090);
      ladderShelf(g,-.48,2.51,c.graphite);
      armchair(g,.43,2.40,0,0x235777);
      table(g,-1.42,1.25,1.35,.65,.73,c.chalk,Math.PI/2);
      chair(g,-.77,.94,Math.PI/2,c.graphite);
      chair(g,-.77,1.57,Math.PI/2,c.graphite);
      table(g,-1.63,-.78,2.27,.67,.74,c.chalk,Math.PI/2);
      monitor(g,-1.78,-.32,.79,.63,Math.PI/2,null);
      laptop(g,-1.55,-.24,.79,Math.PI/2);
      for(const z of [-1.12,-1.46,-1.69]) box(g,-1.73,.84,z,.24,.11,.20,c.ivory);
      chair(g,-.94,-.36,Math.PI/2,c.ivory,true);
      chair(g,-.96,-1.36,Math.PI/2,0xa5aaa8,true);

      ladderShelf(g,-1.65,back+.33,c.chalk);
      table(g,-.54,back+.50,1.18,.57,.74,c.chalk);
      laptop(g,-.51,back+.49,.79);
      chair(g,-.54,back+1.16,0,c.graphite,true);
      sphere(g,-1.44,.24,back+1.16,.43,c.red).scale.set(1.12,.59,1.03);
      for(let i=0;i<6;i++) {
        const a=i*Math.PI/3;
        sphere(g,-1.44+Math.cos(a)*.094,.28,back+1.16+Math.sin(a)*.094,.072,0xe9c642).scale.y=.45;
      }
      sphere(g,-1.44,.29,back+1.16,.060,c.cream).scale.y=.45;

      table(g,1.65,-1.20,1.47,.68,.75,c.graphite,-Math.PI/2);
      filamentPrinter(g,1.65,-1.52,1.03);
      filamentPrinter(g,1.65,-.82,.64);
      table(g,1.66,1.14,2.71,.67,.75,c.graphite,-Math.PI/2);
      monitor(g,1.73,1.64,.80,.84,-Math.PI/2,editingScreen);
      monitor(g,1.75,.53,.80,.55,-Math.PI/2,codeScreen);
      chair(g,.93,1.59,-Math.PI/2,c.red,true);
      chair(g,.96,.52,-Math.PI/2,c.red);
      box(g,1.54,.798,1.57,.32,.017,.20,0x356450,false);
      cylinder(g,1.53,.93,2.06,.045,.24,0xb87692,12);
    }},
    jago: {size:roomSizes.jago, yaw:-.50, build(g,w,d) {
      floor(g,w,d,0x74756d,'carpet');
      wall(g,.59,-d/2,4.22,.14,c.ivory);
      linkedDoor(g,-2.13,-d/2+.09,1.05);
      ac(g,-.39,-d/2+.16,2.38);
      for(const [x,y] of [[-.86,1.82],[-.25,1.76],[-.77,1.24],[-.14,1.27]]) {
        box(g,x,y,-d/2+.085,.38,.42,.034,c.black);
        picture(g,x,y,-d/2+.105,.34,.38,poster);
      }
      const windows=cutaway(g,w/2,-.15,-Math.PI/2);
      frame(windows,0,1.56,0,5.96,2.37,5,0xa4b8c3);
      for(let i=0;i<5;i++) {
        const x=(i-2)*1.19;
        box(windows,x,1.66,.051,1.15,2.03,.036,0xc7ced9);
        box(windows,x,2.68,.074,1.18,.061,.077,0xd6d8da);
      }
      wall(windows,0,0,5.96,.13,0x685743,.35);
      const board=cutaway(g,-w/2,-.30,Math.PI/2);
      wall(board,0,0,5.75,.13,c.wall);
      box(board,0,1.63,.10,4.69,1.27,.048,c.chalk);
      box(board,0,2.40,.14,4.97,.17,.30,c.red);
      for(let i=0;i<29;i++) {
        box(board,-2.08+(i%9)*.49,1.99-Math.floor(i/9)*.23+(i%3)*.028,.129,.13+(i%4)*.062,.014,.008,i%4===1?c.blue:c.steel,false);
      }
      table(g,-2.17,-.73,4.03,.73,.75,0x4c3f36,Math.PI/2);
      for(const z of [-2.11,-.88,.30]) {
        monitor(g,-2.26,z,.80,.52,Math.PI/2);
        chair(g,-1.46,z,Math.PI/2,c.black,true);
      }
      table(g,1.70,-2.46,1.63,.69,.77,c.steel);
      monitor(g,1.64,-2.47,.82,.54,0,codeScreen);
      monitor(g,1.57,-2.89,1.37,1.48,0,null,false);
      for(const x of [1.03,2.10]) box(g,x,.73,-2.90,.05,1.37,.055,c.black);
      chair(g,1.65,-1.75,0,c.chalk,true);
      table(g,-.06,-2.46,1.32,.69,.77,c.steel);
      monitor(g,-.06,-2.52,.82,.54,0,codeScreen);
      chair(g,-.06,-1.75,0,c.chalk,true);
      for(const [x,z] of [[1.62,.15],[1.82,1.30]]) {
        sphere(g,x,.29,z,.53,beanbagCloth).scale.set(1.06,.58,1.14);
      }
      const musicWall=cutaway(g,0,d/2,Math.PI);
      wall(musicWall,-.465,0,4.47,.14,0x97988e);
      linkedDoor(musicWall,diskusiSideDoor.x,.09,diskusiSideDoor.width);
      picture(musicWall,.75,1.80,.10,1.39,1.36,lightbulb);
      guitar(musicWall,-.27,1.82,.14);
      guitar(g,2.04,.50,3.39);
      table(g,.77,2.82,2.23,.54,.73,c.chalk);
      monitor(g,.48,2.89,.78,.50,Math.PI,codeScreen);
      chair(g,.09,2.20,Math.PI,c.red);
      chair(g,.73,2.20,Math.PI,c.red);
      fan(g,1.63,2.83,Math.PI,.76);
    }},
    coworking: {size:roomSizes.coworking, yaw:.60, build(g,w,d) {
      floor(g,w,d,0x82614f,'terracotta');
      const back=-d/2;
      wall(g,0,back,w,.15,0x354d50);
      frame(g,0,2.28,back+.096,w-.19,.64,8,0x64898c);
      box(g,0,1.86,back+.147,w-.08,.22,.14,c.red);
      for(const x of [-4.30,.10,4.50]) tallDoor(g,x,back+.122,1.02);
      foodShelf(g,-2.86,back+.42,1.23);
      foodShelf(g,1.60,back+.42,1.47);
      picture(g,1.60,2.03,back+.23,1.59,.31,coworkingSign);
      box(g,3.01,.49,back+.51,1.13,.87,.59,c.red);
      box(g,3.01,.95,back+.51,1.14,.068,.61,0xd6d6ca);
      monitor(g,-1.32,back+.16,1.10,1.65,0,null,false);
      box(g,-3.25,1.32,back+.158,1.64,.91,.038,c.chalk);
      for(const [x,z,tone] of [[-4.13,.47,c.steel],[-1.98,.50,c.steel],[.27,.66,c.oak],[2.55,.59,c.oak],[-3.28,2.01,c.steel],[1.43,2.01,c.oak]]) {
        table(g,x,z,1.61,.88,.75,tone);
        chair(g,x-.38,z+.73,0,x<-2?c.red:c.orange);
        chair(g,x+.39,z+.73,0,c.red);
        chair(g,x-.38,z-.69,Math.PI,0xaab3b1);
        chair(g,x+.39,z-.69,Math.PI,c.graphite);
        if(tone===c.steel) laptop(g,x,z+.20,.81);
      }
      table(g,4.12,1.19,1.54,1.64,.76,c.oak);
      chair(g,3.07,1.18,-Math.PI/2,c.graphite);
      chair(g,5.14,1.18,Math.PI/2,c.red);
      chair(g,4.14,2.41,0,0xaab3b1);
      const openSide=cutaway(g,0,d/2,Math.PI);
      for(const x of [-5.46,-2.75,0,2.75,5.46]) {
        box(openSide,x,1.35,0,.074,2.63,.075,c.graphite);
        plant(g,-x,d/2-.35);
        for(let i=0;i<8;i++) {
          const vine=sphere(openSide,x+Math.sin(i)*.107,.82+i*.214,.076,.108,c.green);
          vine.scale.set(.87,1.52,.63);
        }
      }
      for(const x of [-4.10,1.37,4.10]) {
        box(openSide,x,1.87,.045,2.38,1.54,.035,0x926e46);
        for(let i=0;i<11;i++) box(openSide,x,1.18+i*.135,.07,2.38,.016,.018,c.lightOak,false);
      }
      box(openSide,0,2.66,0,w-.13,.07,.08,c.graphite);
      for(let i=0;i<18;i++) sphere(openSide,-5.45+i*.64,2.56,.057,.038,0xffd190).castShadow=false;
      const redEnd=cluster(g,w/2,-.14,-Math.PI/2);
      redEnd.userData.detailOnly=true;
      wall(redEnd,-1.97,0,.45,.24,c.red,2.48);
      wall(redEnd,1.97,0,.45,.24,c.red,2.48);
      box(redEnd,0,2.29,0,4.05,.47,.24,c.red);
      box(redEnd,0,.09,.06,3.60,.12,.45,c.oak);
    }},
    redbox: {size:roomSizes.redbox, yaw:.33, build(g,w,d) {
      floor(g,w,d,0x89694f,'terracotta');
      wall(g,0,-d/2,w-.72,.16,0x714045);
      box(g,0,1.38,-d/2+.101,3.62,2.02,.05,0xb5a38f);
      wall(g,-2.30,-.67,.22,2.75,0x882e3b,2.40);
      const right=cutaway(g,2.30,-.67,-Math.PI/2);
      wall(right,0,0,2.75,.22,0x882e3b,2.40);
      box(g,0,.15,-.71,4.37,.24,2.80,c.oak);
      for(let i=0;i<10;i++) box(g,-1.96+i*.44,.274,-.71,.011,.008,2.77,0x674833,false);
      const opening=cluster(g,0,1.09);
      for(const x of [-2.25,2.25]) wall(opening,x,0,.52,.37,c.red,2.46);
      box(opening,0,2.37,0,5.00,.49,.37,c.red);
      const clock=cylinder(opening,0,2.40,.224,.155,.038,c.cream,32);
      clock.rotation.x=Math.PI/2;
      box(opening,0,2.449,.249,.014,.092,.011,c.ink);
      const hand=box(opening,.033,2.398,.249,.069,.014,.011,c.ink);
      hand.rotation.z=.36;
      fan(g,-1.91,1.53);
      fan(g,1.91,1.50);
      table(g,-.92,-1.17,.61,.40,.35,c.oak);
      box(g,1.82,.47,-.61,.56,.39,.42,c.lightOak);
      plant(g,2.45,1.55);
    }},
  };

  const gallery=new T.Group();
  scene.add(gallery);
  const { layout, floors: passageFloors, walls: passageWalls } = overviewPlan();
  const combinedView={x:8,z:-4.7,yaw:1.47};
  const passages=cluster(scene,0,0,0,.012);
  for(const {x,z,w,d} of passageFloors) floor(cluster(passages,x,z),w,d,0xaaa397);
  for(const {x,z,w,d} of passageWalls) wall(passages,x,z,Math.max(w,.09),Math.max(d,.09),c.ivory,.60);
  const rooms=Object.entries(data).map(([id,info]) => {
    const group=new T.Group();
    group.userData.room=id;
    info.build(group,...info.size);
    gallery.add(group);
    const modes=[];
    group.traverse(part=>{
      if(part.userData.detailOnly||part.userData.overviewOnly) modes.push(part);
    });
    return {id,group,modes,bounds:new T.Box3().setFromObject(group),cutaways:group.children.filter(part=>part.userData.cutaway)};
  });
  // Simple standing figure per marker, in the room's local coordinates so it follows the room in overview.
  const shirts=[c.red,c.blue,c.green,c.orange,c.mint,c.yellow,0x6b4f8a,0x2f7a8c];
  const figures=new Map();
  function figure(roomGroup,{id,x,z}) {
    const seed=[...id].reduce((sum,ch)=>sum*31+ch.charCodeAt(0)>>>0,7);
    const body=cluster(roomGroup,x,z,Math.atan2(-x,-z));
    body.userData.person=id;
    for(const side of [-.085,.085]) box(body,side,.45,0,.12,.84,.15,c.ink);
    cylinder(body,0,1.16,0,.19,.64,shirts[seed%shirts.length]);
    for(const side of [-.24,.24]) box(body,side,1.12,0,.08,.58,.1,shirts[seed%shirts.length]);
    sphere(body,0,1.62,0,.13,[0xe0b48f,0xc68e64,0x9a6a48][seed%3]);
    box(body,0,1.70,-.03,.25,.09,.24,c.black);
    return body;
  }
  const ray=new T.Raycaster();
  const defaultRoom = 'overview';
  let zoom = 100;
  let markers = [];
  let active=defaultRoom;
  let yaw=.65, pitch=.62;
  let width=1,height=1;
  let frameRequest;
  let pointer;
  const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
  const corner=new T.Vector3();
  const viewBounds=new T.Box3();

  function draw() {
    frameRequest=undefined;
    const isOverview=active==='overview';
    const aspect=width/height;
    const targetY=isOverview?.63:.97;
    const targetX=isOverview?combinedView.x:0;
    const targetZ=isOverview?combinedView.z:0;
    const distance=isOverview?48:28;
    camera.position.set(targetX+distance*Math.cos(pitch)*Math.sin(yaw),targetY+distance*Math.sin(pitch),targetZ+distance*Math.cos(pitch)*Math.cos(yaw));
    camera.lookAt(targetX,targetY,targetZ);
    camera.updateMatrixWorld();
    viewBounds.makeEmpty();
    for(const {group,bounds,cutaways} of rooms) {
      if(!group.visible) continue;
      group.updateMatrixWorld();
      for(const part of cutaways) {
        const angle=part.rotation.y+group.rotation.y;
        const inwardX=Math.sin(angle);
        const inwardZ=Math.cos(angle);
        part.getWorldPosition(corner);
        const dx=camera.position.x-corner.x;
        const dz=camera.position.z-corner.z;
        const visible=dx*inwardX+dz*inwardZ>.15;
        if(part.visible!==visible) renderer.shadowMap.needsUpdate=true;
        part.visible=visible;
      }
      for(const x of [bounds.min.x,bounds.max.x]) {
        for(const y of [bounds.min.y,bounds.max.y]) {
          for(const z of [bounds.min.z,bounds.max.z]) {
            corner.set(x,y,z).applyMatrix4(group.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
            viewBounds.expandByPoint(corner);
          }
        }
      }
    }
    const vertical=Math.max(
      (viewBounds.max.x-viewBounds.min.x)/aspect,
      viewBounds.max.y-viewBounds.min.y
    )*.555/(zoom/100);
    const centerX=(viewBounds.min.x+viewBounds.max.x)/2;
    const centerY=(viewBounds.min.y+viewBounds.max.y)/2;
    camera.left=centerX-vertical*aspect;
    camera.right=centerX+vertical*aspect;
    camera.top=centerY+vertical;
    camera.bottom=centerY-vertical;
    camera.updateProjectionMatrix();
    renderer.render(scene,camera);
    // Room view: name labels above each figure's head. Overview: one label per room, above the walls.
    const points = active === 'overview'
      ? Object.entries(layout).map(([id, { x, z }]) => ({ id, x, y: 2.9, z }))
      : markers.filter(marker => marker.room === active).map(marker => ({ ...marker, y: 2.05 }));
    onProjection(points.map(({ id, x, y, z }) => {
      corner.set(x, y, z).project(camera);
      return {
        id, x: (corner.x + 1) * 50, y: (1 - corner.y) * 50,
        visible: Math.abs(corner.x) <= 1 && Math.abs(corner.y) <= 1 && Math.abs(corner.z) <= 1
      };
    }));
  }
  function schedule() {
    if(frameRequest===undefined) frameRequest=requestAnimationFrame(draw);
  }
  function resize() {
    width=Math.max(1,canvas.clientWidth); height=Math.max(1,canvas.clientHeight);
    renderer.setSize(width,height,false);
    schedule();
  }

  function show(id) {
    active = Object.hasOwn(data, id) || id === 'overview' ? id : defaultRoom;
    const isOverview = active === 'overview';
    yaw = isOverview ? combinedView.yaw : data[active].yaw;
    pitch = isOverview ? .99 : (data[active].pitch ?? .58);
    zoom = 100;
    passages.visible = isOverview;
    key.target.position.set(isOverview ? combinedView.x : 0, 0, isOverview ? combinedView.z : 0);
    key.target.updateMatrixWorld();
    key.position.set(9 + key.target.position.x, 18, 10 + key.target.position.z);
    Object.assign(key.shadow.camera, {
      left: isOverview ? -22 : -17, right: isOverview ? 22 : 17,
      top: isOverview ? 22 : 15, bottom: isOverview ? -22 : -15
    });
    key.shadow.camera.updateProjectionMatrix();
    for (const room of rooms) {
      const placement = layout[room.id];
      room.group.visible = isOverview || active === room.id;
      room.group.position.set(isOverview ? placement.x : 0, 0, isOverview ? placement.z : 0);
      room.group.rotation.y = isOverview ? placement.angle : 0;
      for (const model of room.modes) model.visible = model.userData.detailOnly ? !isOverview : isOverview;
    }
    renderer.shadowMap.needsUpdate = true;
    schedule();
  }

  const listeners = new AbortController();
  const { signal } = listeners;
  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw, pitch, moved: false };
    canvas.setPointerCapture(event.pointerId);
  }, { signal });
  canvas.addEventListener('pointermove', event => {
    if (pointer?.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (Math.hypot(dx, dy) > 4) pointer.moved = true;
    if (!pointer.moved) return;
    yaw = pointer.yaw - dx * .008;
    pitch = clamp(pointer.pitch + dy * .006, .26, 1.31);
    schedule();
  }, { signal });
  canvas.addEventListener('pointerup', event => {
    if (pointer?.id !== event.pointerId) return;
    const click = !pointer.moved;
    pointer = undefined;
    if (!click) return;

    const rect = canvas.getBoundingClientRect();
    ray.setFromCamera(new T.Vector2(
      2 * (event.clientX - rect.left) / rect.width - 1,
      1 - 2 * (event.clientY - rect.top) / rect.height
    ), camera);
    if (active !== 'overview') {
      const room = rooms.find(room => room.id === active);
      const hit = ray.intersectObject(room.group, true).find(hit => hit.object.userData.officeFloor);
      if (hit) {
        const next = room.group.worldToLocal(hit.point);
        onPick({ x: Number(next.x.toFixed(3)), z: Number(next.z.toFixed(3)) });
      }
      return;
    }
    let object = ray.intersectObjects(rooms.map(room => room.group), true).find(hit => {
      for (let node = hit.object; node; node = node.parent) if (!node.visible) return false;
      return true;
    })?.object;
    while (object && !object.userData.room) object = object.parent;
    if (object?.userData.room) onSelect(object.userData.room);
  }, { signal });
  canvas.addEventListener('pointercancel', () => { pointer = undefined; }, { signal });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    onUnavailable();
  }, { signal });

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  show(initialArea);
  resize();

  return {
    show,
    rotate(direction) {
      yaw += direction * Math.PI / 8;
      schedule();
    },
    setZoom(value) {
      zoom = clamp(value, 75, 160);
      schedule();
    },
    // positions: [{ id, room, x, z }] for every room, so figures also show in the overview.
    setMarkers(positions) {
      markers = positions;
      for (const body of figures.values()) {
        body.removeFromParent();
        body.traverse(part => { if (part.isMesh && part.geometry !== unitCube) part.geometry.dispose(); });
      }
      figures.clear();
      for (const marker of positions) {
        const room = rooms.find(room => room.id === marker.room);
        if (room) figures.set(marker.id, figure(room.group, marker));
      }
      renderer.shadowMap.needsUpdate = true;
      schedule();
    },
    dispose() {
      listeners.abort();
      observer.disconnect();
      if (frameRequest !== undefined) cancelAnimationFrame(frameRequest);
      const geometries = new Set();
      const materials = new Set();
      const textures = new Set();
      scene.traverse(object => {
        if (!object.isMesh) return;
        geometries.add(object.geometry);
        materials.add(object.material);
        if (object.material.map) textures.add(object.material.map);
      });
      for (const geometry of geometries) geometry.dispose();
      for (const texture of textures) texture.dispose();
      for (const material of materials) material.dispose();
      key.shadow.dispose();
      renderer.dispose();
    }
  };
}
