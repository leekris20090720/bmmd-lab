/* One offscreen WebGL surface paints all learning tiles. Controls are native links/buttons. */
(() => {
  'use strict';
  const B=window.BM=window.BM||{};
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let active,graphics,load,frame=0,failed=false;
  const models=new Map();
  const idle=()=>!motion.matches&&!B.flow?.state().preferences.reducedMotion;
  const schedule=()=>{if(!frame&&active?.ready&&!document.hidden&&!failed)frame=requestAnimationFrame(draw);};
  function draw(now){
    frame=0;
    if(!active?.ready||document.hidden||failed)return;
    const {T,renderer,scene,camera}=graphics;
    let animate=false;
    for(const tile of active.tiles){
      if(!tile.visible)continue;
      const automatic=idle()&&tile===active.feature&&!tile.manual;
      if(!tile.dirty&&(!automatic||now-(tile.lastDraw||0)<42)){animate||=automatic;continue;}
      tile.lastDraw=now;
      const w=Math.round(tile.canvas.clientWidth),h=Math.round(tile.canvas.clientHeight);
      if(!w||!h)continue;
      const scale=Math.min(devicePixelRatio||1,1.65,680/w);
      const dw=Math.round(w*scale),dh=Math.round(h*scale);
      if(tile.canvas.width!==dw||tile.canvas.height!==dh){tile.canvas.width=dw;tile.canvas.height=dh;}
      if(renderer.domElement.width!==dw||renderer.domElement.height!==dh)renderer.setSize(dw,dh,false);
      if(!models.has(tile.kind)){
        const object=B.buildSpatialStudio(B.ThreeRuntime,tile.kind);
        const bounds=new T.Box3().setFromObject(object),center=bounds.getCenter(new T.Vector3());
        models.set(tile.kind,{object,center,radius:bounds.getSize(new T.Vector3()).length()/2});
      }
      const {object,center,radius}=models.get(tile.kind);
      scene.add(object);
      const yaw=.58+tile.yaw+(automatic ? .16*Math.sin(now/1800) : 0);
      const pitch=.40+tile.pitch,aspect=w/h;
      const fit=Math.min(1,aspect);
      const distance=radius*(tile.large?2.78:2.90)/fit;
      camera.aspect=aspect;
      camera.position.set(center.x+distance*Math.cos(pitch)*Math.sin(yaw),center.y+distance*Math.sin(pitch),center.z+distance*Math.cos(pitch)*Math.cos(yaw));
      camera.lookAt(center);camera.updateProjectionMatrix();
      renderer.render(scene,camera);
      tile.ctx.drawImage(renderer.domElement,0,0);
      scene.remove(object);
      tile.canvas.dataset.modelReady='true';
      tile.dirty=false;animate||=automatic;
    }
    if(animate)schedule();
  }
  function leave(){
    cancelAnimationFrame(frame);frame=0;
    if(active){active.abort.abort();active.resize.disconnect();active.observe.disconnect();active=null;}
  }
  function mount(root){
    leave();
    const canvases=[...root.querySelectorAll('[data-learning-model]')];
    if(!canvases.length||failed)return;
    const abort=new AbortController(),{signal}=abort,tiles=[];
    const resize=new ResizeObserver(entries=>{for(const {target} of entries){const tile=tiles.find(tile=>tile.canvas===target);if(tile)tile.dirty=true;}schedule();});
    const observe=new IntersectionObserver(entries=>{for(const {target,isIntersecting} of entries){const tile=tiles.find(tile=>tile.canvas===target);if(tile){tile.visible=isIntersecting;tile.dirty=true;}}schedule();});
    const state={abort,resize,observe,tiles,feature:null,ready:false};
    active=state;
    for(const canvas of canvases){
      const control=canvas.closest('a,button');
      const ctx=canvas.getContext('2d');
      if(!control||!ctx)continue;
      const tile={canvas,ctx,control,kind:canvas.dataset.learningModel,yaw:0,pitch:0,dirty:true,visible:false,manual:false,large:!!control.closest('.pd-learn-destinations')};
      tiles.push(tile);resize.observe(canvas);observe.observe(canvas);
      let drag,preventClickUntil=0;
      const refresh=()=>{tile.dirty=true;schedule();};
      const feature=()=>{if(active===state){state.feature=tile;refresh();}};
      control.addEventListener('focus',feature,{signal});
      control.addEventListener('pointerenter',feature,{signal});
      control.addEventListener('pointerdown',()=>{preventClickUntil=0;},{capture:true,signal});
      canvas.addEventListener('pointerdown',e=>{
        if(!e.isPrimary||e.button!==0||!canvas.dataset.modelReady)return;
        drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:tile.yaw,pitch:tile.pitch,moved:false};
      },{signal});
      control.addEventListener('pointermove',e=>{
        if(drag?.id!==e.pointerId)return;
        const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
        if(!drag.moved){
          if(e.pointerType==='touch'&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>6){drag=null;return;}
          if(Math.hypot(dx,dy)<6)return;
          drag.moved=true;control.setPointerCapture(e.pointerId);
        }
        tile.manual=true;tile.yaw=drag.yaw+dx*.013;tile.pitch=Math.max(-.20,Math.min(.60,drag.pitch+dy*.008));refresh();
      },{signal});
      const end=e=>{if(drag?.id!==e.pointerId)return;if(drag.moved)preventClickUntil=performance.now()+500;drag=null;};
      control.addEventListener('pointerup',end,{signal});
      control.addEventListener('pointercancel',end,{signal});
      control.addEventListener('lostpointercapture',end,{signal});
      control.addEventListener('click',e=>{
        if(e.detail&&performance.now()<preventClickUntil){e.preventDefault();e.stopImmediatePropagation();preventClickUntil=0;}
      },{capture:true,signal});
      control.addEventListener('keydown',e=>{
        if(!canvas.dataset.modelReady||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;
        e.preventDefault();tile.manual=true;
        if(e.key==='Home'){tile.yaw=0;tile.pitch=0;}
        else if(e.key==='ArrowLeft'||e.key==='ArrowRight')tile.yaw+=e.key==='ArrowLeft'?-.25:.25;
        else tile.pitch=Math.max(-.20,Math.min(.60,tile.pitch+(e.key==='ArrowUp'?.12:-.12)));
        refresh();
      },{signal});
    }
    state.feature=tiles[0];
    (load||=B.Product.script('assets/ui/three-runtime.js')).then(()=>{
      if(signal.aborted)return;
      if(!graphics){
        const T=B.ThreeRuntime.THREE,renderer=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'}),scene=new T.Scene();
        B.lightSpatialScene(T,renderer,scene);
        renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;cancelAnimationFrame(frame);frame=0;});
        renderer.domElement.addEventListener('webglcontextrestored',()=>{failed=false;for(const tile of active?.tiles||[])tile.dirty=true;schedule();});
        graphics={T,renderer,scene,camera:new T.PerspectiveCamera(35,1,.05,100)};
      }
      state.ready=true;schedule();
    }).catch(()=>{load=null;if(!signal.aborted)leave();});
  }
  const tile=(id,body)=>`<span class="bm-learning-preview"><img src="assets/learning-models/${id}.webp" alt="" decoding="async"><canvas data-learning-model="${id}" aria-hidden="true"></canvas></span>${body}`;
  const filters=(items,label,attr)=>`<div class="bm-model-filters" role="group" aria-label="${B.Product.E(label)}">${items.map(([value,name,kind,count])=>`<button type="button" ${attr}="${value}" aria-pressed="${value==='all'}" aria-describedby="pd-model-hint">${tile(kind,`<span class="bm-model-label"><strong>${B.Product.E(name)}</strong><small>${count}</small></span>`)}</button>`).join('')}</div>`;
  window.addEventListener('bm:page-ready',e=>{
    if(['learn','learn/courses','learn/experiments'].includes(e.detail.route))mount(document.getElementById('pd-content'));
    else leave();
  });
  motion.addEventListener('change',()=>{for(const tile of active?.tiles||[])tile.dirty=true;schedule();});
  document.addEventListener('visibilitychange',schedule);
  const hint=()=>`<p class="bm-model-hint" id="pd-model-hint">${B.Product.t('点击选择，拖动或用方向键旋转模型。','Select to open or filter. Drag or use the arrow keys to rotate.')}</p>`;
  B.LearningModels={tile,filters,hint,leave};
})();
