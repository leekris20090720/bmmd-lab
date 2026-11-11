/* Geometry for the ideal teaching models. All motion comes from the experiment result. */
(() => {
  'use strict';
  const B = window.BM;
  const radians = Math.PI / 180;

  B.buildMechanismScene = ({THREE:T, RoundedBoxGeometry}, world, material, id) => {
    const cylinder = new T.CylinderGeometry(1, 1, 1, 24);
    const cone = new T.ConeGeometry(1, 1, 18);
    const up = new T.Vector3(0, 1, 0);
    const delta = new T.Vector3();
    const v = (x,y,z=0) => new T.Vector3(x,y,z);
    const G = (parent=world, x=0,y=0,z=0) => {
      const node = new T.Group();
      node.position.set(x,y,z);
      parent.add(node);
      return node;
    };
    function mesh(parent, geometry, finish, x=0,y=0,z=0) {
      const node = new T.Mesh(geometry, material[finish]);
      node.position.set(x,y,z);
      parent.add(node);
      return node;
    }
    const soft = (parent, finish,x,y,z,w,h,d) =>
      mesh(parent,new RoundedBoxGeometry(w,h,d,3,Math.min(w,h,d)*.43),finish,x,y,z);
    function round(parent, finish,x,y,z,r,h,axis='y') {
      const node = mesh(parent,cylinder,finish,x,y,z);
      node.scale.set(r,h,r);
      if(axis==='z')node.rotation.x=Math.PI/2;
      if(axis==='x')node.rotation.z=Math.PI/2;
      return node;
    }
    function link(node,a,b,r) {
      delta.subVectors(b,a);
      const length=delta.length();
      node.visible=length>.00001;
      if(!node.visible)return;
      node.position.copy(a).lerp(b,.5);
      node.quaternion.setFromUnitVectors(up,delta.divideScalar(length));
      node.scale.set(r,length,r);
    }
    function tube(parent,finish,points,r) {
      return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>v(...p))),48,r,8,false),finish);
    }
    const bar = (parent,finish,a,b,r) => {
      const node=mesh(parent,cylinder,finish);
      link(node,v(...a),v(...b),r);
      return node;
    };
    const guide = (finish,r,parent=world) => {
      const node=mesh(parent,cylinder,finish);
      node.visible=false;
      return (a,b)=>link(node,a,b,r);
    };
    function arrow(finish) {
      const shaft=mesh(world,cylinder,finish),tip=mesh(world,cone,finish);
      shaft.visible=tip.visible=false;
      return (origin,direction) => {
        const length=direction.length();
        const tipLength=Math.min(.22,length*.35);
        const end=origin.clone().add(direction);
        const start=end.clone().addScaledVector(direction,-tipLength/Math.max(length,.00001));
        link(shaft,origin,start,.027);
        link(tip,start,end,.08);
      };
    }
    function plinth(w=1,d=.67) {
      const outline=[[0,-.28],[2.50,-.28],[2.65,-.23],[2.72,-.14],[2.72,-.07],[2.62,0],[0,0]];
      const base=mesh(world,new T.LatheGeometry(outline.map(([r,y])=>new T.Vector2(r,y)),72),'platform');
      base.scale.set(w,1,d);
      const rim=mesh(world,new T.TorusGeometry(2.65,.014,8,72),'trim',0,-.12,0);
      rim.rotation.x=-Math.PI/2;
      rim.scale.set(w,d,1);
    }
    function wheel(parent,x,y,z,r) {
      const part=G(parent,x,y,z);
      round(part,'graphite',0,0,0,r,.19,'z');
      for(const side of [-1,1]) {
        round(part,'chrome',0,0,side*.092,r*.96,.035,'z');
        round(part,'graphite',0,0,side*.116,r*.82,.025,'z');
      }
      round(part,'bronze',0,0,.148,r*.28,.08,'z');
      for(let k=0;k<5;k++){
        const angle=k*Math.PI*2/5;
        round(part,'rubber',Math.cos(angle)*r*.53,Math.sin(angle)*r*.53,.138,r*.11,.026,'z');
      }
      return part;
    }
    function post(x,y,z) {
      soft(world,'graphite',x,.12,z,.56,.23,.65);
      bar(world,'graphite',[x,.20,z],[x,y,z],.115);
    }
    function grip(parent,x,y,z,w=.7) {
      round(parent,'chrome',x,y,z,.084,w,'z');
      round(parent,'rubber',x,y,z,.121,w*.85,'z');
    }
    function vectorScene() {
      plinth();
      const balance=id==='force-balance', lever=id==='lever';
      const origin=v(lever?-1.43:0,.99,.14);
      post(origin.x,.99,origin.z);
      round(world,'bronze',origin.x,origin.y,origin.z,.17,.28,'z');
      bar(world,'trim',[-2.15,.99,-.02],[2.15,.99,-.02],.028);
      const arm=guide('chrome',.082), perpendicular=guide('teal',.023);
      const along=arrow('teal'), force=arrow('copper'), result=arrow('silver');
      return ({p,metrics:m})=>{
        const angle=(balance?m.angleBetween:p.angle)*radians;
        const unit=v(Math.cos(angle),Math.sin(angle));
        const point=origin.clone().add(v(lever?p.reach*2.35:0,0));
        const length=(balance?p.forceB:p.force)*.0068;
        force(point,unit.clone().multiplyScalar(length));
        if(lever){
          arm(origin,point);
          const foot=point.clone().addScaledVector(unit,origin.clone().sub(point).dot(unit));
          perpendicular(origin,foot);
        }else if(balance){
          along(origin,v(p.forceA*.0068,0));
          result(origin.clone().add(v(0,0,.11)),v(m.resultantX*.0068,m.resultantY*.0068));
        }else{
          along(origin.clone().add(v(0,-.14,.04)),v(m.parallel*.0068,0));
        }
        return [point.x,angle,length,balance?m.resultant:p.force];
      };
    }
    function cableTower() {
      plinth();
      for(const z of [-.43,.43])tube(world,'graphite',[
        [-1.62,.1,z],[-1.62,1.9,z],[-1.52,2.23,z],[-1.29,2.34,z],[1.44,2.34,z],[1.66,2.22,z],[1.68,.1,z]
      ],.086);
      for(const x of [-1.16,1.06])bar(world,'chrome',[x,.08,-.13],[x,2.29,-.13],.035);
      const upper=wheel(world,-.38,2.1,.47,.26);
      const lower=wheel(world,.62,1.16,.47,.22);
      const load=G();
      for(let k=0;k<5;k++)soft(load,k===2?'bronze':'rubber',0,k*.067,0,.82,.059,.46);
      const handle=G();
      grip(handle,0,0,0,.54);
      soft(handle,'bronze',0,.14,0,.18,.17,.24);
      const lines=Array.from({length:4},()=>guide('chrome',.021));
      const lead=guide('chrome',.023);
      const end=guide('chrome',.02);
      const power=id==='power';
      return ({p,metrics:m})=>{
        const ratio=power?2:p.ratio;
        const travel=power?m.position:(m.handle??(m.weightRise*ratio));
        const lift=power?travel/ratio:(m.rise??m.weightRise);
        const handleY=1.73-travel*.87, loadY=.24+lift*.87;
        handle.position.set(-1.52,handleY,.54);
        load.position.set(.64,loadY,.47);
        lower.position.y=loadY+.49;
        lower.rotation.z=-lift*4;
        lower.visible=ratio>1;
        upper.rotation.z=travel*4;
        lead(v(-1.52,handleY+.17,.54),v(-.63,2.10,.54));
        end(v(-.13,2.10,.47),v(.63,ratio>1?lower.position.y:loadY+.33,.47));
        for(const [i,line] of lines.entries()){
          const x=.68+(i-(ratio-1)/2)*.18;
          const a=v(x,2.21,.54),b=i<ratio? v(x,loadY+.33,.54):a;
          line(a,b);
        }
        return [handleY,loadY,ratio,power?m.power:(m.force??m.liftingForce)];
      };
    }
    function seated() {
      plinth(1,.72);
      for(const z of [-.52,.52])tube(world,'graphite',[
        [-1.65,.08,z],[-1.46,.29,z],[-1.14,1.08,z],[-.85,1.23,z],[.74,1.23,z],[1.26,.87,z],[1.61,.08,z]
      ],.086);
      soft(world,'rubber',-.60,1.27,0,1.64,.16,1.12);
      const back=soft(world,'rubber',-1.45,1.69,0,.19,1.04,1.12);
      back.rotation.z=.19;
      round(world,'chrome',.51,1.23,0,.113,1.45,'z');
      round(world,'bronze',.51,1.23,.60,.20,.12,'z');
      const isStudy=id==='leg-tempo',swing=G(world,.51,1.23,.68);
      bar(swing,'chrome',[0,0,0],[0,-.91,0],.08);
      const rollerY=isStudy?-.765:-.90;
      grip(swing,0,rollerY,-.29,.86);
      for(const z of [-.70,.12])round(swing,'bronze',0,rollerY,z,.13,.055,'z');
      const arcGeometry=new T.BufferGeometry().setFromPoints(Array.from({length:49},(_,i)=>{
        const angle=i/48*1.46;
        return v(.51+Math.sin(angle)*.62,1.23-Math.cos(angle)*.62,.87);
      }));
      const arc=new T.Line(arcGeometry,material.arc);
      if(!isStudy)world.add(arc);
      else arcGeometry.dispose();
      const resist=arrow('copper'), gravity=arrow('gold');
      return ({metrics:m,study,params})=>{
        const theta=isStudy?study.theta:m.position;
        swing.rotation.z=theta;
        if(!isStudy)arcGeometry.setDrawRange(0,1+Math.round(Math.min(1,Math.max(0,theta/1.46))*48));
        if(isStudy){
          const length=params.length*2.25;
          swing.scale.y=length/.91;
          const roller=v(.51+Math.sin(theta)*length*.85,1.23-Math.cos(theta)*length*.85,.78);
          const com=v(.51+Math.sin(theta)*length*.5,1.23-Math.cos(theta)*length*.5,.82);
          resist(roller,v(-Math.cos(theta),-Math.sin(theta)).multiplyScalar(study.padForce*.005));
          gravity(com,v(0,-params.segmentMass*9.81*.005));
        }
        return [theta,isStudy?study.padForce:m.velocity];
      };
    }
    function shaft() {
      plinth();
      post(-.82,1.02,0);
      const ring=wheel(world,-.82,1.03,.30,.55);
      round(world,'chrome',-.82,1.03,.42,.125,.3,'z');
      const pointer=G(world,-.82,1.03,.62);
      bar(pointer,'chrome',[0,0,0],[1.25,0,0],.073);
      round(pointer,'bronze',1.27,0,0,.145,.18,'z');
      const cable=guide('copper',.029), arm=guide('teal',.027), tension=arrow('copper');
      return ({metrics:m})=>{
        ring.rotation.z=pointer.rotation.z=m.angle;
        const x=-.82+m.arm*4;
        cable(v(x,.19,.81),v(x,2.34,.81));
        arm(v(-.82,1.03,.81),v(x,1.03,.81));
        tension(v(x,1.52,.84),v(0,Math.min(.75,m.cable*.0015),0));
        return [m.angle,m.arm,m.torque];
      };
    }
    function incline() {
      plinth();
      const hinge=G(world,-1.68,.33,0);
      for(const z of [-.50,.50])bar(hinge,'graphite',[0,0,z],[3.38,0,z],.12);
      for(const x of [.2,1.2,2.2,3.15])bar(hinge,'chrome',[x,0,-.5],[x,0,.5],.049);
      const sled=G(hinge);
      soft(sled,'graphite',0,.16,0,.72,.20,1.15);
      const plate=soft(sled,'rubber',.24,.40,0,.19,.56,.94);
      plate.rotation.z=-.18;
      for(const z of [-.65,.65]){
        round(sled,'bronze',.04,.21,z,.17,.15,'z');
        round(sled,'chrome',.04,.21,z+Math.sign(z)*.09,.07,.05,'z');
      }
      const gravity=arrow('gold'), applied=arrow('copper'), friction=arrow('teal'), normal=arrow('silver');
      return ({p,progress,metrics:m})=>{
        const angle=p.slope*radians;
        hinge.rotation.z=angle;
        sled.position.x=.56+(p.mode===2?.48:progress)*1.8;
        const along=v(Math.cos(angle),Math.sin(angle)), perp=v(-along.y,along.x);
        const weight=Math.hypot(m.gravity,m.normal),scale=1.02/Math.max(1,weight,Math.abs(m.force),Math.abs(m.friction),m.normal);
        const at=v(-1.68,.33,.30).addScaledVector(along,sled.position.x).addScaledVector(perp,.24);
        gravity(at,v(0,-weight*scale));
        applied(at,along.clone().multiplyScalar(m.force*scale));
        friction(at.clone().add(v(0,0,.17)),along.clone().multiplyScalar(m.friction*scale));
        normal(at,perp.multiplyScalar(m.normal*scale));
        return [p.slope,sled.position.x,m.force,m.friction];
      };
    }
    function spring() {
      plinth();
      const y=.76;
      post(-1.86,y,0);
      for(const z of [-.41,.41])bar(world,'chrome',[-1.85,.29,z],[1.85,.29,z],.055);
      soft(world,'graphite',1.82,.14,0,.45,.27,1.18);
      const coil=G(world,-1.77,y,0);
      const path=Array.from({length:137},(_,i)=>{
        const q=i/136,a=q*Math.PI*22,r=(i===0||i===136)?0:.145;
        return v(q,r*Math.cos(a),r*Math.sin(a));
      });
      mesh(coil,new T.TubeGeometry(new T.CatmullRomCurve3(path),136,.027,7,false),'chrome');
      const carriage=G();
      soft(carriage,'bronze',0,.65,0,.65,.42,.73);
      soft(carriage,'rubber',0,.40,0,.86,.16,1.04);
      for(const x of [-.30,.30])for(const z of [-.41,.41])round(carriage,'graphite',x,.26,z,.133,.11,'z');
      const force=arrow('copper');
      return ({metrics:m})=>{
        const displacement=id==='spring'?m.position:m.extension;
        const x=.18+displacement*1.5;
        carriage.position.x=x;
        coil.scale.x=x+1.43;
        if(id==='elastic-load')force(v(x+.35,.66,.18),v(Math.min(1,m.elasticForce*.002),0));
        return [x,coil.scale.x,m.elasticForce??m.energy];
      };
    }
    function balanceBeam() {
      plinth();
      post(0,1.48,0);
      round(world,'chrome',0,1.48,0,.20,.49,'z');
      const beam=G(world,0,1.48,.24);
      soft(beam,'graphite',0,0,0,3.62,.14,.26);
      const leads=[guide('chrome',.025),guide('chrome',.025)];
      const weights=[G(),G()];
      for(const [i,weight] of weights.entries()){
        round(weight,i?'bronze':'graphite',0,-.1,0,.27,.29);
        round(weight,'chrome',0,.054,0,.19,.035);
        round(weight,'rubber',0,-.255,0,.27,.035);
      }
      return ({p,x,metrics:m})=>{
        const angle=x*radians;
        beam.rotation.z=angle;
        for(const [i,distance] of [-p.armLeft,p.armRight].entries()){
          const at=v(Math.cos(angle)*distance*1.45,1.48+Math.sin(angle)*distance*1.45,.24);
          const end=at.clone().add(v(0,-.37));
          weights[i].position.copy(end);
          weights[i].scale.setScalar(.73+Math.sqrt(i?p.massRight:p.massLeft)*.088);
          leads[i](at,end);
        }
        return [angle,p.armLeft,p.armRight,m.weightMoment];
      };
    }
    function rotor() {
      plinth();
      round(world,'graphite',0,.22,0,.55,.41);
      round(world,'chrome',0,.43,0,.43,.07);
      const rotating=G(world,0,.58,0);
      soft(rotating,'graphite',0,0,0,3.4,.18,.32);
      round(rotating,'bronze',0,.15,0,.23,.25);
      const weights=[G(rotating),G(rotating)];
      for(const weight of weights){
        round(weight,'graphite',0,.15,0,.29,.32);
        round(weight,'chrome',0,.32,0,.25,.055);
        round(weight,'bronze',0,.36,0,.11,.044);
      }
      return ({p,metrics:m})=>{
        rotating.rotation.y=-m.rotorAngle;
        for(const [i,weight] of weights.entries()){
          weight.position.x=(i?-1:1)*p.radius*2.60;
          weight.scale.setScalar(.72+p.pointMass*.10);
        }
        return [m.rotorAngle,p.radius,m.angularSpeed];
      };
    }
    function support() {
      plinth();
      const base=soft(world,'graphite',0,.34,0,1,.15,1.31);
      const feet=[soft(world,'rubber',0,.12,0,.32,.24,1.18),soft(world,'rubber',0,.12,0,.32,.24,1.18)];
      const mast=guide('chrome',.13), pull=arrow('copper'), left=arrow('teal'), right=arrow('teal');
      return ({p,x,metrics:m})=>{
        const half=p.halfWidth*2.68,height=.41+p.forceHeight*1.15;
        base.scale.x=2*half+.36;
        feet[0].position.x=-half;feet[1].position.x=half;
        mast(v(0,.38,0),v(0,height,0));
        pull(v(0,height,0),v(x*.0021,0));
        const scale=.95/Math.max(1,m.requiredRight);
        left(v(-half,.035,.65),v(0,Math.max(0,m.requiredLeft)*scale));
        right(v(half,.035,.65),v(0,m.requiredRight*scale));
        return [x,half,height,m.requiredLeft];
      };
    }
    function shoulder() {
      plinth();
      const point=p=>v(p.x*1.55,p.y*1.55,0);
      const tower=guide('graphite',.11), arm=guide('chrome',.082), cable=guide('chrome',.022), distance=guide('teal',.023);
      const pulley=wheel(world,0,0,0,.20);
      const anchor=wheel(world,0,0,0,.18);
      const handle=G();
      grip(handle,0,0,0,.50);
      const support=guide('graphite',.12), force=arrow('copper');
      return ({study:s})=>{
        const shoulder=point(s.shoulder), hand=point(s.hand), exit=point(s.pulley);
        pulley.position.copy(exit);anchor.position.copy(shoulder);handle.position.copy(hand);
        tower(v(exit.x,.03,-.14),v(exit.x,2.30,-.14));
        support(v(shoulder.x,.03,0),shoulder);
        arm(shoulder,hand);cable(exit,hand);
        const line=exit.clone().sub(hand).normalize();
        distance(shoulder,hand.clone().addScaledVector(line,shoulder.clone().sub(hand).dot(line)));
        force(hand,line.multiplyScalar(.81));
        return [s.angle,exit.x,exit.y,hand.x,hand.y];
      };
    }
    const types={
      direction:vectorScene,lever:vectorScene,'force-balance':vectorScene,pulley:cableTower,
      'pulley-efficiency':cableTower,power:cableTower,kinematics:seated,'leg-tempo':seated,
      cam:shaft,work:shaft,calculus:shaft,uncertainty:shaft,design:shaft,incline,spring,
      'elastic-load':spring,counterweight:balanceBeam,'rotational-inertia':rotor,
      'base-stability':support,'cable-lateral':shoulder
    };
    return types[id]?.();
  };
})();
