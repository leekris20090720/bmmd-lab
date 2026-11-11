/* One on-demand Three renderer travels between the existing BM//MD pages. */
(() => {
  'use strict';
  const B = window.BM = window.BM || {};
  const t = (z,e) => B.i18n?.getLanguage() === 'en' ? e : z;
  const rooms = {
    train: {title:['训练','Train'],note:['计划、重量与每一组','Plans, loads and sets'],route:'train/plans',x:-3.62,z:2.54,yaw:-.42},
    learn: {title:['动作学习','Movement'],note:['人体动作与器械结构','Movement and machine structure'],route:'learn',x:3.62,z:2.54,yaw:.57},
    lab: {title:['力学实验','Mechanics'],note:['改变参数，验证原理','Change a variable and test it'],route:'learn/experiments',x:-3.62,z:-2.54,yaw:-.52},
    interact: {title:['互动展厅','Explore'],note:['转动器械，观察细节','Turn a machine and examine it'],x:3.62,z:-2.54,yaw:1.22}
  };
  const stations = {
    train: [
      ['训练椅','Train now','train/session',[-3.68,.58,3.35]],
      ['记录台','History','train/history',[-1.13,.94,2.92]]
    ],
    learn: [
      ['观察钢索','Cable course','course/arm',[3.33,1.32,3.63]],
      ['动作导图','Movement map','learn/map',[6.08,.93,2.91]]
    ],
    lab: [
      ['有效力臂','Moment arm','experiment/lever',[-3.26,1.88,-2.24]],
      ['滑轮效率','Pulley efficiency','experiment/pulley-efficiency',[-1.16,.96,-2.14]]
    ]
  };
  const roomEntries = {'train/plans':'train','learn':'learn','learn/experiments':'lab'};
  const cameraHome = {x:0,z:0,yaw:.36};
  function door(id, mark=false, trainRoute) {
    const room = rooms[id];
    const attrs = mark ? `class="spatial-marker" data-spatial-marker="${id}" tabindex="-1"` : `data-spatial-door="${id}"`;
    const detail = mark ? '' : `<small>${t(...room.note)}</small>`;
    const body = `<span class="spatial-door-text"><strong>${t(...room.title)}</strong>${detail}</span>${mark?'':'<span class="spatial-arrow" aria-hidden="true">↗</span>'}`;
    return room.route ? `<a ${attrs} href="#${id==='train'&&trainRoute?trainRoute:room.route}">${body}</a>` :
      `<button ${attrs} type="button" data-pd-explore aria-haspopup="dialog">${body}</button>`;
  }
  function stage(view, full, entry=false, trainRoute) {
    const stops = entry ? stations[view] : [];
    const stationLinks = mark => stops.map(([z,e,route],index)=>`<a href="#${route}" ${mark?`class="spatial-marker" data-spatial-station="${index}" tabindex="-1"`:''}>${t(z,e)} ↗</a>`).join('');
    const trace = view==='trace';
    const label = trace ? t('三维实验曲线','3D experiment trace') :
      view==='hall' ? t('力学馆全景','Studio overview') : t(...rooms[view].title);
    return `<figure class="spatial-view ${full?'spatial-view-full':'spatial-view-room'}${entry?' spatial-view-entry':''}" data-spatial-view="${view}" aria-label="${label}">
      <div class="spatial-stage">
        ${trace?'':`<img class="spatial-poster" src="assets/spatial-studio/${view}.webp?v=contour-20261111-1" alt="" width="1080" height="720" decoding="async" ${full?'fetchpriority="high"':''}>`}
        ${full||entry?`<div class="spatial-markers">${full?Object.keys(rooms).map(id=>door(id,true,trainRoute)).join(''):stationLinks(true)}</div>`:''}
      </div>
      <figcaption class="spatial-caption">
        <span>${trace?t('三维曲线 · 橙为当前，浅蓝为对照','3D trace · Amber current, pale blue comparison'):full?t('俯瞰 · 四个区域','Overview · Four rooms'):`<a href="#home" class="spatial-return">${t('← 全馆视图','← Studio overview')}</a>`}</span>
        <span class="spatial-instructions">${t('拖动转动视角','Drag to orbit')}</span>
        <span class="spatial-controls">
          <button type="button" data-spatial-turn="-1" aria-label="${t('向左转','Turn left')}">↶</button>
          <button type="button" data-spatial-turn="1" aria-label="${t('向右转','Turn right')}">↷</button>
          <button type="button" data-spatial-reset>${t('重置视角','Reset view')}</button>
        </span>
      </figcaption>
      ${entry?`<nav class="spatial-station-links" aria-label="${t('区域入口','Room stations')}">${stationLinks(false)}</nav>`:''}
    </figure>`;
  }
  function home(trainRoute) {
    return `<section class="deck-hub" aria-labelledby="bm-spatial-title">
      <header class="deck-hub-title">
        <h1 id="bm-spatial-title" data-heading-renderer="studio">${t('动作力学馆','Movement mechanics')}</h1>
        <p>${t('看懂器械怎样传递力量，记录你完成的每一组。','See how machines transmit force and log the sets you complete.')}</p>
      </header>
      <div class="deck-hub-model">${stage('hall',true,false,trainRoute)}</div>
      <nav class="deck-bays spatial-doors" aria-label="${t('舱室入口','Deck stations')}">
        ${Object.keys(rooms).map(id=>door(id,false,trainRoute)).join('')}
      </nav>
      <footer class="deck-hub-footer"><a href="#settings/data">${t('备份与恢复','Backup and restore')} ↗</a><span>${t('训练记录存于本机','Training records are stored locally')}</span></footer>
    </section>`;
  }
  function header(route) {
    if (/^(course\/|engineering\/)|^learn\/map$/.test(route) || route==='experiment/kinematics') return '';
    if (route.startsWith('experiment/')) return stage('trace',false);
    if (roomEntries[route]) return stage(roomEntries[route],false,true);
    if (route.startsWith('train/')) return stage('train',false);
    if (route.startsWith('learn')) return stage('learn',false);
    if (route.startsWith('settings')) return stage('hall',false);
    return '';
  }

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => motion.matches || document.documentElement.classList.contains('pd-reduced');
  const clamp = (n,lo,hi) => Math.min(hi,Math.max(lo,n));
  let graphics, host, pageHost, galleryHost, listeners, resize, visibility, visible = false, load, failed = false, frame = 0;
  let instrumentStart=0, instrumentSignal={}, instrumentKind;
  let turn=0,pitch=0,shownTurn=0,shownPitch=0,lastDraw=0,previousView,transition,lost=false,traceData,markers=[];
  const stop = () => { cancelAnimationFrame(frame); frame=0; };
  function createGraphics() {
    const T = B.ThreeRuntime.THREE;
    const renderer = new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
    const scene = new T.Scene();
    B.lightSpatialScene(T,renderer,scene);
    const model = B.buildSpatialStudio(B.ThreeRuntime), trace = B.buildSpatialTrace(T);
    scene.add(model.world,trace.world);
    const camera = new T.PerspectiveCamera(34,1,.12,100);
    const canvas = renderer.domElement;
    canvas.className='spatial-canvas';
    canvas.tabIndex=0;
    canvas.setAttribute('role','img');
    canvas.addEventListener('webglcontextlost',event=>{
      event.preventDefault(); lost=true; stop();
      host?.removeAttribute('data-spatial-ready');
      host?.setAttribute('data-spatial-unavailable','true');
    });
    canvas.addEventListener('webglcontextrestored',()=>{
      lost=false; host?.removeAttribute('data-spatial-unavailable'); drawSoon();
    });
    return {T,renderer,scene,model,trace,camera,canvas,point:new T.Vector3(),look:new T.Vector3(),ray:new T.Raycaster()};
  }
  function pose() {
    const {T,camera} = graphics;
    const view=host.dataset.spatialView,isTrace=view==='trace',isExhibit=view==='exhibit',isInstrument=view==='instrument';
    if(isInstrument&&instrumentKind==='pulse'){
      const y=1.55,z=6.45*Math.max(1,1/camera.aspect);
      return {center:new T.Vector3(0,y,0),position:new T.Vector3(0,y,z)};
    }
    const layout = isTrace || isExhibit || isInstrument ? {x:0,z:0,yaw:.42} : rooms[view] || cameraHome;
    const isHall = view==='hall';
    const compact = host.classList.contains('spatial-view-room');
    const preview=host.classList.contains('pg-model');
    const radius=(isHall?(compact?30:21.4):isTrace?8.05:isInstrument?6.65:isExhibit?7.85:9.2)
      * Math.max(1,(isHall?1.46:preview?1:1.25)/camera.aspect);
    const compassView=isInstrument&&instrumentKind==='compass';
    const angle=(compassView?.26:layout.yaw)+shownTurn;
    const elevation = clamp((isHall?.56:isTrace?.29:isExhibit?.37:isInstrument?compassView?.63:.34:.47)+shownPitch,.22,1.26);
    const center = new T.Vector3(layout.x,isHall?.53:isTrace?1.14:isInstrument?compassView?.46:1.05:.89,layout.z);
    const ground = radius*Math.cos(elevation);
    const position = new T.Vector3(center.x+ground*Math.sin(angle),center.y+radius*Math.sin(elevation),center.z+ground*Math.cos(angle));
    return {center,position};
  }
  function draw(now) {
    frame=0;
    if (!host || !graphics || !visible || document.hidden || lost) return;
    const {renderer,scene,camera,model,trace,point,look}=graphics;
    const dt=lastDraw?Math.min(45,now-lastDraw):17;
    lastDraw=now;
    const relax=reduced()?1:1-Math.exp(-dt/43);
    shownTurn=Math.abs(turn-shownTurn)<.002?turn:shownTurn+(turn-shownTurn)*relax;
    shownPitch=Math.abs(pitch-shownPitch)<.002?pitch:shownPitch+(pitch-shownPitch)*relax;
    const isTrace=host.dataset.spatialView==='trace';
    model.world.visible=!isTrace;
    if(isTrace && traceData?.route===document.body.dataset.bmRoute)trace.update(...traceData.args);
    else trace.world.visible=false;
    const isScanner=host.dataset.spatialView==='instrument'&&instrumentKind==='scanner';
    const scanFraction=isScanner&&!reduced()?clamp((now-instrumentStart)/1700,0,1):.55;
    if(host.dataset.spatialView==='instrument')model.updateInstrument(instrumentSignal,reduced(),scanFraction);
    const target = pose();
    if (transition && !reduced()) {
      const time = clamp((now-transition.start)/660,0,1), ease=1-Math.pow(1-time,3);
      camera.position.lerpVectors(transition.position,target.position,ease);
      look.lerpVectors(transition.center,target.center,ease);
      if (time===1) transition=null;
    } else {
      transition=null; camera.position.copy(target.position); look.copy(target.center);
    }
    camera.lookAt(look); camera.updateMatrixWorld();
    renderer.render(scene,camera);
    for(const marker of markers){
      const anchor=model.anchors[marker.dataset.spatialMarker];
      if(anchor)point.copy(anchor);
      else point.fromArray(stations[host.dataset.spatialView][Number(marker.dataset.spatialStation)][3]);
      point.project(camera);
      marker.style.setProperty('--spatial-x',`${((point.x+1)*.5*graphics.width).toFixed(1)}px`);
      marker.style.setProperty('--spatial-y',`${((1-point.y)*.5*graphics.height).toFixed(1)}px`);
      marker.hidden = Math.abs(point.x)>.91 || Math.abs(point.y)>.91 || point.z>1;
    }
    host.setAttribute('data-spatial-ready','true');
    if(transition||shownTurn!==turn||shownPitch!==pitch||(isScanner&&!reduced()&&scanFraction<1))drawSoon();
  }
  function drawSoon() {
    if(!frame && host && visible && !document.hidden && !lost) frame=requestAnimationFrame(draw);
  }
  function fit() {
    if(!host || !graphics) return;
    const stage=host.querySelector('.spatial-stage');
    const width=stage.clientWidth,height=stage.clientHeight;
    if(!width || !height) return;
    const {renderer,camera}=graphics;
    if(width!==graphics.width||height!==graphics.height){
      graphics.width=width;graphics.height=height;
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.40,Math.sqrt(690000/(width*height))));
      renderer.setSize(width,height,false);
      camera.aspect=width/height;camera.updateProjectionMatrix();
    }
    drawSoon();
  }
  function restoreView() { turn=0; pitch=0; transition=null; drawSoon(); }
  function selectRoom(id) { graphics.model.select(id); drawSoon(); }
  function bind(canvas, signal) {
    const controls = host.querySelector('.spatial-controls');
    controls?.addEventListener('click',event=>{
      const button=event.target.closest('button');
      if(!button)return;
      if(button.hasAttribute('data-spatial-reset'))restoreView();
      else { transition=null; turn+=.34*Number(button.dataset.spatialTurn); drawSoon(); }
    },{signal});
    canvas.addEventListener('keydown',event=>{
      const directions={ArrowLeft:[-.16,0],ArrowRight:[.16,0],ArrowUp:[0,.09],ArrowDown:[0,-.09]};
      if(event.key==='Home'){event.preventDefault();restoreView();return;}
      const shift=directions[event.key];
      if(!shift)return;
      event.preventDefault(); transition=null;
      turn+=shift[0]; pitch=clamp(pitch+shift[1],-.55,.65); drawSoon();
    },{signal});
    let drag;
    canvas.addEventListener('pointerdown',event=>{
      if (!event.isPrimary || event.button!==0) return;
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
      canvas.setPointerCapture(event.pointerId);
    },{signal});
    canvas.addEventListener('pointermove',event=>{
      if(drag?.id!==event.pointerId)return;
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if(!drag.moved && Math.hypot(dx,dy)<5)return;
      drag.moved=true; drag.x=event.clientX; drag.y=event.clientY;
      transition=null; turn-=dx*.007; pitch=clamp(pitch+dy*.006,-.55,.65);
      drawSoon();
    },{signal});
    canvas.addEventListener('pointercancel',()=>{drag=null;},{signal});
    canvas.addEventListener('pointerup',event=>{
      if(drag?.id!==event.pointerId)return;
      const open = !drag.moved && host.classList.contains('spatial-view-full');
      drag=null;
      if(!open)return;
      const {T,ray,camera,model}=graphics;
      const rect=canvas.getBoundingClientRect();
      ray.setFromCamera(new T.Vector2((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2),camera);
      const hit=ray.intersectObjects(Object.values(model.tiles),false)[0];
      if(hit)host.closest('.deck-hub').querySelector(`[data-spatial-door="${hit.object.name}"]`)?.click();
    },{signal});
    const entry = host.closest('.deck-hub');
    if(!entry)return;
    for(const control of entry.querySelectorAll('[data-spatial-door],[data-spatial-marker]')){
      const id=control.dataset.spatialDoor || control.dataset.spatialMarker;
      control.addEventListener('pointerenter',()=>selectRoom(id),{signal});
      control.addEventListener('pointerleave',()=>selectRoom(null),{signal});
      control.addEventListener('focus',()=>selectRoom(id),{signal});
      control.addEventListener('blur',()=>selectRoom(null),{signal});
    }
  }
  function detach() {
    stop(); listeners?.abort(); resize?.disconnect(); visibility?.disconnect();
    if(host)host.removeAttribute('data-spatial-ready');
    graphics?.canvas.remove(); host=null; visible=false; transition=null;
  }
  async function mount(next) {
    if(next===host)return;
    detach(); if(!next)return;
    if(failed){next.setAttribute('data-spatial-unavailable','true');return;}
    host=next;
    listeners=new AbortController();
    const {signal}=listeners;
    try {
      // The shared loader also serves courses and engineering. Only fetch it once.
      load ||= B.Product.script('assets/ui/three-runtime.js');
      await load;
      if(signal.aborted)return;
      graphics ||= createGraphics();
      const {canvas,camera,look,model}=graphics;
      const view=next.dataset.spatialView;
      if(previousView && previousView!==view && ![previousView,view].some(key=>key==='trace'||key==='exhibit'||key==='instrument')){
        transition={start:performance.now(),position:camera.position.clone(),center:look.clone()};
      }
      previousView=view; turn=shownTurn=0; pitch=shownPitch=0; lastDraw=0;
      markers=[...next.querySelectorAll('[data-spatial-marker],[data-spatial-station]')];
      model.select(view);
      updateGallery(next);
      const passive=next.dataset.spatialPassive==='true';
      canvas.tabIndex=passive?-1:0;
      canvas.setAttribute('aria-label',next.dataset.spatialLabel||t('立体视图，方向键转动，Home 键复位','3D view. Arrow keys rotate, Home resets.'));
      next.querySelector('.spatial-stage').prepend(canvas);
      if(!passive)bind(canvas,signal);
      resize=new ResizeObserver(fit);resize.observe(next.querySelector('.spatial-stage'));
      visibility=new IntersectionObserver(([entry])=>{
        visible=entry.isIntersecting;
        if(visible){fit();drawSoon();}else stop();
      });
      visibility.observe(next);
      fit();
    } catch(error) {
      if(!signal.aborted){ failed=true; next.setAttribute('data-spatial-unavailable','true'); detach(); }
    }
  }
  function currentHost() {
    mount(galleryHost?.isConnected ? galleryHost : pageHost?.isConnected ? pageHost : null);
  }
  function updateGallery(element) {
    const {model,canvas}=graphics,view=element.dataset.spatialView;
    model.show(view);
    if(view==='exhibit')model.showExhibit(element.dataset.spatialVariant);
    instrumentKind=view==='instrument'?element.dataset.spatialVariant:undefined;
    if(instrumentKind){
      instrumentStart=performance.now();
      instrumentSignal={};
      model.showInstrument(instrumentKind);
    }
    if(element.dataset.spatialLabel)canvas.setAttribute('aria-label',element.dataset.spatialLabel);
  }
  function gallery(element) {
    galleryHost=element;
    if(host===element && graphics && element){
      updateGallery(element);
      restoreView();
    }else currentHost();
  }
  function releaseGallery(element){if(galleryHost===element)gallery(null);}
  function pulse(element,scale,near,beat){
    if(host!==element)return;
    if(instrumentSignal.scale===scale&&instrumentSignal.near===near&&instrumentSignal.beat===beat)return;
    instrumentSignal={scale,near,beat};
    drawSoon();
  }
  window.addEventListener('bm:page-ready',event=>{
    const route=event.detail.route;
    const root=document.getElementById(route==='home'?'portal-welcome-stage':'product-root');
    pageHost=root?.querySelector('[data-spatial-view]');
    currentHost();
  });
  new MutationObserver(()=>{
    if(host && !host.isConnected)currentHost();
    if(host===pageHost && host && (document.body.dataset.bmRoute==='home')!==host.classList.contains('spatial-view-full')){
      pageHost=null; currentHost();
    }
  }).observe(document.body,{attributes:true,attributeFilter:['data-bm-route']});
  motion.addEventListener('change',drawSoon);
  document.addEventListener('visibilitychange',()=>{ if(document.hidden)stop(); else drawSoon(); });
  window.addEventListener('pagehide',event=>{if(event.persisted)stop();else detach();});
  window.addEventListener('pageshow',event=>{if(event.persisted)drawSoon();});
  function updateExperiment(rows,reference,x,y) {
    traceData={route:document.body.dataset.bmRoute,args:[rows,reference,x,y]};
    if(host?.dataset.spatialView==='trace')drawSoon();
  }
  B.SpatialStudio={home,header,gallery,releaseGallery,pulse,updateExperiment};
})();
