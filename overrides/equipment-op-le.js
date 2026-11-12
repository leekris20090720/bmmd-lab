/* OP-LE display model. Dimensions and limits: docs/op-le-display-model.md.
 * No physics, training state, renderer or DOM ownership in this factory.
 * Local +X = kick direction, +Y = up, +Z = tower side. Authored photo coordinates are reflected in Z below. */
(function (global) {
  'use strict';
  const BM = global.BM = global.BM || {};
  const models = BM.EquipmentModels = BM.EquipmentModels || {};
  models.createOPLE = function ({ THREE: T, RoundedBoxGeometry }) {
    // Manufacturer reference: height 1.35m; width ~1.02m. All component
    // dimensions below are visual estimates, NOT manufacturing dimensions.
    const S = 2.1, ground = -1.55;
    const D = Object.freeze({ height: 1.35, towerX: -.31, towerZ: -.46,
      seatX: -.08, seatY: .61, seatZ: .12, axisX: .27, axisY: .64,
      armLength: .365, rollerRadius: .079, rollerWidth: .215 });
    const group = new T.Group(); group.name = 'OP-LE · reference-informed display';
    const parts = {}, resources = new Set();
    const material = (name, color, metalness, roughness) => {
      const m = new T.MeshStandardMaterial({ color, metalness, roughness });
      m.name = name; resources.add(m); return m;
    };
    const M = { frame: material('powder-coated platinum', 0xaeb7bc, .55, .39),
      edge: material('machined steel', 0x8c989e, .82, .27),
      pad: material('matte burgundy upholstery', 0x782431, .02, .76),
      seam: material('upholstery edge', 0x9c4550, .01, .87),
      rubber: material('rubber', 0x171b20, .02, .84),
      shroud: material('graphite polymer', 0x262c31, .13, .55),
      stack: material('weight plates', 0x4b5359, .63, .49),
      yellow: material('adjustment pin', 0xe9b52b, .22, .43),
      cable: material('cable schematic', 0x293239, .3, .49) };
    BM.ModelViewTools?.finish(T,[M.frame,M.edge,M.stack],'metal',.018);
    BM.ModelViewTools?.finish(T,[M.pad,M.seam,M.rubber,M.shroud],'matte',.024);
    const vec = (x, y, z) => new T.Vector3(x * S, y * S + ground, -z * S);
    const local = (a) => new T.Vector3(a[0], a[1], -a[2]).multiplyScalar(S);
    const assembly = (name, offset) => {
      const node = new T.Group(); node.name = name; group.add(node);
      return { node, offset: local(offset), position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone() };
    };
    // Non-overlapping wrappers: explosion never writes motion-node transforms.
    const assemblies = {
      frame: assembly('Fixed frame', [0, 0, 0]),
      tower: assembly('Weight tower', [-.16, 0, -.19]),
      seat: assembly('Seat and handles', [0, .16, .16]),
      back: assembly('Backrest carriage', [-.18, .13, .09]),
      motion: assembly('Knee-axis work arm', [.23, 0, .12]),
      transmission: assembly('Transmission schematic', [.09, -.09, -.23])
    };
    const mesh = (name, geometry, mat, position, parent) => {
      resources.add(geometry); const node = new T.Mesh(geometry, mat);
      node.name = name; if (position) node.position.copy(position);
      node.castShadow = true; node.receiveShadow = true; parent.add(node);
      if (name) parts[name] = node; return node;
    };
    const box = (name, size, p, mat = M.frame, parent = assemblies.frame.node, radius = .018, relative = false) =>
      mesh(name, new RoundedBoxGeometry(...size.map(n => n * S), 3, Math.min(radius, ...size.map(n => n / 3)) * S), mat, relative ? local(p) : vec(...p), parent);
    const cylinder = (name, radius, length, p, mat = M.edge, parent = assemblies.frame.node, relative = false, axis = 'z') => {
      const node = mesh(name, new T.CylinderGeometry(radius * S, radius * S, length * S, 24, 1), mat, relative ? local(p) : vec(...p), parent);
      if (axis === 'z') node.rotation.x = Math.PI / 2;
      if (axis === 'x') node.rotation.z = Math.PI / 2;
      return node;
    };
    const rod = (name, a, b, radius, mat, parent, relative = false) => {
      const start = relative ? local(a) : vec(...a), end = relative ? local(b) : vec(...b);
      const node = mesh(name, new T.CylinderGeometry(radius * S, radius * S, 1, 12), mat, null, parent);
      align(node, start, end); return node;
    };
    function align(node, a, b) { const delta = b.clone().sub(a); node.position.copy(a).add(b).multiplyScalar(.5); node.scale.y = delta.length(); node.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()); }
    const beam = (name, a, b, width = .065, depth = .065, parent = assemblies.frame.node) => {
      const start = vec(...a), end = vec(...b), delta = end.clone().sub(start);
      const node = mesh(name, new RoundedBoxGeometry(delta.length(), width * S, depth * S, 3, .012 * S), M.frame, start.add(end).multiplyScalar(.5), parent);
      node.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), delta.normalize()); return node;
    };
    // Low runner, inclined front support, rear upright and lateral connectors.
    beam('mainRunner', [-.60, .055, .12], [.58, .055, .12], .075, .10);
    beam('frontSupport', [.48, .08, .12], [.23, .59, .12], .078, .085);
    beam('rearSupport', [-.49, .08, .12], [-.49, .72, .12], .067, .075);
    beam('seatRail', [-.50, .55, .12], [.28, .55, .12], .065, .075);
    beam('lowerCrossmember', [-.38, .07, -.46], [-.38, .07, .12], .075, .08);
    beam('upperCrossmember', [-.39, .95, -.46], [-.48, .76, .12], .064, .07);
    [[-.60, .12], [.58, .12], [-.53, -.46], [-.08, -.46]].forEach(([x, z], i) => box('foot' + i, [.17, .025, .15], [x, .014, z], M.rubber));
    // Lateral tower, narrow depth with vertical silver side rails.
    const tower = assemblies.tower.node;
    box('towerShroud', [.48, 1.26, .125], [D.towerX, .675, D.towerZ - .025], M.shroud, tower, .028);
    [-.245, .245].forEach((dx, i) => box('towerEdge' + i, [.055, 1.33, .205], [D.towerX + dx, .675, D.towerZ], M.frame, tower, .022));
    box('towerCrown', [.535, .06, .22], [D.towerX, 1.32, D.towerZ], M.rubber, tower, .026);
    // A narrow open reveal shows the stack without inventing a transparent shell.
    box('towerInset', [.135, .98, .012], [D.towerX, .605, D.towerZ + .067], M.rubber, tower, .006);
    const stackLift = new T.Group(); stackLift.name = 'Illustrative selected stack'; tower.add(stackLift); parts.stackLift = stackLift;
    for (let i = 0; i < 13; i++) box('plate' + i, [.115, .023, .045], [D.towerX, .19 + i * .026, D.towerZ + .077], M.stack, stackLift, .003);
    [-.055, .055].forEach((dx, i) => cylinder('guideRod' + i, .007, .96, [D.towerX + dx, .64, D.towerZ + .092], M.edge, tower, false, 'y'));
    cylinder('weightPin', .013, .055, [D.towerX, .37, D.towerZ + .12], M.yellow, tower);
    box('instructionPanel', [.39, .16, .014], [D.towerX, 1.18, D.towerZ + .077], M.rubber, tower, .007);
    // Fixed seat, independent rear sliding carriage; no invented seat-height control.
    const seat = assemblies.seat.node;
    box('seatBase', [.51, .035, .46], [D.seatX, .565, D.seatZ], M.rubber, seat);
    box('seat', [.55, .085, .48], [D.seatX, D.seatY, D.seatZ], M.pad, seat, .035);
    box('seatSeam', [.515, .005, .453], [D.seatX, .652, D.seatZ], M.seam, seat, .015);
    [-.29, .29].forEach((dz, i) => {
      const z = D.seatZ + dz;
      rod('gripMount' + i, [-.12, .53, z], [.16, .52, z], .022, M.edge, seat);
      rod('gripReturn' + i, [.16, .52, z], [.21, .64, z], .021, M.rubber, seat);
      rod('handle' + i, [.21, .64, z], [-.08, .72, z], .024, M.rubber, seat);
      cylinder('gripCap' + i, .025, .01, [-.08, .72, z], M.edge, seat, false, 'x');
    });
    const back = assemblies.back.node;
    beam('backSlide', [-.56, .68, .12], [-.27, .68, .12], .043, .046, back);
    cylinder('backPin', .014, .045, [-.52, .69, .19], M.yellow, back);
    const backPivot = new T.Group(); backPivot.position.copy(vec(-.34, .67, .12)); backPivot.rotation.z = .20; back.add(backPivot);
    box('backShell', [.055, .50, .42], [-.018, .235, 0], M.rubber, backPivot, .022, true);
    box('backPad', [.075, .52, .435], [.019, .235, 0], M.pad, backPivot, .034, true);
    // Transverse knee shaft: arm and transmission rotate around the same axis,
    // as siblings; one display-pose adapter keeps both rotations coordinated.
    // The work arm sits off the centreline; the fixed inclined support passes
    // through the free gap between the pads, rather than through the arm.
    const origin = vec(D.axisX, D.axisY, D.seatZ - .145);
    cylinder('fixedBearing', .020, .38, [D.axisX, D.axisY, D.seatZ], M.edge);
    [-.17, .17].forEach((z, i) => cylinder('bearingHousing' + i, .055, .035, [D.axisX, D.axisY, D.seatZ + z], M.frame));
    const armPivot = new T.Group(); armPivot.name = 'Knee-axis rotating assembly'; armPivot.position.copy(origin); assemblies.motion.node.add(armPivot); parts.armPivot = armPivot;
    box('workArm', [.075, .285, .05], [0, -.115, 0], M.frame, armPivot, .025, true);
    box('kicker', [.044, .17, .043], [.007, -.285, 0], M.edge, armPivot, .008, true);
    cylinder('axisCap', .058, .075, [0, 0, .075], M.edge, armPivot, true);
    cylinder('armPin', .014, .075, [.012, -.222, .055], M.yellow, armPivot, true);
    const roller = new T.Group(); roller.name = 'Two independent shin pads'; roller.position.copy(local([.012, -D.armLength, .145])); armPivot.add(roller); parts.shinRoll = roller;
    cylinder('rollerShaft', .019, .59, [0, 0, 0], M.edge, roller, true);
    [-.162, .162].forEach((z, i) => {
      cylinder('shinPad' + i, D.rollerRadius, D.rollerWidth, [0, 0, z], M.pad, roller, true);
      [-1, 1].forEach((side, j) => cylinder('rollerCap' + i + j, .067, .008, [0, 0, z + side * (D.rollerWidth / 2 + .003)], M.rubber, roller, true));
    });
    // Opaque cam envelope inferred from the assembly drawing. It is deliberately
    // NOT generated from d(theta); groove, contact point and ratio are unknown.
    const cam = new T.Group(); cam.name = 'Uncalibrated transmission envelope'; cam.position.copy(origin); assemblies.transmission.node.add(cam); parts.cam = cam;
    rod('camBracket', [0, 0, -.08], [.004, -.22, -.08], .017, M.edge, cam, true);
    const camDisk = cylinder('camDisk', .103, .018, [.004, -.225, -.08], M.shroud, cam, true); camDisk.geometry.scale(.82, 1, 1.3);
    cylinder('camFastener', .012, .024, [.004, -.225, -.06], M.edge, cam, true);
    const pulley = cylinder('guidePulley', .038, .045, [-.41, .28, .0], M.rubber, assemblies.transmission.node);
    parts.cableA = rod('cableA', [D.towerX, .20, D.towerZ + .1], [-.41, .28, .0], .0032, M.cable, assemblies.transmission.node);
    parts.cableB = rod('cableB', [-.41, .28, .0], [.27, .41, .04], .0032, M.cable, assemblies.transmission.node);
    const attachment = new T.Object3D(); attachment.position.copy(local([-.06, -.265, -.08])); cam.add(attachment);
    const cableEnd = new T.Vector3();
    // Only the same already-existing 0..100 teaching motion is mapped here.
    // Illustrative stack travel is not a measured cable-length constraint.
    function update(progress) {
      const p = T.MathUtils.clamp(Number(progress) || 0, 0, 100) / 100;
      armPivot.rotation.z = cam.rotation.z = -.1 + 1.46 * p;
      stackLift.position.y = p * .12 * S;
      cam.updateMatrix(); attachment.updateMatrix();
      cableEnd.copy(attachment.position).applyMatrix4(cam.matrix);
      align(parts.cableB, pulley.position, cableEnd);
    }
    const force = new T.Group(); force.name = 'Legacy force anchor'; force.visible = false; force.userData.forceIndicator = true; group.add(force); parts.force = force;
    // Invisible selectable volume is owned by the rig; adapter registers it.
    const hitMat = new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }); resources.add(hitMat);
    parts.actionHit = mesh('actionHit', new T.BoxGeometry(.22 * S, .21 * S, .57 * S), hitMat, new T.Vector3(), roller);
    parts.actionHit.userData = { dragScene: 'cam', dragControl: '', dragProxy: true, dragTarget: roller };
    const anchors = {
      seat: { node: parts.seat, target: assemblies.seat.node, label: '坐垫与把手', text: '坐垫和两侧把手用于坐稳与支撑；调节方法应核对现场器械。' },
      back: { node: parts.backPad, target: assemblies.back.node, label: '靠背调节', text: '靠背沿支架前后移动；本模型只标示位置，不设置未经核实的档位。' },
      axis: { node: parts.bearingHousing1, target: parts.bearingHousing1, label: '器械转轴', text: '转轴横向贯穿工作臂。准备时，膝关节与器械转轴对齐。' },
      roller: { node: parts.rollerCap11, target: roller, label: '双小腿垫', text: '两段独立滚垫随工作臂绕器械转轴运动；调节插管以适合小腿长度。' },
      drive: { node: parts.guidePulley, target: assemblies.transmission.node, label: '钢索与传动', text: '装配资料确认了部件连接；槽线、切点与阻力曲线尚未标定。' }
    };
    let exploded = 0;
    function setExplode(value) {
      exploded = T.MathUtils.clamp(Number(value) || 0, 0, 1);
      Object.values(assemblies).forEach(({ node, offset, position, quaternion, scale }) => {
        node.position.copy(position).addScaledVector(offset, exploded);
        node.quaternion.copy(quaternion); node.scale.copy(scale);
      });
      group.updateWorldMatrix(true, true);
    }
    update(0);
    return { group, parts, anchors, assemblies, dimensions: D, sceneUnitsPerM: S,
      update, setExplode, getExplode: () => exploded,
      // The ideal experiment can exceed the teaching envelope. Clamp only
      // this display shell; the authoritative result and colored mechanism
      // retain their original angle and all SI calculations.
      setDisplayAngle(angleRad) { update((T.MathUtils.clamp(angleRad, -.1, 1.36) + .1) / 1.46 * 100); },
      poseAt: p => -.1 + 1.46 * T.MathUtils.clamp(p, 0, 100) / 100,
      dispose() { group.removeFromParent(); resources.forEach(r => r.dispose()); resources.clear(); },
      metadata: { model: 'Life Fitness Axiom OP-LE', reference: '1013946-0001 REV AC', calibration: 'visual approximation', internalTransmission: 'schematic' } };
  };
})(typeof window !== 'undefined' ? window : globalThis);
