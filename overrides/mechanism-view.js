/* One demand-driven renderer serves the teaching preview and the experiment workbench. */
(() => {
  'use strict';
  const B = window.BM;
  let current, graphics, pending = 0, unavailable = false;
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
  const t = (zh,en)=>B.Product.t(zh,en);
  const legends={
    direction:[['copper','钢索拉力','Cable force'],['teal','水平分量','Horizontal component']],
    lever:[['copper','作用力','Applied force'],['teal','垂直力臂','Moment arm']],
    'force-balance':[['teal','第一股力','First force'],['copper','第二股力','Second force'],['silver','合力','Resultant']],
    incline:[['copper','外力','Applied force'],['gold','重力','Gravity'],['silver','支持力','Normal force'],['teal','摩擦力','Friction']],
    'base-stability':[['copper','水平拉力','Horizontal pull'],['teal','支撑反力','Support reaction']],
    'cable-lateral':[['copper','拉力方向','Force direction'],['teal','肩部有效力臂','Shoulder moment arm']],
    'leg-tempo':[['copper','滚垫阻力','Roller resistance'],['gold','小腿重力','Shank weight']]
  };

  function initialize() {
    const T=B.ThreeRuntime.THREE;
    const canvas=document.createElement('canvas');
    const context=canvas.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'low-power'});
    if(!context)return null;
    const renderer=new T.WebGLRenderer({canvas,context});
    const scene=new T.Scene(), world=new T.Group();
    const camera=new T.PerspectiveCamera(33,1,.10,50);
    const material=(color,metalness,roughness)=>new T.MeshStandardMaterial({color,metalness,roughness});
    const solid=color=>new T.MeshBasicMaterial({color});
    B.lightSpatialScene(T,renderer,scene);
    scene.add(world);
    canvas.tabIndex=0;
    canvas.setAttribute('role','img');
    canvas.addEventListener('webglcontextlost',event=>{
      event.preventDefault();
      unavailable=true;
      if(current&&current.mode!=='2d')current.wrapper.dataset.mechanismMode='fallback';
    });
    canvas.addEventListener('webglcontextrestored',()=>{
      unavailable=false;
      if(current)queue();
    });
    const palette={
      graphite:material(0x44444e,.72,.29), chrome:material(0xb8becb,.82,.25),
      bronze:material(0xc68a60,.67,.29), rubber:material(0x20202a,.08,.73),
      platform:material(0x292835,.55,.36), trim:material(0x756c87,.65,.33),
      teal:solid(0x55b6ad), copper:solid(0xf2bb96), silver:solid(0xc5d6ef), gold:solid(0xe0ac69),
      arc:new T.LineBasicMaterial({color:0xf2bb96})
    };
    return {T,canvas,renderer,camera,scene,world,palette,width:0,height:0,rig:null,id:null,count:0};
  }
  function discardModel() {
    if(!graphics)return;
    const geometries=new Set();
    graphics.world.traverse(node=>{if(node.geometry)geometries.add(node.geometry);});
    for(const geometry of geometries)geometry.dispose();
    graphics.world.clear();
    graphics.id=null;
    graphics.rig=null;
  }
  async function boot(session) {
    if(session.booting||unavailable)return;
    session.booting=true;
    try{
      await B.Product.script('assets/ui/three-runtime.js');
      if(current!==session||!session.wrapper.isConnected)return;
      graphics ||= initialize();
      if(!graphics){unavailable=true;return;}
      session.stage.append(graphics.canvas);
      graphics.canvas.setAttribute('aria-label',t('立体实验模型，方向键旋转，Home 键复位','3D experiment model. Use arrow keys to turn, Home to reset.'));
      queue();
    }catch{
      if(current===session)session.wrapper.dataset.mechanismMode='fallback';
    }
  }
  function queue() {
    if(!current||current.failed||!current.visible||current.mode==='2d'||unavailable||pending||document.hidden)return;
    if(!graphics||graphics.canvas.parentNode!==current.stage){boot(current);return;}
    pending=requestAnimationFrame(()=>{
      try{draw();}
      catch(error){
        current.failed=true;
        current.wrapper.dataset.mechanismMode='fallback';
        discardModel();
        console.warn('3D diagram unavailable',error);
      }
    });
  }
  function draw() {
    pending=0;
    const session=current;
    if(!session?.wrapper.isConnected||!session.visible||session.mode==='2d'||unavailable)return;
    const {state,stage,wrapper}=session;
    const {T,renderer,camera,scene,world,palette,canvas}=graphics;
    if(graphics.id!==state.id){
      discardModel();
      graphics.rig=B.buildMechanismScene(B.ThreeRuntime,world,palette,state.id);
      graphics.id=state.id;
    }
    if(!graphics.rig)return;
    if(session.legendTopic!==state.id){
      session.legendTopic=state.id;
      session.legend.replaceChildren(...(legends[state.id]||[]).map(([color,zh,en])=>{
        const label=document.createElement('span');
        label.dataset.mechanismColor=color;
        label.textContent=t(zh,en);
        return label;
      }));
    }
    // Reveal the canvas stage so it can be measured on its first visible frame.
    if(wrapper.dataset.mechanismMode!=='3d')wrapper.dataset.mechanismMode='3d';
    const width=stage.clientWidth,height=stage.clientHeight;
    if(!width||!height)return;
    if(width!==graphics.width||height!==graphics.height){
      graphics.width=width;graphics.height=height;
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.40,Math.sqrt(520000/(width*height))));
      renderer.setSize(width,height,false);
      camera.aspect=width/height;
      camera.updateProjectionMatrix();
    }
    const position=graphics.rig(state);
    const tall=['pulley','pulley-efficiency','power','cable-lateral','force-balance','incline'].includes(state.id);
    const target=tall?1.12:.83;
    const radius=(tall?8.85:8.35)*Math.max(1,1.42/camera.aspect);
    const yaw=session.yaw,elevation=session.elevation,ground=radius*Math.cos(elevation);
    camera.position.set(ground*Math.sin(yaw),target+radius*Math.sin(elevation),ground*Math.cos(yaw));
    camera.lookAt(0,target,0);
    renderer.render(scene,camera);
    if(session.readouts.length){
      const {time,position,velocity}=state.metrics;
      for(const [i,value] of [time,position,velocity].entries()){
        const text=value.toFixed(2);
        if(session.readouts[i].textContent!==text)session.readouts[i].textContent=text;
      }
    }
    canvas.dataset.mechanismRig=state.id;
    canvas.dataset.mechanismState=JSON.stringify(position);
    canvas.dataset.mechanismFrame=String(++graphics.count);
  }
  function setView(session,mode) {
    session.mode=mode;
    session.wrapper.dataset.mechanismMode=mode;
    session.toggle.textContent=mode==='2d'?t('返回 3D','Show 3D'):t('2D 图解','2D diagram');
    session.toggle.setAttribute('aria-pressed',String(mode==='2d'));
    for(const button of session.wrapper.querySelectorAll('[data-mechanism-camera]'))button.hidden=mode==='2d';
    queue();
  }
  function attach(diagram,state) {
    const wrapper=document.createElement('div');
    wrapper.className='bm-mechanism';
    wrapper.dataset.mechanismMode='fallback';
    const readouts=state.id==='kinematics'?`<dl class="bm-mechanism-readouts">
      <div><dt>${t('时刻','Time')}</dt><dd><output></output> s</dd></div>
      <div><dt>${t('转角','Angle')}</dt><dd><output></output> rad</dd></div>
      <div><dt>${t('角速度','Angular velocity')}</dt><dd><output></output> rad/s</dd></div>
    </dl>`:'';
    wrapper.innerHTML=`<div class="bm-mechanism-stage"></div>${readouts}<div class="bm-mechanism-legend"></div>
      <div class="bm-mechanism-tools"><span>${t('拖动旋转','Drag to rotate')}</span>
        <button type="button" data-mechanism-camera="front">${t('正视','Front view')}</button>
        <button type="button" data-mechanism-camera="reset">${t('重置视角','Reset view')}</button>
        <button type="button" data-mechanism-toggle aria-pressed="false">${t('2D 图解','2D diagram')}</button>
      </div>`;
    const stage=wrapper.firstElementChild;
    diagram.before(wrapper);
    diagram.classList.add('bm-mechanism-diagram');
    wrapper.append(diagram);
    const controller=new AbortController(), {signal}=controller;
    const session={wrapper,diagram,stage,state,controller,visible:false,yaw:.45,elevation:.31,mode:'3d',booting:false,readouts:[...wrapper.querySelectorAll('.bm-mechanism-readouts output')],legend:wrapper.querySelector('.bm-mechanism-legend'),toggle:wrapper.querySelector('[data-mechanism-toggle]')};
    let drag=null;
    const orient=(yaw,elevation)=>{
      session.yaw=yaw;session.elevation=clamp(elevation,.02,1.10);
      queue();
    };
    wrapper.addEventListener('click',event=>{
      const button=event.target.closest('button');
      if(!button)return;
      if(button===session.toggle)setView(session,session.mode==='3d'?'2d':'3d');
      else if(button.dataset.mechanismCamera==='front')orient(0,.035);
      else if(button.dataset.mechanismCamera==='reset')orient(.45,.31);
    },{signal});
    stage.addEventListener('keydown',event=>{
      const offsets={ArrowLeft:[-.15,0],ArrowRight:[.15,0],ArrowUp:[0,.12],ArrowDown:[0,-.12]};
      if(event.key==='Home'){event.preventDefault();orient(.45,.31);return;}
      if(!offsets[event.key])return;
      event.preventDefault();
      orient(session.yaw+offsets[event.key][0],session.elevation+offsets[event.key][1]);
    },{signal});
    stage.addEventListener('pointerdown',event=>{
      if(!event.isPrimary||event.button!==0)return;
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,axis:event.pointerType==='touch'?null:'both'};
      if(drag.axis)stage.setPointerCapture(event.pointerId);
    },{signal});
    stage.addEventListener('pointermove',event=>{
      if(drag?.id!==event.pointerId)return;
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if(!drag.axis){
        if(Math.abs(dx)<=8||Math.abs(dx)<Math.abs(dy)*1.2)return;
        drag.axis='horizontal';stage.setPointerCapture(event.pointerId);
      }
      orient(session.yaw-dx*.008,session.elevation+(drag.axis==='both'?dy*.006:0));
      drag.x=event.clientX;drag.y=event.clientY;
    },{signal});
    for(const type of ['pointerup','pointercancel','lostpointercapture']){
      stage.addEventListener(type,()=>{drag=null;},{signal});
    }
    session.intersection=new IntersectionObserver(([entry])=>{
      session.visible=entry.isIntersecting;
      if(session===current)queue();
    });
    session.intersection.observe(wrapper);
    session.resize=new ResizeObserver(()=>{if(session===current)queue();});
    session.resize.observe(wrapper);
    document.addEventListener('visibilitychange',queue,{signal});
    return session;
  }
  function leave() {
    if(!current)return;
    const {wrapper,diagram,intersection,resize,controller}=current;
    cancelAnimationFrame(pending);pending=0;
    intersection.disconnect();resize.disconnect();controller.abort();
    if(wrapper.isConnected)wrapper.before(diagram);
    diagram.classList.remove('bm-mechanism-diagram');
    wrapper.remove();
    discardModel();
    current=null;
  }
  function show(diagram,state) {
    if(!diagram||!state?.id)return;
    if(current?.diagram!==diagram){leave();current=attach(diagram,state);}
    current.state=state;
    queue();
  }
  B.MechanismView={show,leave};
})();
