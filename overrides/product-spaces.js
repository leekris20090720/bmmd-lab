/* Two independently running spaces. The v3 store remains the only training data owner. */
(function(){'use strict';const B=window.BM=window.BM||{},F=B.flow;
const en=()=>B.i18n?.getLanguage()==='en',t=(z,e)=>en()?e:z,E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root=document.createElement('div');root.id='product-root';root.setAttribute('data-i18n-skip','');document.body.append(root);
const header=document.createElement('header');header.id='pd-header';header.setAttribute('data-i18n-skip','');document.body.append(header);
const status=document.createElement('p');status.id='pd-status';status.setAttribute('role','status');status.setAttribute('data-i18n-skip','');document.body.append(status);
const portal=document.getElementById('portal-hub-overlay'),welcome=document.getElementById('portal-welcome-stage');let route='',navigation=0,noticeTimer,returnTo='learn/courses';const loaders=new Map(),scrolls={};
const pageNavigation=B.Navigation.create(history,location);
const sourceURL=new URL('.',document.currentScript.src);
const anatomyModules=['anatomy-meshes.js','human-anatomy.js','human-lessons.js','script.js','product-courses.js'];
const source=p=>{const url=new URL(p,sourceURL);url.searchParams.set('v',anatomyModules.includes(p)?'anatomy-3d-20261111-1':p==='course-workspace.js'?'taste-layout-20261111-1':['product-experiments.js','research-labs.js','experiment-lessons.js'].includes(p)?'layout-balance-20261111-1':'mechanics-library-20261103-1');return url.href;};
function script(p){if(loaders.has(p))return loaders.get(p);const job=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=source(p);s.onload=resolve;s.onerror=()=>{loaders.delete(p);s.remove();reject(Error(t('学习资源未能加载，请重试：','Learning resource could not load; retry: ')+p));};document.body.append(s);});loaders.set(p,job);return job;}
const modelScripts=['mechanics-core.js','mechanics-education.js','mechanics-spring.js','mechanics-snapshots.js','mechanics-three-bridge.js','assets/ui/three-runtime.js','equipment-op-le.js','studio-rendering.js','lesson-profiles.js','equipment-inspector.js','anatomy-meshes.js','human-anatomy.js','human-lessons.js','script.js'];
// Download together, execute in the original dependency order. Classic script
// elements remain the loader, including when index.html is opened via file://.
function preloadModels(){for(const p of modelScripts){if(loaders.has(p))continue;const href=source(p);if(document.querySelector(`link[rel="preload"][href="${href}"]`))continue;const link=document.createElement('link');link.rel='preload';link.as='script';link.href=href;document.head.append(link);}}
let modelReady=null;async function models(){if(!modelReady){preloadModels();modelReady=(async()=>{for(const p of modelScripts)await script(p);})().catch(e=>{modelReady=null;throw e;});}return modelReady;}
function go(r){if(location.hash==='#'+r)render();else location.hash=r;}
function notice(s,error=false){status.textContent=s;status.classList.toggle('pd-error',error);status.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>status.hidden=true,error?9000:2600);}
function nav(space){header.innerHTML=`<a href="#home" class="pd-brand" aria-label="BM//MD ${t('首页','home')}">BM<span>//</span>MD</a><nav aria-label="${t('主要方向','Primary navigation')}"><a href="#train/plans" ${space==='train'?'aria-current="page"':''}>${t('训练','Train')}</a><a href="#learn" ${space==='learn'?'aria-current="page"':''}>${t('学习','Learn')}</a><button type="button" class="pd-nav-interact" data-pd-explore aria-haspopup="dialog" aria-expanded="false">${t('互动','Interact')}</button></nav><div><a href="#settings">${t('设置','Settings')}</a><button type="button" data-pd-language aria-label="${t('Switch to English','切换到中文')}">${en()?'中':'EN'}</button></div>`;}
const narrowWorkspace=window.matchMedia('(max-width: 1100px)');
const overviewSections={
  'train/plans':'.fit-training-panel',
  learn:'.pd-learn-movements',
  'learn/experiments':'.ex-library-controls'
};
function placeWorkspacePreview(){
  const selector=overviewSections[route];
  if(!selector)return;
  const workspace=root.querySelector('.deck-workspace');
  const preview=workspace?.querySelector('.deck-observatory');
  const section=workspace?.querySelector(selector);
  if(!preview||!section)return;
  if(narrowWorkspace.matches){
    if(section.nextElementSibling!==preview)section.after(preview);
  }else if(preview.parentElement!==workspace){
    workspace.append(preview);
  }
}
narrowWorkspace.addEventListener('change',placeWorkspacePreview);
function page(title,html,space='learn'){nav(space);const supplied=html.match(/^\s*<a\s+[^>]*href=["']#([^"']+)["'][^>]*>\s*←[\s\S]*?<\/a>/),fallback=supplied?supplied[1]:B.Navigation.parent(route);if(supplied)html=html.slice(supplied[0].length);const backTarget=pageNavigation.target(fallback),view=B.SpatialStudio?.header(route);root.innerHTML=`${space==='train'?`<nav class="pd-subnav" aria-label="${t('训练页面','Training pages')}">${[['train/plans','我的计划','My plans'],['train/session','正在训练','Training now'],['train/history','训练记录','History']].map(([r,z,e])=>`<a href="#${r}" ${route===r?'aria-current="page"':''}>${t(z,e)}</a>`).join('')}</nav>`:''}<main class="pd-main"><div class="pd-page-topline"><div class="pd-return-bar"><a class="pd-page-back" href="#${E(backTarget)}" data-pd-back>← ${t('返回上一页','Back')}</a></div><header class="pd-page-heading"${route.startsWith('course/')?' data-deck-plate':''}><h1 tabindex="-1">${title}</h1></header></div><div class="deck-workspace"><div class="deck-operation">${(space==='train'||space==='settings')?(B.LocalVault?.statusHTML()||''):''}${B.store.exportData().storage.loadError?`<p class="pd-warning" role="alert">${t('原训练库读取有问题，原文恢复副本已保留。请先到备份页核对；不要用新数据覆盖。','The previous database could not be read. Its original recovery copy is retained. Check Backup before replacing data.')} <a href="#settings/data">${t('查看备份','View backups')}</a></p>`:''}${B.store.hasUnsavedDraft()?`<p class="pd-warning" role="alert">${t('有输入尚未写入本机，请重试保存或下载备份。','Some input is not yet saved locally. Retry or download a backup.')} <button type="button" data-pd="retry-store">${t('重试保存','Retry save')}</button> <a href="#settings/data">${t('下载备份','Download backup')}</a></p>`:''}<div id="pd-content">${html}${route==='train/plans'?fitnessOverview(F.active()):''}${(route==='train/plans'||route.startsWith('train/summary/'))?(B.LocalVault?.reminderHTML()||''):''}</div></div>${view?`<aside class="deck-observatory" data-deck-plate>${view}</aside>`:''}</div></main>`;B.Product.content=root.querySelector('#pd-content');placeWorkspacePreview();document.title=(typeof title==='string'?title.replace(/<[^>]+>/g,''):'BM//MD')+' · BM//MD';B.LocalVault?.mount();window.dispatchEvent(new CustomEvent('bm:page-ready',{detail:{route}}));}
function fitnessOverview(active){
 const state=F.state(),performed=session=>B.TrainingData.executed(session),ended=state.sessions.filter(x=>x.endedAt&&performed(x).length),key=value=>{const d=new Date(value);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();};
 const today=new Date(),days=Array.from({length:7},(_,i)=>{const d=new Date(today);d.setHours(0,0,0,0);d.setDate(d.getDate()-6+i);const sessions=ended.filter(x=>key(x.endedAt)===key(d));return {date:d,sessions,sets:sessions.reduce((n,x)=>n+performed(x).length,0)};});
 const recent=days.flatMap(d=>d.sessions),sets=days.reduce((n,d)=>n+d.sets,0),families=new Set(state.plans.map(p=>p.familyId||p.id));
 const count=(value,label)=>`<div><dt>${label}</dt><dd><span data-fit-count="${value}">${value}</span></dd></div>`;
 const weekday=d=>new Intl.DateTimeFormat(en()?'en':'zh-CN',{weekday:'short'}).format(d);
 const dateLabel=d=>new Intl.DateTimeFormat(en()?'en':'zh-CN',{month:'short',day:'numeric'}).format(d),period=dateLabel(days[0].date)+' — '+dateLabel(today);
 const rows=day=>day.sessions.length?day.sessions.map(x=>`<a class="fit-history-row" href="#train/summary/${E(x.id)}"><span><strong>${E(x.planSnapshot.title)}</strong><small>${E(x.planSnapshot.days.find(d=>d.id===x.dayId)?.title||'')}</small></span><span>${performed(x).length} ${t('组','sets')} <span aria-hidden="true">↗</span></span></a>`).join(''):`<p class="fit-day-empty">${t('这一天还没有训练记录。','No finished session on this day.')}</p>`;
 return `<section class="fit-training-panel" aria-labelledby="fit-plan-title" data-ui>
  <h2 id="fit-plan-title">${t('训练概览','Training overview')}</h2>
  ${active?`<p class="fit-plan-note">${t('正在进行','In progress')} · ${E(active.planSnapshot.title)}</p>`:''}
  <dl class="fit-metrics">${count(recent.length,t('近 7 天训练','Sessions · 7 days'))}${count(sets,t('近 7 天完成组','Sets · 7 days'))}${count(families.size,t('我的计划','My plans'))}</dl>
  <div class="fit-week" data-fit-tabs>
   <div class="fit-week-heading"><h3>${t('训练日历','Training calendar')}</h3><a href="#train/history">${t('全部记录','All history')} ↗</a></div>
   <p class="fit-calendar-range">${E(period)}</p>
   <div class="fit-day-tabs" role="tablist" aria-label="${t('最近七天','Last seven days')}"><i class="fit-tab-indicator" aria-hidden="true"></i>${days.map((d,i)=>`<button type="button" role="tab" id="fit-day-${i}" data-fit-tab="${i}" aria-controls="fit-day-panel-${i}" aria-selected="${i===6}" tabindex="${i===6?0:-1}"><span>${weekday(d.date)}</span><strong>${d.date.getDate()}</strong><small aria-hidden="true">${d.sessions.length?'•':''}</small><span class="studio-sr">${d.sessions.length} ${t('次训练','sessions')}</span></button>`).join('')}</div>
   ${days.map((d,i)=>`<div role="tabpanel" id="fit-day-panel-${i}" aria-labelledby="fit-day-${i}" ${i===6?'':'hidden'} tabindex="0">${rows(d)}</div>`).join('')}
  </div>
 </section>`;
}
function home(){
 nav('home');
 document.title='BM//MD · '+t('动作力学馆','Movement mechanics');
 const copy=welcome.querySelector('.apple-hero-copy');
 const train=F.active()?'train/session':'train/plans';
 copy.innerHTML=`<main class="studio-home-main deck-home" data-i18n-skip>
  ${B.SpatialStudio?.home(train)||`<section class="deck-no-module" data-deck-plate><h1>BM//MD</h1><nav><a href="#${train}">${t('训练','Train')}</a><a href="#learn">${t('动作学习','Movement')}</a><a href="#learn/experiments">${t('力学实验','Mechanics')}</a><button type="button" data-pd-explore>${t('互动','Explore')}</button></nav></section>`}
 </main>`;
 welcome.querySelectorAll('.apple-welcome-footer,.bm-text-explore-down,#bm-home-intro,.bm-text-brand-footer').forEach(e=>e.hidden=true);
 welcome.querySelector('.apple-welcome-header').hidden=true;
 welcome.classList.add('portal-stage-active');
 portal.style.display='';portal.style.pointerEvents='auto';portal.inert=false;portal.scrollTop=0;root.hidden=true;
 window.dispatchEvent(new CustomEvent('bm:page-ready',{detail:{route:'home'}}));
}
function learning(){
 const title=a=>B.i18n?.t(a.name)||a.name,featured=F.byId.cam;
 const selected=['flat-press','arm','cable-row','home-sit-to-stand'].map(id=>F.byId[id]).filter(Boolean);
 const diagrams=[
 '<path d="M16 56H93M24 56L75 32"/><circle cx="24" cy="56" r="4"/><path class="pd-sketch-accent" d="M75 32V8m-4 6 4-6 4 6"/><path stroke-dasharray="3 3" d="M24 56H75V32"/>',
 '<circle cx="31" cy="36" r="21" stroke-dasharray="3 4"/><circle cx="31" cy="36" r="3"/><path class="pd-sketch-accent" d="M31 36H65V12m-4 6 4-6 4 6M65 43c10-15 16-10 25-29"/>',
 '<path d="M12 10V60H94"/><path class="pd-sketch-accent" d="M12 56C46 56 55 14 94 14"/><path stroke-dasharray="3 3" d="M57 9V60"/><circle cx="57" cy="35" r="4"/>'
 ];
 const questions=[
  ['lever','滚垫力相同，膝部力矩为何不同？','Same pad force, different knee moment?','找转轴，再比较滚垫力的垂直力臂。','Find the pivot and compare perpendicular moment arms.'],
  ['cam','凸轮如何改变阻力？','How does the cam change resistance?','观察钢索的作用线和力矩曲线。','Follow the cable’s line of action and the torque curve.'],
  ['kinematics','转角、速度和加速度如何关联？','How do angle, speed and acceleration relate?','拖动同一时刻，对照三张曲线。','Scrub to the same instant on all three plots.']
 ];
 const courseLinks=selected.map(a=>`<li><a data-pd-course="${a.id}" href="#course/${a.id}">
   <strong>${E(title(a))}</strong><small>${E(t({chest:'胸部',shoulder:'肩部',back:'背部',legs:'下肢'}[a.group]||'家庭练习',{chest:'Chest',shoulder:'Shoulders',back:'Back',legs:'Legs'}[a.group]||'Home exercise'))}</small>
   <span aria-hidden="true">↗</span>
 </a></li>`).join('');
 const questionLinks=questions.map(([id,z,e,subZ,subE],i)=>`<li><a href="#experiment/${id}">
   <svg viewBox="0 0 108 74" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">${diagrams[i]}</svg>
   <div><h3>${t(z,e)}</h3><p>${t(subZ,subE)}</p></div><span aria-hidden="true">↗</span>
 </a></li>`).join('');
 page(t('学习','Learn'),`
  <div class="pd-learn-intro"><p class="pd-lead">${t('看懂一个动作，再亲手验证它的原理。','Understand a movement, then test its mechanics yourself.')}</p></div>
  <nav class="pd-learn-tools" aria-label="${t('学习工具','Learning tools')}">
    <button type="button" data-pd-explore>${t('互动展厅','Explore the gallery')} <span aria-hidden="true">↗</span></button>
    <button type="button" data-pd-search>${t('搜索动作','Search movements')} <kbd>⌘ / Ctrl K</kbd></button>
  </nav>
  <div class="pd-learn-layout">
    <section class="pd-learn-movements" aria-labelledby="pd-learn-movements-title">
      <div class="pd-section-head"><h2 id="pd-learn-movements-title">${t('从一个动作开始','Start with a movement')}</h2><a href="#learn/courses">${t('全部 '+F.all.length+' 门课程','All '+F.all.length+' courses')} ↗</a></div>
      <article class="pd-learn-feature">
        <div><h3>${E(title(featured))}</h3><p>${t('找准膝盖与转轴，观察滚垫带动工作臂。','Find the knee and pivot, then follow how the shin pad moves the work arm.')}</p></div>
        <a class="pd-button pd-primary" data-pd-course="cam" href="#course/cam">${t('进入课程','Open course')} ↗</a>
      </article>
      <ul class="pd-learn-shelf" aria-label="${t('其他动作课程','More movement courses')}">${courseLinks}</ul>
    </section>
    <section class="pd-learn-questions" aria-labelledby="pd-learn-questions-title">
      <div class="pd-section-head"><h2 id="pd-learn-questions-title">${t('把原理看明白','Explore the mechanics')}</h2><a href="#learn/experiments">${t('全部实验','All experiments')} ↗</a></div>
      <p class="pd-learn-question-note">${t('三个实验都以坐姿腿屈伸为例。','Use the seated leg extension to test these three questions.')}</p>
      <ul>${questionLinks}</ul>
    </section>
  </div>
  ${B.LearningDynamics.overviewHTML(t)}${B.ResearchContent.directoryLinks()}
 `);
 B.LearningDynamics.mountOverview();
}
function settings(){page(t('设置','Settings'),`<section class="pd-plan"><h2>${t('显示与操作','Display and interaction')}</h2><div class="pd-fields"><label><input id="pd-reduce" type="checkbox" ${F.state().preferences.reducedMotion?'checked':''}>${t('减少动态，使用静态关键帧','Reduce motion and use static keyframes')}</label><label><input id="pd-rest-sound" type="checkbox" ${F.state().preferences.restSound?'checked':''}>${t('休息结束提示音（默认关闭）','Rest completion sound (off by default)')}</label><label><input id="pd-rest-vibration" type="checkbox" ${F.state().preferences.restVibration?'checked':''}>${t('休息结束振动（设备支持时）','Vibrate when rest ends (if supported)')}</label></div><p>${t('声音和振动只在你选择后启用。训练数据保存在此浏览器。','Sound and vibration require your choice. Training data is saved in this browser.')}</p><a class="pd-button" href="#settings/data">${t('备份与恢复','Backup and restore')}</a></section><section class="pd-plan"><h2>${t('已有数据与工具','Existing data and tools')}</h2><p>${t('旧计划和训练快照保留。实验档案与器械结构检查仍在学习空间中。','Previous plans and training snapshots are retained. Experiment archives and equipment inspection remain in Learning.')}</p><a href="#learn/experiments">${t('查看学习工具','Open learning tools')}</a><a class="pd-button" href="#settings/profile">${t('可选身体档案','Optional body profile')}</a></section>`,'settings');}

const profileMeasurements={height:['身高（cm）','Height (cm)'],weight:['体重（kg）','Body mass (kg)'],armSpan:['臂展（cm）','Arm span (cm)'],upperArmLength:['上臂长度（cm）','Upper arm (cm)'],forearmLength:['前臂长度（cm）','Forearm (cm)'],femurLength:['大腿长度（cm）','Thigh length (cm)'],tibiaLength:['小腿长度（cm）','Shin length (cm)'],shoulderWidthCm:['肩宽（cm）','Shoulder width (cm)'],ankleDorsiflexionCm:['膝触墙距离（cm）','Knee-to-wall distance (cm)'],plankSeconds:['平板支撑实测时长（秒）','Measured plank time (seconds)'],hingeGapCm:['髋铰链测试距离（cm）','Hip-hinge test distance (cm)'],legRaiseAngle:['抬腿测试角度（°）','Leg-raise test angle (degrees)']};
function profile(){const fields=F.state().profile.fields;page(t('可选身体档案','Optional body profile'),`<p>${t('只保存你主动填写的测量。空值保持未知，教学模特与演示数值不会写到这里。','Only measurements you enter are saved. Blank stays unknown; teaching body and example values are never copied here.')}</p><form id="pd-profile" class="pd-fields"><div class="pd-editor-grid">${Object.entries(profileMeasurements).filter(([key])=>fields[key]).map(([key,label])=>`<label>${E(t(...label))}<input name="${key}" type="number" min="0" step="any" inputmode="decimal" value="${E(fields[key].value??'')}"><small>${fields[key].source==='user'?t('主动填写','Entered by you'):t('尚未确认的旧值或未知；填写实测值后才作为本人输入。','Unconfirmed previous value or unknown; only your measured entry is treated as your input.')}</small></label>`).join('')}</div><button class="pd-primary">${t('保存测量','Save measurements')}</button></form><details><summary>${t('旧版分类与推算字段','Previous classifications and derived fields')}</summary><p>${t('旧值与来源完整保留在备份里。本页不把旧版风险标记当成诊断，不用它们生成个人负荷处方。','Previous values and provenance remain in the backup. Legacy risk flags are not diagnoses and do not prescribe personal training loads.')}</p></details>`,'settings');fProfile();}
function fProfile(){root.querySelector('#pd-profile').addEventListener('submit',e=>{e.preventDefault();const old=F.state().profile.fields,values={};for(const [key,v]of new FormData(e.target)){if(String(old[key].value??'')===v)continue;values[key]={value:v===''?null:Number(v),source:v===''?'unknown':'user'};}const r=B.store.saveProfile(values);notice(r.ok?t('已保存你填写的测量','Your measurements were saved'):r.error,!r.ok);});}
const aliases={plans:'train/plans',training:'train/session',history:'train/history',data:'settings/data',wizard:'train/recommend',library:'learn/courses',sphere:'learn/courses','learn/map':'learn/courses',manual:'train/edit',profile:'settings/profile'};
async function render(){const token=++navigation;B.MechanismView?.leave();B.LearningDynamics?.leaveOverview();B.ProductTraining?.stop();B.ProductCourses?.leave();B.ProductExperiments?.leave();B.engineering?.close();if(route)scrolls[route]=root.scrollTop;let next=decodeURIComponent(location.hash.slice(1)||'home');if(aliases[next])return location.replace('#'+aliases[next]);if(next.startsWith('action/'))return location.replace('#course/'+next.slice(7));route=next;pageNavigation.visit(next);document.body.classList.add('pd-app');document.body.classList.toggle('pd-home',next==='home');document.body.classList.remove('bm-overlay','bm-learning','bm-adjust','bm-principle-intro');document.body.dataset.bmRoute=next;document.body.dataset.productSpace=next.startsWith('train/')?'train':next==='home'?'home':next.startsWith('settings')?'settings':'learn';portal.inert=next!=='home';root.hidden=false;root.inert=next.startsWith('engineering/');document.querySelectorAll('.workspace-page,.system-header,#beginner-root').forEach(e=>e.inert=true);
if(next.startsWith('course/')&&F.byId[next.slice(7)])preloadModels();
try{if(next==='home')home();else if(next.startsWith('train/')||next==='settings/data')B.ProductTraining.render(next);else if(next==='settings')settings();else if(next==='settings/profile')profile();else if(next==='learn')learning();else if(next.startsWith('engineering/')){await models();await script('learning-explainer.js');await script('mechanics-lab.js');if(token!==navigation)return;nav('learn');B.engineering.open(next,'learn/experiments');}else if(next==='learn/courses'||next.startsWith('course/')){await script('course-content.js');await script('product-courses.js');if(token!==navigation)return;await B.ProductCourses.render(next);}else if(next==='learn/experiments'||next.startsWith('experiment/')){await script('mechanics-core.js');await script('mechanics-education.js');await script('mechanics-spring.js');await script('experiment-engine.js');await script('course-content.js');await script('experiment-lessons.js');await script('product-experiments.js');if(token!==navigation)return;await B.ProductExperiments.render(next);}else page(t('找不到这个页面','Page not found'),`<a href="#home">${t('返回首页','Return home')}</a>`);if(token===navigation){root.scrollTop=scrolls[next]||0;root.querySelector('h1')?.focus({preventScroll:true});}}catch(error){page(t('内容暂时未能加载','Content could not load'),`<p role="alert">${E(error.message)}</p><button type="button" data-pd-retry>${t('重试','Retry')}</button><a href="#train/plans">${t('返回训练，已有数据仍在','Return to training; your data is retained')}</a>`);}finally{
  if(token===navigation && document.getElementById('bm-startup')) {
    window.dispatchEvent(new Event('bm:startup-ready'));
  }
}}
B.Product={root,content:null,page,notice,go,script,models,openCourse(id,from=route){returnTo=from;F.tx(s=>s.preferences.courseReturn=from,{onFailure:'base'});go('course/'+id);},returnRoute(){const target=returnTo==='learn/courses'?(F.state().preferences.courseReturn||returnTo):returnTo;return target==='learn/map'||target==='sphere'?'learn/courses':target;},t,E,applyPreferences(){const p=F.state().preferences;if(p.theme)theme(p.theme);if(p.language)B.i18n.setLanguage(p.language);document.documentElement.classList.toggle('pd-reduced',!!p.reducedMotion);},get route(){return route;}};
// Stable numbering is additive v3 metadata. The store's pre-load backup preserves the exact old raw value.
const old=F.state(),numbered=F.clone(old);B.TrainingData.numberSessions(numbered);if(old.sessions.length&&!B.store.exportData().storage.loadError&&JSON.stringify(old)!==JSON.stringify(numbered)){const r=F.tx(s=>B.TrainingData.numberSessions(s),{onFailure:'base'});if(!r.ok)notice(r.error,true);}
// One supported appearance. Legacy light preferences in old backups remain
// readable but never change the rendered theme or rewrite training records.
function theme(){document.documentElement.dataset.theme='dark';document.body.classList.add('theme-dark','dark-mode');try{localStorage.setItem('bmmd_apple_theme_v1','dark');}catch{}}theme();
document.addEventListener('click',e=>{const back=e.target.closest('[data-pd-back]');if(back){e.preventDefault();B.ProductTraining?.collectSet();pageNavigation.back(r=>location.replace('#'+r),back.getAttribute('href').slice(1));return;}const course=e.target.closest('[data-pd-course]');if(course){e.preventDefault();B.Product.openCourse(course.dataset.pdCourse,route);}if(e.target.closest('[data-pd-language]')){B.ProductTraining?.collectSet();B.i18n.setLanguage(en()?'zh-CN':'en');}if(e.target.closest('[data-pd-retry]'))render();if(e.target.closest('[data-pd-explore]'))document.dispatchEvent(new CustomEvent('bm:explore',{detail:{tab:'gallery'}}));if(e.target.closest('[data-pd-search]'))document.dispatchEvent(new CustomEvent('bm:explore',{detail:{tab:'search'}}));});
document.addEventListener('change',e=>{const k=e.target.id;if(['pd-reduce','pd-rest-sound','pd-rest-vibration'].includes(k)){const key={'pd-reduce':'reducedMotion','pd-rest-sound':'restSound','pd-rest-vibration':'restVibration'}[k];const r=F.tx(s=>s.preferences[key]=e.target.checked,{onFailure:'base'});if(!r.ok)notice(r.error,true);document.documentElement.classList.toggle('pd-reduced',!!F.state().preferences.reducedMotion);}});
document.addEventListener('bm:language-before-change',()=>B.ProductTraining?.collectSet());document.addEventListener('bm:language-change',()=>{const r=F.tx(s=>s.preferences.language=B.i18n.getLanguage(),{onFailure:'base'});if(!r.ok)notice(r.error,true);render();});window.addEventListener('hashchange',render);document.documentElement.classList.toggle('pd-reduced',!!F.state().preferences.reducedMotion);render();
})();
