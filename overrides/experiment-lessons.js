/* Original comparison protocols and SVG illustrations for the mechanics library. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else(root.BM=root.BM||{}).ExperimentLessons=api;})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const metrics={
  resultant:['两股力的合力大小','Resultant magnitude','N'],resultantX:['合力的x分量','Resultant x-component','N'],resultantY:['合力的y分量','Resultant y-component','N'],angleBetween:['两股力夹角','Angle between forces','°'],
  leftMoment:['左配重力矩（逆时针为正）','Left weight moment (+counterclockwise)','N·m'],rightMoment:['右配重力矩','Right weight moment','N·m'],weightMoment:['两个配重的合力矩','Net weight moment','N·m'],holdingMoment:['保持当前位置的额外力矩','Extra moment to hold this position','N·m'],
  elasticForce:['保持当前伸长所需拉力','Force holding the current extension','N'],elasticEnergy:['从起点增加的弹性能','Elastic energy added from the start','J'],extension:['额外伸长','Additional extension','m'],
  inertia:['两颗配重的转动惯量','Inertia of both weights','kg·m²'],angularAcceleration:['角加速度','Angular acceleration','rad/s²'],angularSpeed:['当前角速度','Current angular speed','rad/s'],rotorAngle:['累计转角','Accumulated rotation','rad'],kineticEnergy:['当前转动动能','Current rotational kinetic energy','J'],driveWork:['驱动力矩做功','Work by driving torque','J'],
  liftingForce:['手柄提升拉力','Handle lifting force','N'],weightRise:['配重上升','Load rise','m'],inputWork:['手柄输入功','Input handle work','J'],outputWork:['配重势能增加','Gravitational energy gained','J'],lostWork:['耗散的机械能','Dissipated mechanical energy','J'],actualEfficiency:['给定提升效率','Specified lifting efficiency','1'],
  requiredLeft:['左侧静态平衡所需反力','Left reaction required for equilibrium','N'],requiredRight:['右侧静态平衡所需反力','Right reaction required for equilibrium','N'],tippingForce:['不滑动时的倾覆临界拉力','Tipping threshold without sliding','N'],stabilityMargin:['恢复力矩减去倾覆力矩','Restoring minus overturning moment','N·m']
 };
 const step=(z,e,before,after,metric,whyZ,whyE,q=.5)=>({title:[z,e],before,after,metric,why:[whyZ,whyE],q});
 const protocols={
  direction:[
   step('斜拉时，只剩多少有效分量？','How much of an oblique force acts along motion?',{force:100,angle:0},{angle:60},'parallel','把夹角从0°改成60°，cos α从1变成1/2。力的总大小保持100 N。','Changing 0° to 60° halves cos α; the applied force remains 100 N.'),
   step('转到90°，拉力消失了吗？','At 90°, has the force vanished?',{force:100,angle:0},{angle:90},'parallel','只有沿+x分量为0；垂直分量仍存在。请同时看两条分量读数。','Only the +x component becomes zero. The perpendicular component remains.'),
   step('超过90°，负号在说什么？','What does a negative component mean?',{force:100,angle:0},{angle:150},'parallel','负号表示沿−x，不是“负的力大小”。这股拉力会阻碍规定的+x运动。','A negative component points toward −x; it is not a negative magnitude.')],
  lever:[
   step('距离加倍，力矩怎样变？','Double the distance: what happens to moment?',{force:100,reach:.4,angle:90},{reach:.8},'torque','拉力垂直于杆时，有效力臂就是作用点距离；力矩随距离成比例。','With a perpendicular force, the application distance is the moment arm.'),
   step('同样距离，改成斜拉','Keep distance and incline the force',{force:100,reach:.5,angle:90},{angle:30},'torque','此时d=r sin30°，只有原来的一半。不要把杆长直接当有效力臂。','Here d=r sin30°, half the original arm. Rod length is not always moment arm.'),
   step('作用线穿过轴','Pass the line of force through the pivot',{force:100,reach:.5,angle:90},{angle:0},'torque','即使作用点离轴0.5 m，作用线过轴时垂直力臂为0。','Even at a 0.5 m application distance, a force line through the pivot has zero moment arm.')],
  pulley:[
   step('把承重绳段从1改成2','Change one supporting segment to two',{mass:20,ratio:1,travel:.8},{ratio:2},'force','配重相同，理想拉力减半；固定手柄行程时，配重上升也减半。','At the same mass, ideal pull halves; at fixed handle travel, load rise also halves.',1),
   step('再比较4段承重','Compare four supporting segments',{mass:20,ratio:2,travel:.8},{ratio:4},'force','倍率改变力和行程的交换；它不创造能量。图是等效约束，不是完整布绳图。','The ratio exchanges force for distance; it creates no energy. The drawing is an equivalent constraint.',1),
   step('同一倍率，多拉一倍','Double travel at the same ratio',{mass:20,ratio:2,travel:.4},{travel:.8},'work','拉力不变，行程加倍，因此输入功与配重上升高度都加倍。','Force stays fixed; doubling travel doubles input work and load rise.',1)],
  cam:[
   step('从恒定力臂到变化力臂','From a constant to a varying moment arm',{mass:20,base:.1,shape:0,phase:0},{shape:.5},'torque','在行程中点，正弦项最大；同时观察垂距和阻力矩，不把d当成外轮廓半径。','The sine term peaks at mid-stroke. Observe the perpendicular distance, not an assumed contour radius.'),
   step('整体放大有效力臂','Scale the effective moment arm',{mass:20,base:.1,shape:.5,phase:0},{base:.2},'torque','张力不变时，d整体加倍会使整条力矩曲线加倍。','At fixed tension, doubling d doubles the whole torque curve.'),
   step('把峰值提前或延后','Shift where the peak occurs',{mass:20,base:.1,shape:.5,phase:0},{phase:90},'torque','只改相位会移动高阻力区，配重和基准力臂都没有改变。','Changing phase moves the high-resistance region without changing mass or the base arm.')],
  incline:[
   step('上行时加入摩擦','Add friction during upward motion',{mass:30,slope:45,friction:0,mode:0},{friction:.2},'force','上行时摩擦向下，维持准静态上行所需外力随之增加。','Friction points downhill during upward motion and increases the required uphill force.'),
   step('同一斜面改为下行','Reverse the specified motion',{mass:30,slope:45,friction:.2,mode:0},{mode:1},'force','运动方向反转，摩擦方向也反转。这里比较准静态需求，不计算加速度。','Reversing motion reverses friction. This is a quasi-static force comparison.'),
   step('检查静止是否做得到','Check whether rest is possible',{mass:30,slope:45,friction:.2,mode:2,applied:208},{applied:0},'friction','静摩擦只在界限内补足平衡；所需摩擦超过μN时，界面会报告不能静止。','Static friction supplies only the needed balance within its bound. Above μN, rest fails.')],
  work:[
   step('比较发力与返回的符号','Compare outward and return signs',{mass:30,shape:.5,direction:0},{direction:1},'work','同一路径反向走，角位移符号改变，所以理想机械功反号。','Reversing the same path reverses displacement and ideal mechanical work.',1),
   step('配重加倍，曲线面积怎样变？','Double the mass: how does area change?',{mass:20,shape:.5,direction:0},{mass:40},'work','同一力臂曲线下，张力与力矩随配重加倍，积分面积也加倍。','At the same moment-arm curve, mass doubles tension, torque and integrated work.',1),
   step('比较平坦与中段更高的曲线','Compare flat and mid-stroke resistance',{mass:30,shape:0,direction:0},{shape:.5},'work','新增的力矩曲线面积带来更多器械机械功，不能直接换成人体热量。','The added torque area increases machine work; this is not metabolic energy.',1)],
  power:[
   step('完成时间减半','Halve the stroke duration',{mass:30,travel:.8,duration:4},{duration:2},'averagePower','同样配重和行程，功不变；平均功率等于功除以时间，因此加倍。','The same mass and path give the same work; halving time doubles average power.'),
   step('固定时间，行程加倍','Double travel at fixed duration',{mass:30,travel:.4,duration:4},{travel:.8},'averagePower','同一拉力下，路径加倍使功加倍，平均功率也加倍。','At fixed force, doubling the path doubles work and average power.'),
   step('固定路径和时间，配重加倍','Double mass at fixed path and time',{mass:20,travel:.8,duration:4},{mass:40},'power','在这个准静态模型里力随配重增加；瞬时速度相同，P=Fv随之增加。','In this quasi-static model, mass raises force while instantaneous speed stays the same.')],
  kinematics:[
   step('同一角度，时间减半','Halve duration for the same rotation',{duration:4,travel:1},{duration:2},'velocity','中点速度变为2倍，位置仍是同一角行程的一半。','Mid-stroke angular speed doubles; position is still halfway through the same rotation.'),
   step('看加速度为何变成4倍','Why does acceleration become four times larger?',{duration:4,travel:1},{duration:2},'acceleration','同样轨迹缩短到一半时间，角加速度随1/T²放大；起点最容易比较。','For this trajectory, acceleration scales as 1/T². Compare at the start.',0),
   step('固定时间，转角加倍','Double rotation at fixed time',{duration:4,travel:.5},{travel:1},'position','位置、角速度与角加速度都随给定转角范围成比例。','Position, angular speed and angular acceleration scale with the specified rotation range.')],
  spring:[
   step('从无阻尼到有阻尼','Add damping to the free response',{mass:1,stiffness:80,damping:0,displacement:.2},{damping:8},'energy','无阻尼能量在动能与弹性能之间转换；阻尼把机械能耗散出去。','Without damping, energy exchanges between kinetic and elastic forms; damping dissipates it.'),
   step('质量变4倍，周期怎样变？','Quadruple mass: how does period change?',{mass:1,stiffness:80,damping:0,displacement:.2},{mass:4},'position','T=2π√(m/k)，质量变4倍使周期变2倍。看整条曲线的波峰间距。','T=2π√(m/k); quadrupling mass doubles the period. Compare peak spacing.',.2),
   step('初始拉开距离加倍','Double the release displacement',{mass:1,stiffness:80,damping:0,displacement:.1},{displacement:.2},'energy','初始弹性能为½kx²，因此初始位移加倍会使总机械能变4倍。','Initial elastic energy is ½kx², so doubling displacement quadruples total energy.',0)],
  calculus:[
   step('从4段加密到64段','Refine four intervals to sixty-four',{mass:30,shape:.5,segments:4},{segments:64},'error','比较有符号误差与0的距离。这里降低的是数值离散误差。','Compare the signed error’s distance from zero. This reduces discretization error.'),
   step('继续加密到256段','Refine to 256 intervals',{mass:30,shape:.5,segments:64},{segments:256},'error','解析曲线不变，只有积分分段变细；图下方的误差曲线可以验证收敛。','The analytic curve is unchanged; only the integration grid is refined.'),
   step('直线面积为什么容易算准？','Why is the flat curve integrated exactly?',{mass:30,shape:.5,segments:4},{shape:0},'error','恒定力矩的面积是矩形，梯形公式即可精确积分；这不校准真实器械。','A constant-torque rectangle is integrated exactly by the trapezoid rule; it does not calibrate equipment.')],
  uncertainty:[
   step('把理想尺寸变成一个范围','Replace an exact dimension with bounds',{mass:30,base:.12,range:0},{range:.02},'low','下限与上限来自你给定的尺寸范围，不带95%之类的概率解释。','The bounds follow the specified dimensions, without a 95% probability interpretation.'),
   step('相同尺寸偏差，配重加倍','Double mass with the same dimension bounds',{mass:20,base:.12,range:.01},{mass:40},'high','输出与配重成比例，因此同一尺寸范围对应的力矩和包络宽度都加倍。','Torque and envelope width both scale with mass for the same dimensional bounds.'),
   step('只扩大可能的尺寸偏差','Widen only the dimensional bounds',{mass:30,base:.12,range:.01},{range:.03},'low','包络变宽，当前中央曲线不变；不确定性范围与中心估计要分开读。','The envelope widens while the central curve stays fixed. Read bounds separately from the central estimate.')],
  design:[
   step('先比较基准力臂','Compare the base moment arm',{mass:30,base:.12,shape:.5,phase:0},{base:.2},'error','整条实线被放大，但不保证更接近虚线目标；看归一化误差。','The whole curve scales up, which need not improve its fit. Inspect normalized error.'),
   step('只移动阻力曲线的相位','Shift only the resistance phase',{mass:30,base:.12,shape:.5,phase:0},{phase:90},'error','峰值位置改变以后，与三点目标的差也会改变；没有自动最优结论。','Moving the peak changes deviation from the target; no optimum is claimed.'),
   step('用平坦曲线比较平坦目标','Compare a flat curve with a flat target',{mass:30,base:.1,shape:.5,phase:0,targetStart:30,targetMiddle:30,targetEnd:30},{shape:0},'error','真实曲线即使接近目标，仍只是有效力臂设计；还没有解决轮廓与制造。','A close curve match is still only an effective-arm design, without contour or manufacturing constraints.')],
  'force-balance':[
   step('同向时可以直接相加','Same direction: magnitudes add',{forceA:100,forceB:50},{forceB:100},'resultant','在0°夹角时，两股100 N外力指向同一方向，合力为200 N。','At 0°, the two 100 N forces point the same way and sum to 200 N.',0),
   step('直角时为什么不是200 N？','Why is the right-angle resultant not 200 N?',{forceA:100,forceB:0},{forceB:100},'resultant','在90°夹角时，用分量的勾股关系得到约141.4 N，而不是直接加大小。','At 90°, the component norm gives about 141.4 N, not the sum of magnitudes.',.5),
   step('反向时，张力与合力分开看','Opposite directions: tension versus resultant',{forceA:100,forceB:50},{forceB:100},'resultant','180°时等大的两股力抵消，但每根绳依然受张力。','At 180°, equal forces cancel, while each cable remains under tension.',1)],
  counterweight:[
   step('同距离，右边加重','Increase right mass at equal distances',{massLeft:10,massRight:10,armLeft:.4,armRight:.4},{massRight:20},'weightMoment','右侧力矩更大，合力矩为顺时针；要停在此处需额外逆时针力矩。','The right moment dominates clockwise; holding position requires a counterclockwise moment.',0),
   step('重的一侧放近一点','Move the heavier weight inward',{massLeft:10,massRight:20,armLeft:.4,armRight:.4},{armRight:.2},'weightMoment','右侧质量为2倍，距离改成一半后，两侧重力矩相等。','Twice the mass at half the distance gives equal gravitational moments.',0),
   step('质量小也能靠长力臂平衡','A smaller mass can balance with a longer arm',{massLeft:10,massRight:10,armLeft:.4,armRight:.8},{massRight:5},'weightMoment','5 kg×0.8 m与10 kg×0.4 m相等；同一杆角的cos θ也相同。','5 kg×0.8 m equals 10 kg×0.4 m; both sides share the same cos θ.',0)],
  'elastic-load':[
   step('起点张力把曲线抬高','Starting tension raises the curve',{stiffness:300,preload:0,travel:.6},{preload:30},'elasticForce','只加初始张力，整条F-x曲线上移；斜率k保持不变。','Adding starting tension shifts F-x upward without changing slope k.',1),
   step('刚度改变的是斜率','Stiffness changes the slope',{stiffness:200,preload:0,travel:.4},{stiffness:400},'elasticForce','同一伸长下，k加倍使理想弹性力加倍。','At the same extension, doubling k doubles the ideal elastic force.',1),
   step('伸长加倍，能量变4倍','Double extension: energy quadruples',{stiffness:300,preload:0,travel:.2},{travel:.4},'elasticEnergy','三角形面积½kx²随位移平方变化；同时比较上方当前拉力。','The triangular area ½kx² scales with extension squared. Also compare current force.',1)],
  'rotational-inertia':[
   step('半径加倍，惯量变4倍','Double radius: inertia quadruples',{pointMass:2,radius:.2,driveTorque:1,duration:2},{radius:.4},'angularAcceleration','同样质量和驱动力矩，I随r²增大，角加速度变为四分之一。','At fixed mass and torque, I scales as r² and angular acceleration drops to one quarter.',1),
   step('每颗配重质量加倍','Double each point mass',{pointMass:1,radius:.3,driveTorque:1,duration:2},{pointMass:2},'angularAcceleration','两颗质量都加倍，转动惯量加倍，因此角加速度减半。','Doubling both masses doubles inertia and halves angular acceleration.',1),
   step('施力时间加倍，动能怎样变？','Double time under torque: what happens to energy?',{pointMass:2,radius:.3,driveTorque:1,duration:1},{duration:2},'kineticEnergy','从静止恒加速，角速度变2倍，动能变4倍；累计做功与动能相等。','From rest at constant acceleration, speed doubles and kinetic energy quadruples; work agrees.',1)],
  'pulley-efficiency':[
   step('从理想到80%效率','From ideal to 80% efficiency',{mass:30,ratio:2,efficiency:1,travel:.8},{efficiency:.8},'liftingForce','同一提升任务需要更大手柄力；效率是输出功与输入功的比，不是减重比例。','The same lift needs more handle force. Efficiency is output/input work, not a weight reduction.',1),
   step('再降低效率，检查耗散','Lower efficiency and inspect loss',{mass:30,ratio:2,efficiency:.8,travel:.8},{efficiency:.5},'lostWork','配重得到的势能没变，增加的输入功全计入耗散。','The load gains the same potential energy; extra input work appears as dissipation.',1),
   step('手柄行程不变，倍率改成4','Keep handle travel and use four segments',{mass:30,ratio:2,efficiency:.8,travel:.8},{ratio:4},'weightRise','拉力更小，但同样手柄行程下配重也升得更少；不是同一提升高度的比较。','Pull is lower, but the same handle stroke also lifts less high. These are different lift heights.',1)],
  'base-stability':[
   step('底座半宽加倍','Double the base half-width',{mass:60,halfWidth:.3,forceHeight:1.2,maxForce:300},{halfWidth:.6},'tippingForce','恢复力矩mg b随半宽成比例，因此临界拉力变2倍。','Restoring moment mg b scales with half-width, so the tipping threshold doubles.'),
   step('把拉力作用高度减半','Halve the force application height',{mass:60,halfWidth:.3,forceHeight:1.2,maxForce:300},{forceHeight:.6},'tippingForce','倾覆力矩Fh的力臂变小，同样条件下需要更大拉力才会失去支撑。','The moment arm in Fh decreases, requiring a larger force to lose contact.'),
   step('让所需反力重新回到非负','Return the required reaction to a nonnegative value',{mass:60,halfWidth:.3,forceHeight:1.2,maxForce:300},{maxForce:100},'requiredLeft','负的所需反力不能由普通地面提供，代表静态条件失效；减小拉力后可回到支撑区间。','Ordinary ground cannot supply a negative reaction. Reducing force can restore the static support condition.',1)]
 };
 const number=v=>!Number.isFinite(v)?'—':Math.abs(v)<1e-9?'0':Math.abs(v)<.001?v.toExponential(2):Number(v.toFixed(3)).toString();
 function guideHTML(id,X,labels,{t,E}){
  const steps=protocols[id];if(!steps)return '';
  return `<section class="ex-guided" aria-labelledby="ex-guided-title"><div class="ex-section-heading"><h2 id="ex-guided-title">${t('按三步做一次对照实验','Run a three-step comparison')}</h2><p>${t('载入后演示暂停。实线是改变后，虚线是改变前；还可以继续拖动参数。','Loading pauses playback. Solid is after, dashed is before; keep exploring with the controls.')}</p></div><ol class="ex-protocols">${steps.map((s,i)=>{
   const before={...X.params(id),...s.before},after={...before,...s.after},a=X.calculate(id,before,s.q).metrics[s.metric],b=X.calculate(id,after,s.q).metrics[s.metric],config=X.configs.find(c=>c.id===id);
   let label=labels[s.metric]||metrics[s.metric];
   if(id==='kinematics')label={position:['从起点增加的转角','Rotation from start','rad'],velocity:['角速度','Angular velocity','rad/s'],acceleration:['角加速度','Angular acceleration','rad/s²']}[s.metric]||label;
   if(s.metric==='error')label=id==='design'?['归一化误差','Normalized error','1']:['积分有符号误差','Signed integration error','J'];
   const changes=Object.entries(s.after).map(([key,value])=>{const k=config.controls.find(c=>c.key===key);return t(...k.label)+': '+before[key]+' → '+value+' '+k.unit;}).join(' · ');
   return `<li><h3>${t(...s.title)}</h3><p class="ex-task-setting">${E(changes)}</p><p class="ex-task-measure">${E(t(label[0],label[1]))}</p><dl class="ex-task-values"><div><dt>${t('改变前','Before')}</dt><dd>${number(a)} <small>${label[2]}</small></dd></div><div><dt>${t('改变后','After')}</dt><dd>${number(b)} <small>${label[2]}</small></dd></div></dl><button type="button" data-ex-preset="${i}" aria-pressed="false">${t('载入这组对照','Load this comparison')} ↗</button><details><summary>${t('怎样解释这个变化','Explain the change')}</summary><p>${t(...s.why)}</p></details></li>`;
  }).join('')}</ol></section>`;
 }
 function sourceHTML(id,c,{t,E}){
  const base='https://openstax.org/books/university-physics-volume-1/pages/';
  const pages={direction:'2-3-algebra-of-vectors',lever:'10-6-torque',pulley:'9-3-simple-machines',cam:'10-6-torque',incline:'6-2-friction',work:'7-1-work',power:'7-4-power',kinematics:'10-2-rotation-with-constant-angular-acceleration',spring:'15-5-damped-oscillations',calculus:'7-1-work',uncertainty:'1-6-significant-figures',design:'10-6-torque'};
  const list=c.sources||[{url:id==='pulley'?'https://openstax.org/books/physics/pages/9-3-simple-machines':base+pages[id],title:'OpenStax · '+t('力学基础','Mechanics foundations')}];
  return `${list.map(s=>`<a href="${E(s.url)}" target="_blank" rel="noopener">${E(s.title)}</a>`).join(' · ')} · ${t('基本原理参考；算例、参数与图解为本站编写。','Foundational references; examples, parameters and diagrams are original to this site.')}`;
 }
 function explanation(r,{t}){const m=r.metrics;
  if(r.id==='force-balance')return m.resultant<1e-8?t('合力为0，但两根绳仍各有张力；零向量没有确定方向。','The resultant is zero, while each cable remains under tension; the zero vector has no defined direction.'):t('先分别相加x、y分量，再求合力大小：','Add x and y components first, then take the norm: ')+number(m.resultantX)+' N, '+number(m.resultantY)+' N → '+number(m.resultant)+' N。';
  if(r.id==='counterweight')return t('两个配重的合力矩为','Net weight moment is ')+number(m.weightMoment)+' N·m'+t('；保持这个角度需额外施加', '; holding this angle requires an additional ')+number(m.holdingMoment)+' N·m。';
  if(r.id==='elastic-load')return t('当前保持拉力为','Current holding force is ')+number(m.elasticForce)+' N'+t('；从起点增加的弹性能为','; elastic energy added from the start is ')+number(m.elasticEnergy)+' J。';
  if(r.id==='rotational-inertia')return t('两颗配重合计惯量为','Combined inertia is ')+number(m.inertia)+' kg·m²'+t('；相同恒力矩下，角加速度为','; angular acceleration under this constant torque is ')+number(m.angularAcceleration)+' rad/s²。';
  if(r.id==='pulley-efficiency')return number(m.inputWork)+' J = '+number(m.outputWork)+' J + '+number(m.lostWork)+' J'+t('：输入功 = 配重势能 + 耗散。',': input work = gravitational energy + loss.');
  if(r.id==='base-stability')return r.extras.geometry.equilibrium?t('两侧所需反力均非负；在不滑动假设下可满足静态支撑。临界拉力为','Both required reactions are nonnegative. Under the non-sliding assumption, static support is possible. The threshold is ')+number(m.tippingForce)+' N。':t('左侧所需反力为负，地面不能把底座向下拉，静态支撑解失效。图中不模拟失稳后的翻倒。','The required left reaction is negative: the ground cannot pull the base down, so static support fails. Subsequent tipping is not simulated.');
  return '';
 }
 function diagram(r,{t,E}){
  const p=r.p,m=r.metrics,ink='var(--pd-ink)',muted='var(--pd-muted)',accent='var(--pd-accent)',other='#61a998';
  const line=(x1,y1,x2,y2,color=ink,arrow=false,dash='none')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2.5" stroke-dasharray="${dash}" ${arrow?'marker-end="url(#ex-new-arrow)"':''}/>`;
  const text=(x,y,value,color=ink)=>`<text x="${x}" y="${y}" fill="${color}" font-size="14">${E(value)}</text>`;
  const dot=(x,y,radius=6,color=ink)=>`<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}"/>`;
  let s='';
  if(r.id==='force-balance'){
   const scale=150/Math.max(1,p.forceA+p.forceB),o=[205,235],a=[o[0]+p.forceA*scale,o[1]],b=[o[0]+p.forceB*Math.cos(r.extras.geometry.angle)*scale,o[1]-p.forceB*Math.sin(r.extras.geometry.angle)*scale],end=[o[0]+m.resultantX*scale,o[1]-m.resultantY*scale];
   s=line(35,235,450,235,muted)+line(...o,...a,other,true)+line(...o,...b,other,true)+line(...a,...end,muted,false,'4 4')+line(...b,...end,muted,false,'4 4')+line(...o,...end,accent,true)+dot(...o)+text(30,35,'F₁='+p.forceA+' N; F₂='+p.forceB+' N')+text(30,65,'α='+number(m.angleBetween)+'°; |R|='+number(m.resultant)+' N')+text(30,300,t('绿：合力；浅绿：两股力；虚线：平行四边形','Green: resultant; pale: applied forces; dashed: parallelogram'))+text(30,330,t('所有力箭头使用同一比例','All force arrows use the same scale'));
  }else if(r.id==='counterweight'){
   const scale=105/Math.max(p.armLeft,p.armRight),a=r.extras.geometry.angle,left=[250-p.armLeft*scale*Math.cos(a),180+p.armLeft*scale*Math.sin(a)],right=[250+p.armRight*scale*Math.cos(a),180-p.armRight*scale*Math.sin(a)];
   s=`<path d="M235 213L250 185L265 213Z" fill="${muted}"/>`+line(...left,...right,ink)+dot(...left,12,other)+dot(...right,12,accent)+line(left[0],left[1],left[0],left[1]+28,other,true)+line(right[0],right[1],right[0],right[1]+28,accent,true)+text(25,32,'mL='+p.massLeft+' kg; mR='+p.massRight+' kg')+text(25,58,'L='+number(p.armLeft)+' m; R='+number(p.armRight)+' m; θ='+number(r.x)+'°')+text(25,325,t('支点可施加保持力矩；图形位置不是自由运动解','Pivot holds the angle; this is not a free-motion solution'));
  }else if(r.id==='elastic-load'){
   const x=170+225*r.progress;let spring='M65 175';for(let i=0;i<20;i++)spring+='L'+(80+(x-100)*i/19)+' '+(175+(i%2?13:-13));
   s=line(65,90,65,250,muted)+`<path d="${spring}L${x+15} 175" fill="none" stroke="${accent}" stroke-width="3"/>`+dot(x+15,175,9)+line(x+15,175,x+75,175,accent,true)+text(30,35,'F=F₀+kx = '+number(m.elasticForce)+' N')+text(30,300,'x='+number(m.extension)+' m; ΔU='+number(m.elasticEnergy)+' J')+text(30,330,t('线性弹性元件；未标定真实弹力带','Ideal linear element; not a calibrated resistance band'));
  }else if(r.id==='rotational-inertia'){
   const a=r.extras.geometry.angle,rad=p.radius*165,x=250+rad*Math.cos(a),y=180-rad*Math.sin(a),xx=250-rad*Math.cos(a),yy=180+rad*Math.sin(a);
   s=`<circle cx="250" cy="180" r="${rad}" fill="none" stroke="var(--pd-line)" stroke-dasharray="4 5"/>`+line(x,y,xx,yy,muted)+dot(x,y,13,accent)+dot(xx,yy,13,accent)+dot(250,180)+text(25,30,t('俯视水平转台，两颗配重各','Top view: each mass ')+p.pointMass+' kg')+text(25,58,'r='+number(p.radius)+' m; τ='+number(p.driveTorque)+' N·m')+text(25,305,'t='+number(r.x)+' s; ω='+number(m.angularSpeed)+' rad/s')+text(25,333,'K='+number(m.kineticEnergy)+' J; W='+number(m.driveWork)+' J');
  }else if(r.id==='pulley-efficiency'){
   const max=p.mass*9.81*p.travel/(p.ratio*p.efficiency),scale=330/Math.max(max,1);
   s=text(30,35,t('相同行程位置的机械能分配','Energy allocation at the same travel position'))+text(30,65,'n='+p.ratio+'; η='+number(p.efficiency)+'; x='+number(r.x)+' m')+text(30,112,t('输入功','Input work'))+`<rect x="30" y="123" width="${m.inputWork*scale}" height="24" rx="3" fill="${accent}"/>`+text(30,182,t('配重势能','Gravitational energy'))+`<rect x="30" y="193" width="${m.outputWork*scale}" height="24" rx="3" fill="${other}"/>`+text(30,252,t('耗散','Dissipation'))+`<rect x="30" y="263" width="${Math.max(0,m.lostWork*scale)}" height="24" rx="3" fill="${muted}"/>`+text(30,330,t('三条柱长共用能量比例；位置由y=x/n约束','Shared energy scale; travel obeys y=x/n'));
  }else if(r.id==='base-stability'){
   const b=p.halfWidth*200,h=p.forceHeight*100,y=290-h,w=p.mass*9.81,scale=70/Math.max(w,Math.abs(m.requiredLeft),Math.abs(m.requiredRight),r.x,1);
   s=line(35,295,465,295,muted)+`<path d="M${250-b} 288H${250+b}V80H${250-b}Z" fill="none" stroke="${ink}" stroke-width="3"/>`+line(250,y,250+r.x*scale,y,accent,true)+line(250,195,250,195+w*scale,muted,true)+line(250-b,288,250-b,288-m.requiredLeft*scale,other,true,m.requiredLeft<0?'5 4':'none')+line(250+b,288,250+b,288-m.requiredRight*scale,other,true)+text(25,28,'F='+number(r.x)+' N; Ftip='+number(m.tippingForce)+' N')+text(25,56,t('总宽2b=','Width 2b=')+number(2*p.halfWidth)+' m; h='+number(p.forceHeight)+' m')+text(25,332,r.extras.geometry.equilibrium?t('两侧接触可满足静态平衡','Both contacts can satisfy static balance'):t('虚线：负的所需反力，接触不能提供','Dashed: negative required reaction cannot be supplied'));
  }
  return `<svg viewBox="0 0 500 355" role="img" aria-label="${E(t('当前参数的计算图解','Computed diagram for the current parameters'))}"><defs><marker id="ex-new-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>${s}</svg>`;
 }
 function directoryHTML(X,labs,{t,E,modelPicker}){
  const groups=[['力与转动','Force and rotation'],['传动与阻力','Transmission and resistance'],['功、时间与运动','Work, time and motion'],['曲线、弹簧与测量','Curves, springs and measurement'],['动作综合实验','Movement studies']];
  const items=[...X.configs.map(c=>({...c,kind:protocols[c.id]?t('3组对照','3 comparisons'):''})),...labs.map(c=>({...c,theme:4,kind:t('动作综合','Movement study')}))];
  const kinds=['force','transmission','motion','measurement','study'];
  const topics=[['all',t('全部','All'),'topics',items.length],...groups.map((group,i)=>[String(i),t(...group),kinds[i],items.filter(item=>item.theme===i).length])];
  const sections=groups.map((group,index)=>{
   const entries=items.filter(item=>item.theme===index);
   const rows=entries.map(item=>`<li data-ex-card data-ex-theme="${index}" data-ex-search="${E([...item.title,...item.intro,item.id].join(' ').toLowerCase())}">
    <a href="#experiment/${item.id}">
      <div class="ex-library-entry"><h3>${t(...item.title)}</h3><p>${t(...item.intro)}</p></div>
      ${item.kind?`<small>${item.kind}</small>`:''}<span aria-hidden="true">↗</span>
    </a>
   </li>`).join('');
   return `<section class="ex-library-group" data-ex-group="${index}" aria-labelledby="ex-group-${index}">
    <div class="ex-section-heading"><h2 id="ex-group-${index}">${t(...group)}</h2><span>${entries.length} ${t('个实验','experiments')}</span></div><ol>${rows}</ol>
   </section>`;
  }).join('');
  return `<div class="ex-library-intro">
   <div><p class="pd-lead">${t('从一个具体问题出发，改参数、留对照，再用图和读数解释变化。','Start with a concrete question. Change parameters, keep a baseline, and explain the result with diagrams and readings.')}</p>
   <p class="ex-library-count"><strong>${items.length}</strong> ${t('个可操作实验','interactive experiments')} · ${X.configs.length} ${t('个基础实验','foundations')} · ${labs.length} ${t('个动作综合','movement studies')}</p></div>
   <figure class="bm-lab-image"><img src="assets/motion-story/stack.webp" alt="${t('配重片与调节插销','Weight plates and a selector pin')}" width="1120" height="1991" decoding="async"></figure>
  </div>
  <div class="ex-library-controls">
   <label>${t('搜索实验','Find an experiment')}<input type="search" id="ex-library-search" placeholder="${t('名称或关键词','Name or keyword')}" autocomplete="off"></label>
   ${modelPicker.filters(topics,t('按主题筛选实验','Filter experiments by topic'),'data-ex-filter')}
   ${modelPicker.hint()}
   <p id="ex-library-status" role="status" aria-live="polite">${t('显示全部','Showing all')} ${items.length} ${t('个实验','experiments')}</p>
  </div><div class="ex-library-groups">${sections}</div>
  <p id="ex-library-empty" hidden>${t('没有匹配的实验。换个关键词或选择“全部”。','No matches. Try another term or select All.')}</p>`;
 }
 function mountDirectory(root,{t}){
  const input=root.querySelector('#ex-library-search');
  let theme='all';
  const buttons=[...root.querySelectorAll('[data-ex-filter]')];
  const rows=[...root.querySelectorAll('[data-ex-card]')];
  const groups=[...root.querySelectorAll('[data-ex-group]')];
  const filter=()=>{
   const query=input.value.trim().toLowerCase();
   const visibleGroups=new Set();
   let count=0;
   for(const row of rows){
    row.hidden=!((theme==='all'||row.dataset.exTheme===theme)&&(!query||row.dataset.exSearch.includes(query)));
    if(!row.hidden){count++;visibleGroups.add(row.dataset.exTheme);}
   }
   for(const group of groups)group.hidden=!visibleGroups.has(group.dataset.exGroup);
   for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.exFilter===theme));
   root.querySelector('#ex-library-empty').hidden=count!==0;
   root.querySelector('#ex-library-status').textContent=t('找到','Found')+' '+count+' '+t('个实验','experiments');
  };
  input.addEventListener('input',filter);
  for(const button of buttons)button.addEventListener('click',()=>{theme=button.dataset.exFilter;filter();});
 }
 return {metrics,protocols,guideHTML,sourceHTML,explanation,diagram,directoryHTML,mountDirectory};
});
