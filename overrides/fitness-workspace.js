/* GSAP feedback on the existing native calendar and actual training values.
 * Aceternity / React Bits / Uiverse visual references remain credited.
 * No networking, storage writes or training actions are owned by this module.
 */
(() => {
 'use strict';
 const G=window.gsap,media=matchMedia('(prefers-reduced-motion: reduce)');
 const reduced=()=>media.matches||document.documentElement.classList.contains('pd-reduced');
 const counts=new Map(),bars=new Map();
 let queued=0,context=null,observers=[];
 const run=fn=>context?context.add(fn):fn();
 function finish(){
  context?.revert();context=null;observers.forEach(o=>o.disconnect());observers=[];
  document.querySelectorAll('[data-fit-count]').forEach(node=>node.textContent=node.dataset.fitCount);
 }
 function indicator(group,instant=false){
  const list=group.querySelector('[role=tablist]'),active=list?.querySelector('[aria-selected=true]'),mark=list?.querySelector('.fit-tab-indicator');
  if(!active||!mark)return;
  const x=active.offsetLeft;mark.style.width=active.offsetWidth+'px';
  if(G)run(()=>{if(instant||reduced()){G.killTweensOf(mark);G.set(mark,{x});}else G.to(mark,{x,duration:.55,ease:'back.out(1.4)',overwrite:'auto'});});
  else mark.style.transform=`translateX(${x}px)`;
 }
 function activate(button,focus=false){
  const group=button.closest('[data-fit-tabs]');if(!group)return;
  const old=group.querySelector('[role=tab][aria-selected=true]');
  group.querySelectorAll('[role=tab]').forEach(tab=>{const on=tab===button;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;const panel=document.getElementById(tab.getAttribute('aria-controls'));if(panel)panel.hidden=!on;});
  indicator(group);if(focus)button.focus();
  const panel=document.getElementById(button.getAttribute('aria-controls'));
  if(panel&&old!==button&&!reduced()){
   if(G)run(()=>{G.killTweensOf(panel.children);G.fromTo(panel.children,{opacity:.65,y:10},{opacity:1,y:0,duration:.32,stagger:.045,ease:'power3.out',overwrite:'auto'});});
   else panel.animate([{opacity:.65,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:280,easing:'ease-out'});
  }
 }
 function refresh(){
  queued=0;finish();context=G?G.context(()=>{},document.body):null;
  document.documentElement.dataset.fitnessEngine=G?'gsap':'native';
  document.querySelectorAll('[data-fit-tabs]').forEach(group=>{indicator(group,true);const observer=new ResizeObserver(()=>indicator(group,true));observer.observe(group.querySelector('[role=tablist]'));observers.push(observer);});
  document.querySelectorAll('[data-fit-count]').forEach((node,index)=>{
   const to=Number(node.dataset.fitCount),key=document.body.dataset.bmRoute+':'+index,from=counts.get(key);counts.set(key,to);
   if(from===undefined||from===to||reduced()||!G)return;
   node.setAttribute('aria-label',String(to));const value={number:from};
   run(()=>G.to(value,{number:to,duration:.48,ease:'power3.out',onUpdate:()=>{if(node.isConnected)node.textContent=String(Math.round(value.number));},onComplete:()=>{if(node.isConnected)node.textContent=String(to);}}));
  });
  let completed=false;
  document.querySelectorAll('[data-fit-bar]').forEach(node=>{
   const to=Number(node.style.getPropertyValue('--fit-progress')),key=node.dataset.fitBar,from=bars.get(key)??to;bars.set(key,to);
   if(from===to||reduced()||!G)return;
   if(to>from)completed=true;
   run(()=>G.fromTo(node,{scaleX:from},{scaleX:to,duration:.7,ease:'expo.out',overwrite:'auto'}));
  });
  if(completed&&G&&!reduced()){
   const count=document.querySelector('.fit-progress-heading strong');
   if(count)run(()=>G.fromTo(count,{scale:1.12},{scale:1,duration:.45,ease:'back.out(1.5)'}));
  }
  document.documentElement.dataset.fitnessMotion='gsap-shared-calendar gsap-count-up gsap-set-progress';
 }
 function schedule(){if(!queued)queued=requestAnimationFrame(refresh);}
 document.addEventListener('click',e=>{const button=e.target.closest?.('[data-fit-tab]');if(button)activate(button);});
 document.addEventListener('keydown',e=>{const button=e.target.closest?.('[data-fit-tab]');if(!button)return;const tabs=[...button.closest('[role=tablist]').querySelectorAll('[role=tab]')],index=tabs.indexOf(button);let next;if(e.key==='ArrowRight')next=(index+1)%tabs.length;else if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();activate(tabs[next],true);});
 window.addEventListener('bm:page-ready',schedule);window.addEventListener('hashchange',schedule);media.addEventListener('change',schedule);
 const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
 window.addEventListener('pagehide',()=>{finish();observer.disconnect();});
 window.addEventListener('pageshow',event=>{if(event.persisted){observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});schedule();}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
