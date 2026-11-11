/* Presentation meshes for the course rig. No forces or training data enter this layer. */
(function (B) {
  'use strict';

  const focusByMovement = {
    lateral: ['deltoid'],
    extension: ['quadriceps'],
    'press-leg': ['quadriceps', 'gluteal'],
    squat: ['quadriceps', 'gluteal'],
    'mini-squat': ['quadriceps', 'gluteal'],
    'chair-stand': ['quadriceps', 'gluteal'],
    bench: ['pectoral', 'triceps'],
    'chest-press': ['pectoral', 'triceps'],
    'incline-press': ['pectoral', 'deltoid'],
    wall: ['pectoral', 'triceps'],
    fly: ['pectoral'],
    'standing-fly': ['pectoral'],
    row: ['latissimus', 'biceps'],
    'chest-row': ['latissimus', 'biceps'],
    pulldown: ['latissimus', 'biceps'],
    pullover: ['latissimus'],
    shoulder: ['deltoid', 'triceps'],
    calf: ['calf']
  };
  const labels = {
    deltoid: ['三角肌', 'Deltoid'],
    pectoral: ['胸大肌', 'Pectoralis major'],
    latissimus: ['背阔肌', 'Latissimus dorsi'],
    triceps: ['肱三头肌', 'Triceps'],
    biceps: ['肱二头肌', 'Biceps'],
    quadriceps: ['股四头肌', 'Quadriceps'],
    hamstrings: ['腘绳肌', 'Hamstrings'],
    gluteal: ['臀大肌', 'Gluteus maximus'],
    calf: ['腓肠肌', 'Gastrocnemius']
  };

  function create(T, resources) {
    const data = B.AnatomyMeshes;
    const up = new T.Vector3(0,1,0), localSide = new T.Vector3(1,0,0);
    const front = new T.Vector3(), axis = new T.Vector3(), cross = new T.Vector3();
    const basis = new T.Matrix4();
    const wallPalm = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(
      new T.Vector3(0,0,-1),new T.Vector3(0,1,0),new T.Vector3(1,0,0)
    ));
    const shoeRotation = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(
      new T.Vector3(0,0,1), new T.Vector3(1,0,0), new T.Vector3(0,1,0)
    ));
    const style = (color, metalness, roughness, vertexColors=false) => {
      const material = new T.MeshStandardMaterial({color,metalness,roughness,vertexColors});
      resources.add(material);
      return material;
    };
    const cast = style(0x635e71,.25,.55);
    const shoeMat = style(0x343240,.23,.58);
    const coated = style(0xffffff,.30,.51,true);
    const baseColor = new T.Color(0x686275), shortsColor = new T.Color(0x484356);
    const studyColor = new T.Color(0x776977), warmColor = new T.Color(0x9a776e);
    const accentColor = new T.Color(0xc68459), blended = new T.Color();
    const models = new Map(), variants = new Map();
    const clamp = T.MathUtils.clamp;

    const word=(raw,i)=>raw.charCodeAt(i)|raw.charCodeAt(i+1)<<8;
    const signed=(raw,i)=>((word(raw,i)<<16)>>16)/10000;
    function positions(encoded) {
      const raw = atob(encoded);
      const values = new Float32Array(raw.length / 2);
      for (let i=0; i<values.length; i++) {
        values[i] = signed(raw,i*2);
      }
      return new T.BufferAttribute(values,3);
    }
    function model(name) {
      if (models.has(name)) return models.get(name);
      const {base,rings,sides,muscles={}} = data[name];
      const index = [];
      for (let row=0; row<rings-1; row++) {
        for (let column=0; column<sides; column++) {
          const a = row*sides+column, b = row*sides+(column+1)%sides;
          index.push(a,b,b+sides,a,b+sides,a+sides);
        }
      }
      const last = (rings-1)*sides;
      for (let i=1; i<sides-1; i++) index.push(0,i+1,i,last,last+i,last+i+1);
      const geometry = new T.BufferGeometry();
      geometry.setIndex(index);
      const position=positions(base);
      geometry.setAttribute('position',position);
      geometry.computeVertexNormals();
      const muscleEntries=Object.entries(muscles);
      if(muscleEntries.length){
        geometry.morphTargetsRelative=true;
        geometry.morphAttributes.position=[];
        geometry.morphAttributes.normal=[];
      }
      const masks=new Map(), bounds=new Map(), point=new T.Vector3(), movement=new T.Vector3();
      const normals=geometry.attributes.normal.array;
      for(const [id,encoded] of muscleEntries){
        const changes=atob(encoded), colors=new Uint8Array(position.count);
        const offset=new T.BufferAttribute(new Float32Array(position.count*3),3);
        offset.name=id;
        const target=geometry.clone(), shape=target.attributes.position, extent=new T.Box3();
        for(let row=0;row<changes.length;row+=9){
          const i=word(changes,row),weight=changes.charCodeAt(row+8);
          movement.set(signed(changes,row+2),signed(changes,row+4),signed(changes,row+6));
          colors[i]=weight;
          offset.setXYZ(i,movement.x,movement.y,movement.z);
          point.fromBufferAttribute(position,i);
          if(weight>46)extent.expandByPoint(point);
          point.add(movement);
          if(weight>46)extent.expandByPoint(point);
          shape.setXYZ(i,point.x,point.y,point.z);
        }
        target.computeVertexNormals();
        const normal=target.attributes.normal;
        for(let i=0;i<normal.array.length;i++)normal.array[i]-=normals[i];
        normal.name=id;
        geometry.morphAttributes.position.push(offset);
        geometry.morphAttributes.normal.push(normal);
        target.dispose();
        masks.set(id,colors);
        bounds.set(id,extent);
      }
      geometry.computeBoundingBox();
      const result={geometry,masks,bounds};
      models.set(name,result);resources.add(geometry);
      return result;
    }
    function colored(name,focus,observe) {
      const source=model(name);
      if(!source.masks.size)return source.geometry;
      const selected=focus.filter(id=>source.masks.has(id));
      const key=name+'/'+selected.join(',')+'/'+observe;
      if(variants.has(key))return variants.get(key);
      const from=source.geometry;
      const geometry=new T.BufferGeometry();
      geometry.setIndex(from.index);
      geometry.setAttribute('position',from.attributes.position);
      geometry.setAttribute('normal',from.attributes.normal);
      geometry.morphAttributes=from.morphAttributes;
      geometry.morphTargetsRelative=true;
      geometry.boundingBox=from.boundingBox;
      const count=from.attributes.position.count, rgb=new Float32Array(count*3);
      const neutral=name==='pelvis'?shortsColor:baseColor;
      for(let i=0;i<count;i++){
        let active=0,other=0;
        for(const [id,mask] of source.masks){
          const weight=mask[i]/255;
          if(selected.includes(id))active=Math.max(active,weight);
          else other=Math.max(other,weight);
        }
        blended.copy(neutral).lerp(studyColor,other*.25)
          .lerp(observe?accentColor:warmColor,Math.min(1,active*(observe?1.42:.47)));
        blended.toArray(rgb,i*3);
      }
      geometry.setAttribute('color',new T.BufferAttribute(rgb,3));
      variants.set(key,geometry);resources.add(geometry);
      return geometry;
    }

    function attach(group,kind) {
      const focus=focusByMovement[kind]||[], meshes=[];
      function mesh(name, shape, material) {
        const part=new T.Mesh(colored(shape,focus,false),material);
        part.name=name;
        part.userData.lessonHuman=true;
        group.add(part);
        meshes.push({shape,part});
        return part;
      }
      const torso=mesh('thorax','torso',coated);
      const hips=mesh('Pelvis','pelvis',coated);
      const neck=mesh('Neck','neck',cast),head=mesh('head','head',cast);
      const limbs=['L','R'].map(side=>({
        arm:mesh('Upper arm '+side,'upperArm',coated),
        forearm:mesh('Forearm '+side,'forearm',cast),
        thigh:mesh('Thigh '+side,'thigh',coated),
        shin:mesh('Shin '+side,'shin',coated),
        hand:mesh('Hand '+side,kind==='wall'?'palm':'grip',cast),
        shoe:mesh('foot-'+side,'shoe',shoeMat)
      }));

      // Match the old contact envelope when replacing its ellipsoid with a sculpted shoe.
      const contactNormal=kind==='press-leg'?new T.Vector3(-Math.SQRT1_2,-Math.SQRT1_2,0):
        kind==='row'?new T.Vector3(-Math.cos(.42),-Math.sin(.42),0):up;
      const contactPoint=new T.Vector3(), inverted=new T.Quaternion();
      function placeShoe(part,anchor){
        part.position.copy(anchor.position);
        part.quaternion.copy(anchor.quaternion).multiply(shoeRotation);
        if(kind==='extension')return;
        const n=contactPoint.copy(contactNormal).applyQuaternion(inverted.copy(anchor.quaternion).invert());
        const oldMin=-Math.hypot(n.x*.22,n.y*.085,n.z*.12);
        n.copy(contactNormal).applyQuaternion(inverted.copy(part.quaternion).invert());
        const xyz=part.geometry.attributes.position.array;
        let min=Infinity;
        for(let j=0;j<xyz.length;j+=3)min=Math.min(min,n.x*xyz[j]+n.y*xyz[j+1]+n.z*xyz[j+2]);
        part.position.addScaledVector(contactNormal,oldMin-min);
      }
      const point=(x,y,z)=>new T.Vector3(x,y,z);
      function orient(part,start,end,facing,alternative) {
        part.position.copy(start);
        axis.subVectors(end,start);
        const distance=Math.max(axis.length(),.0001);
        axis.divideScalar(distance);
        front.copy(facing).addScaledVector(axis,-facing.dot(axis));
        if(front.lengthSq()<.0001)front.copy(alternative).addScaledVector(axis,-alternative.dot(axis));
        if(front.lengthSq()<.0001)front.copy(localSide).addScaledVector(axis,-localSide.dot(axis));
        front.normalize();
        cross.crossVectors(axis,front);
        part.quaternion.setFromRotationMatrix(basis.makeBasis(cross,axis,front));
        part.scale.y=distance;
      }
      function morph(part,name,value) {
        part.morphTargetInfluences[part.morphTargetDictionary[name]]=clamp(value,0,1);
      }
      function local(part,x,y,z) {
        return point(x,y*part.scale.y,z).applyQuaternion(part.quaternion).add(part.position);
      }

      function update({pelvis,torsoRotation,height,contacts,feet}) {
        torso.position.fromArray(pelvis);torso.quaternion.copy(torsoRotation);torso.scale.y=height;
        hips.position.copy(torso.position);hips.quaternion.copy(torsoRotation);
        neck.position.copy(local(torso,0,1.02,-.022));neck.quaternion.copy(torsoRotation);
        head.position.copy(local(torso,0,1+.405/height,-.024));head.quaternion.copy(torsoRotation);
        const forward=point(0,0,1).applyQuaternion(torsoRotation),torsoUp=up.clone().applyQuaternion(torsoRotation);
        let chestShort=0,backShort=0,hipsShort=0;
        contacts.forEach((c,i)=>{
          const l=limbs[i];
          const shoulder=point(...c.shoulderPosition),elbow=point(...c.elbowPosition),wrist=point(...c.handPosition);
          const hip=point(...c.hipPosition),knee=point(...c.kneePosition),ankle=point(...c.anklePosition);
          const upper=elbow.clone().sub(shoulder).normalize(),lower=wrist.clone().sub(elbow).normalize();
          const femur=knee.clone().sub(hip).normalize(),tibia=ankle.clone().sub(knee).normalize();
          const armBend=(1-upper.dot(lower))*.78,kneeBend=(1-femur.dot(tibia))*.94;
          orient(l.arm,shoulder,elbow,lower,forward);
          orient(l.forearm,elbow,wrist,upper.clone().negate(),forward);
          l.hand.position.copy(wrist);
          l.hand.quaternion.copy(kind==='wall'?wallPalm:l.forearm.quaternion);
          l.hand.scale.x=i===0?-1:1;
          orient(l.thigh,hip,knee,tibia.clone().negate(),forward);
          orient(l.shin,knee,ankle,femur,forward);
          if(kind==='extension'){l.shin.scale.x=.79;l.shin.scale.z=.79;}
          const shoe=feet[i];
          placeShoe(l.shoe,shoe);
          const plantar=up.clone().applyQuaternion(l.shoe.quaternion).dot(tibia);
          morph(l.arm,'deltoid',(upper.dot(torsoUp)+1)*.78);
          morph(l.arm,'biceps',armBend);
          morph(l.arm,'triceps',1-armBend);
          morph(l.thigh,'quadriceps',1-kneeBend);
          morph(l.thigh,'hamstrings',kneeBend);
          morph(l.shin,'calf',.14+1.75*plantar);
          chestShort+=clamp(.21+.84*upper.dot(forward),0,1)*.5;
          backShort+=clamp(.43-.59*upper.dot(torsoUp)-.46*upper.dot(forward),0,1)*.5;
          hipsShort+=clamp(-femur.dot(torsoUp),0,1)*.5;
        });
        morph(torso,'pectoral',chestShort);
        morph(torso,'latissimus',backShort);
        morph(hips,'gluteal',hipsShort);
      }

      const worldBounds=new T.Box3();
      return {
        update,
        showFocus(value) {
          for(const {shape,part} of meshes)part.geometry=colored(shape,focus,value);
        },
        bounds(box) {
          for(const {shape,part} of meshes){
            for(const [id,extent] of model(shape).bounds){
              if(focus.includes(id))box.union(worldBounds.copy(extent).applyMatrix4(part.matrixWorld));
            }
          }
        }
      };
    }
    return {attach};
  }

  B.HumanAnatomy={
    create,
    focus(kind){return (focusByMovement[kind]||[]).map(id=>labels[id]);},
    rearView(kind){return ['row','chest-row','pulldown','pullover','calf'].includes(kind);}
  };
})(window.BM);
