/* One offscreen WebGL surface paints all learning tiles. Controls are native links/buttons. */
(() => {
  'use strict';
  const B=window.BM=window.BM||{};
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let active,graphics,load,frame=0,failed=false;
  const models=new Map();
  const idle=()=>!motion.matches&&!B.flow?.state().preferences.reducedMotion;
  const schedule=()=>{if(!frame&&active?.ready&&!document.hidden&&!failed)frame=requestAnimationFrame(draw);};
  function placeGymZones(tile,camera,gym,width,height){
    const buttons=tile.gym.querySelectorAll('[data-gym-zone-button]');
    const point=new graphics.T.Vector3();
    const rects=[];
    let fits=width>=590;
    for(const button of buttons){
      point.copy(gym.zones[button.dataset.courseFilter].anchor).project(camera);
      const x=(point.x+1)*width/2,y=(1-point.y)*height/2;
      button.style.setProperty('--zone-x',x+'px');
      button.style.setProperty('--zone-y',y+'px');
      const halfWidth=(button.firstElementChild.offsetWidth+button.lastElementChild.offsetWidth+28)/2;
      const halfHeight=button.offsetHeight/2;
      const rect={left:x-halfWidth,right:x+halfWidth,top:y-halfHeight,bottom:y+halfHeight};
      fits&&=rect.left>=6&&rect.right<=width-6&&rect.top>=6&&rect.bottom<=height-6;
      fits&&=!rects.some(other=>rect.left<other.right+5&&rect.right>other.left-5&&rect.top<other.bottom+5&&rect.bottom>other.top-5);
      rects.push(rect);
    }
    tile.gym.toggleAttribute('data-gym-projected',fits);
  }
  function draw(now){
    frame=0;
    if(!active?.ready||document.hidden||failed)return;
    const {T,renderer,scene,camera}=graphics;
    let animate=false;
    for(const tile of active.tiles){
      if(!tile.visible)continue;
      const automatic=!tile.gym&&idle()&&tile===active.feature&&!tile.manual;
      if(!tile.dirty&&(!automatic||now-(tile.lastDraw||0)<42)){animate||=automatic;continue;}
      tile.lastDraw=now;
      const w=Math.round(tile.canvas.clientWidth),h=Math.round(tile.canvas.clientHeight);
      if(!w||!h)continue;
      const scale=Math.min(devicePixelRatio||1,1.65,(tile.gym?1050:680)/w);
      const dw=Math.round(w*scale),dh=Math.round(h*scale);
      if(tile.canvas.width!==dw||tile.canvas.height!==dh){tile.canvas.width=dw;tile.canvas.height=dh;}
      if(renderer.domElement.width!==dw||renderer.domElement.height!==dh)renderer.setSize(dw,dh,false);
      if(!models.has(tile.kind)){
        const object=B.buildSpatialStudio(B.ThreeRuntime,tile.kind);
        const bounds=new T.Box3().setFromObject(object),center=bounds.getCenter(new T.Vector3());
        if(object.userData.gym)center.y-=.85;
        models.set(tile.kind,{object,center,radius:bounds.getSize(new T.Vector3()).length()/2});
      }
      const {object,center,radius}=models.get(tile.kind);
      scene.add(object);
      const yaw=(tile.gym ? .30 : .58)+tile.yaw+(automatic ? .16*Math.sin(now/1800) : 0);
      const pitch=(tile.gym ? .68 : .40)+tile.pitch,aspect=w/h;
      const fit=Math.min(1,aspect/(tile.gym?1.42:1));
      const distance=radius*tile.framing/fit;
      camera.aspect=aspect;
      camera.position.set(center.x+distance*Math.cos(pitch)*Math.sin(yaw),center.y+distance*Math.sin(pitch),center.z+distance*Math.cos(pitch)*Math.cos(yaw));
      camera.lookAt(center);camera.updateProjectionMatrix();
      const gym=object.userData.gym;
      const lighting=gym?.select(tile.gym.dataset.zone,now,idle());
      renderer.render(scene,camera);
      if(gym){
        tile.pickCamera ||= camera.clone();
        tile.pickCamera.copy(camera);
        if(!tile.gym.hasAttribute('data-gym-live')){
          tile.gym.setAttribute('data-gym-live','');
          tile.control.tabIndex=0;
        }
        placeGymZones(tile,camera,gym,w,h);
      }
      tile.ctx.drawImage(renderer.domElement,0,0);
      scene.remove(object);
      tile.canvas.dataset.modelReady='true';
      tile.dirty=Boolean(lighting);animate||=automatic||lighting;
    }
    if(animate)schedule();
  }
  function leave(){
    cancelAnimationFrame(frame);frame=0;
    if(active){active.abort.abort();active.resize.disconnect();active.observe.disconnect();active.selection?.disconnect();active=null;}
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
      const gym=canvas.closest('[data-course-gym]');
      const control=gym?canvas.parentElement:canvas.closest('a,button');
      const ctx=canvas.getContext('2d');
      if(!control||!ctx)continue;
      const kind=canvas.dataset.learningModel;
      let framing=2.90;
      if(control.closest('.pd-learn-destinations'))framing=2.78;
      if(gym)framing=2.34;
      const tile={canvas,ctx,control,kind,gym,framing,yaw:0,pitch:0,dirty:true,visible:false,manual:false};
      tiles.push(tile);resize.observe(canvas);observe.observe(canvas);
      let drag,preventClickUntil=0;
      const refresh=()=>{tile.dirty=true;schedule();};
      const feature=()=>{if(active===state&&!gym){state.feature=tile;refresh();}};
      const tilt=delta=>{tile.pitch=Math.max(-.20,Math.min(gym ? .37 : .60,delta));};
      if(gym){
        state.selection=new MutationObserver(refresh);
        state.selection.observe(gym,{attributes:true,attributeFilter:['data-zone']});
        gym.addEventListener('click',event=>{
          const button=event.target.closest('[data-gym-view]');
          if(!button||!tile.pickCamera)return;
          if(button.dataset.gymView==='reset')tile.yaw=tile.pitch=0;
          else tile.yaw+=Number(button.dataset.gymView)*.32;
          refresh();
        },{signal});
        canvas.addEventListener('click',event=>{
          const model=models.get(kind)?.object.userData.gym;
          if(!model||!tile.pickCamera)return;
          const bounds=canvas.getBoundingClientRect();
          const pointer=new graphics.T.Vector2(
            (event.clientX-bounds.left)/bounds.width*2-1,
            1-(event.clientY-bounds.top)/bounds.height*2
          );
          const ray=new graphics.T.Raycaster();
          ray.setFromCamera(pointer,tile.pickCamera);
          const zone=ray.intersectObjects(model.targets,false)[0]?.object.userData.zone;
          if(zone)gym.querySelector('[data-course-filter="'+zone+'"]').click();
        },{signal});
      }
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
        tile.manual=true;tile.yaw=drag.yaw+dx*.013;tilt(drag.pitch+dy*.008);refresh();
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
        else tilt(tile.pitch+(e.key==='ArrowUp'?.12:-.12));
        refresh();
      },{signal});
    }
    state.feature=tiles.find(tile=>!tile.gym);
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
  const tile=(id,body)=>`<span class="bm-learning-preview"><img src="assets/learning-models/${id}.webp" alt="" loading="lazy" decoding="async"><canvas data-learning-model="${id}" aria-hidden="true"></canvas></span>${body}`;
  function gym(items,selected){
    const {t,E}=B.Product;
    const [all,...zones]=items;
    const button=([key,label,count],inside=false)=>`<button type="button" data-course-filter="${key}" ${inside?'data-gym-zone-button':''} aria-pressed="${key===selected}" aria-controls="pd-course-directory"><span>${E(label)}</span><small>${count}</small></button>`;
    const view=[['-1','↶',t('向左旋转','Rotate left')],['1','↷',t('向右旋转','Rotate right')],['reset','⟲',t('复位视角','Reset view')]];
    return `<figure class="bm-course-gym" data-course-gym data-zone="${selected}" aria-label="${t('3D 健身房','3D gym')}">
      <div class="bm-gym-stage" role="group" aria-label="${t('健身房模型','Gym model')}" aria-describedby="pd-model-hint">
        <img src="assets/learning-models/course-gym.webp" alt="" decoding="async">
        <canvas data-learning-model="course-gym" aria-hidden="true"></canvas>
      </div>
      <div class="bm-gym-zones" role="group" aria-label="${t('训练分区','Training zones')}">${zones.map(zone=>button(zone,true)).join('')}</div>
      <figcaption class="bm-gym-toolbar">
        ${button(all)}
        <p id="pd-model-hint" class="bm-model-hint">${t('点训练区筛选课程，拖动或用方向键旋转。','Select a training zone to filter courses. Drag or use the arrow keys to rotate.')}</p>
        <div class="bm-gym-view" role="group" aria-label="${t('视角','View')}">${view.map(([id,icon,label])=>`<button type="button" data-gym-view="${id}" title="${label}" aria-label="${label}">${icon}</button>`).join('')}</div>
      </figcaption>
    </figure>`;
  }
  const filters=(items,label,attr)=>`<div class="bm-model-filters" role="group" aria-label="${B.Product.E(label)}">${items.map(([value,name,kind,count])=>`<button type="button" ${attr}="${value}" aria-pressed="${value==='all'}" aria-describedby="pd-model-hint">${tile(kind,`<span class="bm-model-label"><strong>${B.Product.E(name)}</strong><small>${count}</small></span>`)}</button>`).join('')}</div>`;
  window.addEventListener('bm:page-ready',e=>{
    if(['learn','learn/courses','learn/experiments'].includes(e.detail.route))mount(document.getElementById('pd-content'));
    else leave();
  });
  motion.addEventListener('change',()=>{for(const tile of active?.tiles||[])tile.dirty=true;schedule();});
  document.addEventListener('visibilitychange',schedule);
  const hint=()=>`<p class="bm-model-hint" id="pd-model-hint">${B.Product.t('点击选择，拖动或用方向键旋转模型。','Select to open or filter. Drag or use the arrow keys to rotate.')}</p>`;
  B.LearningModels={tile,filters,hint,gym,leave};
})();
