/* The Blender export preserves named training zones and label anchors. */
(() => {
  'use strict';
  const B=window.BM;
  const base=new URL('.',document.currentScript.src);
  const version='detail-20261112-1';
  const file=new URL('assets/learning-models/course-gym.blender.glb.gz',base);
  file.searchParams.set('v',version);
  const zoneIds=['chest','back','shoulder','legs'];
  let modelPromise;

  async function load(){
    const response=await fetch(file);
    if(!response.ok||!response.body)throw new Error('Gym model unavailable');
    const compressed=response.body.pipeThrough(new DecompressionStream('gzip'));
    const contents=await new Response(compressed).arrayBuffer();
    const {THREE,GLTFLoader}=B.ThreeRuntime;
    const {scene:object}=await new GLTFLoader().parseAsync(contents,base.href);
    const zones={},targets=[],details=new Map();
    object.updateMatrixWorld(true);
    object.traverse(part=>{
      if(!part.isMesh)return;
      part.receiveShadow=true;
      part.castShadow=!/EPDM|concrete|enclosure/i.test(part.material.name);
    });
    for(const id of zoneIds){
      const label=object.getObjectByName('label_'+id);
      const zone=object.getObjectByName('zone_'+id);
      const glow=object.getObjectByName('glow_'+id);
      if(!label||!zone||!glow)throw new Error('Missing zone in Blender gym: '+id);
      glow.visible=false;
      const floor=[],lights=[];
      zone.traverse(part=>{
        if(!part.isMesh)return;
        part.userData.zone=id;
        targets.push(part);
        if(part.material.name.startsWith('EPDM')){
          part.material=part.material.clone();
          floor.push(part.material);
        }
      });
      glow.traverse(part=>{
        if(!part.isMesh)return;
        part.castShadow=part.receiveShadow=false;
        lights.push(part.material);
      });
      zones[id]={anchor:label.getWorldPosition(new THREE.Vector3()),floor,glow,lights};
    }

    for(const root of object.children){
      const match=/^machine_(chest|back|shoulder|legs)__(.+)$/.exec(root.name);
      if(!match)continue;
      const [,zone,id]=match;
      const bounds=new THREE.Box3().setFromObject(root);
      details.set(id,{center:bounds.getCenter(new THREE.Vector3()),radius:bounds.getSize(new THREE.Vector3()).length()/2});
      root.traverse(part=>{
        if(!part.isMesh)return;
        part.userData.zone=zone;
        targets.push(part);
      });
    }
    if(details.size!==8)throw new Error('Blender gym inspection targets missing');
    details.set('floor',{center:new THREE.Vector3(3.35,.16,3.64),radius:.92});
    let selected='all',began=0;
    const warm=new THREE.Color(0xc36534);
    object.userData.gym={
      zones,targets,details,
      select(id,now,animate){
        if(id!==selected){
          selected=id;began=now;
          for(const [key,zone] of Object.entries(zones)){
            const on=key===id;
            zone.glow.visible=on;
            for(const floor of zone.floor){
              floor.emissive.copy(on?warm:new THREE.Color(0));
              floor.emissiveIntensity=on?.11:0;
            }
          }
        }
        const zone=zones[id];
        if(!zone)return false;
        const duration=390;
        const changing=animate&&now-began<duration;
        const progress=changing?(now-began)/duration:1;
        for(const light of zone.lights)light.emissiveIntensity=.54+.73*Math.sin(progress*Math.PI/2);
        return changing;
      }
    };
    return object;
  }

  function light(T,renderer){
    const scene=new T.Scene();
    B.lightSpatialScene(T,renderer,scene);
    const [fill,key,rim]=scene.children.filter(child=>child.isLight);
    scene.environmentIntensity=1.00;
    fill.color.setHex(0xe4ddf2);fill.groundColor.setHex(0x38323b);fill.intensity=1.22;
    key.color.setHex(0xffe2ce);key.intensity=2.65;key.position.set(-6,12,9);
    rim.color.setHex(0xc4bfdc);rim.intensity=2.22;rim.position.set(5,7,-8);
    key.castShadow=true;
    key.shadow.mapSize.set(1536,1536);
    key.shadow.camera.left=-10;key.shadow.camera.right=10;
    key.shadow.camera.top=9;key.shadow.camera.bottom=-9;
    key.shadow.camera.near=.2;key.shadow.camera.far=31;
    key.shadow.normalBias=.026;key.shadow.bias=-.00013;
    key.shadow.intensity=.74;key.shadow.radius=3;
    return {scene,key};
  }

  B.BlenderGym={load:()=>modelPromise||=(load().catch(error=>{modelPromise=null;throw error;})),light};
})();
