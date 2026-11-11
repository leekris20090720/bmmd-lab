/* Original anatomy cast with articulated teaching poses. MIT; docs/product-human-license.md.
 * Fixed bone lengths; equipment-space contact anchors. Reference scope: docs/human-motion-review.md.
 */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.BM.HumanLessons=api;})(typeof window==='undefined'?null:window,function(){'use strict';
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,k)=>a.map(v=>v*k),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),len=a=>Math.hypot(...a),norm=a=>mul(a,1/(len(a)||1)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function ik(start,target,l1,l2,pole){
 const delta=sub(target,start),raw=len(delta),axis=raw>1e-9?norm(delta):[0,-1,0],d=Math.min(l1+l2-1e-6,Math.max(Math.abs(l1-l2)+1e-6,raw));
 let p=sub(sub(pole,start),mul(axis,dot(sub(pole,start),axis)));
 if(len(p)<1e-7){const fallback=Math.abs(axis[1])<.9?[0,1,0]:[0,0,1];p=sub(fallback,mul(axis,dot(fallback,axis)));}
 p=norm(p);const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along)),joint=add(add(start,mul(axis,along)),mul(p,height)),end=add(start,mul(axis,d));
 return {start,joint,end,error:Math.abs(raw-d),upperLength:len(sub(joint,start)),lowerLength:len(sub(end,joint))};
}
const profiles={
 arm:{kind:'lateral',front:[0,0,1],camera:[.7,.28,1.8],hands:['handle','rightHandle'],arm:1.5,height:1.17,leg:.86},
 cam:{kind:'extension',front:[1,0,0],camera:[1.2,.25,1.6],hands:['handle0','handle1'],arm:1.48,height:1.07,leg:.88},
 incline:{kind:'press-leg',front:[1,0,0],camera:[-.85,.25,1.8],hands:['rackHandleL','rackHandleR'],arm:1.50,height:1.25,leg:1.05,machineRange:.44},
 pec:{kind:'fly',front:[-1,0,0],hands:['gripL','gripR'],arm:1.30,height:1.25,leg:.90},
 lat:{kind:'pulldown',front:[1,0,0],hands:['gripL','gripR'],arm:1.52,height:1.20,leg:.93,machineRange:.90,seatOffset:-.26},
 'barbell-squat':{kind:'squat',front:[-1,0,0],camera:[-1.1,.70,1.6],hands:['barShaft'],arm:1.38,height:1.08,leg:.89},
 'cable-row':{kind:'row',front:[1,0,0],hands:['neutralGripL','neutralGripR'],arm:1.72,height:1.18,leg:.91},
 'barbell-bench':{kind:'bench',front:[0,1,0],camera:[.65,1.1,1.6],hands:['barShaft'],arm:1.40,height:1.08,leg:.88},
 'flat-press':{kind:'chest-press',front:[-1,0,0],hands:['neutralGripL','neutralGripR'],arm:1.60,height:1.18,leg:.89},
 'incline-press':{kind:'incline-press',front:[-1,0,0],hands:['handleL','handleR'],arm:1.55,height:1.21,leg:.84},
 'cable-fly':{kind:'standing-fly',front:[0,0,1],camera:[.7,.3,1.8],hands:['handleL','handleR'],arm:1.50,height:1.17,leg:.87},
 'machine-fly':{kind:'fly',front:[-1,0,0],hands:['leftArmGrip','rightArmGrip'],arm:1.55,height:1.28,leg:.90},
 'scissor-pulldown':{kind:'pulldown',front:[1,0,0],hands:['handleL','handleR'],arm:1.86,height:1.30,leg:1.00},
 'nautilus-pullover':{kind:'pullover',front:[-1,0,0],camera:[-1.15,.3,1.7],hands:['arcGrip'],arm:1.81,height:1.35,leg:.84},
 'hammer-row':{kind:'chest-row',front:[1,0,0],hands:['handleL','handleR'],arm:1.32,height:1.30,leg:.83},
 'cable-pulldown':{kind:'pulldown',front:[-1,0,0],hands:['bar'],arm:1.62,height:1.30,leg:.83},
 'machine-military-press':{kind:'shoulder',front:[-1,0,0],hands:['handleL','handleR'],arm:1.80,height:1.27,leg:.94},
 'seated-machine-shoulder':{kind:'shoulder',front:[-1,0,0],hands:['neutralGripL','neutralGripR'],arm:1.70,height:1.30,leg:.94},
 'home-wall-press-up':{kind:'wall',front:[1,0,0],camera:[-.7,.25,1.8],arm:1.40,height:1.17,leg:.86},
 'home-sit-to-stand':{kind:'chair-stand',front:[1,0,0],arm:1.40,height:1.17,leg:.86},
 'home-mini-squat':{kind:'mini-squat',front:[1,0,0],camera:[-.6,.25,1.8],arm:1.40,height:1.17,leg:.86},
 'home-calf-raise':{kind:'calf',front:[1,0,0],camera:[-.6,.25,1.8],arm:1.50,height:1.17,leg:.86}
};
function squatPose(u,floor=-1.7){const pelvis=[.32+.46*u,floor+.085+1.76-.83*u,0],up=norm([-.10-.42*u,1,0]);return {pelvis,up,bar:add(add(pelvis,mul(up,1.08)),[.15,.025,0])};}
function attach({THREE:T,scene,rigs,canvas,requestDraw,anatomy}){
 const V=a=>new T.Vector3(...a),arr=v=>v.toArray(),bodies=new Map();let active='',progress=0,deviation=false,homeRig=null;
 const resources=new Set(), anatomyStudio=anatomy.create(T,resources);
 function mesh(geometry,material){resources.add(geometry);const m=new T.Mesh(geometry,material);m.castShadow=m.receiveShadow=true;return m;}
 function bodyFor(id,rig){
  if(bodies.has(id))return bodies.get(id);let floor=id.startsWith('home-')?-1.62:Infinity;rig.group.updateWorldMatrix(true,true);if(!id.startsWith('home-'))rig.group.traverse(n=>{if(!n.isMesh||n.userData.dragProxy||n.material?.opacity===0)return;let visible=true;for(let p=n;p;p=p.parent)if(!p.visible)visible=false;if(!visible)return;n.geometry.computeBoundingBox();const box=n.geometry.boundingBox;for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])floor=Math.min(floor,rig.group.worldToLocal(n.localToWorld(V([x,y,z]))).y);});
  const group=new T.Group();group.name='BMMD anatomy cast · '+id;group.userData.lessonHuman=true;rig.group.add(group);const b={group,rig,id,floor,parts:{},anatomy:anatomyStudio.attach(group,profiles[id].kind)};
  b.parts.footL=new T.Object3D();
  b.parts.footR=new T.Object3D();
  group.traverse(node=>{if(node.isMesh)node.layers.enable(1);});bodies.set(id,b);return b;
 }
 // Geometry-space anchors do not move when the complete equipment group rotates.
 function point(n,rig,p=[0,0,0]){if(!n)return null;n.updateWorldMatrix(true,false);return arr(rig.group.worldToLocal(n.localToWorld(V(p))));}
 // Rig updates transform these fixed geometries; their local bounds do not
 // change with a pose. Reuse Three's bounds instead of scanning every vertex.
 function geometryPoint(n,rig,top=false){if(!n)return null;if(!n.geometry)return point(n,rig);if(!n.geometry.boundingBox)n.geometry.computeBoundingBox();const box=n.geometry.boundingBox,c=box.getCenter(new T.Vector3());if(top)c.y=box.max.y;return point(n,rig,arr(c));}
 function surfacePoint(n,rig,normal){if(!n.geometry)n=n.children.find(c=>c.geometry&&!c.isInstancedMesh&&!c.userData.dragProxy);const center=geometryPoint(n,rig);if(!n.geometry.boundingBox)n.geometry.computeBoundingBox();const box=n.geometry.boundingBox;let plane=-Infinity;for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])plane=Math.max(plane,dot(point(n,rig,[x,y,z]),normal));return add(center,mul(normal,plane-dot(center,normal)));}
 function direction(n,rig,axis=[0,1,0]){n.updateWorldMatrix(true,false);return arr(V(axis).applyQuaternion(n.getWorldQuaternion(new T.Quaternion())).applyQuaternion(rig.group.getWorldQuaternion(new T.Quaternion()).invert()).normalize());}
 function setPoint(m,p){m.position.set(...p);}
 function frame(up,front){const f=norm(sub(front,mul(up,dot(front,up)))),right=norm(cross(up,f));return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(V(right),V(up),V(f)));}
 function gripPoints(b,c){
  if(!c.hands)return null;const nodes=c.hands.map(k=>b.rig.parts[k]);if(nodes.some(n=>!n))throw new Error('Missing teaching contact: '+b.id+' '+c.hands.join(', '));
  if(nodes.length===1){const span=b.id==='cable-pulldown'?1.05:b.id==='nautilus-pullover'?.55:b.id==='barbell-bench'?.86:b.id==='barbell-squat'?1.0:.67;return [-1,1].map(s=>point(nodes[0],b.rig,[0,s*span,0]));}
  if(b.id==='lat')return nodes.map(n=>point(n,b.rig,[0,-.15,0]));
  return nodes.map(n=>n.isGroup?point(n,b.rig,[0,-.08,0]):geometryPoint(n,b.rig));
 }
 function cable(m,a,b){if(!m)return;const d=V(b).sub(V(a));m.position.copy(V(a).add(V(b)).multiplyScalar(.5));m.scale.set(1,d.length(),1);m.quaternion.setFromUnitVectors(V([0,1,0]),d.normalize());}
 function prepare(id,u,rig){
  if(!rig)return;
  if(id==='arm'||id==='cable-fly'){
   const shoulderY=(bodies.get(id)?.floor??-1.7)+.085+1.71+profiles[id].height,lateral=id==='arm',theta=u*(lateral?Math.PI/2:Math.PI*.5556),r=lateral?1.46:1.43;
   [-1,1].forEach((sign,k)=>{const grasp=lateral?[sign*(.37+r*Math.sin(theta)),shoulderY-r*Math.cos(theta),1.7]:[sign*(.37+r*Math.cos(theta)),shoulderY-.10,1.4+r*Math.sin(theta)];
    const h=k?rig.parts.rightHandle:rig.parts.handle;h.position.copy(V(grasp).add(V([0,.08,0])));const pulley=k?rig.parts.rightPulley:rig.parts.carriagePulley;cable(k?rig.parts.rightCable:rig.parts.cable,point(pulley,rig),point(h,rig,[0,.22,0]));});
  }
  if(id==='barbell-squat')rig.parts.bar.position.copy(V(squatPose(u,bodies.get(id)?.floor).bar));
  if(id==='barbell-bench')rig.parts.bar.position.set(.15-.70*u,-.29+1.03*u,0);
 }
 function makeHome(id){
  if(!homeRig){const group=new T.Group();scene.add(group);const pad=new T.MeshStandardMaterial({color:0x52676f,roughness:.75});resources.add(pad);const parts={};
   for(const [n,size,pos] of [['seat',[1.05,.16,1],[-.75,-.75,0]],['backPad',[.12,1.3,1],[-1.23,-.08,0]],['wall',[.12,3.7,2.8],[1.5,.15,0]]]){const m=mesh(new T.BoxGeometry(...size),pad);m.position.set(...pos);group.add(m);parts[n]=m;}
   for(const z of [-.4,.4])for(const x of [-1.13,-.35]){const m=mesh(new T.CylinderGeometry(.035,.035,.84,10),pad);m.position.set(x,-1.2,z);m.userData.chairSupport=true;group.add(m);}homeRig={group,parts};
  }for(const n of homeRig.group.children)if(n.userData.chairSupport)n.visible=id!=='home-wall-press-up';homeRig.parts.wall.visible=id==='home-wall-press-up';homeRig.parts.seat.visible=homeRig.parts.backPad.visible=id!=='home-wall-press-up';return homeRig;
 }
 function update(id=active,u=progress,bad=deviation){
  if(!id)return;u=Math.max(0,Math.min(1,Number(u)||0));const c=profiles[id];if(!c)throw new Error('Unknown human lesson '+id);
  const rig=rigs[id]||makeHome(id),b=bodyFor(id,rig),kind=c.kind;prepare(id,u,rig);active=id;progress=u;deviation=bad;for(const body of bodies.values())body.group.visible=body===b;
  const up=[0,1,0];let front=c.front.slice(),side=norm(cross(front,up));if(len(side)<.1)side=[0,0,1];const seat=geometryPoint(rig.parts.seat||rig.parts.bench,rig,true);
  let pelvis=add(add(seat||[0,-.7,0],mul(front,c.seatOffset??-.10)),[0,.20,0]),torsoUp=rig.parts.backPad?direction(rig.parts.backPad,rig):up.slice(),height=c.height,hands=gripPoints(b,c),feet=null,knees=null,elbows=null,footDirections=null,legPole=null;
  if(kind==='lateral'||kind==='standing-fly'){
   const ankleY=b.floor+.085;pelvis=[0,ankleY+1.71,kind==='lateral'?1.7:1.4];torsoUp=up.slice();feet=kind==='lateral'?[[-.31,ankleY,1.7],[.31,ankleY,1.7]]:[[-.31,ankleY,1.22],[.31,ankleY,1.58]];
  }else if(kind==='extension'){
   const axis=point(rig.parts.armPivot,rig),roll=point(rig.parts.shinRoll,rig);axis[2]=seat[2];pelvis=[axis[0]-.79,axis[1]+.13,seat[2]];knees=[add(axis,[0,0,.30]),add(axis,[0,0,-.30])];
   const d0=norm(sub(roll,axis)),a=-.31,d=[d0[0]*Math.cos(a)-d0[1]*Math.sin(a),d0[0]*Math.sin(a)+d0[1]*Math.cos(a),0];feet=knees.map(k=>add(k,mul(d,.94)));footDirections=feet.map(()=>norm([-d[1],d[0],0]));
  }else if(kind==='press-leg'){
   pelvis=add(seat,[0,.16,0]);torsoUp=norm([-1,1,0]);const normal=norm([-1,-1,0]),tangent=norm([-1,1,0]),plate=surfacePoint(rig.parts.footPlate,rig,normal),ankle=add(add(plate,mul(normal,.19)),mul(tangent,-.10));
   feet=[add(ankle,[0,0,.31]),add(ankle,[0,0,-.31])];footDirections=feet.map(()=>tangent);legPole=[-1.2,.5,0];
  }else if(kind==='bench'){
   pelvis=[.58,-.54,0];torsoUp=[-1,0,0];front=[0,1,0];side=[0,0,1];feet=[[1.44,b.floor+.085,.54],[1.44,b.floor+.085,-.54]];legPole=[2,-.20,0];
  }else if(kind==='squat'){
   const p=squatPose(u,b.floor);pelvis=p.pelvis;torsoUp=p.up;feet=[[.22,b.floor+.085,.36],[.22,b.floor+.085,-.36]];
  }else if(kind==='row'){
   pelvis=add(seat,[0,.20,0]);torsoUp=up.slice();const normal=[-Math.cos(.42),-Math.sin(.42),0],tangent=[-Math.sin(.42),Math.cos(.42),0];feet=['footL','footR'].map(k=>add(add(surfacePoint(rig.parts[k],rig,normal),mul(normal,.19)),mul(tangent,-.10)));footDirections=feet.map(()=>tangent);
  }else if(kind==='chest-row'){pelvis=add(seat,[-.20,.20,0]);torsoUp=norm([.20,1,0]);
  }else if(id==='lat'){torsoUp=norm([.035,1,0]);
  }else if(id==='scissor-pulldown'){torsoUp=norm([-.08,1,0]);
  }else if(id==='cable-pulldown'){torsoUp=norm([.13,1,0]);pelvis=add(seat,[.17,.20,0]);
  }else if(kind==='pullover'){
   torsoUp=norm([.04,1,0]);const axis=point(rig.parts.arcArm,rig);pelvis=sub(axis,mul(torsoUp,height));elbows=[.55,-.55].map(z=>point(rig.parts.arcArm,rig,[-.79,.42,z]));hands=[.55,-.55].map(z=>point(rig.parts.arcArm,rig,[-.37,1.21,z]));
  }else if(kind==='wall'){
   torsoUp=norm([.32*u,1,0]);const ankle=[.10,-1.53,0];pelvis=add(ankle,mul(torsoUp,1.718));feet=[add(ankle,[0,0,.29]),add(ankle,[0,0,-.29])];hands=[[1.405,.94,.36],[1.405,.94,-.36]];
  }else if(kind==='chair-stand'){
   pelvis=[-.68+.83*u,-.47+.65*u,0];torsoUp=norm([.38*Math.sin(Math.PI*u)+.18*(1-u),1,0]);feet=[[.15,-1.53,.28],[.15,-1.53,-.28]];
  }else if(kind==='mini-squat'){
   pelvis=[-2.30-.23*u,.18-.32*u,0];torsoUp=norm([.08+.15*u,1,0]);feet=[[-2.30,-1.53,.28],[-2.30,-1.53,-.28]];hands=[[-1.23,.61,.35],[-1.23,.61,-.35]];
  }else if(kind==='calf'){
   const angle=u*.42,foot=[Math.cos(angle),-Math.sin(angle),0],footCenter=[-1.99-.22*Math.cos(angle),-1.62+Math.hypot(.22*Math.sin(angle),.085*Math.cos(angle)),0],ankle=sub(footCenter,mul(foot,.12));pelvis=add(ankle,[0,1.718,0]);feet=[add(ankle,[0,0,.28]),add(ankle,[0,0,-.28])];footDirections=[foot,foot];hands=[[-1.23,.61,.35],[-1.23,.61,-.35]];
  }
  let supportGap=null;
  const support=kind==='chest-row'?rig.parts.chestPad:(!id.startsWith('home-')&&kind!=='pullover'?rig.parts.backPad:null);
  if(support){const normal=norm(sub(front,mul(torsoUp,dot(front,torsoUp))));if(!support.geometry.boundingBox)support.geometry.computeBoundingBox();const box=support.geometry.boundingBox,projections=[];
   for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])projections.push(dot(point(support,rig,[x,y,z]),normal));
   const surface=kind==='chest-row'?Math.min(...projections):Math.max(...projections),target=surface+(kind==='chest-row'?-.205:.205),center=add(pelvis,mul(torsoUp,height*.64)),horizontal=[normal[0],0,normal[2]],denom=dot(horizontal,normal);
   if(denom>.05)pelvis=add(pelvis,mul(horizontal,(target-dot(center,normal))/denom));
   supportGap=dot(add(pelvis,mul(torsoUp,height*.64)),normal)-target;
  }
  if(bad){if(kind==='extension'){pelvis=add(pelvis,[-.20,0,0]);knees=knees.map(k=>add(k,[-.20,0,0]));feet=feet.map(k=>add(k,[-.20,0,0]));}
   else if(['row','chest-row','pulldown'].includes(kind))torsoUp=norm(add(torsoUp,mul(front,-.25*u)));
   else if(kind==='squat'||kind==='chair-stand')pelvis=add(pelvis,mul(side,.16*u));
   else if(kind==='press-leg')pelvis=add(pelvis,[0,.16*u,0]);
   else if(kind==='lateral')torsoUp=norm(add(torsoUp,mul(side,.18*u)));
   else if(kind==='wall')pelvis=add(pelvis,[.15*u,0,0]);else torsoUp=norm(add(torsoUp,mul(front,.18*u)));
  }
  const bodyFront=norm(sub(front,mul(torsoUp,dot(front,torsoUp)))),orientation=frame(torsoUp,bodyFront),shouldersCenter=add(pelvis,mul(torsoUp,height)),hips=[add(pelvis,mul(side,.23)),add(pelvis,mul(side,-.23))],shoulders=[add(shouldersCenter,mul(side,.37)),add(shouldersCenter,mul(side,-.37))];
  if(!feet)feet=hips.map(h=>[h[0]+front[0]*.83,b.floor+.085,h[2]+front[2]*.83]);
  if(!hands){const forward=kind==='chair-stand'?.60*(1-u):.15;hands=shoulders.map(s=>add(add(s,mul(bodyFront,forward)),mul(torsoUp,-1.20)));}
  const handNodes=c.hands?.slice()||[];
  if(len(sub(shoulders[0],hands[0]))+len(sub(shoulders[1],hands[1]))>len(sub(shoulders[0],hands[1]))+len(sub(shoulders[1],hands[0]))){hands.reverse();handNodes.reverse();if(elbows)elbows.reverse();}
  if(len(sub(hips[0],feet[0]))+len(sub(hips[1],feet[1]))>len(sub(hips[0],feet[1]))+len(sub(hips[1],feet[0]))){feet.reverse();if(footDirections)footDirections.reverse();if(knees)knees.reverse();}
  const contacts=[];
  for(let k=0;k<2;k++){
   const sn=k?'R':'L',sgn=k?-1:1;let armPole=add(shoulders[k],add(mul(side,sgn*.65),add(mul(bodyFront,.08),mul(torsoUp,-.65))));
   if(['chest-press','incline-press','bench'].includes(kind))armPole=add(shoulders[k],add(mul(bodyFront,-.65),add(mul(side,sgn*.65),mul(torsoUp,-.25))));
   if(['row','chest-row'].includes(kind))armPole=add(shoulders[k],add(mul(bodyFront,-1),add(mul(side,sgn*.25),mul(torsoUp,-.35))));
   if(kind==='wall')armPole=add(shoulders[k],add(mul(side,sgn*.18),mul(torsoUp,-1)));
   if(['lateral','standing-fly','fly'].includes(kind))armPole=add(shoulders[k],add(mul(side,sgn),mul(bodyFront,.30)));
   const arm=elbows&&!bad?{start:shoulders[k],joint:elbows[k],end:hands[k],error:0,upperLength:len(sub(elbows[k],shoulders[k])),lowerLength:len(sub(hands[k],elbows[k]))}:ik(shoulders[k],hands[k],elbows?Math.hypot(.79,.42,.18):c.arm*.52,elbows?Math.hypot(.42,.79):c.arm*.48,elbows?elbows[k]:armPole);
   const leg=knees?{start:hips[k],joint:knees[k],end:feet[k],error:0,upperLength:len(sub(knees[k],hips[k])),lowerLength:len(sub(feet[k],knees[k]))}:ik(hips[k],feet[k],c.leg,c.leg,legPole?add(hips[k],legPole):add(hips[k],mul(front,1.6)));
   const fd=footDirections?.[k]||(kind==='bench'?[1,0,0]:norm([front[0],0,front[2]]));let footUp=norm(cross([0,0,1],fd));if(len(footUp)<.1)footUp=up.slice();if(!['press-leg','row'].includes(kind)&&dot(footUp,up)<0)footUp=mul(footUp,-1);
   let footCenter=add(leg.end,mul(fd,.12));if(['press-leg','row'].includes(kind))footCenter=add(footCenter,mul(footUp,-.10));setPoint(b.parts['foot'+sn],footCenter);b.parts['foot'+sn].quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(V(fd),V(footUp),V(norm(cross(fd,footUp)))));
   const angle=(a,j,e)=>Math.acos(Math.max(-1,Math.min(1,dot(norm(sub(a,j)),norm(sub(e,j))))))*180/Math.PI;
   contacts.push({side:sn,handError:arm.error,footError:leg.error,armLengths:[arm.upperLength,arm.lowerLength],legLengths:[leg.upperLength,leg.lowerLength],elbowAngle:angle(arm.start,arm.joint,arm.end),kneeAngle:angle(leg.start,leg.joint,leg.end),handTarget:hands[k],handPosition:arm.end,elbowPosition:arm.joint,shoulderPosition:arm.start,footTarget:feet[k],anklePosition:leg.end,kneePosition:leg.joint,hipPosition:leg.start,handNode:handNodes[k]||handNodes[0]||'local support'});
  }
  b.anatomy.update({pelvis,torsoRotation:orientation,height,contacts,feet:['L','R'].map(s=>b.parts['foot'+s])});
  const result={id,kind,progress:+u.toFixed(4),deviation:bad,floor:b.floor,supportGap,pelvis,torsoUp,front:bodyFront,contacts,source:'Original articulated anatomy cast; qualitative muscle shapes and teaching contact anchors',profile:false};canvas.dataset.humanLesson=JSON.stringify(result);requestDraw?.();return {...result,group:b.group};
 }
 function open(id){active=id;progress=0;deviation=false;if(homeRig)homeRig.group.visible=!rigs[id];for(const b of bodies.values())b.group.visible=false;return update(id,0,false);}
 return {open,update,prepare,hide(){active='';for(const b of bodies.values())b.group.visible=false;if(homeRig)homeRig.group.visible=false;},showFocus(value){bodies.get(active)?.anatomy.showFocus(value);},focusBounds(box){bodies.get(active)?.anatomy.bounds(box);},getGroup(id=active){return bodies.get(id)?.rig.group;},getFloorWorld(id=active){const b=bodies.get(id);return b?b.rig.group.localToWorld(V([0,b.floor,0])):null;},destroy(){for(const b of bodies.values())b.group.removeFromParent();homeRig?.group.removeFromParent();resources.forEach(r=>r.dispose());}};
}
return {ik,profiles,attach,license:'MIT, original BM//MD procedural model, 2026'};
});
