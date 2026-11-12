/* Shared camera input and subtle surface grain for the lightweight 3D viewers. */
(() => {
  'use strict';
  const B=window.BM=window.BM||{};
  const limits=(value,min=.36,max=1.6)=>Math.min(max,Math.max(min,value));
  const labels=(zh,en)=>B.i18n?.getLanguage()==='en'?en:zh;
  function buttons(attribute='data-model-zoom'){
    return [[1,'+','放大','Zoom in'],[-1,'−','缩小','Zoom out']].map(([direction,text,zh,en])=>{
      const name=labels(zh,en);
      return `<button type="button" ${attribute}="${direction}" title="${name}" aria-label="${name}">${text}</button>`;
    }).join('');
  }
  function bind(surface,{zoom,signal,available=()=>true}){
    let pinch=null;
    const distance=touches=>Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);
    surface.addEventListener('wheel',event=>{
      if(!available()||!(event.ctrlKey||event.metaKey||surface===surface.getRootNode().activeElement))return;
      event.preventDefault();
      const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?120:1);
      zoom(Math.exp(limits(delta*.0025,-.24,.24)));
    },{passive:false,signal});
    surface.addEventListener('keydown',event=>{
      if(!available()||!['+','=','-','−'].includes(event.key))return;
      event.preventDefault();zoom(event.key==='+'||event.key==='=' ? .80 : 1.25);
    },{signal});
    surface.addEventListener('touchstart',event=>{
      if(available()&&event.touches.length===2)pinch=distance(event.touches);
    },{passive:true,signal});
    surface.addEventListener('touchmove',event=>{
      if(pinch===null||event.touches.length!==2)return;
      event.preventDefault();
      const next=distance(event.touches);
      if(next>4&&pinch>4)zoom(pinch/next);
      pinch=next;
    },{passive:false,signal});
    for(const type of ['touchend','touchcancel']){
      surface.addEventListener(type,event=>{if(event.touches.length<2)pinch=null;},{passive:true,signal});
    }
    return {pinching:()=>pinch!==null};
  }
  const textures=new Map();
  function finish(T,materials,type,strength){
    if(!textures.has(type)){
      const size=128,data=new Uint8Array(size*size*4);
      let seed=243931;
      const next=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)>>>24)/255;
      for(let y=0;y<size;y++){
        const row=next();
        for(let x=0;x<size;x++){
          const i=(y*size+x)*4;
          const grain=type==='metal'? .64*row+.36*next() : .63*next()+.37*(.5+.5*Math.sin(x*2.3)*Math.sin(y*2.7));
          data[i]=data[i+1]=data[i+2]=Math.round(86+grain*86);data[i+3]=255;
        }
      }
      const map=new T.DataTexture(data,size,size,T.RGBAFormat);
      map.wrapS=map.wrapT=T.RepeatWrapping;
      map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;
      map.generateMipmaps=true;map.needsUpdate=true;
      textures.set(type,map);
    }
    for(const material of materials){
      material.bumpMap=textures.get(type);
      material.bumpScale=strength;
    }
  }
  B.ModelViewTools={buttons,bind,finish,limits};
})();
