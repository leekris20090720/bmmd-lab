/* BM//MD cutaway studio. These presentation models have no role in calculations. */
(() => {
  'use strict';
  const B = window.BM = window.BM || {};
  B.buildSpatialStudio = ({THREE: T, RoundedBoxGeometry}) => {
    const world = new T.Group();
    const standard = (color, roughness = .54, metalness = .18) => new T.MeshStandardMaterial({color, roughness, metalness});
    const steel = standard(0x9aaabe, .33, .55);
    const edge = standard(0x33415c, .42, .48);
    const rubber = standard(0x101728, .91, .02);
    const slab = standard(0x222f48, .88, .04);
    const wall = standard(0x182235, .83, .07);
    const ivory = standard(0xabb5ca, .53, .31);
    const mint = standard(0xeaa557, .48, .20);
    const pads = standard(0x252d41, .96, 0);
    const line = new T.MeshBasicMaterial({color:0x566581});
    const lamp = new T.MeshBasicMaterial({color:0x8caed0});
    const active = new T.MeshBasicMaterial({color:0xffbd73});
    const black = new T.MeshBasicMaterial({color:0x0b121e});
    const unitBox = new T.BoxGeometry(1,1,1);
    const unitCylinder = new T.CylinderGeometry(1,1,1,32);
    const mesh = (parent, geometry, material, x, y, z) => {
      const object = new T.Mesh(geometry, material);
      object.position.set(x,y,z); parent.add(object);
      return object;
    };
    const box = (parent, material, x,y,z,w,h,d) => {
      const object = mesh(parent,unitBox,material,x,y,z);
      object.scale.set(w,h,d);
      return object;
    };
    const soft = (parent, material, x,y,z,w,h,d) =>
      mesh(parent, new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.23),material,x,y,z);
    const cylinder = (parent, material, x,y,z,r,h,axis='y') => {
      const object = mesh(parent,unitCylinder,material,x,y,z);
      object.scale.set(r,h,r);
      if (axis==='x') object.rotation.z=Math.PI/2;
      if (axis==='z') object.rotation.x=Math.PI/2;
      return object;
    };
    const yAxis = new T.Vector3(0,1,0);
    const rod = (parent, material, from, to, radius) => {
      const a = new T.Vector3(...from), b = new T.Vector3(...to);
      const center = a.clone().lerp(b,.5), delta = b.sub(a);
      const object = cylinder(parent,material,...center,radius,delta.length());
      object.quaternion.setFromUnitVectors(yAxis,delta.normalize());
      return object;
    };
    const group = (parent,x,y,z) => {
      const object = new T.Group(); object.position.set(x,y,z); parent.add(object); return object;
    };
    const shadowCanvas = document.createElement('canvas'); shadowCanvas.width=shadowCanvas.height=96;
    const brush = shadowCanvas.getContext('2d');
    const gradient = brush.createRadialGradient(48,48,4,48,48,47);
    gradient.addColorStop(0,'#050917'); gradient.addColorStop(.5,'#050917a0'); gradient.addColorStop(1,'#05091700');
    brush.fillStyle=gradient; brush.fillRect(0,0,96,96);
    const shadow = new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,opacity:.85});
    const plane = new T.PlaneGeometry(1,1);
    const shade = (parent,x,y,z,w,d) => {
      const object = mesh(parent,plane,shadow,x,y,z); object.scale.set(w,d,1); object.rotation.x=-Math.PI/2; return object;
    };
    function label(parent, text, x,y,z,w,h, floor=false) {
      const canvas = document.createElement('canvas'); canvas.width=384; canvas.height=128;
      const ctx = canvas.getContext('2d');
      ctx.font='600 76px monospace'; ctx.fillStyle='#d5e2f3'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(text,192,67);
      const texture = new T.CanvasTexture(canvas); texture.colorSpace=T.SRGBColorSpace;
      const material = new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});
      const mark = mesh(parent,plane,material,x,y,z); mark.scale.set(w,h,1);
      if(floor)mark.rotation.x=-Math.PI/2;
    }
    function wheel(parent,x,y,z,r,axis='z') {
      cylinder(parent,edge,x,y,z,r,.20,axis);
      const shift = axis==='z'?[0,0,.105]:[.105,0,0];
      const center = [x+shift[0],y,z+shift[2]];
      const ring = mesh(parent,new T.TorusGeometry(r*.76,r*.08,10,32),steel,...center);
      if(axis==='x')ring.rotation.y=Math.PI/2;
      cylinder(parent,mint,...center,r*.22,.09,axis);
    }
    function bench(parent) {
      const frame = group(parent,-.22,0,.24);
      shade(frame,0,.018,0,5.1,3.6);
      for (const x of [-1.7,1.7]) {
        box(frame,edge,x,.11,-.32,.21,.22,2.3);
        box(frame,steel,x,1.52,-.87,.18,2.98,.18);
        box(frame,steel,x,1.52,.86,.15,2.98,.15);
        box(frame,edge,x,2.95,0,.23,.19,1.95);
        for(let y=.69;y<2.78;y+=.26)box(frame,rubber,x,y,.946,.076,.074,.018);
      }
      box(frame,steel,0,2.94,-.87,3.6,.18,.18);
      box(frame,edge,0,.36,.48,.20,.22,1.75);
      for(const z of [-.12,1.16])box(frame,steel,0,.29,z,.72,.26,.18);
      soft(frame,pads,0,.58,.44,.74,.22,1.78);
      rod(frame,steel,[-2.27,1.63,.90],[2.27,1.63,.90],.052);
      for(const x of [-1.82,1.82]) {
        cylinder(frame,rubber,x,1.63,.9,.49,.16,'x');
        cylinder(frame,ivory,x+Math.sign(x)*.089,1.63,.9,.37,.045,'x');
        cylinder(frame,steel,x+Math.sign(x)*.12,1.63,.9,.14,.09,'x');
      }
    }
    function cableMachine(parent) {
      const frame = group(parent,-.18,0,.05);
      shade(frame,0,.018,0,5.15,3.3);
      box(frame,edge,0,.11,.12,4.3,.22,1.95);
      for(const x of [-1.73,1.73]){
        soft(frame,edge,x,1.40,-.05,.68,2.78,.65);
        box(frame,steel,x+(x<0?.28:-.28),1.43,.38,.13,2.83,.17);
        for(let n=0;n<11;n++) box(frame,n===4?mint:rubber,x+(x<0?.28:-.28),.44+n*.19,.48,.066,.071,.041);
        wheel(frame,x,2.75,.44,.25);
        rod(frame,steel,[x,2.59,.48],[x*.66,.91,1.02],.024);
        box(frame,pads,x*.66,.88,1.05,.40,.12,.13);
      }
      box(frame,steel,0,2.78,-.05,3.81,.17,.42);
      box(frame,black,0,2.65,.18,2.92,.13,.15);
      soft(frame,rubber,0,.17,.62,2.38,.16,1.28);
      box(frame,line,0,.254,.64,1.92,.018,.047);
    }
    function testStand(parent) {
      shade(parent,0,.016,.0,5.65,3.45);
      box(parent,edge,0,.30,-.28,4.52,.6,2.46);
      box(parent,ivory,0,.63,-.28,4.64,.13,2.57);
      box(parent,rubber,0,.75,-.34,3.56,.13,1.6);
      for (const x of [-1.42,1.42]){
        box(parent,steel,x,1.50,-.50,.145,1.65,.15);
        box(parent,steel,x,.79,-.50,.39,.19,.55);
      }
      box(parent,steel,0,2.34,-.50,3.13,.16,.16);
      wheel(parent,.25,1.87,-.13,.57);
      rod(parent,steel,[.25,1.87,.05],[-1.14,1.22,.05],.10);
      cylinder(parent,mint,-1.16,1.20,.06,.17,.31,'z');
      rod(parent,mint,[.74,1.87,-.05],[.74,1.02,.36],.025);
      box(parent,steel,.74,.99,.37,.34,.32,.32);
      const chart=group(parent,1.64,.89,.59);
      chart.rotation.x=-.27;
      box(chart,black,0,.03,.06,.73,.46,.08);
      let previous=[-.26,-.085,.105];
      for(let n=1;n<=9;n++){
        const point=[-.26+n*.057,-.085+.23*Math.pow(n/9,1.65),.105];
        rod(chart,active,previous,point,.012);
        previous=point;
      }
    }
    function gallery(parent) {
      const display=group(parent,0,0,-.18);
      shade(display,0,.015,0,5.23,3.3);
      cylinder(display,edge,0,.24,0,1.54,.47);
      cylinder(display,rubber,0,.51,0,1.46,.12);
      const ring=mesh(display,new T.TorusGeometry(1.49,.026,10,72),active,0,.48,0);
      ring.rotation.x=Math.PI/2;
      const specimen=group(display,0,1.68,0);
      specimen.rotation.y=-.25;
      for(const z of [-.43,.43]){
        rod(specimen,steel,[-.85,-1.06,z],[.66,.87,z],.13);
        rod(specimen,edge,[.66,.87,z],[1.19,-1.06,z],.12);
      }
      wheel(specimen,.48,.65,.61,.43);
      wheel(specimen,-.64,-.74,.61,.34);
      rod(specimen,mint,[-.56,-.53,.69],[.65,.93,.69],.031);
      soft(specimen,pads,-.10,.00,-.12,.71,.22,1.32).rotation.z=.63;
      for (const x of [-2.02,2.02]){
        cylinder(display,steel,x,.55,-.91,.045,1.1);
        cylinder(display,lamp,x,1.14,-.91,.075,.075);
      }
    }
    function inclineMachine(parent) {
      shade(parent,0,.018,0,5.4,3.7);
      for(const x of [-.75,.75]){
        box(parent,edge,x,.10,0,.19,.2,3.2);
        rod(parent,steel,[x,.31,1.26],[x,2.29,-1.23],.092);
        rod(parent,edge,[x,.23,-1.25],[x,2.29,-1.23],.108);
      }
      const seat=group(parent,0,.57,.88);
      soft(seat,pads,0,0,0,1.03,.20,.82).rotation.x=-.26;
      soft(seat,pads,0,.32,.32,.92,.20,.97).rotation.x=-.73;
      const sled=group(parent,0,1.63,-.4);
      soft(sled,edge,0,.10,0,1.70,1.0,.17).rotation.x=.61;
      for(const x of [-.96,.96]){
        cylinder(sled,rubber,x,0,.11,.44,.14,'x');
        cylinder(sled,steel,x+Math.sign(x)*.08,0,.11,.22,.05,'x');
      }
    }
    function seatedMachine(parent) {
      shade(parent,0,.018,0,4.7,3.3);
      box(parent,edge,0,.11,-.26,3.55,.22,2.29);
      soft(parent,edge,.93,1.14,-.91,.58,2.25,.51);
      for(let i=0;i<9;i++)box(parent,i===3?mint:steel,.93,.38+i*.12,-.62,.37,.065,.035);
      box(parent,steel,-.37,.46,.22,.24,.73,.31);
      soft(parent,pads,-.37,.85,.34,.88,.20,.76);
      soft(parent,pads,-.37,1.25,-.15,.79,.83,.18).rotation.x=-.12;
      for(const x of [-.93,.19]){
        wheel(parent,x,1.96,-.31,.20);
        rod(parent,steel,[x,1.96,-.31],[x,1.22,.81],.075);
        cylinder(parent,pads,x,1.22,.81,.075,.35,'x');
      }
      box(parent,steel,-.37,2.06,-.43,1.57,.15,.20);
    }
    function terminal(parent,x,z) {
      box(parent,edge,x,.38,z,.55,.74,.47);
      const screen=group(parent,x,.81,z);
      screen.rotation.x=-.23;
      box(screen,ivory,0,0,0,.56,.34,.08);
      box(screen,black,0,0,.048,.47,.26,.022);
      for(let n=0;n<4;n++)box(screen,n===2?active:line,-.086+n*.058,0,.064,.025,.10+n*.013,.013);
    }
    const rooms=[
      {id:'train',x:-3.50,z:2.51,number:'01',build:bench},
      {id:'learn',x:3.50,z:2.51,number:'02',build:cableMachine},
      {id:'lab',x:-3.50,z:-2.51,number:'03',build:testStand},
      {id:'interact',x:3.50,z:-2.51,number:'04',build:gallery}
    ];
    // Each room rests on separate suspension beams around the central rotor.
    shade(world,0,-1.20,0,24,19);
    for(const x of [-6.1,0,6.1]){
      box(world,edge,x,-.54,0,.28,.19,10.88);
      for(const z of [-4.38,4.38]){
        box(world,rubber,x,-.77,z,.48,.43,.69);
        box(world,lamp,x,-.69,z+.36,.24,.045,.024);
      }
    }
    for(const z of [-4.7,0,4.7]){
      box(world,wall,0,-.61,z,14.04,.17,.34);
      box(world,steel,0,-.48,z,13.94,.045,.09);
    }
    const anchors = {}, strips = {}, tiles = {}, bays = {};
    for(const room of rooms) {
      const bay=group(world,room.x,0,room.z); bays[room.id]=bay;
      soft(bay,edge,0,-.235,0,6.55,.24,4.62);
      for(const x of [-2.70,2.70]){
        box(bay,rubber,x,-.31,0,.34,.29,3.68);
        for(let n=0;n<4;n++)box(bay,steel,x,-.315,-1.1+n*.72,.39,.12,.15);
      }
      const tile=soft(bay,slab,0,-.09,0,6.52,.18,4.58);
      tile.name=room.id;
      tiles[room.id]=tile;
      for(const x of [-3.14,3.14])box(bay,line,x,.012,0,.017,.021,4.39);
      strips[room.id]=box(bay,lamp,0,.024,2.20,6.22,.032,.048);
      for(let i=0;i<3;i++)box(bay,line,-2.84+i*.14,.016,1.98,.047,.022,.28);
      label(bay,room.number,-2.48,.025,1.69,1.28,.41,true);
      room.build(bay);
      if(room.id==='train')terminal(bay,2.38,.46);
      if(room.id==='learn')terminal(bay,2.58,.53);
      if(room.id==='lab')terminal(bay,2.60,.57);
      anchors[room.id]=new T.Vector3(room.x,1.0,room.z+2.12);
    }
    const rotor=group(world,0,-.01,0);
    cylinder(rotor,edge,0,.27,0,1.48,.58);
    cylinder(rotor,rubber,0,.58,0,1.30,.14);
    cylinder(rotor,steel,0,1.07,0,.50,.98);
    const axis=group(rotor,0,2.65,0);
    axis.rotation.y=.26;
    cylinder(axis,rubber,0,0,0,1.17,.48,'z');
    cylinder(axis,edge,0,0,.24,1.10,.16,'z');
    cylinder(axis,ivory,0,0,.36,.34,.09,'z');
    cylinder(axis,steel,0,0,.42,.24,.10,'z');
    for(const [radius,tube,z,material] of [[1.21,.075,.34,steel],[1.29,.039,-.19,active],[.81,.033,.36,mint],[.46,.022,.372,steel]]){
      mesh(axis,new T.TorusGeometry(radius,tube,14,96),material,0,0,z);
    }
    for(let i=0;i<12;i++){
      const angle=i*Math.PI/6;
      const spoke=box(axis,i%3===0?mint:edge,Math.cos(angle)*.74,Math.sin(angle)*.74,.381,.39,.075,.055);
      spoke.rotation.z=angle;
      cylinder(axis,steel,Math.cos(angle)*1.035,Math.sin(angle)*1.035,.366,.028,.04,'z');
    }
    for(const x of [-7.02,7.02]){
      box(world,edge,x,1.5,-4.86,.24,4.1,.27);
      box(world,lamp,x,1.50,-4.70,.036,3.10,.032);
      box(world,wall,x,3.49,-3.39,.31,.23,3.15);
    }
    box(world,wall,0,3.53,-4.9,14.45,.27,.32);
    box(world,active,0,3.41,-4.73,9.84,.032,.032);
    label(world,'BM // MD',0,3.15,-4.69,2.5,.54);
    const shell=world.children.filter(object=>!Object.values(bays).includes(object));
    const exhibit = group(world,0,0,0);
    soft(exhibit,edge,0,-.18,0,5.65,.35,3.86);
    box(exhibit,active,0,-.047,1.87,5.24,.023,.028);
    const variants = {};
    for(const [id,build] of Object.entries({rack:bench,cable:cableMachine,incline:inclineMachine,seated:seatedMachine})){
      const item=group(exhibit,0,0,0);build(item);variants[id]=item;
    }
    return {world, anchors, tiles, showExhibit(kind){
      for(const [id,fixture] of Object.entries(variants))fixture.visible=id===kind;
    }, show(view){
      exhibit.visible=view==='exhibit';
      const all=view==='hall';
      for(const [id,bay] of Object.entries(bays))bay.visible=all || view===id;
      for(const object of shell)object.visible=all;
    }, select(id){
      for(const [key,strip] of Object.entries(strips))strip.material=key===id?active:lamp;
    }};
  };
  B.buildSpatialTrace = T => {
    const world = new T.Group();
    const ground = new T.Mesh(new T.BoxGeometry(6.6,.12,2.5),new T.MeshStandardMaterial({color:0x27334b,roughness:.79}));
    ground.position.y=-.11; world.add(ground);
    const gridPoints=[];
    for(const z of [-.72,.72]){
      for(let k=0;k<=6;k++) {
        const x=-2.9+k*5.8/6;
        gridPoints.push(new T.Vector3(x,0,z),new T.Vector3(x,2.43,z));
      }
      for(let k=0;k<=4;k++){
        const y=k*2.43/4;
        gridPoints.push(new T.Vector3(-2.9,y,z),new T.Vector3(2.9,y,z));
      }
    }
    const grid=new T.LineSegments(new T.BufferGeometry().setFromPoints(gridPoints),new T.LineBasicMaterial({color:0x587195,transparent:true,opacity:.49}));
    world.add(grid);
    function createPlot(color,z) {
      const line=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color}));
      const ribbon=new T.Mesh(new T.BufferGeometry(),new T.MeshBasicMaterial({color,transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide}));
      line.position.z=ribbon.position.z=z;
      world.add(line,ribbon);
      return {line,ribbon};
    }
    const live=createPlot(0xffbc75,.72), reference=createPlot(0xb8c3e7,-.72);
    const marker=new T.Mesh(new T.SphereGeometry(.082,18,12),new T.MeshBasicMaterial({color:0xffe2bd}));
    world.add(marker);
    let prevRows, prevReference, mapX, mapY;
    function points(series, plot) {
      const coords=[], fill=[], zero=mapY(0);
      let previous;
      for (const {x,y} of series) {
        const p=[mapX(x),mapY(y)];
        coords.push(...p,0);
        if(previous)fill.push(previous[0],zero,0,...previous,0,...p,0,previous[0],zero,0,...p,0,p[0],zero,0);
        previous=p;
      }
      plot.line.geometry.dispose(); plot.ribbon.geometry.dispose();
      plot.line.geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(coords,3));
      plot.ribbon.geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(fill,3));
    }
    function update(rows,compare,x,y) {
      if(!rows?.length){world.visible=false;return;}
      world.visible=true;
      if(rows!==prevRows || compare!==prevReference) {
        const both=compare?.length?[...rows,...compare]:rows;
        const xmin=Math.min(...both.map(p=>p.x)), xmax=Math.max(...both.map(p=>p.x));
        const ymin=Math.min(0,...both.map(p=>p.y)), ymax=Math.max(0,...both.map(p=>p.y));
        mapX=n=>-2.9+5.8*(n-xmin)/(xmax-xmin||1);
        mapY=n=>.04+2.30*(n-ymin)/(ymax-ymin||1);
        points(rows,live);
        reference.line.visible=reference.ribbon.visible=Boolean(compare?.length);
        if(compare?.length)points(compare,reference);
        prevRows=rows; prevReference=compare;
      }
      marker.position.set(mapX(x),mapY(y),.72);
    }
    return {world,update};
  };
})();
