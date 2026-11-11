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
    function legExtension(parent){
      shade(parent,0,.015,0,4.7,3.3);
      for(const x of [-.97,.97]){
        tube(parent,graphite,[[x,.12,1.14],[x,.12,-.87],[x,.23,-1.06],[x,.95,-1.03]],.092,24);
      }
      rod(parent,graphite,[-.94,.14,.74],[.94,.14,.74],.092);
      rod(parent,chrome,[0,.22,-.30],[0,.93,-.30],.075);
      soft(parent,ceramic,0,.94,.05,.96,.16,.83).rotation.x=-.09;
      soft(parent,rubber,0,1.28,-.47,.93,.74,.20).rotation.x=.18;
      tube(parent,graphite,[[1.03,.25,-.70],[1.03,1.83,-.70],[.77,2.05,-.67],[.45,2.05,-.67]],.080,26);
      for(let i=0;i<9;i++)soft(parent,i===3?bronze:rubber,.98,.31+i*.115,-.80,.48,.081,.44);
      for(const x of [.85,1.11])rod(parent,chrome,[x,.22,-.73],[x,1.73,-.73],.023);
      wheel(parent,.74,1.10,.46,.28,'x');
      tube(parent,chrome,[[.73,1.09,.48],[.74,.75,.69],[.74,.47,.96],[.60,.43,1.06]],.058,18);
      cylinder(parent,rubber,.17,.43,1.06,.143,.88,'x');
      cylinder(parent,bronze,-.29,.43,1.06,.081,.055,'x');
      tube(parent,bronze,[[.98,1.66,-.72],[.99,1.93,-.71],[.88,1.94,-.23],[.76,1.33,.33]],.016,24);
    }
    function rowingStation(parent){
      shade(parent,0,.015,0,5.0,3.2);
      tube(parent,graphite,[[0,.18,1.62],[0,.18,-.96],[0,.33,-1.20],[0,1.81,-1.24]],.11,32);
      for(const z of [1.47,-1.11])rod(parent,graphite,[-.78,.18,z],[.78,.18,z],.095);
      for(const x of [-.25,.25])rod(parent,chrome,[x,.31,1.43],[x,.31,-.22],.042);
      soft(parent,ceramic,0,.56,.85,.76,.15,.53);
      soft(parent,graphite,0,.40,.85,.39,.18,.40);
      soft(parent,graphite,0,1.04,-1.28,.79,1.68,.47);
      for(let i=0;i<8;i++)soft(parent,i===3?bronze:rubber,0,.37+i*.135,-.99,.49,.093,.25);
      for(const x of [-.30,.30]){
        const plate=group(parent,x,.47,-.59);plate.rotation.x=-.59;
        soft(plate,graphite,0,0,0,.40,.45,.09);
        for(let i=0;i<5;i++)rod(plate,rubber,[-.14,-.16+.08*i,.049],[.14,-.16+.08*i,.049],.012);
      }
      wheel(parent,0,.77,-.96,.186);
      rod(parent,bronze,[0,.77,-.85],[0,1.03,.53],.017);
      tube(parent,chrome,[[-.26,1.06,.68],[-.19,1.02,.52],[0,1.02,.53],[.19,1.02,.52],[.26,1.06,.68]],.037,22);
      for(const x of [-.26,.26])cylinder(parent,rubber,x,1.05,.72,.046,.16,'z');
    }
    function flyStation(parent){
      shade(parent,0,.015,0,5.1,3.45);
      tube(parent,graphite,[[-1.30,.12,.72],[-1.31,.12,-.61],[-1.19,.31,-.88],[-1.15,2.30,-.88],[-.93,2.58,-.88],[.93,2.58,-.88],[1.15,2.30,-.88],[1.19,.31,-.88],[1.31,.12,-.61],[1.30,.12,.72]],.103,56);
      soft(parent,graphite,0,1.30,-1.0,.55,2.29,.44);
      for(let i=0;i<10;i++)soft(parent,i===5?bronze:rubber,0,.44+i*.126,-.70,.35,.09,.24);
      rod(parent,chrome,[0,.12,.17],[0,.74,.17],.086);
      soft(parent,ceramic,0,.79,.27,.78,.17,.64);
      soft(parent,rubber,0,1.29,-.13,.62,.91,.18).rotation.x=.12;
      for(const side of [-1,1]){
        cylinder(parent,chrome,side*.88,2.28,-.62,.208,.16);
        cylinder(parent,bronze,side*.88,2.19,-.62,.115,.12);
        tube(parent,graphite,[[side*.88,2.23,-.62],[side*1.43,2.22,-.38],[side*1.55,2.14,.20],[side*1.49,1.81,.81],[side*1.28,1.37,1.02]],.074,30);
        cylinder(parent,rubber,side*1.28,1.30,1.02,.053,.37);
      }
    }
    function shoulderStation(parent){
      shade(parent,0,.015,0,4.8,3.25);
      for(const x of [-.93,.93]){
        tube(parent,graphite,[[x,.15,1.23],[x,.15,-.84],[x,.47,-1.01],[x,2.11,-.84]],.099,29);
        wheel(parent,x,2.04,-.58,.244,'x');
        tube(parent,chrome,[[x,2.04,-.58],[x,2.20,-.17],[x*.83,2.24,.49],[x*.71,2.20,.69]],.059,24);
        cylinder(parent,rubber,x*.56,2.20,.69,.055,.36,'x');
        tube(parent,graphite,[[x,2.02,-.60],[x*1.18,1.79,-.96],[x*1.29,1.69,-1.19]],.069,18);
        cylinder(parent,bronze,x*1.29,1.68,-1.18,.105,.12,'x');
        wheel(parent,x*1.18,1.71,-1.18,.29,'x');
      }
      rod(parent,graphite,[-.94,2.20,-.82],[.94,2.20,-.82],.096);
      rod(parent,chrome,[0,.18,.14],[0,.74,.14],.087);
      soft(parent,ceramic,0,.79,.27,.80,.17,.66);
      soft(parent,rubber,0,1.35,-.08,.63,.98,.20).rotation.x=.18;
      soft(parent,ceramic,0,1.94,-.19,.32,.29,.16);
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
    for(const [id,build] of Object.entries({rack:bench,cable:cableMachine,incline:inclineMachine,seated:seatedMachine,extension:legExtension,row:rowingStation,fly:flyStation,shoulder:shoulderStation})){
      const item=group(exhibit);build(item);variants[id]=item;
    }
    const instrument=group(world), instruments=new Map();
    const glass=new T.MeshPhysicalMaterial({color:0x605063,roughness:.23,metalness:.22,transparent:true,opacity:.26,depthWrite:false,side:T.DoubleSide,clearcoat:.85});
    function ringFace(parent,radius,section,material,x,y,z){
      return mesh(parent,new T.TorusGeometry(radius,section,10,96),material,x,y,z);
    }
    function metronome(stand){
      capsule(stand,1,1.69,.91);
      for(const x of [-.81,.81]){
        tube(stand,graphite,[[x,.05,.24],[x,.17,.05],[x,.56,-.32],[x,.99,-.36],[x,1.58,-.22]],.074,22);
        cylinder(stand,chrome,x,1.57,-.22,.144,.18,'x');
      }
      const face=group(stand,0,1.55,.02);
      turned(face,graphite,[[.89,-.20],[1.05,-.20],[1.16,-.16],[1.19,-.08],[1.19,.085],[1.14,.161],[1.02,.187],[.91,.173],[.89,.127],[.89,-.20]],0,0,0,'z',96);
      ringFace(face,1.11,.020,chrome,0,0,.144);
      ringFace(face,.91,.025,bronze,0,0,.159);
      cylinder(face,make(0x2f2939,.37,.43),0,0,.004,.887,.094,'z');
      ringFace(face,.49,.019,softLight,0,0,.075);
      ringFace(face,.91,.009,glow,0,0,.185);
      for(let i=0;i<36;i++){
        const t=i*Math.PI/18, r=i%3===0?1.014:1.03, c=Math.cos(t),d=Math.sin(t);
        rod(face,i%3===0?bronze:softLight,[c*r,d*r,.182],[c*1.07,d*1.07,.178],i%3===0?.011:.005);
      }
      const striker=group(face);
      turned(striker,chrome,[[0,.005],[.26,.005],[.30,.022],[.305,.115],[.28,.15],[0,.15]],0,0,0,'z');
      cylinder(striker,graphite,0,0,.153,.253,.035,'z');
      ringFace(striker,.232,.014,bronze,0,0,.174);
      cylinder(striker,glow,0,0,.178,.089,.019,'z');
      const lamps=[];
      for(let i=0;i<8;i++){
        const theta=Math.PI/2-i*Math.PI/4;
        const x=.73*Math.cos(theta),y=.73*Math.sin(theta);
        cylinder(face,graphite,x,y,.112,.046,.049,'z');
        lamps.push(cylinder(face,softLight,x,y,.139,.027,.012,'z'));
      }
      const arm=group(face,0,0,.103);
      rod(arm,bronze,[0,.18,0],[0,.60,0],.020);
      mesh(arm,new T.SphereGeometry(.053,20,12),chrome,0,.61,0);
      const wave=ringFace(face,.91,.025,selected,0,0,.204);
      const echoMaterial=new T.MeshBasicMaterial({color:0xf3b986,transparent:true,opacity:0,depthWrite:false});
      const echo=ringFace(face,.91,.018,echoMaterial,0,0,.218);
      const colors={'on-time':0xffd1a3,early:0xabb8ed,late:0xe6a1a0,miss:0x797386};
      return {pulse({scale=1.27,near=false,beat=0,reaction,strength=0,swing=0},quiet){
        wave.scale.set(quiet?1:scale,quiet?1:scale,1);
        wave.visible=!quiet||near;
        wave.material=near?selected:glow;
        for(let i=0;i<lamps.length;i++)lamps[i].material=i<beat?glow:i===beat&&near?selected:softLight;
        const spring=quiet?0:Math.sin(strength*Math.PI)*strength;
        striker.position.z=.09*spring;
        arm.rotation.z=-beat*Math.PI/4+swing+(reaction==='early'?.26:reaction==='late'?-.26:.12)*spring;
        echo.visible=Boolean(reaction)&&strength>0;
        if(echo.visible){
          echo.scale.setScalar(quiet?1:1+.44*(1-strength));
          echoMaterial.color.setHex(colors[reaction]??colors['on-time']);
          echoMaterial.opacity=Math.min(1,strength*.95);
        }
      }};
    }
    function scanner(stand){
      capsule(stand,1,1.95,1.23);
      shade(stand,0,.024,0,3.9,2.65);
      turned(stand,graphite,[[0,.03],[.87,.03],[.94,.08],[.98,.15],[.95,.23],[.87,.25],[0,.25]]);
      band(stand,glow,.935,.014,.195);
      for(const z of [-.60,.38]){
        tube(stand,graphite,[[-1.19,.11,z],[-1.19,1.74,z],[-1.07,2.04,z],[-.78,2.19,z],[.78,2.19,z],[1.07,2.04,z],[1.19,1.74,z],[1.19,.11,z]],.10,42);
        tube(stand,chrome,[[-1.17,.44,z+.014],[-1.17,1.71,z+.014],[-.98,2.02,z+.014],[-.66,2.10,z+.014]],.023,24);
      }
      for(const x of [-1.19,1.19])for(const y of [.38,1.77]){
        rod(stand,ceramic,[x,y,-.62],[x,y,.40],.07);
      }
      soft(stand,graphite,0,2.16,-.06,.62,.28,.68);
      turned(stand,chrome,[[0,.06],[.19,.06],[.21,.102],[.19,.14],[0,.14]],0,1.99,.17,'z');
      cylinder(stand,glow,0,1.99,.319,.092,.035,'z');
      const sample=group(stand,0,.90,.02);sample.rotation.z=-.18;
      const face=new T.Shape();face.absarc(0,0,.59,0,Math.PI*2,false);
      for(let n=0;n<5;n++){
        const a=n*Math.PI*2/5;
        const hole=new T.Path();hole.absarc(.37*Math.cos(a),.37*Math.sin(a),.104,0,Math.PI*2,true);face.holes.push(hole);
      }
      const disk=new T.ExtrudeGeometry(face,{depth:.17,curveSegments:24,bevelEnabled:true,bevelSize:.026,bevelThickness:.027,bevelSegments:2});
      mesh(sample,disk,graphite,0,0,-.09);
      ringFace(sample,.58,.037,chrome,0,0,.084);
      ringFace(sample,.56,.014,bronze,0,0,.128);
      cylinder(sample,chrome,0,0,.111,.174,.09,'z');
      cylinder(sample,ink,0,0,.161,.101,.034,'z');
      rod(stand,chrome,[0,.24,-.19],[0,.59,-.13],.10);
      const sensor=group(stand,0,.96,0);
      for(const z of [-.60,.38])for(const x of [-1.17,1.17]){
        soft(sensor,graphite,x,0,z,.24,.24,.25);
        cylinder(sensor,glow,x*.89,0,z,.042,.072,'x');
      }
      const pane=mesh(sensor,new T.PlaneGeometry(2.20,.98),glass,0,0,-.11);pane.rotation.x=-Math.PI/2;
      rod(sensor,glow,[-1.03,.002,.382],[1.03,.002,.382],.010);
      return {scan(fraction){
        const easing=fraction*fraction*(3-2*fraction);
        sensor.position.y=1.83-1.42*easing;
        sample.rotation.y=-.23+easing*.71;
      }};
    }
    function wayfinderMiniatures(){
      const pearl=make(0xaaa9b8,.42,.36), slate=make(0x676274,.48,.39);
      const copper=make(0xc49069,.61,.31);
      return [
        ['home',station=>{
          soft(station,slate,0,.045,0,.62,.09,.49);
          soft(station,pearl,0,.233,0,.47,.31,.37);
          const roof=new T.Shape();
          roof.moveTo(-.30,0);roof.lineTo(0,.205);roof.lineTo(.30,0);roof.closePath();
          mesh(station,new T.ExtrudeGeometry(roof,{depth:.49,bevelEnabled:true,bevelThickness:.014,bevelSize:.014,bevelSegments:2}),copper,0,.375,-.245);
          soft(station,graphite,.035,.168,.190,.123,.194,.025);
          soft(station,ink,-.125,.247,.195,.106,.10,.021);
          rod(station,chrome,[-.165,.238,.211],[-.085,.238,.211],.009);
          soft(station,pearl,.035,.065,.218,.17,.041,.10);
        }],
        ['library',station=>{
          soft(station,graphite,0,.047,0,.70,.094,.49);
          for(const [i,height] of [.43,.51,.37].entries()){
            const volume=group(station,(i-1)*.183,.105,.01);
            volume.rotation.z=i===2?-.17:.035;
            const cover=[copper,slate,pearl][i];
            soft(volume,cover,0,height*.50,0,.162,height,.40);
            soft(volume,pearl,0,height*.50,-.187,.117,height-.047,.053);
            for(const y of [.077,height-.073])rod(volume,copper,[-.058,y,.204],[.058,y,.204],.010);
          }
        }],
        ['learn/experiments',station=>{
          soft(station,slate,0,.046,0,.72,.092,.45);
          turned(station,graphite,[[0,.08],[.11,.08],[.092,.14],[.044,.36],[0,.39]]);
          cylinder(station,chrome,0,.383,.01,.066,.081,'z');
          const lever=group(station,0,.386,0);
          rod(lever,chrome,[-.305,0,0],[.305,0,0],.029);
          for(const [x,y] of [[-.255,-.115],[.255,-.115]]){
            rod(lever,bronze,[x,0,0],[x,y-.03,0],.011);
            turned(lever,copper,[[0,-.031],[.103,-.031],[.111,-.016],[.11,.002],[.094,.024],[0,.024]],x,y-.033,0,'y',30);
          }
          cylinder(lever,slate,-.255,-.117,0,.048,.061);
          return time=>{lever.rotation.z=.12+.19*Math.sin(time*1.9);};
        }],
        ['plans',station=>{
          soft(station,graphite,0,.044,0,.61,.088,.40);
          const page=group(station,0,.31,.025);page.rotation.x=-.17;
          soft(page,pearl,0,0,0,.56,.43,.095);
          soft(page,copper,0,.155,.051,.52,.092,.028);
          for(const x of [-.159,.159]){
            mesh(page,new T.TorusGeometry(.049,.014,7,24),chrome,x,.214,.015).rotation.y=Math.PI/2;
          }
          for(let row=0;row<3;row++)for(let column=0;column<4;column++){
            soft(page,row===1&&column===2?copper:slate,(column-1.5)*.104,.045-row*.074,.058,.049,.036,.014);
          }
        }],
        ['training',station=>{
          soft(station,slate,0,.046,0,.73,.092,.44);
          for(const x of [-.13,.13]){
            rod(station,chrome,[x,.076,0],[x,.245,0],.034);
            rod(station,graphite,[x,.231,-.087],[x,.231,.084],.035);
          }
          const handle=group(station,0,.278,0);handle.rotation.y=-.19;
          cylinder(handle,chrome,0,0,0,.027,.65,'x');
          for(const side of [-1,1]){
            for(let i=0;i<3;i++){
              cylinder(handle,i===2?copper:graphite,side*(.202+i*.036),0,0,.153-i*.014,.031,'x');
            }
            cylinder(handle,chrome,side*.324,0,0,.059,.046,'x');
          }
        }],
        ['history',station=>{
          soft(station,slate,0,.044,0,.72,.088,.43);
          rod(station,chrome,[-.311,.102,.115],[.318,.102,.115],.014);
          for(const [i,height] of [.18,.28,.23,.43].entries()){
            const x=(i-1.5)*.155;
            soft(station,i===3?copper:pearl,x,.10+height/2,0,.113,height,.23);
            soft(station,i===3?selected:softLight,x,.102+height,.026,.087,.015,.13);
          }
        }],
        ['data',station=>{
          soft(station,graphite,0,.044,0,.63,.088,.46);
          for(let i=0;i<3;i++){
            const level=group(station,0,.13+i*.117,0);
            turned(level,i===2?slate:graphite,[[0,-.05],[.237,-.05],[.264,-.034],[.273,-.012],[.273,.025],[.258,.048],[0,.05]],0,0,0,'y',38);
            band(level,i===2?copper:pearl,.252,.014,.025);
            cylinder(level,i===2?selected:softLight,.096,.003,.254,.021,.025,'z');
          }
          cylinder(station,copper,0,.414,0,.073,.034);
          cylinder(station,pearl,0,.444,0,.045,.030);
        }],
        ['settings/profile',station=>{
          turned(station,graphite,[[0,.02],[.23,.02],[.26,.049],[.24,.084],[.14,.096],[0,.096]]);
          band(station,copper,.22,.014,.078);
          const bust=new T.Shape();
          bust.moveTo(-.128,.10);bust.lineTo(.128,.10);
          bust.quadraticCurveTo(.21,.112,.237,.177);
          bust.quadraticCurveTo(.244,.231,.192,.258);
          bust.quadraticCurveTo(.102,.279,.065,.322);
          bust.lineTo(.058,.376);bust.lineTo(-.058,.376);bust.lineTo(-.065,.322);
          bust.quadraticCurveTo(-.102,.279,-.192,.258);
          bust.quadraticCurveTo(-.244,.231,-.237,.177);
          bust.quadraticCurveTo(-.21,.112,-.128,.10);bust.closePath();
          mesh(station,new T.ExtrudeGeometry(bust,{depth:.145,bevelEnabled:true,bevelSize:.023,bevelThickness:.023,bevelSegments:3}),pearl,0,0,-.073);
          mesh(station,new T.SphereGeometry(.119,24,18),pearl,0,.465,.011).scale.set(.92,1.17,.93);
          mesh(station,new T.SphereGeometry(.033,14,10),pearl,0,.449,.106).scale.set(.65,1,.72);
        }]
      ];
    }
    function wayfinder(stand){
      const miniatures=wayfinderMiniatures();
      capsule(stand,1,2.84,2.84);
      shade(stand,.0,.03,0,6.35,6.35);
      turned(stand,graphite,[[0,.04],[2.34,.04],[2.49,.11],[2.55,.24],[2.54,.38],[2.47,.49],[2.33,.54],[0,.54]]);
      band(stand,chrome,2.39,.036,.49);
      band(stand,softLight,2.49,.016,.29);
      turned(stand,ceramic,[[0,.553],[2.30,.553],[2.31,.49]],0,0,0);
      band(stand,bronze,1.42,.025,.574);
      band(stand,softLight,1.28,.014,.579);
      for(let i=0;i<48;i++){
        const angle=i*Math.PI/24,sin=Math.sin(angle),cos=Math.cos(angle);
        const start=i%6===0?1.49:1.56;
        rod(stand,i%6===0?bronze:softLight,[sin*start,.582,cos*start],[sin*1.64,.582,cos*1.64],i%6===0?.016:.007);
      }
      const targets=[];
      const stations=miniatures.map(([id,build],i)=>{
        const angle=i*Math.PI/4,x=Math.sin(angle)*1.94,z=Math.cos(angle)*1.94;
        const station=group(stand,x,.548,z);
        turned(station,graphite,[[0,0],[.36,0],[.39,.027],[.39,.069],[.36,.094],[0,.094]],0,0,0,'y',44);
        const ring=band(station,softLight,.36,.014,.073);
        const model=group(station,0,.096,0);model.rotation.y=.12;
        const animate=build(model);
        station.traverse(node=>{
          if(!node.isMesh)return;
          node.userData.destination=id;targets.push(node);
        });
        return {id,ring,model,animate};
      });
      const rotor=group(stand,0,.68,0);
      const pointer=new T.Shape();
      pointer.moveTo(0,1.47);pointer.lineTo(-.19,.34);pointer.lineTo(-.15,-.19);pointer.lineTo(0,-.64);
      pointer.lineTo(.15,-.19);pointer.lineTo(.19,.34);pointer.closePath();
      const needle=mesh(rotor,new T.ExtrudeGeometry(pointer,{depth:.08,bevelEnabled:true,bevelSize:.028,bevelThickness:.028,bevelSegments:3}),bronze);
      needle.rotation.x=Math.PI/2;
      cylinder(stand,graphite,0,.682,0,.32,.27);
      cylinder(stand,chrome,0,.827,0,.23,.075);
      band(stand,glow,.17,.018,.869);
      return {targets,update({selection,time,quiet,dt}){
        const index=Math.max(0,stations.findIndex(station=>station.id===selection));
        const heading=index*Math.PI/4+(quiet?0:.034*Math.sin(time*1.9));
        const difference=Math.atan2(Math.sin(heading-rotor.rotation.y),Math.cos(heading-rotor.rotation.y));
        const ease=quiet?1:1-Math.exp(-Math.max(16,dt)/100);
        rotor.rotation.y+=difference*ease;
        let lifting=false;
        stations.forEach(({ring,model,animate},i)=>{
          const active=i===index, height=active?.163:.096;
          ring.material=active?selected:softLight;
          model.position.y+=(height-model.position.y)*ease;
          lifting||=Math.abs(height-model.position.y)>.001;
          animate?.(active&&!quiet?time:0);
        });
        return lifting||Math.abs(difference)>.009;
      }};
    }
    function mechanicsBench(stand){
      capsule(stand,1,3.55,1.28);
      shade(stand,0,.035,0,7.65,3.25);
      const bases=[],targets=[];
      const lanes=['pulley','cam','incline'];
      const updateCable=(wire,a,b)=>{
        const start=v(...a),end=v(...b),delta=end.clone().sub(start);
        wire.position.copy(start).addScaledVector(delta,.5);
        wire.scale.y=delta.length();wire.quaternion.setFromUnitVectors(yAxis,delta.normalize());
      };
      const sections=lanes.map((id,i)=>{
        const lane=group(stand,(i-1)*2.22,.22,0);
        const base=soft(lane,graphite,0,-.006,0,1.99,.40,1.95);
        base.userData.destination=id;targets.push(base);
        bases.push(soft(lane,softLight,0,.063,.974,1.47,.027,.026));
        soft(lane,ceramic,0,.197,0,1.89,.041,1.83);
        return lane;
      });
      const pulley=sections[0];
      for(const x of [-.77,.77]){
        tube(pulley,graphite,[[x,.21,.63],[x,.22,-.55],[x,.43,-.65],[x,1.77,-.62],[x,2.18,-.31],[x,2.24,.05]],.063,26);
      }
      rod(pulley,chrome,[-.77,2.23,.04],[.77,2.23,.04],.062);
      wheel(pulley,.34,2.05,.20,.17);
      cylinder(pulley,chrome,-.17,2.16,.28,.048,.10,'z');
      const load=group(pulley,0,.55,.18);
      wheel(load,0,.15,.09,.173);
      soft(load,graphite,0,-.10,.10,.47,.22,.39);
      soft(load,bronze,0,-.24,.10,.51,.066,.43);
      const tensionLines=Array.from({length:3},()=>cylinder(pulley,bronze,0,0,0,.014,1));
      const handle=cylinder(pulley,rubber,.51,1.83,.28,.047,.28,'x');
      const camLane=sections[1];
      tube(camLane,graphite,[[-.68,.22,-.42],[-.68,1.24,-.42],[-.52,1.71,-.42],[0,1.82,-.42],[.52,1.71,-.42],[.68,1.24,-.42],[.68,.22,-.42]],.083,36);
      const cam=group(camLane,-.16,1.18,.16);
      const profile=new T.Shape();
      for(let j=0;j<=80;j++){
        const angle=j*Math.PI*2/80,r=.51+.105*Math.cos(angle)+.053*Math.sin(2*angle);
        if(j===0)profile.moveTo(r*Math.cos(angle),r*Math.sin(angle));else profile.lineTo(r*Math.cos(angle),r*Math.sin(angle));
      }
      profile.closePath();
      mesh(cam,new T.ExtrudeGeometry(profile,{depth:.18,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3}),graphite);
      cylinder(cam,chrome,0,0,.20,.15,.10,'z');
      rod(cam,bronze,[0,0,.21],[.43,0,.21],.024);
      for(const y of [1.00,1.36])rod(camLane,chrome,[.36,y,.09],[.87,y,.09],.029);
      const follower=wheelFollower(camLane);
      function wheelFollower(lane){
        const node=group(lane,.66,1.18,.19);
        wheel(node,0,0,.07,.122);
        soft(node,ceramic,.15,0,-.084,.27,.32,.14);
        return node;
      }
      const ramp=sections[2];
      const slope=group(ramp,0,1.03,0);slope.rotation.z=.45;
      for(const z of [-.39,.39]){
        rod(slope,chrome,[-.90,-.03,z],[.90,-.03,z],.061);
        rod(ramp,graphite,[.76,.22,z],[.76,1.39,z],.071);
        rod(ramp,graphite,[-.76,.22,z],[-.76,.67,z],.056);
      }
      for(let i=0;i<6;i++)rod(slope,ceramic,[-.78+i*.31,-.078,-.40],[-.78+i*.31,-.078,.40],.036);
      const cart=group(slope,.57,.19,0);
      soft(cart,ceramic,0,.02,0,.45,.19,.69);
      soft(cart,bronze,0,.125,0,.29,.088,.46);
      for(const z of [-.39,.39])for(const x of [-.16,.16])wheel(cart,x,-.105,z,.082);
      return {targets,update({selection,progress}){
        bases.forEach((lamp,i)=>{lamp.material=lanes[i]===selection?selected:softLight;});
        const lift=selection==='pulley'?progress*.50:0;
        load.position.y=.55+lift;handle.position.y=1.82-lift*2;
        updateCable(tensionLines[0],[-.17,2.16,.28],[-.17,.70+lift,.28]);
        updateCable(tensionLines[1],[.17,2.05,.28],[.17,.70+lift,.28]);
        updateCable(tensionLines[2],[.51,2.05,.28],[.51,handle.position.y,.28]);
        const angle=selection==='cam'?progress*Math.PI*2:0;
        cam.rotation.z=angle;
        follower.position.x=.47+.105*Math.cos(angle)-.053*Math.sin(2*angle);
        cart.position.x=.61-(selection==='incline'?progress*1.22:0);
      }};
    }
    const instrumentBuilders={metronome,scanner,wayfinder,bench:mechanicsBench};
    let liveInstrument;
    function showInstrument(id){
      if(id==='pulse')id='metronome';
      if(!instruments.has(id)){
        const root=group(instrument), model=(instrumentBuilders[id]||wayfinder)(root);
        instruments.set(id,{root,model});
      }
      liveInstrument=instruments.get(id);
      for(const exhibit of instruments.values())exhibit.root.visible=exhibit===liveInstrument;
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
    return {world,anchors,tiles,showInstrument,updateInstrument(signal,quiet,fraction,time,selection,dt){
      const active=liveInstrument?.model;
      active?.pulse?.(signal,quiet);
      active?.scan?.(fraction);
      return active?.update?.({selection,progress:fraction,time,quiet,dt});
    },pickInstrument(ray){
      const target=ray.intersectObjects(liveInstrument?.model.targets||[],false)[0];
      return target?.object.userData.destination;
    },showExhibit(kind){
      for(const [id,fixture] of Object.entries(variants))fixture.visible=id===kind;
    },show(view){
      exhibit.visible=view==='exhibit';
      instrument.visible=view==='instrument';
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
