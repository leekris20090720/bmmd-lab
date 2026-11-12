/* WebGL console chassis. Native controls are projected onto the same camera plane. */
(() => {
  'use strict';
  const B=window.BM=window.BM||{};
  const length=1320;
  const rad=Math.PI/180;
  const plateSelectors=[
    '[data-deck-plate]','.deck-bays > *','#pd-header',
    '#pd-content > :is(section,article,form,.pd-plan,.pd-doors,.pd-course-directory):not(.pd-plot-grid)',
    '.pd-ex-layout > :is(.pd-ex-observe,.pd-ex-controls)','.pd-course-workspace > *','.ex-topic',
    '#pd-content > div:not(.pd-ex-layout,.pd-course-workspace,.pd-plot-grid,.ex-library-topics,.pd-plan-toolbar,.pd-learn-intro,.pd-learn-layout,.ex-library-intro,.ex-library-controls,.ex-library-groups)',
    '#engineering-root :is(.eng-top,.eng-heading,.eng-models,.eng-hero,.eng-stage,.eng-parameters,.eng-position,.eng-panel,.eng-graph,.eng-observe,.eng-layout > *,.did-lab-header,.did-detailed-readouts)',
    '.pg-header','.pg-tabs','.pg-content > :not(.pg-game,section.pg-empty)','.pg-footer'
  ].join(',');
  const keySelectors='button,a.pd-button,nav a,summary,[role=tab],input:not([type=range],[type=checkbox],[type=radio],[type=file]),select,textarea';
  const modalStyle=`
  :host{--ui-bg:#101017;--ui-surface:#25232d;--ui-surface-subtle:#292631;--ui-text:#f6f2f0;--ui-muted:#c6bdca;--ui-line:#60576b;--ui-accent:#f2bb96;--ui-primary-bg:#f2bb96;--ui-primary-text:#1b130b;--ui-focus:#ffe0cb;font-family:"BM Inter",Inter,system-ui,sans-serif}
  .pg-dialog{background:#101017!important;border:1px solid #675d70!important;border-radius:14px!important;color:#f6f2f0!important}
  .pg-dialog::backdrop{background:#04070de8!important;backdrop-filter:none!important}
  .pg-shell{position:relative;z-index:1;background:transparent!important}
  .pg-ambient,.ref-light,.ref-edge,.ref-glare,.ref-beam,.pg-gallery-ambient,.pg-gallery-ring{display:none!important}
  .pg-header,.pg-tabs,.pg-content,.pg-footer,.pg-game,.pg-choice,.pg-wave-choice,.pg-empty,.pg-result{background:#201e28!important;border-color:#5a5164!important;border-radius:14px!important;box-shadow:none!important}
  .pg-gallery-stage{background:#101017!important}
  .pg-dialog button{background:#2d2936!important;color:#f6f2f0!important;border:1px solid #62576a!important;border-radius:14px!important;box-shadow:0 3px 0 #121017!important}
  .pg-dialog button:is([aria-selected=true],[aria-pressed=true]){background:#f2bb96!important;color:#23180d!important;border-color:#f7d5c0!important}
  .pg-dialog .pg-lab-bench .pg-bench-switch button[aria-pressed=true]{background:#f2bb96!important;color:#27190b!important}
  .pg-dialog .pg-dual-wave button.pg-wave-choice{
    justify-content:center;align-items:flex-start;gap:4px;
    padding:10px clamp(12px,1.2vw,16px);text-align:start;
  }
  .pg-dialog .pg-dual-wave .pg-wave-choice small{line-height:1.4}
  .pg-dialog .pg-dual-wave .pg-wave-choice[aria-pressed=true]{--wave-x:0px!important}
  .pg-dialog .pg-dual-wave .pg-wave-choice[aria-pressed=true] small{color:#543221}
  .pg-dialog .pg-empty{padding:clamp(16px,2.6vw,28px);overflow-wrap:anywhere}
  .pg-dialog #pg-content > section.pg-empty{
    border:1px solid var(--ui-line);min-height:0;
    row-gap:12px!important;text-align:start!important;
  }
  .pg-dialog #pg-content > section.pg-empty > p{font-size:14px;line-height:1.7;text-wrap:pretty}
  .pg-dialog #pg-content > section.pg-empty > p:first-child{font-size:13px}
  .pg-dialog #pg-content > section.pg-empty > h3{font-size:clamp(20px,2vw,24px);line-height:1.35;font-weight:650;text-wrap:balance}
  .pg-dialog #pg-content > section.pg-empty > button{
    min-height:44px;padding:10px 14px;
    text-align:start;line-height:1.5;text-wrap:pretty;
  }
  .pg-dialog #pg-content > section.pg-empty > button:first-of-type{margin-block-start:4px}
  .pg-dialog .pg-result[aria-selected=true] small,
  .pg-dialog .pg-result[aria-selected=true] > svg{color:#543221}
  .pg-dialog :is(button,a,input):focus-visible{outline:2px solid #f2bb96!important;outline-offset:2px}
  .pg-dialog .pg-search-field:focus-within{outline:2px solid var(--ui-focus);outline-offset:2px}
  .pg-dialog .pg-portal-search .pg-search-field{background:#1f1c27;border-color:#615469;box-shadow:none}
  .pg-dialog .pg-portal-search .pg-search-field input{outline:none!important;box-shadow:none!important}
  .pg-dialog .pg-rhythm-assembly button.pg-rhythm-target{
    background:transparent!important;border:0!important;border-radius:50%!important;box-shadow:none!important
  }
  .pg-dialog .pg-rhythm-assembly button.pg-rhythm-target:focus-visible{outline:2px solid #f2bb96!important;outline-offset:-6px}
  .pg-dialog .pg-game .pg-instrument-copy button.pg-primary{
    background:#f2bb96!important;color:#23180d!important;border-color:#f7d5c0!important
  }
  .pg-dialog .pg-search-field input:focus-visible{outline:none!important}
  .pg-dialog .pg-tabs{min-width:0;overflow-x:auto;scrollbar-width:thin}
  .pg-dialog .pg-tabs::before{display:none}
  .pg-dialog:has(> #bm-depth-canvas) .pg-content{background:transparent!important}
  .pg-dialog .pg-footer[data-deck-active]{background:#25232d!important}
  .pg-dialog [data-deck-active]{background:transparent!important;transform:var(--deck-transform,none)!important}
  .pg-dialog[data-deck-measuring] [data-deck-active]{transform:none!important}
  #bm-depth-canvas{position:fixed;inset:0;width:100vw;height:100dvh;pointer-events:none;z-index:0;display:block}
  `;
  let renderer, scene, camera, canvas, T, boot, frame=0, listed=false, faces=[], modal=null, lost=false, stopped=false;
  let material, physicalKeys, framePool=[], lastWidth=0,lastHeight=0;
  let observer, watched=[], watchedShadow;

  function create(){
    T=B.ThreeRuntime.THREE;
    renderer=new T.WebGLRenderer({alpha:false,antialias:true,powerPreference:'low-power'});
    renderer.toneMapping=T.NoToneMapping;
    canvas=renderer.domElement; canvas.id='bm-depth-canvas'; canvas.setAttribute('aria-hidden','true');
    canvas.addEventListener('webglcontextlost',event=>{
      event.preventDefault();lost=true;
      faces.forEach(node=>node.removeAttribute('data-deck-active'));
      canvas.hidden=true;document.body.dataset.deckEngine='fallback';
    });
    canvas.addEventListener('webglcontextrestored',()=>{
      lost=false;canvas.hidden=false;document.body.dataset.deckEngine='webgl';queue(true);
    });
    scene=new T.Scene();scene.background=new T.Color(0x101017);
    scene.add(new T.HemisphereLight(0xe2d9e9,0x454052,1.27));
    const lamp=new T.DirectionalLight(0xffe1cc,1.03);
    lamp.position.set(-4,8,11);scene.add(lamp);
    const rim=new T.DirectionalLight(0xa19ab8,.68);
    rim.position.set(7,-4,9);scene.add(rim);
    camera=new T.PerspectiveCamera(35,1,5,6500);camera.position.z=length;
    material=new T.MeshStandardMaterial({color:0x22212c,roughness:.50,metalness:.40});
    const keyMaterial=new T.MeshStandardMaterial({color:0x332d3b,roughness:.52,metalness:.27});
    physicalKeys=new T.InstancedMesh(chassis(1,1,1,.21,.07,3),keyMaterial,104);
    physicalKeys.frustumCulled=false;physicalKeys.count=0;
    scene.add(physicalKeys);
    document.body.prepend(canvas);
    document.body.dataset.deckEngine='webgl';
  }
  function chassis(w,h,depth,radius,edge=Math.min(2.1,depth*.17),curve=8){
    const shape=new T.Shape(),x=w/2-edge,y=h/2-edge;
    const r=Math.min(radius,x,y);
    shape.moveTo(-x+r,-y);
    shape.lineTo(x-r,-y);shape.quadraticCurveTo(x,-y,x,-y+r);
    shape.lineTo(x,y-r);shape.quadraticCurveTo(x,y,x-r,y);
    shape.lineTo(-x+r,y);shape.quadraticCurveTo(-x,y,-x,y-r);
    shape.lineTo(-x,-y+r);shape.quadraticCurveTo(-x,-y,-x+r,-y);
    const geometry=new T.ExtrudeGeometry(shape,{depth:depth-2*edge,bevelEnabled:true,
      bevelSize:edge,bevelThickness:edge,bevelSegments:2,curveSegments:curve});
    return geometry.translate(0,0,-depth/2+edge);
  }
  function plate(index,width,height,depth,radius){
    let mesh=framePool[index];
    const w=Math.round(width),h=Math.round(height),signature=`${w}/${h}/${depth}/${radius}`;
    if(!mesh){
      mesh=new T.Mesh(chassis(w,h,depth,radius),material);
      framePool[index]=mesh;scene.add(mesh);
    }else if(mesh.userData.size!==signature){
      mesh.geometry.dispose();
      mesh.geometry=chassis(w,h,depth,radius);
    }
    mesh.userData.size=signature;
    return mesh;
  }
  function lookupModal(){
    const root=document.getElementById('bm-explore-root')?.shadowRoot;
    if(root&&!root.querySelector('[data-deck-shadow]')){
      const style=document.createElement('style');style.dataset.deckShadow='true';style.textContent=modalStyle;root.append(style);
    }
    return root?.querySelector('dialog[open]')||null;
  }
  function refresh(){
    const nextModal=lookupModal();
    if(modal!==nextModal || !canvas.isConnected){
      modal=nextModal;(modal||document.body).prepend(canvas);
    }
    const route=document.body.dataset.bmRoute||'home';
    const primary=route==='home'?document.querySelector('.deck-home'):route.startsWith('engineering/')?document.querySelector('#engineering-root'):document.getElementById('product-root');
    const roots=modal?[modal]:[document.getElementById('pd-header'),primary].filter(Boolean);
    const candidates=new Set(roots.flatMap(root=>[
      ...(root.matches(plateSelectors)?[root]:[]),...root.querySelectorAll(plateSelectors)
    ]));
    const next=[...candidates].filter(node=>{
      for(let parent=node.parentElement;parent;parent=parent.parentElement)if(candidates.has(parent))return false;
      return true;
    });
    for(const node of faces)if(!next.includes(node))node.removeAttribute('data-deck-active');
    faces=next;
    const current=[...roots,...faces];
    for(const node of watched)if(!current.includes(node))observer.unobserve(node);
    for(const node of current)if(!watched.includes(node))observer.observe(node);
    watched=current;
  }
  function size(w,h){
    if(w===lastWidth&&h===lastHeight)return;
    lastWidth=w;lastHeight=h;
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.25,1700/w));
    renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.fov=2*Math.atan(h/(2*length))/rad;camera.updateProjectionMatrix();
  }
  function render(){
    frame=0;if(!renderer||lost||stopped||document.hidden)return;
    if(listed){listed=false;refresh();}
    const w=window.innerWidth,h=window.innerHeight;
    size(w,h);
    const plane=modal||document.body;
    plane.setAttribute('data-deck-measuring','');
    const fixed=modal?.getBoundingClientRect();
    canvas.style.clipPath=fixed?`inset(${Math.max(0,fixed.top)}px ${Math.max(0,w-fixed.right)}px ${Math.max(0,h-fixed.bottom)}px ${Math.max(0,fixed.left)}px)`:'none';
    const minY=fixed?.top??(document.body.classList.contains('pd-home')?0:parseFloat(getComputedStyle(document.getElementById('product-root')).top)||0);
    const frames=faces.map(node=>{
      const rect=node.getBoundingClientRect();
      if(rect.width<50||rect.height<14||rect.top>h+35||rect.bottom<minY-35)return {node,rect,visible:false};
      // Native controls in scroll strips draw their own bevel inside the clip.
      const keys=[...node.querySelectorAll(keySelectors)].filter(el=>!el.closest('.spatial-stage,.pg-gallery-thumbnails,.pg-search-results,.pg-tabs')).map(el=>el.getBoundingClientRect()).filter(r=>r.width>=24&&r.height>=23&&r.bottom>minY&&r.top<h).slice(0,54);
      return {node,rect,keys,visible:true};
    });
    plane.removeAttribute('data-deck-measuring');
    const narrow=w<700;
    const local=new T.Vector3(), face=new T.Vector3(), key=new T.Object3D();
    let n=0,k=0;
    for(const {node,rect,keys,visible} of frames){
      if(!visible){node.removeAttribute('data-deck-active');continue;}
      const x=rect.left+rect.width/2-w/2,y=rect.top+rect.height/2-h/2;
      const dock=node.id==='pd-header'||node.matches('.pg-header,.pg-tabs,.pg-footer');
      const wide=rect.width>w*.73;
      const rx=dock?-2.8:narrow?1.2:wide?2.0:4.0;
      const ry=narrow||dock?0:wide?-0.65:x>0?-2.6:1.5;
      // Keep the projected housing, but square the working surfaces to the screen.
      const nativePlane=node.closest('#product-root,#engineering-root');
      const ax=nativePlane?0:rx*Math.min(1,680/rect.height),ay=nativePlane?0:ry;
      const transform=nativePlane?'none':`translate(${-x.toFixed(2)}px,${-y.toFixed(2)}px) perspective(${length}px) translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotateX(${ax.toFixed(3)}deg) rotateY(${ay.toFixed(3)}deg)`;
      if(node.style.getPropertyValue('--deck-transform')!==transform)node.style.setProperty('--deck-transform',transform);
      if(!node.hasAttribute('data-deck-active'))node.setAttribute('data-deck-active','true');
      const depth=dock?15:narrow?12:24;
      const radius=node.id==='pd-header'||node.closest('.deck-bays')?Math.round(rect.height/2-2):14;
      const surface=plate(n++,rect.width,rect.height,depth,radius);
      surface.visible=true;
      surface.rotation.set(-ax*rad,ay*rad,0,'XYZ');
      face.set(x,-y,0);
      surface.position.copy(local.set(0,0,-depth/2).applyEuler(surface.rotation).add(face));
      for(const r of keys){
        if(k>=104)break;
        local.set(r.left+r.width/2-rect.left-rect.width/2,rect.top+rect.height/2-r.top-r.height/2,-2.1).applyEuler(surface.rotation).add(face);
        key.position.copy(local);key.rotation.copy(surface.rotation);key.scale.set(r.width*.93,r.height*.89,5);
        key.updateMatrix();physicalKeys.setMatrixAt(k++,key.matrix);
      }
    }
    for(let i=n;i<framePool.length;i++)framePool[i].visible=false;
    physicalKeys.count=k;physicalKeys.instanceMatrix.needsUpdate=true;
    canvas.dataset.deckPlates=String(n);
    canvas.dataset.deckKeys=String(k);
    renderer.render(scene,camera);
  }
  function queue(relist=false){
    listed ||= relist;
    if(!frame&&renderer&&!lost&&!stopped)frame=requestAnimationFrame(render);
  }
  function start(){
    document.body.classList.add('bm-deck');
    if(!boot)boot=B.Product.script('assets/ui/three-runtime.js').then(()=>{
      create();observer=new ResizeObserver(()=>queue());queue(true);
    }).catch(()=>{document.body.dataset.deckEngine='fallback';});
    queue(true);
  }
  window.addEventListener('bm:page-ready',start);
  const changes=new MutationObserver(records=>{
    if(records.some(row=>row.type==='attributes'||[...row.addedNodes,...row.removedNodes].some(el=>el.nodeType===1))){
      lookupModal();
      if(!boot && B.Product && document.body.classList.contains('pd-app'))start();
      else queue(true);
    }
  });
  changes.observe(document.body,{attributes:true,attributeFilter:['data-bm-route','data-explore-open'],subtree:true,childList:true});
  const shadowObserver=new MutationObserver(records=>{
    if(records.some(record=>{
      const target=record.target.nodeType===1?record.target:record.target.parentElement;
      return record.type==='attributes'
        ? target?.matches('.pg-dialog[open],.pg-tabs [aria-selected=true]')
        : target?.closest('.pg-tabs');
    })){
      const list=watchedShadow.querySelector('.pg-dialog[open] .pg-tabs');
      const active=list?.querySelector('[aria-selected=true]');
      if(active && list.scrollWidth>list.clientWidth){
        const bounds=list.getBoundingClientRect(), tab=active.getBoundingClientRect();
        const left=tab.left-bounds.left-5, right=tab.right-bounds.right+5;
        if(left<0 || right>0)list.scrollBy({left:left<0?left:right,behavior:'instant'});
      }
    }
    if(records.some(record=>record.type==='childList'||record.attributeName==='open'))queue(true);
  });
  function attachShadow(){
    const root=document.getElementById('bm-explore-root')?.shadowRoot;
    if(!root||root===watchedShadow)return;
    watchedShadow=root;
    shadowObserver.disconnect();
    shadowObserver.observe(root,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['open','aria-selected']});
    root.addEventListener('scroll',()=>queue(),{capture:true,passive:true});
    lookupModal();
  }
  window.addEventListener('load',attachShadow,{once:true});
  document.addEventListener('bm:explore',()=>requestAnimationFrame(attachShadow));
  window.addEventListener('scroll',()=>queue(),{capture:true,passive:true});
  window.addEventListener('resize',()=>queue(true),{passive:true});
  window.addEventListener('hashchange',()=>queue(true));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue(true);});
  window.addEventListener('pagehide',()=>{stopped=true;cancelAnimationFrame(frame);frame=0;});
  window.addEventListener('pageshow',()=>{stopped=false;queue(true);});
})();
