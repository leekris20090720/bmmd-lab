/* BM//MD contour gallery. The fixtures are visual studies, separate from calculation geometry. */
(() => {
  'use strict';
  const B=window.BM=window.BM||{};
  B.lightSpatialScene = (T,renderer,scene)=>{
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.23;
    scene.background = new T.Color(0x101017);
    const envCanvas=document.createElement('canvas');envCanvas.width=512;envCanvas.height=256;
    const paint=envCanvas.getContext('2d');
    paint.fillStyle='#333140';paint.fillRect(0,0,512,256);
    function softbox(x,y,w,h,color){
      const fade=paint.createLinearGradient(x,y,x+w,y+h);
      fade.addColorStop(0,'#817b8a');fade.addColorStop(.42,color);fade.addColorStop(1,'#857e8d');
      paint.fillStyle=fade;paint.fillRect(x,y,w,h);
    }
    softbox(25,41,91,106,'#f4e8dc');softbox(187,55,127,54,'#ffffff');
    softbox(375,60,50,142,'#c3b5eb');softbox(118,160,13,65,'#f6d1af');
    const panorama=new T.CanvasTexture(envCanvas);
    panorama.mapping=T.EquirectangularReflectionMapping;panorama.colorSpace=T.SRGBColorSpace;
    const generator=new T.PMREMGenerator(renderer);
    scene.environment=generator.fromEquirectangular(panorama).texture;scene.environmentIntensity=1.25;
    panorama.dispose();generator.dispose();panorama.dispose();
    scene.add(new T.HemisphereLight(0xdfd7f1,0x353242,1.45));
    const key=new T.DirectionalLight(0xffe3c6,2.65);
    key.position.set(-5,11,7);scene.add(key);
    const rim=new T.DirectionalLight(0xa9a1db,2.30);
    rim.position.set(8,6,-7);scene.add(rim);
  };
  B.buildSpatialStudio=({THREE:T,RoundedBoxGeometry})=>{
    const world=new T.Group();
    const make=(color,metalness,roughness)=>new T.MeshStandardMaterial({color,metalness,roughness});
    const chrome=make(0xb8becb,.82,.25), graphite=make(0x44444e,.72,.29);
    const ceramic=make(0x484552,.24,.46), rubber=make(0x15161e,.04,.78);
    const bronze=make(0xc68a60,.67,.29), platform=make(0x292835,.55,.36);
    const ink=new T.MeshBasicMaterial({color:0x191821}), glow=new T.MeshBasicMaterial({color:0xe0a67e});
    const softLight=new T.MeshBasicMaterial({color:0x6a627f}), selected=new T.MeshBasicMaterial({color:0xffd1a3});
    const unitCylinder=new T.CylinderGeometry(1,1,1,32);
    const plane=new T.PlaneGeometry(1,1);
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=96;
    const ctx=shadowCanvas.getContext('2d'),fill=ctx.createRadialGradient(48,48,5,48,48,47);
    fill.addColorStop(0,'#020307');fill.addColorStop(.48,'#020307a0');fill.addColorStop(1,'#02030700');
    ctx.fillStyle=fill;ctx.fillRect(0,0,96,96);
    const shadow=new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,opacity:.85,depthWrite:false});
    function mesh(parent,geometry,material,x=0,y=0,z=0){
      const result=new T.Mesh(geometry,material);result.position.set(x,y,z);parent.add(result);return result;
    }
    function group(parent,x=0,y=0,z=0){
      const result=new T.Group();result.position.set(x,y,z);parent.add(result);return result;
    }
    function soft(parent,material,x,y,z,w,h,d){
      return mesh(parent,new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.43),material,x,y,z);
    }
    function cylinder(parent,material,x,y,z,r,h,axis='y'){
      const result=mesh(parent,unitCylinder,material,x,y,z);result.scale.set(r,h,r);
      if(axis==='z')result.rotation.x=Math.PI/2;
      if(axis==='x')result.rotation.z=Math.PI/2;
      return result;
    }
    const v=(x,y,z)=>new T.Vector3(x,y,z), yAxis=v(0,1,0);
    function rod(parent,material,a,b,r){
      const start=v(...a),end=v(...b),delta=end.clone().sub(start),middle=start.lerp(end,.5);
      const result=cylinder(parent,material,middle.x,middle.y,middle.z,r,delta.length());
      result.quaternion.setFromUnitVectors(yAxis,delta.normalize());return result;
    }
    function tube(parent,material,points,r,segments=28){
      const path=new T.CatmullRomCurve3(points.map(p=>v(...p)));
      return mesh(parent,new T.TubeGeometry(path,segments,r,8,false),material);
    }
    function turned(parent,material,profile,x=0,y=0,z=0,axis='y',segments=72){
      const result=mesh(parent,new T.LatheGeometry(profile.map(([r,a])=>new T.Vector2(r,a)),segments),material,x,y,z);
      if(axis==='z')result.rotation.x=Math.PI/2;
      if(axis==='x')result.rotation.z=Math.PI/2;
      return result;
    }
    function shade(parent,x,y,z,w,d){
      const result=mesh(parent,plane,shadow,x,y,z);result.rotation.x=-Math.PI/2;result.scale.set(w,d,1);
    }
    function band(parent,material,r,radius,y=0,sx=1,sz=1){
      const result=mesh(parent,new T.TorusGeometry(r,radius,8,96),material,0,y,0);
      result.rotation.x=-Math.PI/2;result.scale.set(sx,sz,1);return result;
    }
    function capsule(parent,r,w,d){
      const plinth=group(parent);
      const tile=turned(plinth,platform,[[0,-.27],[r-.21,-.27],[r-.10,-.24],[r-.035,-.16],[r,-.09],[r-.015,-.035],[r-.11,0],[0,0]]);
      const mark=band(plinth,softLight,r-.07,.018,-.09);
      plinth.scale.set(w,1,d);
      return {tile,mark};
    }
    function wheel(parent,x,y,z,r,axis='z'){
      const hub=group(parent,x,y,z);
      if(axis==='x')hub.rotation.y=Math.PI/2;
      turned(hub,graphite,[[0,-.13],[r*.82,-.13],[r*.95,-.11],[r,-.075],[r*.96,-.037],[r*.86,0],[r*.96,.037],[r,.075],[r*.95,.11],[r*.82,.13],[0,.13]],0,0,0,'z',40);
      turned(hub,chrome,[[r*.38,.13],[r*.40,.16],[r*.71,.16],[r*.79,.13]],0,0,0,'z',40);
      cylinder(hub,bronze,0,0,.16,r*.24,.055,'z');
    }
    function bench(parent){
      const frame=group(parent,-.22,0,.24);
      shade(frame,0,.017,0,4.85,3.1);
      for(const x of [-1.52,1.52]){
        tube(frame,graphite,[[x,.14,1.0],[x,.15,-.88],[x,.32,-1.13],[x,1.75,-1.13],[x,2.43,-.99],[x,2.66,-.68],[x,2.68,.50],[x,2.42,.86],[x,.38,.86]],.108,40);
        rod(frame,chrome,[x,.35,.87],[x,2.31,.87],.068);
        for(let y=.70;y<2.18;y+=.23)cylinder(frame,ink,x,y,.937,.026,.016,'z');
        rod(frame,bronze,[x,1.57,.88],[x,1.57,1.05],.067);
      }
      rod(frame,graphite,[-1.5,2.68,-.48],[1.5,2.68,-.48],.107);
      for(const z of [-.13,1.15]){
        rod(frame,chrome,[0,.13,z],[0,.52,z],.077);
        rod(frame,graphite,[-.38,.11,z],[.38,.11,z],.071);
      }
      soft(frame,rubber,0,.58,.49,.67,.20,1.72);
      soft(frame,ceramic,0,.64,.50,.61,.082,1.62);
      rod(frame,chrome,[-2.18,1.62,1.02],[2.18,1.62,1.02],.048);
      for(const side of [-1,1]){
        for(let i=0;i<3;i++){
          const r=.45-i*.027,x=side*(1.67+i*.115);
          turned(frame,rubber,[[0,-.049],[r-.034,-.049],[r,-.028],[r,.028],[r-.034,.049],[0,.049]],x,1.62,1.02,'x',48);
        }
        cylinder(frame,chrome,side*2.04,1.62,1.02,.14,.080,'x');
      }
    }
    function cableMachine(parent){
      const frame=group(parent,-.18,0,.05);
      shade(frame,0,.015,0,5.1,3.2);
      tube(frame,graphite,[[-1.71,.12,1.0],[-1.71,.12,-.64],[-1.71,.43,-.91],[-1.71,2.52,-.83],[-1.48,2.92,-.72],[0,2.97,-.73],[1.48,2.92,-.72],[1.71,2.52,-.83],[1.71,.43,-.91],[1.71,.12,-.64],[1.71,.12,1.0]],.136,72);
      for(const x of [-1.66,1.66]){
        soft(frame,graphite,x,1.29,-.48,.53,2.33,.45);
        for(const dx of [-.11,.11])rod(frame,chrome,[x+dx,.21,-.20],[x+dx,2.57,-.20],.032);
        for(let n=0;n<8;n++)soft(frame,n===4?bronze:rubber,x,.36+n*.135,-.15,.34,.102,.28);
        wheel(frame,x,2.57,-.03,.25);
        tube(frame,chrome,[[x,2.65,.09],[x*.88,2.14,.26],[x*.67,1.02,.92]],.019,16);
        rod(frame,rubber,[x*.67-.17,.98,.94],[x*.67+.17,.98,.94],.048);
      }
      soft(frame,ceramic,0,.082,.49,2.18,.12,1.36);
    }
    function testStand(parent){
      shade(parent,0,.015,0,4.95,3.4);
      soft(parent,graphite,0,.27,-.19,3.86,.50,2.04);
      soft(parent,chrome,0,.53,-.19,3.79,.12,1.98);
      soft(parent,ceramic,0,.61,-.20,3.59,.09,1.79);
      tube(parent,graphite,[[-1.47,.61,-.52],[-1.43,1.87,-.52],[-1.16,2.13,-.52],[1.13,2.13,-.52],[1.43,1.89,-.52],[1.47,.61,-.52]],.081,42);
      wheel(parent,.24,1.80,-.13,.51);
      rod(parent,chrome,[.24,1.80,.07],[-.99,1.22,.07],.087);
      cylinder(parent,bronze,-1.02,1.21,.07,.13,.29,'z');
      rod(parent,chrome,[.70,1.80,-.05],[.70,.93,.36],.019);
      turned(parent,bronze,[[0,-.14],[.18,-.14],[.20,-.09],[.20,.10],[.16,.16],[0,.16]],.70,.88,.36);
      const chart=group(parent,1.23,.84,.53);chart.rotation.x=-.36;
      soft(chart,ink,0,0,0,.56,.35,.10);
      tube(chart,glow,[[-.20,-.09,.066],[-.06,-.063,.066],[.04,-.015,.066],[.13,.053,.066],[.2,.11,.066]],.008,14);
    }
    function gallery(parent){
      const base=group(parent,0,0,-.2);
      shade(base,0,.015,0,4.9,3.2);
      turned(base,graphite,[[0,.08],[1.39,.08],[1.51,.13],[1.54,.25],[1.49,.36],[1.32,.40],[0,.40]]);
      band(base,glow,1.49,.022,.29);
      tube(base,chrome,[[-1.1,.41,0],[-.73,1.46,0],[.25,2.52,0],[.76,2.47,0],[1.16,1.71,0],[1.13,.43,0]],.13,48);
      wheel(base,.48,2.35,.23,.40);wheel(base,-.61,.89,.23,.31);
      rod(base,bronze,[-.53,1.13,.32],[.62,2.58,.32],.024);
      soft(base,ceramic,-.09,1.03,.19,.86,.20,1.12).rotation.z=.52;
    }
    function inclineMachine(parent){
      shade(parent,0,.015,0,4.8,3.5);
      for(const x of [-.74,.74]){
        tube(parent,graphite,[[x,.11,1.55],[x,.12,-1.23],[x,.37,-1.42],[x,2.32,-1.39]],.095,28);
        rod(parent,chrome,[x,.27,1.35],[x,2.32,-1.39],.080);
      }
      soft(parent,rubber,0,.53,.88,.94,.23,1.26).rotation.x=-.38;
      soft(parent,ceramic,0,.91,1.15,.83,.19,.89).rotation.x=-.74;
      soft(parent,graphite,0,1.55,-.39,1.67,.85,.20).rotation.x=.61;
      for(const side of [-1,1]){
        wheel(parent,side*.91,1.52,-.45,.40,'x');
        cylinder(parent,chrome,side*1.07,1.52,-.45,.14,.16,'x');
      }
    }
    function seatedMachine(parent){
      shade(parent,0,.015,0,4.6,3.25);
      tube(parent,graphite,[[-1.38,.12,.77],[-1.38,.12,-.69],[-1.08,.19,-.98],[.96,.19,-.98],[1.31,.47,-.92],[1.31,2.12,-.85]],.111,37);
      soft(parent,graphite,1.05,1.12,-.80,.61,2.02,.52);
      for(let i=0;i<8;i++)soft(parent,i===3?bronze:rubber,1.03,.39+i*.119,-.50,.44,.084,.22);
      rod(parent,chrome,[-.34,.16,.22],[-.34,.82,.22],.11);
      soft(parent,ceramic,-.34,.83,.33,.85,.19,.74);
      soft(parent,rubber,-.34,1.21,-.16,.75,.78,.18).rotation.x=-.17;
      for(const x of [-.94,.25]){
        wheel(parent,x,1.93,-.28,.18);
        tube(parent,chrome,[[x,1.93,-.28],[x,1.50,.43],[x,1.22,.86]],.073,18);
        cylinder(parent,rubber,x,1.22,.87,.058,.32,'x');
      }
      rod(parent,graphite,[-1.03,2.08,-.28],[.40,2.08,-.28],.082);
    }
    function terminal(parent,x,z){
      rod(parent,graphite,[x,.04,z],[x,.83,z],.12);
      const head=group(parent,x,.90,z);head.rotation.x=-.24;
      soft(head,chrome,0,0,0,.49,.30,.09);
      soft(head,ink,0,0,.049,.43,.23,.025);
      rod(head,glow,[-.14,-.031,.067],[.13,.037,.067],.008);
    }
    const rooms=[
      {id:'train',x:-3.62,z:2.54,build:bench,desk:[2.49,.38]},
      {id:'learn',x:3.62,z:2.54,build:cableMachine,desk:[2.46,.37]},
      {id:'lab',x:-3.62,z:-2.54,build:testStand,desk:[2.46,.40]},
      {id:'interact',x:3.62,z:-2.54,build:gallery}
    ];
    const ring=group(world,0,-.29,0);
    shade(ring,0,-.11,0,20,14);
    band(ring,graphite,1,.020,.03,7.27,4.91);
    band(ring,softLight,1,.004,-.004,7.53,5.08);
    band(ring,softLight,1,.003,-.017,6.88,4.58);
    const anchors={},tiles={},strips={},bays={};
    for(const room of rooms){
      const bay=group(world,room.x,0,room.z);bays[room.id]=bay;
      const {tile,mark}=capsule(bay,1,3.13,2.10);
      tile.name=room.id;tiles[room.id]=tile;strips[room.id]=mark;
      room.build(bay);
      if(room.desk)terminal(bay,...room.desk);
      anchors[room.id]=v(room.x,.65,room.z+1.69);
    }
    const rotor=group(world,.03,0,-.13);
    capsule(rotor,1,1.62,1.43);
    turned(rotor,graphite,[[0,0],[1.27,0],[1.32,.12],[1.28,.34],[1.12,.43],[0,.43]]);
    tube(rotor,graphite,[[-.9,.35,-.29],[-.55,1.01,-.42],[.02,2.24,-.48],[.57,2.52,-.36]],.18,32);
    const axis=group(rotor,0,2.46,.05);axis.rotation.set(-.12,.39,-.06);axis.scale.setScalar(1.09);
    turned(axis,graphite,[[1.51,-.32],[1.75,-.32],[1.85,-.27],[1.90,-.19],[1.90,-.13],[1.85,-.082],[1.72,-.035],[1.70,0],[1.72,.035],[1.85,.082],[1.90,.13],[1.90,.19],[1.85,.27],[1.75,.32],[1.51,.32],[1.51,-.32]],0,0,0,'z',112);
    for(const side of [-1,1]){
      turned(axis,chrome,[[1.57,.316*side],[1.73,.317*side],[1.83,.279*side],[1.88,.215*side]],0,0,0,'z',112).material.side=T.DoubleSide;
    }
    const face=new T.Shape();face.absarc(0,0,1.65,0,Math.PI*2,false);
    for(let n=0;n<6;n++){
      const theta=n*Math.PI/3+.22;
      const hole=new T.Path();hole.absarc(Math.cos(theta)*1.07,Math.sin(theta)*1.07,.28,0,Math.PI*2,true);face.holes.push(hole);
    }
    const faceGeometry=new T.ExtrudeGeometry(face,{depth:.35,curveSegments:32,bevelThickness:.037,bevelSize:.034,bevelSegments:3});
    mesh(axis,faceGeometry,graphite,0,0,-.175);
    cylinder(axis,chrome,0,0,.225,.57,.135,'z');
    cylinder(axis,bronze,0,0,.309,.46,.045,'z');
    cylinder(axis,graphite,0,0,.351,.33,.096,'z');
    const nut=new T.CylinderGeometry(.20,.24,.125,6);nut.rotateX(Math.PI/2);
    mesh(axis,nut,chrome,0,0,.430);
    for(let n=0;n<6;n++){
      const angle=n*Math.PI/3+.22;
      cylinder(axis,chrome,Math.cos(angle)*1.48,Math.sin(angle)*1.48,.20,.039,.044,'z');
    }
    mesh(axis,new T.TorusGeometry(.81,.008,6,80),chrome,0,0,.216);
    const cable=group(axis);
    for(const side of [-1,1]){
      tube(cable,bronze,[[side*1.734,1.83,0],[side*1.729,1.13,0],[side*1.73,0,0],[side*1.61,-.62,0],[side*1.25,-1.20,0],[side*.65,-1.60,0],[0,-1.73,0]],.046,36);
    }
    const shell=world.children.filter(node=>!Object.values(bays).includes(node));
    const exhibit=group(world);
    capsule(exhibit,1,2.76,1.91);
    const variants={};
    for(const [id,build] of Object.entries({rack:bench,cable:cableMachine,incline:inclineMachine,seated:seatedMachine})){
      const item=group(exhibit);build(item);variants[id]=item;
    }
    const reserved=new Set([...Object.values(tiles),...Object.values(strips)]);
    const retired=new Set();
    function batch(root){
      root.updateWorldMatrix(true,true);
      const inverse=root.matrixWorld.clone().invert(),groups=new Map();
      root.traverse(node=>{
        if(!node.isMesh||reserved.has(node)||node.material.transparent)return;
        if(!groups.has(node.material))groups.set(node.material,[]);
        groups.get(node.material).push(node);
      });
      for(const [material,nodes] of groups){
        if(nodes.length<2)continue;
        let verts=0,faces=0;
        for(const node of nodes){const g=node.geometry;verts+=g.attributes.position.count;faces+=g.index?.count||g.attributes.position.count;}
        const positions=new Float32Array(verts*3),normals=new Float32Array(verts*3),indices=new Uint32Array(faces);
        let offset=0,element=0;const point=v(0,0,0),matrix=new T.Matrix4(),normal=new T.Matrix3();
        for(const node of nodes){
          const {geometry:g}=node,{position,normal:direction}=g.attributes;
          matrix.multiplyMatrices(inverse,node.matrixWorld);normal.getNormalMatrix(matrix);
          for(let i=0;i<position.count;i++){
            point.fromBufferAttribute(position,i).applyMatrix4(matrix).toArray(positions,3*(offset+i));
            point.fromBufferAttribute(direction,i).applyNormalMatrix(normal).toArray(normals,3*(offset+i));
          }
          for(let j=0;j<(g.index?.count||position.count);j++)indices[element++]=offset+(g.index?g.index.getX(j):j);
          offset+=position.count;retired.add(g);node.removeFromParent();
        }
        const combined=new T.BufferGeometry();
        combined.setAttribute('position',new T.BufferAttribute(positions,3));
        combined.setAttribute('normal',new T.BufferAttribute(normals,3));
        combined.setIndex(new T.BufferAttribute(indices,1));
        mesh(root,combined,material);
      }
    }
    for(const node of [...shell,...Object.values(bays),...Object.values(variants)])batch(node);
    world.traverse(node=>{if(node.geometry)retired.delete(node.geometry);});
    for(const g of retired)g.dispose();
    return {world,anchors,tiles,showExhibit(kind){
      for(const [id,fixture] of Object.entries(variants))fixture.visible=id===kind;
    },show(view){
      exhibit.visible=view==='exhibit';
      const all=view==='hall';
      for(const [id,bay] of Object.entries(bays))bay.visible=all||view===id;
      for(const node of shell)node.visible=all;
    },select(id){
      for(const [key,strip] of Object.entries(strips))strip.material=key===id?selected:softLight;
    }};
  };
  B.buildSpatialTrace = T => {
    const world = new T.Group();
    const ground = new T.Mesh(new T.BoxGeometry(6.6,.12,2.5),new T.MeshStandardMaterial({color:0x282a33,roughness:.79}));
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
    const grid=new T.LineSegments(new T.BufferGeometry().setFromPoints(gridPoints),new T.LineBasicMaterial({color:0x62677b,transparent:true,opacity:.49}));
    world.add(grid);
    function createPlot(color,z) {
      const line=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color}));
      const ribbon=new T.Mesh(new T.BufferGeometry(),new T.MeshBasicMaterial({color,transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide}));
      line.position.z=ribbon.position.z=z;
      world.add(line,ribbon);
      return {line,ribbon};
    }
    const live=createPlot(0xf0b588,.72), reference=createPlot(0xb6a9e8,-.72);
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
