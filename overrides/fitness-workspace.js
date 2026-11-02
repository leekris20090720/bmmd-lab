/* Aceternity Tabs' shared selection and bounce, adapted to native DOM controls.
 * React Bits CountUp's expo interpolation is used only when a real value changes.
 * Source notices: assets/vendor/fitness-workspace/README.md. No storage writes.
 */
(() => {
 'use strict';
 const media=matchMedia('(prefers-reduced-motion: reduce)');
 const reduced=()=>media.matches||document.documentElement.classList.contains('pd-reduced');
 const counts=new Map(),bars=new Map();
 let queued=0,resize,animations=[];
 const finish=()=>{animations.forEach(a=>a.cancel());animations=[];};
 function indicator(group){
  const list=group.querySelector('[role=tablist]'),active=list?.querySelector('[aria-selected=true]'),mark=list?.querySelector('.fit-tab-indicator');
  if(!active||!mark)return;
  mark.style.width=active.offsetWidth+'px';mark.style.transform=`translateX(${active.offsetLeft}px)`;
 }
 function activate(button,focus=false){
  const group=button.closest('[data-fit-tabs]');if(!group)return;
  const old=group.querySelector('[role=tab][aria-selected=true]');
  group.querySelectorAll('[role=tab]').forEach(tab=>{const on=tab===button;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;const panel=document.getElementById(tab.getAttribute('aria-controls'));if(panel)panel.hidden=!on;});
  indicator(group);if(focus)button.focus();
  const panel=document.getElementById(button.getAttribute('aria-controls'));
  if(panel&&old!==button&&!reduced())panel.animate([{opacity:.65,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:280,easing:'cubic-bezier(.16,1,.3,1)'});
 }
 function refresh(){
  queued=0;resize?.disconnect();finish();
  document.querySelectorAll('[data-fit-tabs]').forEach(group=>{indicator(group);resize=new ResizeObserver(()=>indicator(group));resize.observe(group);});
  document.querySelectorAll('[data-fit-count]').forEach((node,index)=>{
   const to=Number(node.dataset.fitCount),key=document.body.dataset.bmRoute+':'+index,from=counts.get(key);counts.set(key,to);
   if(from===undefined||from===to||reduced())return;
   node.setAttribute('aria-label',String(to));let start;
   const draw=now=>{if(!node.isConnected)return;if(reduced()){node.textContent=String(to);return;}start??=now;const p=Math.min(1,(now-start)/420),ease=p===1?1:(1-Math.pow(2,-10*p))/(1-Math.pow(2,-10));node.textContent=String(Math.round(from+(to-from)*ease));if(p<1)requestAnimationFrame(draw);};requestAnimationFrame(draw);
  });
  document.querySelectorAll('[data-fit-bar]').forEach(node=>{
   const to=Number(node.style.getPropertyValue('--fit-progress')),key=node.dataset.fitBar,from=bars.get(key)??to;bars.set(key,to);
   if(from!==to&&!reduced())animations.push(node.animate([{transform:`scaleX(${from})`},{transform:`scaleX(${to})`}],{duration:600,easing:'cubic-bezier(.22,1,.36,1)'}));
  });
  document.documentElement.dataset.fitnessMotion='aceternity-tabs react-bits-count-up real-set-progress';
 }
 function schedule(){if(!queued)queued=requestAnimationFrame(refresh);}
 document.addEventListener('click',e=>{const button=e.target.closest?.('[data-fit-tab]');if(button)activate(button);});
 document.addEventListener('keydown',e=>{const button=e.target.closest?.('[data-fit-tab]');if(!button)return;const tabs=[...button.closest('[role=tablist]').querySelectorAll('[role=tab]')],index=tabs.indexOf(button);let next;if(e.key==='ArrowRight')next=(index+1)%tabs.length;else if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();activate(tabs[next],true);});
 window.addEventListener('bm:page-ready',schedule);window.addEventListener('hashchange',schedule);media.addEventListener('change',schedule);
 new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
 window.addEventListener('pagehide',()=>{resize?.disconnect();finish();});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
