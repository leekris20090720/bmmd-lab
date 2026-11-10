/* WebGL console chassis. Native controls are projected onto the same camera plane. */
(() => {
  'use strict';
  const B=window.BM=window.BM||{};
  const length=1320;
  const rad=Math.PI/180;
  const plateSelectors=[
    '[data-deck-plate]','.deck-hub-model','.deck-bays > *','#pd-header','.pd-subnav',
    '#pd-content > :is(section,article,form,.pd-plan,.pd-doors,.pd-course-directory,.ex-library-controls)',
    '.pd-ex-layout > *','.pd-course-workspace > *','.ex-topic',
    '#pd-content > div:not(.pd-ex-layout,.pd-course-workspace,.pd-plot-grid,.ex-library-topics)',
    '#engineering-root :is(.eng-top,.eng-heading,.eng-models,.eng-hero,.eng-stage,.eng-parameters,.eng-position,.eng-panel,.eng-graph,.eng-observe,.eng-layout > *,.did-lab-header,.did-detailed-readouts)',
    '.pg-header','.pg-tabs','.pg-content > :not(.pg-gallery)',
    '.pg-gallery :is(.pg-gallery-intro,.pg-gallery-filters,.pg-gallery-display,.pg-gallery-navigation)','.pg-footer'
  ].join(',');
  const keySelectors='button,a.pd-button,nav a,summary,[role=tab],input:not([type=range],[type=checkbox],[type=radio],[type=file]),select,textarea';
  const modalStyle=`
  :host{--ui-bg:#0b111b;--ui-surface:#182337;--ui-surface-subtle:#1d2a40;--ui-text:#eff4ff;--ui-muted:#b9c9df;--ui-line:#596b89;--ui-accent:#ffc285;--ui-primary-bg:#ffc285;--ui-primary-text:#1b130b;--ui-focus:#ffd0a0;font-family:"BM Inter",Inter,system-ui,sans-serif}
  .pg-dialog{background:#0b111b!important;border:1px solid #657999!important;border-radius:2px!important;color:#eff4ff!important}
  .pg-dialog::backdrop{background:#04070de8!important;backdrop-filter:none!important}
  .pg-shell{position:relative;z-index:1;background:transparent!important}
  .pg-ambient,.ref-light,.ref-edge,.ref-glare,.ref-beam,.pg-gallery-ambient,.pg-gallery-ring{display:none!important}
  .pg-header,.pg-tabs,.pg-content,.pg-footer,.pg-gallery-display,.pg-gallery-info,.pg-gallery-stage,.pg-game,.pg-choice,.pg-wave-choice,.pg-empty,.pg-result{background:#141f31!important;border-color:#536684!important;border-radius:2px!important;box-shadow:none!important}
  .pg-gallery-stage{background:#0b121d!important}
  .pg-dialog button{background:#26344d!important;color:#eff4ff!important;border:1px solid #627596!important;border-radius:2px!important;box-shadow:0 3px 0 #080d16!important}
  .pg-dialog button:is([aria-selected=true],[aria-pressed=true],.pg-gallery-primary){background:#ffc285!important;color:#23180d!important;border-color:#ffd9aa!important}
  .pg-dialog :is(button,a,input):focus-visible{outline:2px solid #ffc285!important;outline-offset:2px}
  .pg-dialog .pg-tabs::before{display:none}
  .pg-dialog:has(> #bm-depth-canvas) .pg-content{background:transparent!important}
  .pg-dialog .pg-footer[data-deck-active]{background:#182337!important}
  .pg-dialog [data-deck-active]{background:transparent!important;transform:var(--deck-transform,none)!important}
  .pg-dialog[data-deck-measuring] [data-deck-active]{transform:none!important}
  #bm-depth-canvas{position:fixed;inset:0;width:100vw;height:100dvh;pointer-events:none;z-index:0;display:block}
  `;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)');
  let renderer, scene, camera, canvas, T, boot, frame=0, listed=false, faces=[], modal=null, lost=false, stopped=false;
  let material, keyMaterial, trimMaterial, frameMaterial, box, boltGeometry, framePool=[], keyPool=[], structure, lastWidth=0,lastHeight=0;
  let observer, watched=[], watchedShadow;
  const G=window.gsap;
  let animation;
  const tilt={x:0,y:0};
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
    scene=new T.Scene();scene.background=new T.Color(0x0a101b);
    scene.add(new T.HemisphereLight(0xd4e7ff,0x32405c,1.45));
    const lamp=new T.DirectionalLight(0xffd9ac,1.15);
    lamp.position.set(-4,8,11);scene.add(lamp);
    const rim=new T.DirectionalLight(0x638ff6,1.1);
    rim.position.set(8,-4,9);scene.add(rim);
    camera=new T.PerspectiveCamera(35,1,5,6500);camera.position.z=length;
    box=new T.BoxGeometry(1,1,1);
    boltGeometry=new T.CylinderGeometry(2.2,2.5,1.4,12).rotateX(Math.PI/2);
    const mat=(color,metalness=.18)=>new T.MeshStandardMaterial({color,roughness:.7,metalness});
    material=mat(0x111a2b);
    keyMaterial=mat(0x25344f,.30);
    frameMaterial=mat(0x344665,.46);
    trimMaterial=new T.MeshBasicMaterial({color:0xb7794b});
    structure=new T.Group();scene.add(structure);
    const rail=mat(0x101d31,.31);
    for(let i=0;i<7;i++)structure.add(new T.Mesh(box,rail));
    document.body.prepend(canvas);
    document.body.dataset.deckEngine='webgl';
  }
  function plate(index){
    if(framePool[index])return framePool[index];
    const group=new T.Group();
    const body=new T.Mesh(box,material),lip=new T.Mesh(box,frameMaterial),trim=new T.Mesh(box,trimMaterial);
    const rail=new T.Mesh(box,frameMaterial);
    const bolts=Array.from({length:4},()=>new T.Mesh(boltGeometry,frameMaterial));
    group.add(body,lip,trim,rail,...bolts);scene.add(group);
    return framePool[index]={group,body,lip,trim,rail,bolts};
  }
  function key(index){
    if(keyPool[index])return keyPool[index];
    const mesh=new T.Mesh(box,keyMaterial);scene.add(mesh);keyPool[index]=mesh;return mesh;
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
    structure.children.forEach((mesh,i)=>{
      if(i<5){mesh.position.set((i-2)*(w*.245),0,-170);mesh.scale.set(i%2?6:26,h*1.4,20);}
      else{mesh.position.set(0,(i===5?-.32:.33)*h,-165);mesh.scale.set(w*1.4,i===5?15:7,22);}
    });
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
      const keys=[...node.querySelectorAll(keySelectors)].filter(el=>!el.closest('.spatial-stage')).map(el=>el.getBoundingClientRect()).filter(r=>r.width>=24&&r.height>=23&&r.bottom>minY&&r.top<h).slice(0,54);
      return {node,rect,keys,visible:true};
    });
    plane.removeAttribute('data-deck-measuring');
    const narrow=w<700, motionDisabled=reduce.matches||document.documentElement.classList.contains('pd-reduced');
    let n=0,k=0;
    for(const {node,rect,keys,visible} of frames){
      if(!visible){node.removeAttribute('data-deck-active');continue;}
      const x=rect.left+rect.width/2-w/2,y=rect.top+rect.height/2-h/2;
      const dock=node.id==='pd-header'||node.matches('.pd-subnav,.pg-header,.pg-tabs,.pg-footer');
      const wide=rect.width>w*.73;
      const rx=dock?-6:narrow?3.8:wide?4.5:7.5;
      const ry=narrow||dock?0:wide?-1.3:x>0?-5.6:3.1;
      const scale=Math.min(1,720/rect.height);
      const ax=(rx+(motionDisabled?0:tilt.y))*scale,ay=ry+(motionDisabled?0:tilt.x);
      const transform=`translate(${-x.toFixed(2)}px,${-y.toFixed(2)}px) perspective(${length}px) translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotateX(${ax.toFixed(3)}deg) rotateY(${ay.toFixed(3)}deg)`;
      if(node.style.getPropertyValue('--deck-transform')!==transform)node.style.setProperty('--deck-transform',transform);
      node.setAttribute('data-deck-active','true');
      const {group,body,lip,trim,rail,bolts}=plate(n++);
      group.visible=true;group.position.set(x,-y,0);group.rotation.set(-ax*rad,ay*rad,0,'XYZ');
      const depth=dock?28:narrow?29:42;
      body.position.z=-depth/2;body.scale.set(rect.width,rect.height,depth);
      lip.position.set(0,0,-.9);lip.scale.set(rect.width+3,rect.height+3,2);
      trim.position.set(-rect.width/2+22,rect.height/2+1,0);trim.scale.set(29,2.2,2.2);
      rail.position.set(0,-rect.height/2,-depth*.69);rail.scale.set(rect.width-3,2.1,5.5);
      for(const [i,bolt] of bolts.entries()){
        bolt.position.set((i%2?1:-1)*(rect.width/2-5),(i>1?1:-1)*(rect.height/2-5),.12);
        bolt.visible=rect.height>=44;
      }
      // This second plane is a screen, sitting proud of the machined edge.
      const p=new T.Vector3();
      for(const r of keys){
        if(k>=104)break;
        const item=key(k++);
        item.visible=true;item.scale.set(r.width+2,r.height+3,7);
        p.set(r.left+r.width/2-rect.left-rect.width/2,rect.top+rect.height/2-r.top-r.height/2,-1).applyEuler(group.rotation).add(group.position);
        item.position.copy(p);item.rotation.copy(group.rotation);
      }
    }
    framePool.slice(n).forEach(p=>p.group.visible=false);
    keyPool.slice(k).forEach(p=>p.visible=false);
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
      lookupModal();queue(true);
    }
  });
  changes.observe(document.body,{attributes:true,attributeFilter:['data-bm-route','data-explore-open'],subtree:true,childList:true});
  const shadowObserver=new MutationObserver(()=>queue(true));
  function attachShadow(){
    const root=document.getElementById('bm-explore-root')?.shadowRoot;
    if(!root||root===watchedShadow)return;
    watchedShadow=root;
    shadowObserver.disconnect();
    shadowObserver.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
    root.addEventListener('scroll',()=>queue(),{capture:true,passive:true});
    lookupModal();
  }
  window.addEventListener('load',attachShadow,{once:true});
  document.addEventListener('bm:explore',()=>requestAnimationFrame(attachShadow));
  window.addEventListener('scroll',()=>queue(),{capture:true,passive:true});
  window.addEventListener('resize',()=>queue(true),{passive:true});
  window.addEventListener('hashchange',()=>queue(true));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue(true);});
  reduce.addEventListener('change',()=>queue(true));
  document.addEventListener('pointermove',event=>{
    if(!G||!renderer||reduce.matches||document.documentElement.classList.contains('pd-reduced')||event.pointerType!=='mouse'||event.buttons)return;
    const x=(event.clientX/innerWidth-.5)*1.7,y=(.5-event.clientY/innerHeight)*1.2;
    if(Math.abs(x-tilt.x)+Math.abs(y-tilt.y)<.11)return;
    animation?.kill();
    animation=G.to(tilt,{x,y,duration:.30,ease:'power2.out',onUpdate:()=>queue()});
  },{passive:true});
  window.addEventListener('pagehide',()=>{stopped=true;cancelAnimationFrame(frame);frame=0;animation?.kill();});
  window.addEventListener('pageshow',()=>{stopped=false;queue(true);});
})();
