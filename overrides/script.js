// Real personal measurements and demonstration geometry are independent states.
const BM = window.BM = window.BM || {};
const PERSONAL_NUMERIC_FIELDS = Object.freeze({
  height: [120, 230], weight: [35, 220], armSpan: [120, 240],
  upperArmLength: [20, 55], forearmLength: [18, 50], shoulderWidthCm: [28, 65],
  femurLength: [30, 75], tibiaLength: [28, 70], ankleDorsiflexionCm: [0, 20],
  plankSeconds: [0, 240], hingeGapCm: [0, 45], legRaiseAngle: [0, 120]
});
const MODEL_PROFILE_EXAMPLE = Object.freeze({
  height: 178, weight: 73, armSpan: 178, upperArmLength: 32,
  forearmLength: 27, shoulderWidthCm: 42, femurLength: 46, tibiaLength: 43
});
BM.modelLoads = { arm: 7.5, cam: 50, pec: 50, lat: 50, 'barbell-squat': 100 };

const telemetry = {
  activeScene: 'arm',
  armAngle: 44,
  armRightAngle: 44,
  cableFlyPair: { x: 0, y: 0, z: 0 },
  armLinkLength: 0.35,
  cableMode: true,
  camAngle: 0,
  camAggression: 1,
  sledTare: 45,
  plateMass: 96.4,
  totalMovingMass: 141.4,
  slopeAngle: 45,
  friction: 0.05,
  m3_pos: 0,
  m3_vel: 0,
  m3_state: 'idle',
  m3_history: [],
  m3_energyLoss: 0,
  m3_travelM: 1.5, // Explicit model-example stroke; progress remains dimensionless.
  sledUserControlled: false,
  pecAngle: 58,
  pecCam: 1.05,
  latAngle: 64,
  latPulley: 72,
  squatDepth: 62,
  squatMode: 'free',
  machineTuning: {
    pathAngleOffset: 0,
    seatHeightOffset: 0,
    camBiasOffset: 0,
    efficiency: 0.88
  },
  machineSceneTuning: {},
  extraProgress: {},
  independentArmProgress: {},
  extraLoad: {},
  userProfile: createEmptyUserProfile()
};
window.telemetry = telemetry;
BM.modelProfile = buildModelProfile(telemetry.userProfile);

let focusSceneHandler = null;
let pendingPortalScene = null;
let activeLabCategory = '';

const EXTRA_ACTION_DEFS = [
  { key: 'cable-row', code: '07', group: '背部', title: 'Life Fitness Axiom OP-RW Seated Row 坐姿划船机', tab: 'Axiom OP-RW 坐姿划船', muscle: '背阔肌 / 菱形肌', metric: '背部收缩效率', cue: '双脚压稳斜面脚踏，先做肩胛后缩再拉自调节握把；不要用躯干大幅后仰把划船变成惯性摆动。', formula: 'τ_row ≈ T_cable · r_lever · sinα', curve: 'mid', model: 'row' },
  { key: 'barbell-bench', code: '08', group: '胸部', title: 'Hammer Strength O-FB 奥林匹克平板卧推架', tab: 'Hammer O-FB 卧推', muscle: '胸大肌 / 肱三头', metric: '胸肩肘综合压力', cue: '下放到胸口附近时肩前侧压力最高，肩胛夹紧、手腕垂直杠铃。', formula: 'τ_shoulder ≈ F_bar · r_humerus · sinθ', curve: 'bottom', model: 'press' },
  { key: 'flat-press', code: '09', group: '胸部', title: 'Life Fitness Axiom OP-CP 选择式推胸机', tab: 'Axiom OP-CP 推胸', muscle: '胸大肌', metric: '胸推有效刺激', cue: '器械轨迹更固定，适合稳定加重量；手柄别推到肩膀前顶。', formula: 'F_chest ≈ W_stack · path_gain · sinθ', curve: 'mid', model: 'press' },
  { key: 'incline-press', code: '10', group: '胸部', title: 'Hammer Strength IL-IP Iso-Lateral 上斜推胸机', tab: 'Hammer IL-IP 上斜推胸', muscle: '上胸 / 三角肌前束', metric: '上胸压力', cue: '沿预设上斜轨迹推举，保持肩胛稳定，避免耸肩或用惯性抢推。', formula: 'F_upper ≈ F_press · cos(bench_angle)', curve: 'late', model: 'press-up' },
  { key: 'cable-fly', code: '12', group: '胸部', title: 'Life Fitness OP-DAP 双塔可调滑轮夹胸', tab: 'OP-DAP 2:1 滑轮夹胸', muscle: '胸大肌中缝', metric: '全程夹胸张力', cue: '绳索能让中段和末端持续有张力，别用手腕交叉甩过去。', formula: 'T_fly ≈ T_cable · sin(adduction_angle)', curve: 'late', model: 'fly' },
  { key: 'machine-fly', code: '13', group: '胸部', title: 'Life Fitness Insignia SS-PEC Pectoral Fly 蝶式胸肌训练机', tab: 'Insignia SS-PEC 夹胸', muscle: '胸大肌', metric: '独立凸轮夹胸张力', cue: '双侧转臂由中央凸轮驱动；先把座椅调到握把与胸中线接近，打开过深仍会增加肩前侧压力。', formula: 'T_machine ≈ W_stack · r_cam(θ) / L_handle', curve: 'late', model: 'fly' },
  { key: 'scissor-pulldown', code: '14', group: '背部', title: 'Hammer Strength IL-WPD Iso-Lateral 宽握下拉机', tab: 'Hammer IL-WPD 宽握下拉', muscle: '背阔肌外侧', metric: '背阔展开张力', cue: '分动圆弧轨迹更容易让背阔打开，肘往两侧下压，不要耸肩拉。', formula: 'τ_lat ≈ F_handle · r_lat · arc_gain', curve: 'mid', model: 'pulldown-wide' },
  { key: 'nautilus-pullover', code: '15', group: '背部', title: 'Nautilus Inspiration IPPO3 Pull Over 上拉机', tab: 'Nautilus IPPO3 Pull Over', muscle: '背阔肌 / 大圆肌', metric: '直臂下压张力', cue: '肘顶住环抱式挡垫，用背把上臂往下压；大号辅助脚踏用于安全进入和退出起始位。', formula: 'τ_pullover ≈ F_cam · r_upperarm · sinθ', curve: 'late', model: 'pullover' },
  { key: 'hammer-row', code: '17', group: '背部', title: 'Hammer Strength IL-ROW Iso-Lateral 胸托划船机', tab: 'Hammer IL-ROW 胸托划船', muscle: '背阔 / 中背', metric: '胸托划船效率', cue: '胸托能减少腰部压力，重点把手肘往后下方收，不要只用二头拉。', formula: 'F_row ≈ W_plate · lever_arm · sinθ', curve: 'mid', model: 'row' },
  { key: 'cable-pulldown', code: '18', group: '背部', title: 'Life Fitness Axiom OP-LR Lat Pulldown / Low Row 组合机', tab: 'Axiom OP-LR 下拉/低位划船', muscle: '背阔肌 / 菱形肌', metric: '双功能钢索有效拉力', cue: '高位下拉时锁住大腿；切换低位划船把手后双脚顶稳脚踏，先收肩胛再拉肘。', formula: 'F_handle ≈ M_stack · g / ratio', curve: 'late', model: 'pulldown' },
  { key: 'machine-military-press', code: '20', group: '肩部', title: 'Hammer Strength IL-SP Iso-Lateral 肩推机', tab: 'Hammer IL-SP 肩推', muscle: '三角肌 / 肱三头肌', metric: '分动肩推力矩', cue: '26° 座椅让推力更稳定；左右转臂独立运动，别用腰反弓代替肩部发力。', formula: 'F_user · L_effort = M_plate · g · L_load', curve: 'late', model: 'shoulder' },
  { key: 'seated-machine-shoulder', code: '21', group: '肩部', title: 'Life Fitness Axiom OP-SP 选择式肩推机', tab: 'Axiom OP-SP 肩推', muscle: '三角肌', metric: '固定推肩负荷', cue: '靠背支撑更强，适合稳定加重量；手肘略在身体前侧更舒服。', formula: 'τ_press ≈ W_stack · guided_path_gain', curve: 'mid', model: 'shoulder-machine' },
  { key: 'barbell-squat', code: '22', group: '腿部', title: 'Hammer Strength HD Athletic NX 四柱力量架深蹲', tab: 'HD Athletic NX 深蹲架', muscle: '股四头 / 臀 / 竖脊肌', metric: '腰膝综合压力', cue: '倒蹬机已独立，本动作只看自由深蹲：腹压、脚踝和髋控决定你能不能安全加重。', formula: 'F_shear ≈ M_bar · g · sin(trunk_angle)', curve: 'late', model: 'squat' }
];

EXTRA_ACTION_DEFS.forEach((def) => { def.metric = '模型相对力矩'; });
const EXTRA_ACTION_MAP = Object.fromEntries(EXTRA_ACTION_DEFS.map((def) => [def.key, def]));
const INDEPENDENT_ARM_SCENES = new Set(['incline-press', 'machine-military-press', 'scissor-pulldown', 'hammer-row']);

// Practical equipment guidance, kept separate from the live physics readouts.
const ACTION_GUIDES = {
  "arm": {
    "cue": "稳住身体，肘带着上臂侧抬，慢慢放下。",
    "setup": "滑轮设为低位并扣好握把，确认锁销、配重插销和连接扣扣牢；双侧训练设为同高、同重量。",
    "steps": [
      "双侧时站在双塔中间，各握对侧低位握把；单侧时侧身靠近一塔，用远侧手握把。双脚站稳。",
      "肘保持微弯，将上臂向侧面抬到约肩高；身体稳住，肩膀不要向耳朵耸起。",
      "沿原路缓慢放回，躯干不摇摆；单侧训练做完后换边。"
    ],
    "caution": [
      "不要甩腰、借腿蹬地或用手腕猛拉；抬不稳就减轻重量。",
      "调滑轮或换重量前先让配重落稳；肩部出现刺痛时停止。"
    ],
    "sources": [
      {
        "title": "Life Fitness OP-DAP 官方使用手册",
        "url": "https://support.lifefitness.com/hc/en-us/articles/360039412093-Life-Fitness-Axiom-OP-DAP-Dual-Adjustable-Pulley-Owner-s-Manual"
      },
      {
        "title": "ACE 绳索训练：侧平举",
        "url": "https://www.acefitness.org/cp/pdfs/CertifiedNews/AugSept09Cert.pdf"
      }
    ]
  },
  "cam": {
    "cue": "膝轴对齐，垫在踝上，慢伸慢回。",
    "setup": "调靠背让膝关节对准器械转轴，小腿垫放在脚踝上方；选轻重量并插牢配重销。",
    "steps": [
      "坐稳、背靠垫，双手握住座椅侧把手；大腿留在座垫上，小腿置于滚垫后方。",
      "用大腿前侧发力，平稳抬起小腿，伸到接近直腿时停住，不猛锁膝。",
      "缓慢屈膝回到起点，保持臀部和背部贴垫，别让配重砸落。"
    ],
    "caution": [
      "滚垫不要顶住膝盖或压在脚背；先对齐膝轴再开始。",
      "不要踢甩、抬臀或借躯干后仰发力；膝部出现刺痛就停止。"
    ],
    "sources": [
      {
        "title": "Life Fitness Axiom 官方使用手册",
        "url": "https://support.lifefitness.com/hc/en-us/articles/360053163033-Life-Fitness-Axiom-Series-Single-and-Dual-Stations-Owner-s-Manual"
      },
      {
        "title": "ACE 膝伸展：躯干稳定与缓慢伸膝",
        "url": "https://www.acefitness.org/getfit/studies/FunctionFitness.pdf"
      },
      {
        "title": "Life Fitness OP-LE 官方靠背与胫骨垫说明",
        "url": "https://www.lifefitness.com/en-us/catalog/strength-training/selectorized/axiom-series-leg-extension"
      }
    ]
  },
  "incline": {
    "cue": "背臀贴垫、全脚踩稳；结束先挂牢。",
    "setup": "先确认滑车挂在承重挂钩上，认清保险把手；左右对称装片，初次先用空车或轻负荷。",
    "steps": [
      "背和臀贴住靠垫，双脚放在踏板上；稍伸腿托住滑车，再按器械标示解除挂钩。",
      "控制滑车下降到背臀仍贴垫的位置，再用全脚掌推回；膝盖随脚尖方向移动。",
      "结束时先推到能重新挂回的位置，复位保险把手并缓慢落车；确认挂钩承重后再移开双脚。"
    ],
    "caution": [
      "不要猛锁膝、抬脚跟或下放到骨盆卷起离垫；下降深度以能保持姿势为限。",
      "第一次请现场教练演示挂钩和限位装置；滑车尚未挂牢时不要起身或拿开脚。"
    ],
    "sources": [
      {
        "title": "Hammer Strength HSLLP 官方产品与挂钩说明",
        "url": "https://www.lifefitness.com/en-us/catalog/strength-training/plate-loaded/plate-loaded-linear-leg-press"
      },
      {
        "title": "ACE 腿举动作指导",
        "url": "https://www.acefitness.org/resources/everyone/exercise-library/154/seated-leg-press/"
      }
    ]
  },
  "pec": {
    "cue": "胸飞鸟向前合拢，后束向两侧打开。",
    "setup": "选轻重量并锁好起始档位：胸飞鸟设较宽起点、背靠垫；后束设靠前起点、面朝垫。",
    "steps": [
      "调座椅让握把略低于肩，双脚站稳；胸飞鸟握竖把，后束握横把，肘保持微弯。",
      "胸飞鸟把双手向前合拢；后束保持胸部贴垫，将双手向两侧打开。",
      "沿原路慢慢返回，在能控制的范围内重复，别甩动转臂或让配重砸落。"
    ],
    "caution": [
      "不要耸肩、挺腰或硬把手臂拉到身后；打开到肩部舒适的位置即可。",
      "切换胸飞鸟与后束前，先让配重落稳，再确认两侧起始档位锁住。"
    ],
    "sources": [
      {
        "title": "Life Fitness Axiom 官方使用手册",
        "url": "https://support.lifefitness.com/hc/en-us/articles/360053163033-Life-Fitness-Axiom-Series-Single-and-Dual-Stations-Owner-s-Manual"
      },
      {
        "title": "ACE 通用飞鸟动作：肘微弯、慢速合拢与回放",
        "url": "https://www.acefitness.org/resources/everyone/exercise-library/160/standing-chest-fly/"
      },
      {
        "title": "Life Fitness OP-FLY 官方双动作说明",
        "url": "https://www.lifefitness.com/en-us/catalog/strength-training/selectorized/axiom-series-pectoral-fly-rear-deltoid"
      }
    ]
  },
  "lat": {
    "cue": "肘向下收，身体不晃，握把慢回。",
    "setup": "选轻重量并插牢配重销；调整座椅，让坐下后大腿稳在固定压腿垫下方。",
    "steps": [
      "握住两侧长握把，受控拉低后坐下；双脚踩稳，背保持自然伸展。",
      "肘向下、向身体两侧收，沿转臂轨迹拉到双手约肩高，躯干保持稳定。",
      "缓慢让握把回升，手肘逐渐伸直；结束时仍控制握把，直到配重落稳。"
    ],
    "caution": [
      "不要靠大幅后仰或耸肩抢拉，也不要把握把拉向颈后。",
      "这是固定转臂握把，顺着器械轨迹运动；不要硬扭轨迹或放手弹回。"
    ],
    "sources": [
      {
        "title": "Life Fitness Axiom 官方使用手册",
        "url": "https://support.lifefitness.com/hc/en-us/articles/360053163033-Life-Fitness-Axiom-Series-Single-and-Dual-Stations-Owner-s-Manual"
      },
      {
        "title": "Life Fitness Axiom OP-PD 官方座椅与压腿垫说明",
        "url": "https://www.lifefitness.com/en-us/catalog/strength-training/selectorized/axiom-series-lat-pulldown"
      },
      {
        "title": "ACE 下拉：肘向下、躯干稳定与受控回程",
        "url": "https://www.acefitness.org/resources/everyone/exercise-library/158/seated-lat-pulldown/"
      }
    ]
  },
  "barbell-squat": {
    "cue": "收紧腹部、全脚压地，髋胸一起起身。",
    "setup": "J 杯调到略低于肩；保护杆或安全带设在计划最低点略下方并锁牢，先用空杆练习。",
    "steps": [
      "钻到杠下，让杠落在上背肌肉上；握紧杠、站起出架，再小步后退站稳。",
      "收紧腹部，屈髋屈膝向下蹲；脚跟不抬起，膝盖沿脚尖方向移动，下降到能控制的位置。",
      "全脚掌压地，髋和胸一起起身；结束后向前回架，确认杠铃两端都落入 J 杯再松手。"
    ],
    "caution": [
      "杠不要压在颈椎上；别为了蹲深而弓背、脚跟离地或让膝盖向内塌。",
      "初次负重请教练检查保护装置并协助保护；姿势开始失控就结束该组。"
    ],
    "sources": [
      {
        "title": "ACE 杠铃背蹲动作指导",
        "url": "https://www.acefitness.org/resources/everyone/exercise-library/11/back-squat/"
      },
      {
        "title": "Hammer Strength HD Athletic NX 官方保护装置说明",
        "url": "https://www.lifefitness.com/en-us/catalog/strength-training/racks-rigs-platforms/hd-athletic-nx-power-rack"
      }
    ]
  },
  "machine-fly": {
    "cue": "背肩贴垫，双手合拢，再慢慢打开。",
    "setup": "调座椅，使握住把手时手肘略低于肩；起始打开幅度选肩部舒适的一档，锁牢并选轻重量。",
    "steps": [
      "背靠垫、胸自然抬起，双脚踩稳；握住把手，肘保持微弯。",
      "保持背肩贴垫，平稳把两侧握把向前合拢，不靠身体前冲带动。",
      "缓慢打开到设定起点，保持肩部稳定，别让配重砸落。"
    ],
    "caution": [
      "不要耸肩、挺腰或把起点开得过深；肩前侧出现刺痛就停止。",
      "调座椅或起始档位前先让配重落稳；不要在转臂运动中拔调节销。"
    ],
    "sources": [
      {
        "title": "Life Fitness Insignia 官方使用手册：SS-PEC",
        "url": "https://kb.cybexintl.com/Owners_Manuals/Strength/Life_Fitness_Insignia_Series_Owners_Manual_9481201_Rev_BE.pdf"
      },
      {
        "title": "ACE 通用飞鸟动作：肘微弯、慢速合拢与回放",
        "url": "https://www.acefitness.org/resources/everyone/exercise-library/160/standing-chest-fly/"
      }
    ]
  },
  "cable-row": {
    "cue": "脚踩稳，肘向后拉，握把慢慢送回。",
    "setup": "双脚放在斜面脚踏上，膝盖微弯，坐直并握住自调节握把；确认配重选择到位。",
    "steps": [
      "抬头、胸部自然挺起，保持背部稳定，双臂向前伸到自己能控制的位置。",
      "双脚持续压住脚踏，平稳拉回握把，让手肘随动作向身后移动。",
      "控制握把返回起始位置，躯干保持稳定，避免配重猛落。"
    ],
    "caution": [
      "不要靠躯干大幅前后摆动把重量拉起来。",
      "不要为追求更远的回拉而耸肩或弓背，保持手腕随握把自然对齐。"
    ],
    "sources": [
      {
        "title": "Life Fitness Axiom 厂家使用手册：OP-RW（第51页）",
        "url": "https://kb.cybexintl.com/Owners_Manuals/Strength/OM-OP_Life_Fitness_Axiom_Single_Station_Series_1014208-0001.pdf"
      },
      {
        "title": "Life Fitness Axiom OP-RW 厂家产品页",
        "url": "https://www.lifefitness.com/en-us/catalog/strength-training/selectorized/axiom-series-seated-row"
      }
    ]
  },
  "barbell-bench": {
    "cue": "脚踩稳、肩背贴凳，杠铃慢放稳推。",
    "setup": "确认杠铃稳放在承杠钩内、杠铃片固定可靠，并安排保护同伴协助出杠和回杠；仰卧后双脚踩稳，双手全握杠铃。",
    "steps": [
      "稳定肩背与臀部的位置，在保护同伴协助下将杠铃移出承杠钩，先稳住杠铃。",
      "缓慢把杠铃降向胸前，让手肘保持在手腕下方，不用胸部弹起杠铃。",
      "脚持续踩稳，把杠铃平稳推回；结束时先稳住杠铃，再由保护同伴协助放回两侧承杠钩。"
    ],
    "caution": [
      "不要使用拇指不环握的握法，也不要抬臀或突然反弹借力。",
      "没有确认杠铃已可靠回到两侧承杠钩前，不要松手；初学时请保护同伴全程在旁。"
    ],
    "sources": [
      {
        "title": "Hammer Strength O-FB 厂家产品页",
        "url": "https://www.lifefitness.com/en-us/catalog/strength-training/benches/olympic-flat-bench"
      },
      {
        "title": "ACE 动作库：杠铃卧推",
        "url": "https://www.acefitness.org/resources/everyone/exercise-library/5/chest-press/"
      },
      {
        "title": "ACE 杠铃卧推动作说明",
        "url": "https://www.acefitness.org/certifiednewsarticle/3003/what-are-the-top-3-most-effective-chest-exercises/"
      },
      {
        "title": "ACE 重量训练与保护同伴建议",
        "url": "https://www.acefitness.org/resources/everyone/blog/5502/a-woman-s-guide-to-gaining-muscle-with-weight-training/"
      }
    ]
  },
  "flat-press": {
    "cue": "肩背贴垫，从胸前平稳向前推。",
    "setup": "调好座椅，使握把接近胸部中间高度；肩部贴靠背垫，握稳一组握把，确认配重选择到位。",
    "steps": [
      "头和胸部自然抬起，手肘略低于肩部，稳定坐姿与握把位置。",
      "保持肩背贴垫，平稳向前推握把，双臂逐渐伸直。",
      "慢慢弯肘回到起始位置，控制配重下降，不让它猛撞回去。"
    ],
    "caution": [
      "不要抬臀或用腰部反弓把握把顶出去。",
      "不要突然撞击动作末端；手柄位置或动作幅度不舒服时先停下调整。"
    ],
    "sources": [
      {
        "title": "Life Fitness Axiom 厂家使用手册：OP-CP（第46页）",
        "url": "https://kb.cybexintl.com/Owners_Manuals/Strength/OM-OP_Life_Fitness_Axiom_Single_Station_Series_1014208-0001.pdf"
      },
      {
        "title": "Life Fitness Axiom OP-CP 厂家产品页",
        "url": "https://www.lifefitness.com/en-gb/catalog/strength-training/selectorized/axiom-series-chest-press"
      }
    ]
  },
  "incline-press": {
    "cue": "肩背靠稳，沿上斜轨迹推起、慢回。",
    "setup": "确认两侧工作臂的杠铃片固定可靠；坐稳并靠住背垫，握住横向握把，让起始手柄接近胸部中间或略高的位置。",
    "steps": [
      "胸部自然挺起，手肘略低于肩部，手腕与前臂保持对齐。",
      "保持躯干稳定，让两侧独立工作臂沿器械上斜轨迹平稳伸展。",
      "慢慢弯肘把握把送回起始位置，两侧都保持控制。"
    ],
    "caution": [
      "不要耸肩、抬臀或用腰部反弓抢推。",
      "不要把杠铃片装在储片杆上当作工作阻力；装卸前先让工作臂回到稳定位置。"
    ],
    "sources": [
      {
        "title": "Hammer Strength IL-IP 厂家产品页",
        "url": "https://www.lifefitness.com/en-us/catalog/strength-training/plate-loaded/plate-loaded-iso-lateral-incline-press"
      },
      {
        "title": "Hammer Strength Iso-Lateral 厂家手册：上斜推胸（转载，第18页）",
        "url": "https://www.manualslib.com/manual/1070990/Hammer-Strength-Iso-Lateral.html?page=18"
      },
      {
        "title": "ACE 动作库：上斜推胸的身体与手腕稳定",
        "url": "https://www.acefitness.org/resources/everyone/exercise-library/25/incline-chest-press/"
      }
    ]
  },
  "cable-fly": {
    "cue": "站稳、肘微弯，画弧合拢再慢慢打开。",
    "setup": "把双侧滑轮设在肩部附近或略高的位置，确认滑轮车锁销完全入位、握把连接可靠；握住两侧把手，前后错步站稳。",
    "steps": [
      "向前站到钢索有张力的位置，躯干保持稳定，手肘微弯，双臂向两侧打开。",
      "保持手肘弯曲幅度大致不变，把两只握把沿弧线带到身体前方。",
      "控制双臂慢慢打开，回到可控制的起始位置，不让钢索把身体拉回去。"
    ],
    "caution": [
      "不要甩手、过度交叉双手或靠身体大幅前后摆动夹胸。",
      "每次调整滑轮高度后，都先确认锁销已完全卡入，再开始拉动钢索。"
    ],
    "sources": [
      {
        "title": "Life Fitness OP-DAP 厂家使用手册（第27页）",
        "url": "https://kb.cybexintl.com/Owners_Manuals/Strength/AI_OP_DAP_Dual_Adj_Pulley_1013248-0001_English.pdf"
      },
      {
        "title": "ACE 动作库：站姿绳索夹胸",
        "url": "https://www.acefitness.org/resources/everyone/exercise-library/160/standing-chest-fly/"
      },
      {
        "title": "ACE 绳索夹胸：站姿和弧线动作",
        "url": "https://www.acefitness.org/certifiednewsarticle/3003/what-are-the-top-3-most-effective-chest-exercises/"
      }
    ]
  },
  "scissor-pulldown": {
    "cue": "大腿固定，肘沿弧线下收，慢慢回升。",
    "setup": "确认工作臂片重固定可靠；调好座椅和大腿垫，双脚踩地，正手握住上方把手后坐稳，让大腿处在垫下。",
    "steps": [
      "保持背部稳定、双脚着地，让两侧手臂进入可控制的上举位置。",
      "沿器械的宽握弧线向下拉，手肘随握把向下移动，身体保持稳定。",
      "慢慢让工作臂回到上方，保持坐姿与大腿固定，不突然放手。"
    ],
    "caution": [
      "不要靠身体大幅后仰或晃动把工作臂拽下来。",
      "不要把手柄硬拉到不舒服的范围；两侧独立运动时也要避免扭转躯干。"
    ],
    "sources": [
      {
        "title": "Hammer Strength IL-WPD 厂家产品页",
        "url": "https://www.lifefitness.com/en-us/catalog/strength-training/plate-loaded/plate-loaded-iso-lateral-wide-pulldown"
      },
      {
        "title": "Hammer Strength Iso-Lateral 厂家手册：IL-WPD（转载，第30页）",
        "url": "https://www.manualslib.com/manual/1070990/Hammer-Strength-Iso-Lateral.html?page=30"
      }
    ]
  },
  "nautilus-pullover": {
    "cue": "双肘贴垫，用上臂带动转臂下压。",
    "setup": "按机身图示调好座椅与起始位置，坐稳、靠住背垫并使用安全带；确认肩部位置与标示转轴相配，准备握把和肘垫。",
    "steps": [
      "按机身图示使用辅助脚踏进入起始位置，握稳把手，把双肘放好在肘垫上。",
      "保持躯干贴靠背垫，以上臂带动肘垫向身体前下方转动，双肘持续贴垫。",
      "慢慢回到可控制的起始位置；结束时按图示用辅助脚踏协助退出，确认转臂稳定后再解除安全带离开。"
    ],
    "caution": [
      "不要靠蹬脚踏、抬臀或弯腰完成重复动作，也不要让肘垫突然把双臂拉回。",
      "首次使用请场馆教练演示辅助脚踏的进入与退出方式；不要硬拉到肩部不适的位置。"
    ],
    "sources": [
      {
        "title": "Core Health & Fitness：Nautilus IPPO3 厂家产品说明（2020年，转载）",
        "url": "https://fitnessengros.dk/media/51/ea/4f/1607679426/Nautilus%20Inspiration%20Pull%20Over.pdf"
      }
    ]
  },
  "hammer-row": {
    "cue": "胸部贴垫，肘向后拉，身体不晃。",
    "setup": "确认两侧工作臂片重固定可靠；调好座椅，胸部贴住胸垫，双脚踩实脚踏，握住把手，让手腕与手肘的路线自然对齐。",
    "steps": [
      "保持胸部贴垫，双臂向前伸到可控制的位置，先稳住身体。",
      "平稳把握把拉向胸前，让手肘随动作向身后移动，两侧独立工作臂都保持控制。",
      "慢慢向前送回握把，胸部继续贴垫，回到起始位置。"
    ],
    "caution": [
      "不要让胸部离开胸垫，再靠后仰或甩动身体拉重量。",
      "不要耸肩或过度掰手腕；单侧动作时也要保持躯干正对胸垫。"
    ],
    "sources": [
      {
        "title": "Hammer Strength IL-ROW 厂家产品页",
        "url": "https://www.lifefitness.com/en-us/catalog/strength-training/plate-loaded/plate-loaded-iso-lateral-row"
      },
      {
        "title": "Hammer Strength Iso-Lateral 厂家手册：IL-ROW（转载，第27页）",
        "url": "https://www.manualslib.com/manual/1070990/Hammer-Strength-Iso-Lateral.html?page=27"
      }
    ]
  },
  "cable-pulldown": {
    "cue": "下拉肘向下，划船肘向后；回程放慢。",
    "setup": "高位下拉使用上方横杆并把大腿放在大腿垫下；低位划船使用下方中性握把、双脚踩脚踏。切换前让配重回落，再按机身标示连接对应附件。",
    "steps": [
      "下拉：握住上方横杆后坐稳，躯干保持轻微后倾；把横杆控制地拉向胸前，再慢慢送回上方。",
      "划船：坐在能握到下方把手的位置，脚踩稳脚踏、头胸自然抬起；把握把拉向躯干，让手肘到身体两侧。",
      "两种动作都保持躯干稳定并控制回程；结束后让配重受控回落，再放下附件。"
    ],
    "caution": [
      "高位下拉把横杆拉在身体前方，不拉到颈后，也不靠大幅后仰抢拉。",
      "低位划船不要弓背或前后甩动；配重还悬起时不要更换握把或调节配重。"
    ],
    "sources": [
      {
        "title": "Life Fitness Axiom 厂家使用手册：OP-LR 下拉与划船（第60页）",
        "url": "https://kb.cybexintl.com/Owners_Manuals/Strength/OM-OP_Life_Fitness_Axiom_Single_Station_Series_1014208-0001.pdf"
      },
      {
        "title": "Life Fitness Axiom OP-LR 厂家产品页",
        "url": "https://www.lifefitness.com/en-us/catalog/strength-training/selectorized/axiom-series-lat-pulldown-low-row"
      }
    ]
  },
  "machine-military-press": {
    "cue": "肩背贴垫，沿固定弧线向上推。",
    "setup": "确认两侧工作臂的杠铃片固定可靠；调好座椅，让起始握把接近肩部或略高，坐稳并把肩背贴住背垫。",
    "steps": [
      "头和胸部自然抬起，握稳把手，保持手腕与前臂自然对齐。",
      "保持躯干稳定，让两侧工作臂平稳向上运动，手肘随推举逐渐伸展。",
      "慢慢弯肘，把把手降回自己能控制的起始位置，两侧都不突然放松。"
    ],
    "caution": [
      "不要抬臀或用腰部反弓把重量顶上去。",
      "不要耸肩抢推或突然撞击动作末端；装卸片重前让工作臂回到稳定位置。"
    ],
    "sources": [
      {
        "title": "Hammer Strength IL-SP 厂家产品页",
        "url": "https://www.lifefitness.com/en-us/catalog/strength-training/plate-loaded/plate-loaded-iso-lateral-shoulder-press"
      },
      {
        "title": "Hammer Strength Iso-Lateral 厂家手册：IL-SP（转载，第28页）",
        "url": "https://www.manualslib.com/manual/1070990/Hammer-Strength-Iso-Lateral.html?page=28"
      }
    ]
  },
  "seated-machine-shoulder": {
    "cue": "坐稳、肩背贴垫，向上推起再慢放。",
    "setup": "调好座椅，使握把接近肩部或略高；选择舒服的一组握把，双脚踩稳、肩背靠垫，并确认配重选择到位。",
    "steps": [
      "头和胸部自然抬起，握稳把手，保持肩背贴住背垫。",
      "沿器械轨迹向上推握把，让手肘逐渐伸展，身体保持稳定。",
      "慢慢弯肘返回起始位置，控制配重下降，不让配重猛撞。"
    ],
    "caution": [
      "不要抬臀、反弓腰部或耸肩借力。",
      "起始握把位置或动作幅度不舒服时先停下调整，不要硬顶着继续推。"
    ],
    "sources": [
      {
        "title": "Life Fitness Axiom 厂家使用手册：OP-SP（第52页）",
        "url": "https://kb.cybexintl.com/Owners_Manuals/Strength/OM-OP_Life_Fitness_Axiom_Single_Station_Series_1014208-0001.pdf"
      },
      {
        "title": "Life Fitness Axiom OP-SP 厂家产品页",
        "url": "https://www.lifefitness.com/en-us/catalog/strength-training/selectorized/axiom-series-shoulder-press"
      }
    ]
  }
};

const MACHINE_REFERENCES = {
  arm: {
    name: 'Life Fitness OP-DAP 双塔可调滑轮训练器',
    image: 'assets/equipment-reference/op-dap.png',
    source: 'https://shop.lifefitness.com/products/axiom-dual-adjustable-pulley'
  },
  cam: {
    name: 'Life Fitness Axiom OP-LE 膝伸展机',
    image: 'assets/equipment-reference/op-le.png',
    source: 'https://www.lifefitness.com/en-us/catalog/strength-training/selectorized/axiom-series-leg-extension'
  },
  incline: {
    name: 'Hammer Strength HSLLP 45° 线性倒蹬机',
    image: 'assets/equipment-reference/hsllp.png',
    source: 'https://www.lifefitness.com/en-us/catalog/strength-training/plate-loaded/plate-loaded-linear-leg-press'
  },
  pec: {
    name: 'Life Fitness Axiom OP-FLY 胸飞鸟 / 后束机',
    image: 'assets/equipment-reference/op-fly.png',
    source: 'https://www.lifefitness.com/en-us/catalog/strength-training/selectorized/axiom-series-pectoral-fly-rear-deltoid'
  },
  lat: {
    name: 'Life Fitness Axiom OP-PD 高位下拉机',
    image: 'assets/equipment-reference/op-pd.png',
    source: 'https://www.lifefitness.com/en-us/catalog/strength-training/selectorized/axiom-series-lat-pulldown'
  },
  squat: {
    name: 'Hammer Strength HD Athletic NX 四柱力量架',
    image: 'assets/equipment-reference/nx-rack.jpg',
    source: 'https://www.lifefitness.com/en-us/catalog/strength-training/racks-rigs-platforms/hd-athletic-nx-power-rack'
  },
  'barbell-squat': {
    name: 'Hammer Strength HD Athletic NX 四柱力量架',
    image: 'assets/equipment-reference/nx-rack.jpg',
    source: 'https://www.lifefitness.com/en-us/catalog/strength-training/racks-rigs-platforms/hd-athletic-nx-power-rack'
  },
  'cable-row': {
    name: 'Life Fitness Axiom OP-RW 坐姿划船机',
    image: 'assets/equipment-reference/op-rw.png',
    source: 'https://www.lifefitness.com/en-us/catalog/strength-training/selectorized/axiom-series-seated-row'
  },
  'barbell-bench': {
    name: 'Hammer Strength O-FB 奥林匹克平板卧推架',
    image: 'assets/equipment-reference/o-fb.png',
    source: 'https://www.lifefitness.com/en-us/catalog/strength-training/benches/olympic-flat-bench'
  },
  'flat-press': {
    name: 'Life Fitness Axiom OP-CP 选择式推胸机',
    image: 'assets/equipment-reference/op-cp.png',
    source: 'https://www.lifefitness.com/en-us/catalog/strength-training/selectorized/axiom-series-chest-press'
  },
  'incline-press': {
    name: 'Hammer Strength IL-IP Iso-Lateral 上斜推胸机',
    image: 'assets/equipment-reference/il-ip.png',
    source: 'https://www.lifefitness.com/en-us/catalog/strength-training/plate-loaded/plate-loaded-iso-lateral-incline-press'
  },
  'cable-fly': {
    name: 'Life Fitness OP-DAP 双侧可调滑轮夹胸',
    image: 'assets/equipment-reference/op-dap.png',
    source: 'https://shop.lifefitness.com/products/axiom-dual-adjustable-pulley'
  },
  'machine-fly': {
    name: 'Life Fitness Insignia SS-PEC 蝶式胸肌训练机',
    image: 'assets/equipment-reference/ss-pec.png',
    source: 'https://www.lifefitness.com/en-us/catalog/strength-training/selectorized/insignia-series-pectoral-fly'
  },
  'scissor-pulldown': {
    name: 'Hammer Strength IL-WPD Iso-Lateral 宽握下拉机',
    image: 'assets/equipment-reference/il-wpd.png',
    source: 'https://www.lifefitness.com/en-us/catalog/strength-training/plate-loaded/plate-loaded-iso-lateral-wide-pulldown'
  },
  'nautilus-pullover': {
    name: 'Nautilus Inspiration IPPO3 Pull Over 上拉机',
    image: 'assets/equipment-reference/nautilus-pullover.png',
    source: 'https://www.corehandf.com/products/nautilus-inspiration-pull-over'
  },
  'hammer-row': {
    name: 'Hammer Strength IL-ROW Iso-Lateral 划船机',
    image: 'assets/equipment-reference/il-row.png',
    source: 'https://www.lifefitness.com/en-us/catalog/strength-training/plate-loaded/plate-loaded-iso-lateral-row'
  },
  'cable-pulldown': {
    name: 'Life Fitness Axiom OP-LR 高位下拉 / 低位划船机',
    image: 'assets/equipment-reference/op-lr.png',
    source: 'https://www.lifefitness.com/en-gb/catalog/strength-training/selectorized/axiom-series-lat-pulldown-low-row'
  },
  'db-shoulder-press': {
    name: 'Hammer Strength HDLADJ 多角度训练凳',
    image: 'assets/equipment-reference/hdladj.jpg',
    source: 'https://www.lifefitness.com/en-gb/catalog/strength-training/benches/hd-elite-multi-adjustable-bench'
  },
  'machine-military-press': {
    name: 'Hammer Strength IL-SP Iso-Lateral 肩推机',
    image: 'assets/equipment-reference/il-sp.png',
    source: 'https://www.lifefitness.com/en-us/catalog/strength-training/plate-loaded/plate-loaded-iso-lateral-shoulder-press'
  },
  'seated-machine-shoulder': {
    name: 'Life Fitness Axiom OP-SP 选择式肩推机',
    image: 'assets/equipment-reference/op-sp.png',
    source: 'https://www.lifefitness.com/en-us/catalog/strength-training/selectorized/axiom-series-shoulder-press'
  }
};

function updateMachineReference(sceneKey) {
  const card = document.getElementById('machine-reference-card');
  const image = document.getElementById('machine-reference-image');
  const name = document.getElementById('machine-reference-name');
  const link = document.getElementById('machine-reference-link');
  if (!card || !image || !name || !link) return;
  const reference = MACHINE_REFERENCES[normalizeSceneKey(sceneKey)];
  card.hidden = !reference;
  if (!reference) return;
  image.src = reference.image;
  image.alt = `${reference.name} 厂家实物图`;
  name.textContent = reference.name;
  link.href = reference.source;
}

const MACHINE_RESISTANCE_SYSTEMS = {
  'selectorized-stack': { label: '插片配重', detail: '选择式配重塔' },
  'selectorized-cable': { label: '插片配重', detail: '配重塔 · 滑轮钢索' },
  'dual-selectorized-cable': { label: '插片配重', detail: '双塔配重 · 滑轮钢索' },
  'lock-n-load-stack': { label: '选择式配重', detail: 'Lock N Load 配重选择 · 凸轮传动' },
  'plate-loaded-lever': { label: '片加载', detail: '杠铃片加载 · 分动杠杆' },
  'plate-loaded-sled': { label: '片加载', detail: '杠铃片加载 · 导轨滑车' },
  'free-barbell': { label: '自由重量', detail: '杠铃与杠铃片' },
  'free-dumbbell': { label: '自由重量', detail: '哑铃' },
  bodyweight: { label: '自重', detail: '身体重量' }
};

const MACHINE_RESISTANCE_BY_SCENE = Object.freeze({
  arm: 'dual-selectorized-cable',
  cam: 'selectorized-stack',
  incline: 'plate-loaded-sled',
  pec: 'selectorized-stack',
  lat: 'selectorized-stack',
  'barbell-squat': 'free-barbell',
  'barbell-bench': 'free-barbell',
  'flat-press': 'selectorized-stack',
  'incline-press': 'plate-loaded-lever',
  'cable-fly': 'dual-selectorized-cable',
  'machine-fly': 'selectorized-stack',
  'cable-row': 'selectorized-stack',
  'scissor-pulldown': 'plate-loaded-lever',
  'nautilus-pullover': 'lock-n-load-stack',
  'hammer-row': 'plate-loaded-lever',
  'cable-pulldown': 'selectorized-cable',
  'machine-military-press': 'plate-loaded-lever',
  'seated-machine-shoulder': 'selectorized-stack',
  pushup: 'bodyweight',
  'bent-row': 'free-barbell',
  'db-shoulder-press': 'free-dumbbell'
});

// Keep the existing simulation estimates separate from the verified resistance type.
const MACHINE_TRANSMISSION_ESTIMATE = Object.freeze({ pulleyRatio: 1, efficiency: .88, friction: .045, leverRatio: 1, camBias: 0, pathAngleOffset: 0 });

const MACHINE_BASE_PARAMS = {
  arm: { family: 'free-or-cable', resistanceProfile: 'gravity', pathAngle: 90, romStart: 0, romEnd: 90, joint: '肩外展', target: '三角肌中束', machineType: 'lateral' },
  cam: { family: 'cam-stack', resistanceProfile: 'cam-front', pathAngle: 0, romStart: 10, romEnd: 100, joint: '膝伸展', target: '股四头肌', machineType: 'leg-extension' },
  incline: { family: 'sled', resistanceProfile: 'linear-friction', pathAngle: 45, romStart: 72, romEnd: 164, joint: '膝/髋伸展', target: '臀腿', machineType: 'sled' },
  pec: { family: 'pec-deck', resistanceProfile: 'end', pathAngle: 0, romStart: 110, romEnd: 15, joint: '肩水平内收', target: '胸大肌', machineType: 'pec-deck' },
  lat: { family: 'selectorized-lever-pulldown', resistanceProfile: 'late', pathAngle: -75, romStart: 150, romEnd: 58, joint: '肩内收', target: '背阔肌', machineType: 'axiom-pulldown', pulleyRatio: 1 },
  'barbell-squat': { family: 'free-weight', resistanceProfile: 'bottom', pathAngle: 0, romStart: 172, romEnd: 72, joint: '膝/髋屈伸', target: '股四头/臀/竖脊肌', machineType: 'squat-rack' },
  'barbell-bench': { family: 'free-weight', resistanceProfile: 'bottom', pathAngle: 0, romStart: 75, romEnd: 165, joint: '肩水平推', target: '胸大肌', machineType: 'barbell-bench' },
  'flat-press': { family: 'vertical-chest-press', resistanceProfile: 'mid', pathAngle: 0, romStart: 65, romEnd: 155, joint: '肩水平推', target: '胸大肌', machineType: 'seated-chest-press' },
  'incline-press': { family: 'incline-plate-loaded', resistanceProfile: 'late', pathAngle: 35, romStart: 70, romEnd: 160, joint: '上斜推举', target: '上胸/前三角', machineType: 'incline-press' },
  pushup: { family: 'bodyweight', resistanceProfile: 'bottom', pathAngle: 0, romStart: 65, romEnd: 160, joint: '肩水平推', target: '胸大肌/核心', machineType: 'bodyweight' },
  'cable-fly': { family: 'dual-cable', resistanceProfile: 'flat-late', pathAngle: 0, romStart: 115, romEnd: 18, joint: '肩水平内收', target: '胸大肌', machineType: 'dual-cable-fly' },
  'machine-fly': { family: 'insignia-pec-fly', resistanceProfile: 'end', pathAngle: 0, romStart: 108, romEnd: 20, joint: '肩水平内收', target: '胸大肌', machineType: 'insignia-pec-fly' },
  'cable-row': { family: 'selectorized-row', resistanceProfile: 'mid', pathAngle: 0, romStart: 95, romEnd: 35, joint: '肩伸展/肩胛后缩', target: '背阔/菱形肌', machineType: 'axiom-seated-row' },
  'scissor-pulldown': { family: 'diverging-pulldown', resistanceProfile: 'mid', pathAngle: -68, romStart: 145, romEnd: 52, joint: '肩内收', target: '背阔外侧', machineType: 'scissor-pulldown' },
  'nautilus-pullover': { family: 'pullover-cam', resistanceProfile: 'end', pathAngle: -85, romStart: 165, romEnd: 45, joint: '肩伸展', target: '背阔/大圆肌', machineType: 'pullover-cam' },
  'bent-row': { family: 'free-weight-row', resistanceProfile: 'mid', pathAngle: 0, romStart: 92, romEnd: 32, joint: '肩伸展/髋铰链', target: '背阔/后链', machineType: 'free-row' },
  'hammer-row': { family: 'chest-supported-row', resistanceProfile: 'mid', pathAngle: 8, romStart: 95, romEnd: 34, joint: '肩伸展/肩胛后缩', target: '中背/背阔', machineType: 'plate-row' },
  'cable-pulldown': { family: 'dual-station-cable', resistanceProfile: 'late', pathAngle: -75, romStart: 150, romEnd: 58, joint: '肩内收/肩胛后缩', target: '背阔肌/菱形肌', machineType: 'axiom-pulldown-row', pulleyRatio: 1 },
  'db-shoulder-press': { family: 'dumbbell-free', resistanceProfile: 'bottom', pathAngle: 90, romStart: 75, romEnd: 170, joint: '肩上举/肘伸', target: '三角肌', machineType: 'free-shoulder' },
  'machine-military-press': { family: 'plate-loaded-shoulder', resistanceProfile: 'late', pathAngle: 84, romStart: 72, romEnd: 164, joint: '肩上举/肘伸', target: '三角肌/肱三头肌', machineType: 'plate-shoulder' },
  'seated-machine-shoulder': { family: 'guided-shoulder-press', resistanceProfile: 'mid', pathAngle: 82, romStart: 75, romEnd: 170, joint: '肩上举/肘伸', target: '三角肌', machineType: 'seated-shoulder' }
};

const MACHINE_CONTROL_SCHEMAS = {
  lateral: {
    title: 'OP-DAP 双塔可调滑轮侧平举',
    fields: [
      { key: 'pulleyHeightCm', label: '滑轮固定高度', min: 20, max: 220, step: 5, value: 105, unit: 'cm' },
      { key: 'cableRatio', label: '绳索倍率', min: 1, max: 2, step: .5, value: 2, unit: ':1' },
      { key: 'handleDistanceCm', label: '人到滑轮距离', min: 40, max: 180, step: 5, value: 95, unit: 'cm' },
      { key: 'loadKg', label: '单侧标重', min: 2, max: 40, step: .5, value: 7.5, unit: 'kg' }
    ],
    help: '滑轮越低、离身体越远，起始段越容易有张力；2:1 钢线会让体感重量约减半。'
  },
  'leg-extension': {
    title: 'Life Fitness Axiom OP-LE 膝伸展机',
    fields: [
      { key: 'shinPadCm', label: '胫骨垫到膝距离', min: 22, max: 48, step: 1, value: 35, unit: 'cm' },
      { key: 'camPeakPercent', label: '凸轮峰值位置', min: 20, max: 90, step: 1, value: 58, unit: '%行程' },
      { key: 'startKneeDeg', label: '起始膝角', min: 70, max: 125, step: 1, value: 92, unit: '°' },
      { key: 'stackStepKg', label: '配重片档位', min: 2.5, max: 10, step: 2.5, value: 5, unit: 'kg/格' }
    ],
    help: '胫骨垫越靠脚踝，膝盖转矩越大；凸轮峰值越早，动作开头越顶膝。'
  },
  sled: {
    title: 'Hammer Strength 45° 线性倒蹬机',
    fields: [
      { key: 'railAngleDeg', label: '导轨坡度', min: 35, max: 50, step: 1, value: 45, unit: '°' },
      { key: 'carriageMassKg', label: '滑车空重', min: 25, max: 75, step: 1, value: 45, unit: 'kg' },
      { key: 'footPlateCm', label: '脚踏板高度', min: 25, max: 75, step: 1, value: 48, unit: 'cm' },
      { key: 'railFriction', label: '导轨摩擦系数', min: 0, max: .14, step: .005, value: .05, unit: '' }
    ],
    help: '市面 45° 倒蹬通常靠导轨角度、滑车自重和摩擦决定推起/下放差异。'
  },
  'squat-rack': {
    title: 'Hammer Strength HD Athletic NX 四柱力量架',
    fields: [
      { key: 'barHeightCm', label: '杠铃架高度', min: 120, max: 180, step: 1, value: 145, unit: 'cm' },
      { key: 'stanceWidthCm', label: '双脚站距', min: 35, max: 90, step: 1, value: 55, unit: 'cm' },
      { key: 'heelLiftCm', label: '垫高脚跟', min: 0, max: 6, step: .5, value: 1, unit: 'cm' },
      { key: 'trunkLeanDeg', label: '躯干前倾角', min: 5, max: 45, step: 1, value: 22, unit: '°' }
    ],
    help: '86/91 英寸训练立柱、J 杯与柔性安全带构成完整深蹲保护区；站距、脚跟垫高和躯干前倾决定膝髋分配与腰椎剪切力。'
  },
  'seated-chest-press': {
    title: 'Life Fitness Axiom OP-CP Chest Press',
    fields: [
      { key: 'seatHeightCm', label: '座椅高度', min: 38, max: 62, step: 1, value: 50, unit: 'cm' },
      { key: 'handleWidthCm', label: '手柄间距', min: 38, max: 76, step: 1, value: 58, unit: 'cm' },
      { key: 'pressPathDeg', label: '推柄轨迹角', min: -10, max: 25, step: 1, value: 4, unit: '°' },
      { key: 'leverArmCm', label: '低位转轴动力臂', min: 28, max: 70, step: 1, value: 46, unit: 'cm' }
    ],
    help: 'OP-CP 的双握法推柄绕低位转轴向前走圆弧，钢索经底部凸轮抬升 101.25kg 配重塔；座椅过低会让手柄顶向肩前侧。'
  },
  'incline-press': {
    title: '上斜片加载推胸',
    fields: [
      { key: 'benchAngleDeg', label: '靠背上斜角', min: 20, max: 55, step: 1, value: 35, unit: '°' },
      { key: 'handleWidthCm', label: '手柄间距', min: 42, max: 82, step: 1, value: 62, unit: 'cm' },
      { key: 'leverArmCm', label: '杠杆臂长度', min: 35, max: 80, step: 1, value: 56, unit: 'cm' },
      { key: 'plateHornCm', label: '装片轴到转点', min: 25, max: 70, step: 1, value: 48, unit: 'cm' }
    ],
    help: '上斜角越大越偏肩前束；装片轴离转点越远，底部和中段越重。'
  },
  'barbell-bench': {
    title: 'Hammer Strength O-FB Olympic Flat Bench',
    fields: [
      { key: 'benchHeightCm', label: '卧推凳高度', min: 38, max: 50, step: 1, value: 44, unit: 'cm' },
      { key: 'gripWidthCm', label: '握距', min: 45, max: 95, step: 1, value: 72, unit: 'cm' },
      { key: 'touchPointCm', label: '落点离肩距离', min: 12, max: 34, step: 1, value: 24, unit: 'cm' },
      { key: 'archCm', label: '起桥高度', min: 0, max: 14, step: .5, value: 5, unit: 'cm' }
    ],
    help: 'O-FB 的固定卧推凳和双立柱按 130×132×130cm 比例建立；握距和落点会改变肩水平外展角，起桥越高实际行程越短。'
  },
  'dual-cable-fly': {
    title: '双塔绳索夹胸',
    fields: [
      { key: 'pulleyHeightCm', label: '双侧滑轮高度', min: 40, max: 220, step: 5, value: 135, unit: 'cm' },
      { key: 'towerWidthCm', label: '双塔间距', min: 130, max: 260, step: 5, value: 190, unit: 'cm' },
      { key: 'bodyForwardCm', label: '身体前移距离', min: 0, max: 90, step: 5, value: 35, unit: 'cm' },
      { key: 'cableRatio', label: '滑轮倍率', min: 1, max: 2, step: .5, value: 2, unit: ':1' }
    ],
    help: '双塔越宽、身体越往前，末端夹胸张力越连续；2:1 龙门架读数要按体感减半。'
  },
  'pec-deck': {
    title: 'Life Fitness Axiom OP-FLY 胸飞鸟 / 后束机',
    fields: [
      { key: 'seatHeightCm', label: '座椅高度', min: 38, max: 62, step: 1, value: 50, unit: 'cm' },
      { key: 'armPadWidthCm', label: '肘垫/手柄宽度', min: 46, max: 92, step: 1, value: 68, unit: 'cm' },
      { key: 'camPeakPercent', label: '凸轮最重点', min: 35, max: 95, step: 1, value: 76, unit: '%行程' },
      { key: 'startOpenDeg', label: '起始打开角', min: 70, max: 135, step: 1, value: 110, unit: '°' }
    ],
    help: '肘垫太宽或打开角太大容易顶肩；凸轮峰值偏后会让夹到末端更重。'
  },
  'insignia-pec-fly': {
    title: 'Life Fitness Insignia SS-PEC 蝶式胸肌训练机',
    fields: [
      { key: 'seatHeightCm', label: '座椅高度', min: 38, max: 62, step: 1, value: 50, unit: 'cm' },
      { key: 'backrestAngleDeg', label: '靠背后倾角', min: 65, max: 82, step: 1, value: 72, unit: '°' },
      { key: 'startOpenDeg', label: '起始打开角', min: 72, max: 125, step: 1, value: 108, unit: '°' },
      { key: 'camPeakPercent', label: '独立凸轮峰值', min: 35, max: 95, step: 1, value: 74, unit: '%行程' }
    ],
    help: '按 SS-PEC 官方 154×179×148cm 低机身比例与 130kg 标准配重塔建立；左右转臂绕中央立轴内收，凸轮半径变化决定不同行程的体感阻力。'
  },
  'high-cable': {
    title: '通用高位钢索下拉机',
    fields: [
      { key: 'pulleyHeightCm', label: '上滑轮高度', min: 180, max: 250, step: 5, value: 220, unit: 'cm' },
      { key: 'gripWidthCm', label: '握距', min: 42, max: 110, step: 1, value: 78, unit: 'cm' },
      { key: 'torsoLeanDeg', label: '躯干后倾', min: 0, max: 30, step: 1, value: 12, unit: '°' },
      { key: 'cableRatio', label: '滑轮倍率', min: 1, max: 2, step: .5, value: 1, unit: ':1' }
    ],
    help: '滑轮越高、躯干微后倾，拉线越容易朝肘向髋的方向走；后仰过多会变成划船。'
  },
  'axiom-pulldown': {
    title: 'Life Fitness Axiom OP-PD 固定转臂高位下拉机',
    fields: [
      { key: 'seatHeightCm', label: '可调座椅高度', min: 42, max: 58, step: 1, value: 50, unit: 'cm' },
      { key: 'handleSpanCm', label: '长握把有效握距', min: 58, max: 108, step: 1, value: 86, unit: 'cm' },
      { key: 'thighPadAngleDeg', label: '固定大腿垫倾角', min: 8, max: 28, step: 1, value: 18, unit: '°' },
      { key: 'workArmArcDeg', label: '固定转臂工作圆弧', min: 65, max: 115, step: 1, value: 92, unit: '°' }
    ],
    help: 'OP-PD 不是自由横杆：左右长握把固定在同一刚性转臂上，绕后上方轴心走圆弧，再由凸轮与钢索抬升配重塔。'
  },
  'axiom-pulldown-row': {
    title: 'Life Fitness Axiom OP-LR 下拉 / 低位划船组合机',
    fields: [
      { key: 'machineHeightCm', label: '整机 / 顶轮高度', min: 205, max: 225, step: 1, value: 216, unit: 'cm' },
      { key: 'gripWidthCm', label: '下拉横杆有效握距', min: 55, max: 112, step: 1, value: 92, unit: 'cm' },
      { key: 'thighPadAngleDeg', label: '固定大腿垫倾角', min: 8, max: 28, step: 1, value: 16, unit: '°' },
      { key: 'rowFootPegAngleDeg', label: '低位划船脚踏倾角', min: 25, max: 55, step: 1, value: 38, unit: '°' }
    ],
    help: '官方 OP-LR 为 200×89×216cm 双功能机：标配宽下拉杆、窄距划船把手、低位导轮与双脚踏；两种动作共用 101.25kg 配重塔。'
  },
  'axiom-seated-row': {
    title: 'Life Fitness Axiom OP-RW 坐姿划船机',
    fields: [
      { key: 'pivotHeightCm', label: '划船转轴高度', min: 60, max: 110, step: 1, value: 82, unit: 'cm' },
      { key: 'handleSpanCm', label: '自调节握把间距', min: 42, max: 82, step: 1, value: 58, unit: 'cm' },
      { key: 'footPlateAngleDeg', label: '稳定脚踏倾角', min: 20, max: 50, step: 1, value: 35, unit: '°' },
      { key: 'cableRatio', label: '滑轮倍率', min: 1, max: 2, step: .5, value: 1, unit: ':1' }
    ],
    help: '双向自调节握把保持手腕对齐，斜面脚踏把躯干固定；划船架绕低位转轴运动，再由 1:1 钢索拉起配重片。'
  },
  'scissor-pulldown': {
    title: 'Hammer Strength IL-WPD 分动宽握下拉',
    fields: [
      { key: 'pivotHeightCm', label: '上臂转点高度', min: 130, max: 190, step: 1, value: 162, unit: 'cm' },
      { key: 'handleArcDeg', label: '分动圆弧角', min: 45, max: 115, step: 1, value: 82, unit: '°' },
      { key: 'leverArmCm', label: '握把动力臂', min: 42, max: 90, step: 1, value: 68, unit: 'cm' },
      { key: 'plateHornCm', label: '装片轴到转点', min: 26, max: 70, step: 1, value: 44, unit: 'cm' }
    ],
    help: '它不是普通钢线下拉：左右装片转臂独立绕上方转点运动，握把动力臂与装片轴距离共同决定体感阻力。'
  },
  'pullover-cam': {
    title: '鹦鹉螺 Pullover 凸轮',
    fields: [
      { key: 'elbowPadHeightCm', label: '肘垫高度', min: 95, max: 150, step: 1, value: 122, unit: 'cm' },
      { key: 'camPeakPercent', label: '凸轮峰值位置', min: 35, max: 95, step: 1, value: 78, unit: '%行程' },
      { key: 'upperArmLeverCm', label: '上臂有效杠杆', min: 22, max: 42, step: 1, value: 32, unit: 'cm' },
      { key: 'startShoulderDeg', label: '起始肩屈角', min: 120, max: 175, step: 1, value: 160, unit: '°' }
    ],
    help: 'Pullover 主要通过肘垫把手臂代偿降下去；上臂杠杆越长，背阔转矩越明显。'
  },
  'free-row': {
    title: 'Eleiko IWF Competition Bar 俯身划船',
    fields: [
      { key: 'trunkAngleDeg', label: '躯干前倾角', min: 25, max: 80, step: 1, value: 45, unit: '°' },
      { key: 'gripWidthCm', label: '握距', min: 40, max: 95, step: 1, value: 62, unit: 'cm' },
      { key: 'barPathCm', label: '杠铃拉到腹部距离', min: 10, max: 35, step: 1, value: 22, unit: 'cm' },
      { key: 'hipHingeCm', label: '髋后移距离', min: 0, max: 35, step: 1, value: 18, unit: 'cm' }
    ],
    help: '按 220cm 男子竞赛杠、28mm 握杆与 50mm 套筒比例建立。躯干越水平越吃背，也越考验腰背等长；髋后移能帮你维持重心。'
  },
  'plate-row': {
    title: '悍马 / 胸托划船',
    fields: [
      { key: 'chestPadAngleDeg', label: '胸托角度', min: 55, max: 85, step: 1, value: 72, unit: '°' },
      { key: 'handleWidthCm', label: '手柄宽度', min: 35, max: 90, step: 1, value: 58, unit: 'cm' },
      { key: 'leverArmCm', label: '划船杠杆臂', min: 35, max: 85, step: 1, value: 58, unit: 'cm' },
      { key: 'plateHornCm', label: '装片轴到转点', min: 25, max: 75, step: 1, value: 46, unit: 'cm' }
    ],
    help: '胸托角度决定腰参与多少；装片轴离转点越远，中后段越重。'
  },
  'free-shoulder': {
    title: 'Hammer Strength HDLADJ 多角度凳哑铃推肩',
    fields: [
      { key: 'benchAngleDeg', label: '靠背档位', min: 0, max: 75, step: 15, value: 75, unit: '°' },
      { key: 'elbowStartDeg', label: '底部肘角', min: 55, max: 100, step: 1, value: 78, unit: '°' },
      { key: 'dumbbellPathCm', label: '哑铃水平轨迹', min: 0, max: 24, step: 1, value: 10, unit: 'cm' },
      { key: 'singleDbKg', label: '单只哑铃重量', min: 2, max: 60, step: 1, value: 18, unit: 'kg' }
    ],
    help: 'HDLADJ 具备 0/15/30/45/60/75° 六档靠背、三档座垫和 Dock ’n’ Lock 定位底盘；靠背越直越接近肩推，底部肘太低容易顶肩前侧。'
  },
  'standing-press': {
    title: '固定器械实力推',
    fields: [
      { key: 'pressPathDeg', label: '推举轨迹角', min: 70, max: 100, step: 1, value: 88, unit: '°' },
      { key: 'handleWidthCm', label: '手柄间距', min: 42, max: 82, step: 1, value: 58, unit: 'cm' },
      { key: 'coreStabilityPercent', label: '核心稳定要求', min: 20, max: 100, step: 1, value: 72, unit: '%' },
      { key: 'leverArmCm', label: '推举杠杆臂', min: 32, max: 72, step: 1, value: 48, unit: 'cm' }
    ],
    help: '实力推支撑少，核心稳定要求会放大体感难度；轨迹越垂直越接近自由推举。'
  },
  'plate-shoulder': {
    title: 'Hammer Strength IL-SP 片加载肩推',
    fields: [
      { key: 'seatAngleDeg', label: '座椅倾角', min: 20, max: 34, step: 1, value: 26, unit: '°' },
      { key: 'handleWidthCm', label: '手柄间距', min: 42, max: 82, step: 1, value: 58, unit: 'cm' },
      { key: 'leverArmCm', label: '推举动力臂', min: 36, max: 76, step: 1, value: 52, unit: 'cm' },
      { key: 'plateHornCm', label: '装片轴到转点', min: 26, max: 68, step: 1, value: 45, unit: 'cm' }
    ],
    help: '26° 座椅让腰背获得支撑；左右分动杠杆独立绕轴转动，装片轴距离直接决定阻力矩。'
  },
  'seated-shoulder': {
    title: 'Life Fitness Axiom OP-SP Shoulder Press',
    fields: [
      { key: 'seatHeightCm', label: '座椅高度', min: 38, max: 65, step: 1, value: 51, unit: 'cm' },
      { key: 'backrestAngleDeg', label: '靠背后倾角', min: 70, max: 90, step: 1, value: 82, unit: '°' },
      { key: 'handleWidthCm', label: '手柄间距', min: 42, max: 82, step: 1, value: 58, unit: 'cm' },
      { key: 'pressPathDeg', label: '推柄轨迹角', min: 65, max: 98, step: 1, value: 84, unit: '°' }
    ],
    help: 'OP-SP 的中立握与正握手柄绕肩高转轴上举，平衡块降低起始阻力，再由下方钢索凸轮抬升 85.5kg 配重塔。'
  },
  bodyweight: {
    title: 'Rogue Bolt-Together Parallettes 架上俯卧撑',
    fields: [
      { key: 'handWidthCm', label: '双手间距', min: 35, max: 95, step: 1, value: 62, unit: 'cm' },
      { key: 'footElevationCm', label: '脚垫高', min: 0, max: 60, step: 1, value: 0, unit: 'cm' },
      { key: 'bodyInclineDeg', label: '身体倾角', min: 0, max: 35, step: 1, value: 10, unit: '°' },
      { key: 'bodyweightShare', label: '体重承载比例', min: 45, max: 85, step: 1, value: 64, unit: '%' }
    ],
    help: '每只双杠按 61×38×35.6cm、3.8cm 握杆和橡胶脚垫比例建立；脚垫高会把压力推向上胸和肩前侧，双手过宽会增加肩前侧压力。'
  }
};

// Only manufacturer-supported adjustments with an active rig connection belong in the UI.
const MACHINE_SETTING_POLICIES = Object.freeze({
  arm: { fixed: '2:1 钢索传动 · 固定双塔机架', fields: [
    { key: 'pulleyLeftPercent', label: '左滑轮位置（示意）', min: 0, max: 100, step: .5, value: 42.5, unit: '%' },
    { key: 'pulleyRightPercent', label: '右滑轮位置（示意）', min: 0, max: 100, step: .5, value: 42.5, unit: '%' }
  ] },
  cam: { fixed: '预设凸轮轮廓 · 固定转轴与传动结构' },
  incline: { fixed: '45° 导轨 · 预设滑车与脚踏结构' },
  pec: { fixed: '预设独立凸轮 · 铰接式握把', keys: ['seatHeightCm', 'startOpenDeg'] },
  lat: { fixed: '固定转臂 · 预设握把与钢索传动结构' },
  'barbell-squat': { fixed: '固定机架结构 · 自由杠铃' },
  'barbell-bench': { fixed: '固定水平卧推凳 · 自由杠铃' },
  'flat-press': { fixed: '固定靠背与推柄结构 · 预设转臂轨迹', keys: ['seatHeightCm'] },
  'incline-press': { fixed: '预设上斜靠背 · 左右分动杠杆' },
  'cable-fly': { fixed: '2:1 钢索传动 · 固定双塔机架', keys: ['pulleyHeightCm'] },
  'machine-fly': { fixed: '固定靠背倾角 · 预设独立凸轮', keys: ['seatHeightCm', 'startOpenDeg'] },
  'cable-row': { fixed: '固定脚踏与转轴 · 自调节握把' },
  'scissor-pulldown': { fixed: '固定转轴与装片轴 · 左右分动杠杆' },
  'nautilus-pullover': { fixed: '预设凸轮 · 脚踏与肘撑联动机构' },
  'hammer-row': { fixed: '预设胸托与握把结构 · 左右分动杠杆' },
  'cable-pulldown': { fixed: '固定机架与导轮 · 下拉和划船共用配重塔' },
  'machine-military-press': { fixed: '预设座椅倾角 · 左右分动杠杆' },
  'seated-machine-shoulder': { fixed: '固定靠背与握把结构 · 预设转臂轨迹', keys: ['seatHeightCm'] }
});

function actionGroupFromLabel(label = '') {
  if (label === '胸部') return 'chest';
  if (label === '肩部') return 'shoulder';
  if (label === '背部') return 'back';
  if (label === '腿部') return 'legs';
  return 'all';
}

const $ = (id) => document.getElementById(id);
const armAngleInput = $('arm-angle');
const armLengthPreset = $('arm-length-preset');
const cableModeInput = $('cable-mode');
const camAngleInput = $('cam-angle');
const camAggressionInput = $('cam-aggression');
const sledTareInput = $('sled-tare');
const sledMassInput = $('sled-mass');
const squatLoadInput = $('squat-load');
const pecAngleInput = $('pec-angle');
const pecCamInput = $('pec-cam');
const latAngleInput = $('lat-angle');
const latPulleyInput = $('lat-pulley');
const squatDepthInput = $('squat-depth');
const squatModeInput = $('squat-mode');
const machineResistanceReadout = $('machine-resistance-type');
const machinePathAngleInput = $('machine-path-angle');
const machineSeatHeightInput = $('machine-seat-height');
const machineCamBiasInput = $('machine-cam-bias');
const machineEfficiencyInput = $('machine-efficiency');
const trackerLoadInput = $('tracker-load');
const trackerRepsInput = $('tracker-reps');
const trackerRpeInput = $('tracker-rpe');
const trackerWeekLoadInput = $('tracker-week-load');
const trackerMonthLoadInput = $('tracker-month-load');
const onboardingForm = $('onboarding-form');
const onboardingInputs = Array.from(onboardingForm.querySelectorAll('[data-profile-key]'));
let hasSavedBioProfile = false;

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function bind(el, type, handler, options) {
  if (el) el.addEventListener(type, handler, options);
}

function normalizeSceneKey(sceneKey) {
  if (sceneKey === 'fly') return 'pec';
  if (sceneKey === 'pulldown') return 'lat';
  if (sceneKey === 'squat') return 'barbell-squat';
  return sceneKey || 'overview';
}

const PHYSICS_PROTOTYPES = {
  INCLINE_SLED: 'incline-sled-friction',
  VARIABLE_CAM: 'variable-resistance-cam',
  CABLE_PULLEY: 'cable-spatial-pulley',
  RIGID_LEVER: 'rigid-lever-linkage',
  DIRECT_GRAVITY: 'direct-gravity-moment'
};

const SCENE_PROTOTYPE_MAP = {
  incline: PHYSICS_PROTOTYPES.INCLINE_SLED,
  cam: PHYSICS_PROTOTYPES.VARIABLE_CAM,
  pec: PHYSICS_PROTOTYPES.VARIABLE_CAM,
  'machine-fly': PHYSICS_PROTOTYPES.VARIABLE_CAM,
  'nautilus-pullover': PHYSICS_PROTOTYPES.VARIABLE_CAM,
  lat: PHYSICS_PROTOTYPES.VARIABLE_CAM,
  'cable-pulldown': PHYSICS_PROTOTYPES.CABLE_PULLEY,
  'cable-row': PHYSICS_PROTOTYPES.CABLE_PULLEY,
  'cable-fly': PHYSICS_PROTOTYPES.CABLE_PULLEY,
  'scissor-pulldown': PHYSICS_PROTOTYPES.RIGID_LEVER,
  'flat-press': PHYSICS_PROTOTYPES.RIGID_LEVER,
  'incline-press': PHYSICS_PROTOTYPES.RIGID_LEVER,
  'hammer-row': PHYSICS_PROTOTYPES.RIGID_LEVER,
  'seated-machine-shoulder': PHYSICS_PROTOTYPES.RIGID_LEVER,
  arm: PHYSICS_PROTOTYPES.DIRECT_GRAVITY,
  'barbell-squat': PHYSICS_PROTOTYPES.DIRECT_GRAVITY,
  'barbell-bench': PHYSICS_PROTOTYPES.DIRECT_GRAVITY,
  'bent-row': PHYSICS_PROTOTYPES.DIRECT_GRAVITY,
  'db-shoulder-press': PHYSICS_PROTOTYPES.DIRECT_GRAVITY,
  'machine-military-press': PHYSICS_PROTOTYPES.RIGID_LEVER,
  pushup: PHYSICS_PROTOTYPES.DIRECT_GRAVITY
};

function getPhysicsPrototype(sceneKey = telemetry.activeScene) {
  const scene = normalizeSceneKey(sceneKey);
  if (scene === 'arm' && telemetry.cableMode) return PHYSICS_PROTOTYPES.CABLE_PULLEY;
  return SCENE_PROTOTYPE_MAP[scene] || PHYSICS_PROTOTYPES.DIRECT_GRAVITY;
}

function vec3(x = 0, y = 0, z = 0) { return { x, y, z }; }
function vecSub(a, b) { return vec3(a.x - b.x, a.y - b.y, a.z - b.z); }
function vecLen(v) { return Math.hypot(v.x, v.y, v.z); }
function vecScale(v, s) { return vec3(v.x * s, v.y * s, v.z * s); }
function vecNorm(v) {
  const len = vecLen(v) || 1;
  return vecScale(v, 1 / len);
}
function vecCross(a, b) {
  return vec3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x
  );
}

function sceneLoadKg(sceneKey = telemetry.activeScene) {
  const scene = normalizeSceneKey(sceneKey);
  if (scene === 'incline') return Math.max(0, finiteNumber(telemetry.totalMovingMass, 0));
  if (isExtraScene(scene)) return extraLoad(scene);
  // These are explicitly labelled model examples, never a user's lifting ability.
  return Math.max(0, finiteNumber(BM.modelLoads[scene], 0));
}


const PhysicsEngines = {
  [PHYSICS_PROTOTYPES.INCLINE_SLED]: {
    updatePhysics(params = {}) {
      const g = 9.81;
      const massKg = Math.max(0, finiteNumber(params.massKg, telemetry.totalMovingMass));
      const theta = THREElessDegToRad(params.angleDeg ?? telemetry.slopeAngle ?? 45);
      const mu = Number(params.friction ?? currentMachineProfile('incline').friction ?? telemetry.friction ?? .05);
      const travel = Number(params.travel ?? telemetry.m3_pos ?? 0);
      const s = clamp(travel, 0, 1);
      const travelM = Math.max(.001, Number(params.travelM ?? telemetry.m3_travelM));
      const actualDisplacementM = s * travelM;
      const x = actualDisplacementM * Math.cos(theta);
      const y = actualDisplacementM * Math.sin(theta);
      const shared = BM.Mechanics?.evaluate('incline', { massKg, inclineRad: theta, friction: mu, travelM, direction: 'up' }, s);
      const parallelN = shared?.valid ? shared.geometry.gravityAlongN : massKg * g * Math.sin(theta);
      const frictionN = shared?.valid ? shared.geometry.frictionN : mu * massKg * g * Math.cos(theta);
      const pushN = parallelN + frictionN;
      const lowerN = parallelN - frictionN; // Signed external force; negative means a downward pull is required.
      const hysteresis = pushN ? (2 * frictionN) / pushN * 100 : 0;
      return {
        prototype: PHYSICS_PROTOTYPES.INCLINE_SLED,
        mechanicsResult: shared?.valid ? shared : null,
        forceN: pushN,
        pushN,
        lowerN,
        hysteresis,
        displacement: { x, y, s, metres: actualDisplacementM },
        displacementM: actualDisplacementM,
        energy: { potentialJ: parallelN * actualDisplacementM, dissipatedJ: frictionN * actualDisplacementM, inputWorkJ: pushN * actualDisplacementM },
        vector: vec3(Math.cos(theta) * pushN, Math.sin(theta) * pushN, 0),
        torqueNm: 0,
        momentArmM: 0,
        primaryMetric: `${pushN.toFixed(0)} N`,
        secondaryMetric: `下放 ${lowerN.toFixed(0)} N / 阻力差 ${hysteresis.toFixed(0)}%`
      };
    }
  },
  [PHYSICS_PROTOTYPES.VARIABLE_CAM]: {
    updatePhysics(params = {}) {
      const g = 9.81;
      const angleDeg = Number(params.angleDeg ?? machineJointAngle(params.sceneKey) ?? telemetry.camAngle) || 0;
      const theta = THREElessDegToRad(angleDeg);
      const massKg = Math.max(0, finiteNumber(params.massKg, sceneLoadKg(params.sceneKey)));
      const r0 = Number(params.baseRadiusM ?? .2);
      const k = clamp(Number(params.eccentricity ?? .6), 0, .95);
      const shared = BM.Mechanics?.evaluate('cam', { massKg, baseArmM: r0, eccentricity: k, phaseRad: 0, leverM: .5, startAngleRad: theta, sweepRad: 1.46 }, 0);
      const radiusM = shared?.valid ? shared.effectiveArmM : r0 * (1 + k * Math.sin(theta));
      const torqueNm = shared?.valid ? shared.torqueNm : massKg * g * radiusM;
      const multiplier = radiusM / r0;
      // Ideal effective-arm model: the vertical force line is x=d, so d⊥=radiusM.
      // This is not a solved physical cam outline.
      const contact = vec3(radiusM, 0, 0);
      // OP-PD has attached working arms. Treat the uncalibrated transmission as
      // an ideal shaft balance; cable tension is not the force at its grips.
      const balance = normalizeSceneKey(params.sceneKey)==='lat' ? BM.Education.leverBalance(massKg*g,radiusM,Number(params.handleArmM??.65)) : null;
      return {
        prototype: PHYSICS_PROTOTYPES.VARIABLE_CAM,
        mechanicsResult: shared?.valid ? shared : null,
        forceN: balance?.valid ? balance.handleForceN : massKg * g,
        cableTensionN: massKg*g,
        handleArmM: balance?.handleArmM,
        calibration: 'ideal-unmeasured',
        torqueNm,
        momentArmM: radiusM,
        radiusM,
        multiplier,
        contact,
        cableStart: contact,
        cableEnd: vec3(contact.x, -1.2, 0),
        primaryMetric: `${torqueNm.toFixed(1)} N·m`,
        secondaryMetric: `d⊥(θ) ${(radiusM * 100).toFixed(1)} cm / ${multiplier.toFixed(2)}×`
      };
    }
  },
  [PHYSICS_PROTOTYPES.CABLE_PULLEY]: {
    updatePhysics(params = {}) {
      const g = 9.81;
      const scene = normalizeSceneKey(params.sceneKey);
      const massKg = Math.max(0, finiteNumber(params.massKg, sceneLoadKg(scene)));
      const ratio = Math.max(1, Number(params.ratio ?? currentMachineProfile(scene).pulleyRatio ?? 1));
      const joint = params.joint || vec3(0, 0, 0);
      const handle = params.handle || vec3(0, 0, 0);
      const pulley = params.pulley || vec3(0, 1, 0);
      const uDir = vecNorm(vecSub(pulley, handle));
      const shared = BM.Mechanics?.evaluate('pulley', { massKg, ratio, handleTravelM: 1 }, 0);
      const forceN = shared?.valid ? shared.forceN : massKg * g / ratio;
      const forceVector = vecScale(uDir, forceN);
      const lever = vecSub(handle, joint);
      const torqueVec = vecCross(lever, forceVector);
      const torqueNm = vecLen(torqueVec);
      return {
        prototype: PHYSICS_PROTOTYPES.CABLE_PULLEY,
        mechanicsResult: shared?.valid ? shared : null,
        forceN,
        forceVector,
        uDir,
        joint,
        positionVector: lever,
        phiRad: BM.Education?.angleBetween(lever,uDir) ?? null,
        torqueNm,
        momentArmM: vecLen(vecCross(lever, uDir)), // Geometry remains defined at zero load.
        pulleyRatio: ratio,
        cableStart: pulley,
        cableEnd: handle,
        primaryMetric: `${forceN.toFixed(1)} N`,
        secondaryMetric: `${ratio}:1 / τ ${torqueNm.toFixed(1)} N·m`
      };
    }
  },
  [PHYSICS_PROTOTYPES.RIGID_LEVER]: {
    updatePhysics(params = {}) {
      const g = 9.81;
      const massKg = Math.max(0, finiteNumber(params.massKg, sceneLoadKg(params.sceneKey)));
      const angleDeg = finiteNumber(params.angleDeg, machineJointAngle(params.sceneKey));
      const phi = THREElessDegToRad(angleDeg);
      const loadArmM = Number(params.loadArmM ?? .48);
      const effortArmM = Math.max(.1, Number(params.effortArmM ?? .68));
      const plateTorqueNm = massKg * g * loadArmM * Math.abs(Math.cos(phi));
      const userForceN = plateTorqueNm / Math.max(effortArmM * Math.abs(Math.sin(phi || .01)), .05);
      const gain = loadArmM / effortArmM;
      return {
        prototype: PHYSICS_PROTOTYPES.RIGID_LEVER,
        forceN: userForceN,
        torqueNm: plateTorqueNm,
        momentArmM: loadArmM * Math.abs(Math.cos(phi)),
        gain,
        angleDeg,
        primaryMetric: `${userForceN.toFixed(1)} N`,
        secondaryMetric: `力臂增益 ${gain.toFixed(2)}× / τ ${plateTorqueNm.toFixed(1)} N·m`
      };
    }
  },
  [PHYSICS_PROTOTYPES.DIRECT_GRAVITY]: {
    updatePhysics(params = {}) {
      const g = 9.81;
      const scene = normalizeSceneKey(params.sceneKey);
      const massKg = Math.max(0, finiteNumber(params.massKg, sceneLoadKg(scene)));
      const limbLengthM = Number(params.limbLengthM ?? telemetry.armLinkLength ?? .35);
      const theta = THREElessDegToRad(Number(params.angleDeg ?? machineJointAngle(scene)) || 0);
      const bodyweightShare = scene === 'pushup' ? .65 : 1;
      const forceN = massKg * g * bodyweightShare;
      const momentArmM = scene === 'pushup'
        ? .55
        : limbLengthM * Math.abs(Math.sin(theta));
      const torqueNm = forceN * momentArmM;
      return {
        prototype: PHYSICS_PROTOTYPES.DIRECT_GRAVITY,
        forceN,
        gravityVector: vec3(0, -forceN, 0),
        momentArmM,
        torqueNm,
        bodyweightShare,
        primaryMetric: `${torqueNm.toFixed(1)} N·m`,
        secondaryMetric: `d⊥ ${(momentArmM * 100).toFixed(1)} cm`
      };
    }
  }
};

function THREElessDegToRad(deg) {
  return Number(deg || 0) * Math.PI / 180;
}

function physicsParamsForScene(sceneKey = telemetry.activeScene, stepPercent = currentActionStep(sceneKey)) {
  const scene = normalizeSceneKey(sceneKey);
  const profile = currentMachineProfile(scene);
  const t = clamp(finiteNumber(stepPercent, 0), 0, 100) / 100;
  const angleDeg = machineJointAngle(scene, stepPercent);
  const massKg = sceneLoadKg(scene);
  if (scene === 'incline') {
    return { sceneKey: scene, massKg: telemetry.totalMovingMass, angleDeg: telemetry.slopeAngle, friction: profile.friction, travel: t };
  }
  if (getPhysicsPrototype(scene) === PHYSICS_PROTOTYPES.VARIABLE_CAM) {
    const k = scene === 'cam' ? clamp((telemetry.camAggression - .6) / .9 * .72, .08, .82) : clamp((profile.camBias + 55) / 100, .12, .82);
    return { sceneKey: scene, massKg, angleDeg: scene === 'cam' ? (-.1 + t * 1.46) * 180 / Math.PI : angleDeg, baseRadiusM: .2, eccentricity: k };
  }
  if (getPhysicsPrototype(scene) === PHYSICS_PROTOTYPES.CABLE_PULLEY) {
    const isRow = scene === 'cable-row';
    const isFly = scene === 'cable-fly';
    const isArm = scene === 'arm';
    const armAngle = t * Math.PI / 2;
    const handle = isArm ? vec3(telemetry.armLinkLength * Math.sin(armAngle), -telemetry.armLinkLength * Math.cos(armAngle), 0)
      : isRow ? vec3(.9 - t * 1.1, .2, 0) : isFly ? vec3(1 - t * .8, .35, 0) : vec3(.35, 1.2 - t * 1.2, 0);
    const armPulleyY = -1.15 + 2.3 * finiteNumber(sceneMachineTuning(scene).pulleyLeftPercent, 42.5) / 100;
    const pulley = isArm ? vec3(-.7, armPulleyY, 0) : isRow ? vec3(-1.1, -.45, 0) : isFly ? vec3(1.45, .85, 0) : vec3(0, 2.2, 0);
    return { sceneKey: scene, massKg, angleDeg:isArm?t*90:angleDeg, ratio: profile.pulleyRatio, joint: vec3(0, 0, 0), handle, pulley };
  }
  if (getPhysicsPrototype(scene) === PHYSICS_PROTOTYPES.RIGID_LEVER) {
    const v = sceneMachineTuning(scene);
    return { sceneKey: scene, massKg, angleDeg, loadArmM: Number(v.plateHornCm ?? v.leverArmCm ?? 48) / 100, effortArmM: Number(v.leverArmCm ?? 68) / 100 };
  }
  const limbLengthM = scene === 'arm' ? telemetry.armLinkLength
    : scene.includes('shoulder') ? (BM.modelProfile.upperArmLength + BM.modelProfile.forearmLength) / 100 : .55;
  return { sceneKey: scene, massKg, angleDeg: scene === 'arm' ? t * 90 : angleDeg, limbLengthM };
}


function updatePhysics(params = {}) {
  const scene = normalizeSceneKey(params.sceneKey || telemetry.activeScene);
  const prototype = params.prototype || getPhysicsPrototype(scene);
  const engine = PhysicsEngines[prototype] || PhysicsEngines[PHYSICS_PROTOTYPES.DIRECT_GRAVITY];
  return engine.updatePhysics({ ...physicsParamsForScene(scene, params.stepPercent), ...params, sceneKey: scene });
}

window.updatePhysics = updatePhysics;
window.getPhysicsPrototype = getPhysicsPrototype;

function renderExtendedActionLibrary() {
  const tabBar = document.querySelector('.action-tab-bar');
  const labGrid = document.querySelector('.lab-gateways-grid');
  const analysisPane = $('analysis-scroll');
  const beforeOverview = tabBar?.querySelector('[data-scene="overview"]');

  EXTRA_ACTION_DEFS.forEach((def) => {
    if (tabBar && !tabBar.querySelector(`[data-scene="${def.key}"]`)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'action-tab';
      button.dataset.scene = def.key;
      button.dataset.actionGroup = actionGroupFromLabel(def.group);
      button.textContent = def.tab;
      tabBar.insertBefore(button, beforeOverview || null);
    }

    if (labGrid && !labGrid.querySelector(`[data-scene-card="${def.key}"]`)) {
      const card = document.createElement('a');
      card.href = `#module-${def.code}`;
      card.className = 'gateway-card';
      card.dataset.sceneCard = def.key;
      card.dataset.actionGroup = actionGroupFromLabel(def.group);
      card.onclick = () => { window.transitToWorkspace(def.key); return false; };
      card.innerHTML = `<small>${def.group} · 动作 ${def.code}</small><strong>${def.title}</strong><em>进入动作测试</em>`;
      labGrid.appendChild(card);
    }

    if (analysisPane && !$(`module-${def.code}`) && !analysisPane.querySelector(`[data-scene="${def.key}"]`)) {
      const section = document.createElement('section');
      section.className = 'analysis-module generated-module';
      section.id = `module-${def.code}`;
      section.dataset.scene = def.key;
      section.innerHTML = `
        <p class="eyebrow">${def.group} · Action ${def.code}</p>
        <h2>${def.title}</h2>
        <div class="metric-hero">模型相对力矩：<strong id="${def.key}-load-status">计算中</strong></div>
        <label>动作行程
          <input id="${def.key}-progress" type="range" min="0" max="100" value="50">
          <span id="${def.key}-progress-value">50%</span>
        </label>
        <div class="auto-readout machine-action-readout" id="${def.key}-machine-readout">器械参数计算中</div>
        <label>模型输入质量（kg；示例，不是个人能力）
          <input id="${def.key}-load" type="number" min="0" value="60">
        </label>
        <div class="warning-card">${def.cue}</div>
        <details><summary>查看物理原理</summary><p>${def.formula}</p></details>
      `;
      analysisPane.appendChild(section);
    }
  });
}

function renderActionGuides() {
  document.querySelectorAll('.analysis-module[data-scene]').forEach((module) => {
    const scene = normalizeSceneKey(module.dataset.scene);
    const guide = ACTION_GUIDES[scene];
    const heading = module.querySelector('h2');
    if (!guide || !heading || module.querySelector('.action-guide')) return;

    const details = document.createElement('details');
    details.className = 'action-guide';
    details.dataset.guideScene = scene;
    const summary = document.createElement('summary');
    const preview = document.createElement('span');
    preview.className = 'action-guide-preview';
    const title = document.createElement('strong');
    title.textContent = '动作指导';
    const cue = document.createElement('span');
    cue.className = 'action-guide-cue';
    cue.textContent = guide.cue;
    preview.append(title, cue);
    const toggle = document.createElement('span');
    toggle.className = 'action-guide-toggle';
    toggle.setAttribute('aria-hidden', 'true');
    toggle.textContent = '展开';
    summary.append(preview, toggle);

    const body = document.createElement('div');
    body.className = 'action-guide-body';
    const addSection = (titleText, content, listTag) => {
      const section = document.createElement('section');
      section.className = 'action-guide-section';
      const label = document.createElement('h3');
      label.textContent = titleText;
      const text = document.createElement(listTag || 'p');
      if (listTag) {
        content.forEach((line) => {
          const item = document.createElement('li');
          item.textContent = line;
          text.appendChild(item);
        });
      } else text.textContent = content;
      section.append(label, text);
      body.appendChild(section);
    };
    addSection('使用前', guide.setup);
    addSection('动作步骤', guide.steps, 'ol');
    addSection('注意事项', guide.caution, 'ul');

    const references = document.createElement('details');
    references.className = 'action-guide-references';
    const referenceSummary = document.createElement('summary');
    referenceSummary.textContent = '查看参考来源';
    const links = document.createElement('div');
    links.className = 'action-guide-source-links';
    guide.sources.forEach((source, index) => {
      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.title = source.title;
      link.setAttribute('aria-label', source.title);
      const sourceLabel = source.title.startsWith('ACE') ? 'ACE 动作参考'
        : source.title.includes('手册') ? '厂家使用手册'
          : '厂家产品说明';
      link.textContent = `${index + 1}. ${sourceLabel}`;
      links.appendChild(link);
    });
    references.append(referenceSummary, links);
    body.appendChild(references);
    details.append(summary, body);
    details.addEventListener('toggle', () => { toggle.textContent = details.open ? '收起' : '展开'; });
    heading.after(details);
  });
}

function closeInactiveActionGuides(sceneKey) {
  const scene = normalizeSceneKey(sceneKey);
  document.querySelectorAll('.action-guide[open]').forEach((guide) => {
    if (guide.dataset.guideScene !== scene) {
      guide.open = false;
      const references = guide.querySelector('.action-guide-references');
      if (references) references.open = false;
    }
  });
}

renderExtendedActionLibrary();
renderActionGuides();

Object.defineProperties(telemetry, {
  flyAngle: {
    get() { return this.pecAngle; },
    set(value) { this.pecAngle = value; }
  },
  pulldownAngle: {
    get() { return this.latAngle; },
    set(value) { this.latAngle = value; }
  },
  pulldownWeight: {
    get() { return Number(squatLoadInput?.value) || 50; },
    set() {}
  },
  barbellWeight: {
    get() { return Number(squatLoadInput?.value) || 100; },
    set() {}
  }
});

function baseMachineParams(sceneKey = telemetry.activeScene) {
  return MACHINE_BASE_PARAMS[normalizeSceneKey(sceneKey)] || MACHINE_BASE_PARAMS.arm;
}

function machineResistanceSystem(sceneKey = telemetry.activeScene) {
  const key = MACHINE_RESISTANCE_BY_SCENE[normalizeSceneKey(sceneKey)];
  return key ? { key, ...MACHINE_RESISTANCE_SYSTEMS[key] } : null;
}

function machineSchemaForScene(sceneKey = telemetry.activeScene) {
  const base = baseMachineParams(sceneKey);
  return MACHINE_CONTROL_SCHEMAS[base.machineType] || MACHINE_CONTROL_SCHEMAS.lateral;
}

function defaultMachineControlValues(sceneKey = telemetry.activeScene) {
  const schema = machineSchemaForScene(sceneKey);
  return Object.fromEntries([...schema.fields, ...machineEditableFields(sceneKey)].map((field) => [field.key, field.value]));
}

function machineEditableFields(sceneKey = telemetry.activeScene) {
  const policy = MACHINE_SETTING_POLICIES[normalizeSceneKey(sceneKey)];
  if (!policy) return [];
  if (policy.fields) return policy.fields;
  return (policy.keys || []).map((key) => {
    const field = machineSchemaForScene(sceneKey).fields.find((item) => item.key === key);
    const label = key === 'seatHeightCm' ? '坐垫位置（示意）'
      : key === 'startOpenDeg' ? '起始打开位置（示意）' : '双侧滑轮位置（示意）';
    return { ...field, label, relative: true };
  });
}

function boundedMachineFieldValue(field, value) {
  if (value == null || value === '') return field.value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? clamp(numeric, field.min, field.max) : field.value;
}

function sceneMachineTuning(sceneKey = telemetry.activeScene) {
  const scene = normalizeSceneKey(sceneKey);
  const defaults = defaultMachineControlValues(scene);
  const saved = telemetry.machineSceneTuning?.[scene] || {};
  const values = { ...defaults };
  machineEditableFields(scene).forEach((field) => {
    const pulleyValue = scene === 'arm' && field.key === 'pulleyLeftPercent' ? telemetry.armPulleyLeft
      : scene === 'arm' && field.key === 'pulleyRightPercent' ? telemetry.armPulleyRight : null;
    values[field.key] = boundedMachineFieldValue(field, pulleyValue ?? saved[field.key] ?? field.value);
  });
  if (scene === 'arm') values.pulleyHeightCm = 20 + (values.pulleyLeftPercent + values.pulleyRightPercent);
  return values;
}

function setSceneMachineTuning(sceneKey, values) {
  const scene = normalizeSceneKey(sceneKey);
  const current = sceneMachineTuning(scene);
  const next = {};
  machineEditableFields(scene).forEach((field) => {
    next[field.key] = boundedMachineFieldValue(field, values[field.key] ?? current[field.key]);
  });
  telemetry.machineSceneTuning[scene] = next;
  if (scene === 'arm') {
    telemetry.armPulleyLeft = next.pulleyLeftPercent;
    telemetry.armPulleyRight = next.pulleyRightPercent;
  }
}

function machineFieldValueText(field, value) {
  const numeric = Number(value);
  if (field.relative) return `${Math.round((numeric - field.min) / (field.max - field.min) * 100)}%`;
  if (field.unit === ':1') return `${numeric.toFixed(numeric % 1 ? 1 : 0)}:1`;
  if (field.unit === '') return numeric.toFixed(3);
  if (field.step && field.step < 1 && field.unit !== '%') return `${numeric.toFixed(1)}${field.unit}`;
  return `${numeric.toFixed(0)}${field.unit || ''}`;
}

function machineSettingReadout(sceneKey = telemetry.activeScene) {
  const scene = normalizeSceneKey(sceneKey);
  const fields = machineEditableFields(scene);
  const values = sceneMachineTuning(scene);
  return {
    label: fields.length === 1 ? fields[0].label : fields.length ? '可调位置（示意）' : '固定结构',
    value: fields.length === 1 ? machineFieldValueText(fields[0], values[fields[0].key])
      : fields.length ? fields.map((field) => `${field.label.replace('（示意）', '').replace('位置', '')} ${machineFieldValueText(field, values[field.key])}`).join(' / ')
        : '按型号预设',
    fixed: MACHINE_SETTING_POLICIES[scene]?.fixed || '结构按当前型号预设'
  };
}

function currentMachineProfile(sceneKey = telemetry.activeScene) {
  const scene = normalizeSceneKey(sceneKey);
  const base = baseMachineParams(scene);
  const resistance = machineResistanceSystem(scene);
  const transmission = MACHINE_TRANSMISSION_ESTIMATE;
  const tuning = sceneMachineTuning(scene);
  const model = BM.modelProfile;
  const armRatio = model.armRatio;
  const femurRatio = model.femurLength / model.height;
  const tibiaRatio = model.tibiaLength / model.height;
  const isLower = base.family === 'sled' || base.family === 'free-weight' && scene === 'barbell-squat';
  const anthropometricScale = isLower
    ? clamp((femurRatio + tibiaRatio) / .50, .86, 1.16)
    : clamp(armRatio, .9, 1.12);
  const seatOffsetCm = Number(tuning.seatHeightCm ?? tuning.seatHeightOffset ?? 0) - (defaultMachineControlValues(scene).seatHeightCm ?? 50);
  const cableHeightCm = Number(tuning.pulleyHeightCm ?? tuning.pivotHeightCm ?? tuning.elbowPadHeightCm ?? 120);
  const camPeak = Number(tuning.camPeakPercent ?? 55);
  const angleOverride = tuning.railAngleDeg ?? tuning.pressPathDeg ?? tuning.benchAngleDeg ?? tuning.backrestAngleDeg ?? tuning.trunkAngleDeg;
  const pathAngle = Number(angleOverride ?? base.pathAngle) + (transmission.pathAngleOffset || 0);
  const camBias = (base.camBias || 0) + (transmission.camBias || 0) + (camPeak - 55) * .7;
  let efficiency = clamp((transmission.efficiency || .88), .55, 1.05);
  if (tuning.railFriction != null) efficiency = clamp(efficiency - Number(tuning.railFriction) * .85, .55, 1);
  if (tuning.counterBalanceKg != null) efficiency = clamp(efficiency + Number(tuning.counterBalanceKg) / 250, .55, 1.05);
  const romCenterShift = seatOffsetCm / 100 * (isLower ? 34 : 28);
  const gripWidth = Number(tuning.gripWidthCm ?? tuning.handleWidthCm ?? tuning.handWidthCm ?? 60);
  const widthShift = clamp((gripWidth - 60) / 30, -1, 1);
  const heightShift = clamp((cableHeightCm - 130) / 120, -1, 1);
  const romStart = clamp((base.romStart ?? 0) + romCenterShift + widthShift * 6 - heightShift * 5, 0, 185);
  const romEnd = clamp((base.romEnd ?? 100) + romCenterShift + (anthropometricScale - 1) * (isLower ? 26 : 18) - widthShift * 4, 0, 185);
  const pulleyRatio = tuning.cableRatio != null
    ? Number(tuning.cableRatio)
    : base.pulleyRatio != null
      ? Number(base.pulleyRatio)
    : base.family.includes('cable') || base.family === 'dual-cable' || base.family === 'high-cable'
      ? (transmission.pulleyRatio || 1)
      : 1;
  const friction = clamp(Number(tuning.railFriction ?? transmission.friction ?? .045) + (1 - efficiency) * .06, .015, .18);
  const leverCm = Number(tuning.leverArmCm ?? tuning.plateHornCm ?? tuning.shinPadCm ?? tuning.upperArmLeverCm ?? 45);
  const leverBase = base.family.includes('free') ? 45 : 50;
  let leverRatio = clamp((transmission.leverRatio || 1) * anthropometricScale * (leverCm / leverBase), .62, 1.75);
  if (tuning.bodyweightShare != null) leverRatio *= Number(tuning.bodyweightShare) / 64;
  if (tuning.footElevationCm != null) leverRatio *= 1 + Number(tuning.footElevationCm) / 180;
  if (tuning.heelLiftCm != null && scene === 'barbell-squat') leverRatio *= 1 - Number(tuning.heelLiftCm) / 45;
  if (tuning.trunkLeanDeg != null) leverRatio *= 1 + Number(tuning.trunkLeanDeg) / 120;
  return { ...base, scene, resistanceSystem: resistance?.key || null, resistanceLabel: resistance?.label || '', pulleyRatio, efficiency, friction, leverRatio, camBias, pathAngle, romStart, romEnd, anthropometricScale, controlValues: tuning, schema: machineSchemaForScene(scene) };
}

function machineJointAngle(sceneKey = telemetry.activeScene, stepPercent = currentActionStep(sceneKey)) {
  const p = currentMachineProfile(sceneKey);
  const t = clamp(Number(stepPercent) || 0, 0, 100) / 100;
  return p.romStart + (p.romEnd - p.romStart) * t;
}

function machineResistanceShape(profile, t) {
  const shifted = clamp(t + (profile.camBias || 0) / 100, 0, 1);
  if (profile.resistanceProfile === 'gravity') return Math.sin(shifted * Math.PI / 2);
  if (profile.resistanceProfile === 'bottom') return 1 - shifted * .52;
  if (profile.resistanceProfile === 'late' || profile.resistanceProfile === 'end') return .25 + Math.pow(shifted, 1.35) * .85;
  if (profile.resistanceProfile === 'flat-late') return .62 + shifted * .38;
  if (profile.resistanceProfile === 'cam-front') return .35 + (1 - shifted) * .7;
  if (profile.resistanceProfile === 'linear-friction') return .9 + shifted * .16;
  return .32 + Math.sin(shifted * Math.PI) * .78;
}

function machineAdjustedLoad(sceneKey, rawLoad, stepPercent = currentActionStep(sceneKey)) {
  const profile = currentMachineProfile(sceneKey);
  const t = clamp(Number(stepPercent) || 0, 0, 100) / 100;
  const shape = machineResistanceShape(profile, t);
  return Math.max(0, rawLoad * profile.leverRatio * profile.efficiency / Math.max(.5, profile.pulleyRatio) * shape);
}

function syncMachineControlsFromTelemetry() {
  const resistance = machineResistanceSystem(telemetry.activeScene);
  if ($('machine-config-root')) $('machine-config-root').hidden = !resistance;
  if (machineResistanceReadout) {
    machineResistanceReadout.dataset.resistanceSystem = resistance?.key || '';
    $('machine-resistance-name').textContent = resistance?.label || '';
    $('machine-resistance-detail').textContent = resistance?.detail || '';
  }
  const fields = machineEditableFields(telemetry.activeScene);
  const policy = MACHINE_SETTING_POLICIES[normalizeSceneKey(telemetry.activeScene)];
  const values = sceneMachineTuning(telemetry.activeScene);
  const inputs = [machinePathAngleInput, machineSeatHeightInput, machineCamBiasInput, machineEfficiencyInput];
  const valueNodes = [$('machine-path-angle-value'), $('machine-seat-height-value'), $('machine-cam-bias-value'), $('machine-efficiency-value')];
  const labelNodes = [$('machine-path-angle-label'), $('machine-seat-height-label'), $('machine-cam-bias-label'), $('machine-efficiency-label')];
  inputs.forEach((input, index) => {
    if (!input) return;
    const field = fields[index];
    input.closest('label').hidden = !field;
    input.disabled = !field;
    if (!field) {
      delete input.dataset.machineKey;
      if (labelNodes[index]) labelNodes[index].textContent = '';
      if (valueNodes[index]) valueNodes[index].textContent = '';
      return;
    }
    input.dataset.machineKey = field.key;
    input.min = String(field.min);
    input.max = String(field.max);
    input.step = String(field.step || 1);
    input.value = String(values[field.key] ?? field.value);
    if (labelNodes[index]) labelNodes[index].textContent = field.label;
    if (valueNodes[index]) valueNodes[index].textContent = machineFieldValueText(field, input.value);
    input.setAttribute('aria-valuetext', machineFieldValueText(field, input.value));
  });
  if ($('machine-fixed-structure')) $('machine-fixed-structure').textContent = policy?.fixed || '结构按当前型号预设';
  if ($('machine-param-grid')) $('machine-param-grid').hidden = !resistance || !fields.length;
  if ($('machine-field-help')) {
    $('machine-field-help').hidden = !resistance || !fields.some((field) => field.relative || field.unit === '%');
    $('machine-field-help').textContent = '模型位置示意 · 非实物档位刻度';
  }
  updateMachineReadouts();
}

function updateMachineReadouts() {
  if (!machineResistanceSystem(telemetry.activeScene)) {
    if ($('machine-derived-readout')) $('machine-derived-readout').textContent = '';
    return;
  }
  const profile = currentMachineProfile(telemetry.activeScene);
  const step = currentActionStep(telemetry.activeScene);
  const angle = telemetry.activeScene === 'cam' ? physicsParamsForScene('cam', step).angleDeg : machineJointAngle(telemetry.activeScene, step);
  const fields = machineEditableFields(telemetry.activeScene);
  const values = sceneMachineTuning(telemetry.activeScene);
  const inputs = [machinePathAngleInput, machineSeatHeightInput, machineCamBiasInput, machineEfficiencyInput];
  const valueNodes = [$('machine-path-angle-value'), $('machine-seat-height-value'), $('machine-cam-bias-value'), $('machine-efficiency-value')];
  fields.forEach((field, index) => {
    if (!inputs[index]) return;
    inputs[index].value = String(values[field.key]);
    const text = machineFieldValueText(field, values[field.key]);
    if (valueNodes[index]) valueNodes[index].textContent = text;
    inputs[index].setAttribute('aria-valuetext', text);
  });
  if ($('machine-derived-readout')) {
    $('machine-derived-readout').textContent = `模型估算 · 传动倍率 ${(profile.leverRatio * profile.efficiency / profile.pulleyRatio).toFixed(1)}× · ${telemetry.activeScene === 'cam' ? '模型转角 θ' : profile.joint + '角约'} ${angle.toFixed(0)}° · ${modelInputSource(telemetry.activeScene)}`;
  }
}

function updateControlReadouts() {
  $('arm-angle-value').textContent = `${telemetry.armAngle.toFixed(0)}°`;
  $('cam-angle-value').textContent = `${((-.1 + telemetry.camAngle / 360 * 1.46) * 180 / Math.PI).toFixed(1)}° · ${(telemetry.camAngle / 3.6).toFixed(0)}% 行程`;
  camAngleInput.setAttribute('aria-valuetext', $('cam-angle-value').textContent);
  $('cam-aggression-value').textContent = `${telemetry.camAggression.toFixed(2)}×`;
  $('sled-mass-value').textContent = `${telemetry.plateMass.toFixed(1)} kg 装片质量 / ${telemetry.totalMovingMass.toFixed(1)} kg 总质量（模型输入）`;
  $('pec-angle-value').textContent = `${telemetry.pecAngle.toFixed(0)}% 行程`;
  $('pec-cam-value').textContent = `${telemetry.pecCam.toFixed(2)}×`;
  $('lat-angle-value').textContent = `${telemetry.latAngle.toFixed(0)}°`;
  $('lat-pulley-value').textContent = `${telemetry.latPulley.toFixed(0)}% 位置示意`;
  $('squat-depth-value').textContent = `${telemetry.squatDepth.toFixed(0)}% 行程`;
  setModelReadout('muscle-load-status', 'arm');
  setModelReadout('pec-load-status', 'pec');
  setModelReadout('lat-load-status', 'lat');
  setModelReadout('squat-load-status', 'barbell-squat');
  EXTRA_ACTION_DEFS.forEach((def) => {
    const progress = extraProgress(def.key);
    if ($(`${def.key}-progress-value`)) $(`${def.key}-progress-value`).textContent = `${progress.toFixed(0)}% 行程`;
    if ($(`${def.key}-machine-readout`)) {
      const profile = currentMachineProfile(def.key);
      const hud = extraHudProfile(def, progress, profile);
      $(`${def.key}-machine-readout`).textContent = `${profile.schema.title} · ${hud.secondaryLabel} ${hud.secondaryValue} · ${hud.normal}`;
    }
    setModelReadout(`${def.key}-load-status`, def.key);
  });
  updateMachineReadouts();
}

function setModelReadout(nodeId, sceneKey) {
  const node = $(nodeId);
  if (!node) return;
  const comparison = modelCurveComparison(sceneKey);
  node.textContent = comparison.percent == null ? '无可比较峰值' : `${comparison.percent.toFixed(0)}% · 相对当前设置的采样峰值`;
  const panel = node.closest('.metric-hero');
  if (!panel) return;
  if (panel.firstChild?.nodeType === 3) panel.firstChild.textContent = '模型相对力矩：';
  let source = panel.querySelector('.model-source-note');
  if (!source) { source = document.createElement('small'); source.className = 'model-source-note'; panel.append(source); }
  source.textContent = `${modelInputSource(sceneKey)}。${comparison.basis}；不测量肌肉激活、酸胀或伤害风险。`;
}

const modelCurveCache = new Map();
function modelCurveComparison(sceneKey = telemetry.activeScene, step = currentActionStep(sceneKey)) {
  const scene = normalizeSceneKey(sceneKey);
  if (scene === 'overview') return { percent: null, basis: '尚未选择动作', peak: null };
  const current = updatePhysics({ ...physicsParamsForScene(scene, step), sceneKey: scene });
  const quantity = scene === 'incline' ? 'forceN' : 'torqueNm';
  const signature = JSON.stringify([scene, sceneLoadKg(scene), telemetry.armLinkLength, telemetry.camAggression, telemetry.slopeAngle, currentMachineProfile(scene)]);
  let sample = modelCurveCache.get(scene);
  if (!sample || sample.signature !== signature) {
    const values = resistanceSampleLabels().map((step) => Math.abs(updatePhysics({ ...physicsParamsForScene(scene, step), sceneKey: scene })[quantity]));
    const peak = Math.max(0, ...values.filter(Number.isFinite));
    sample = { signature, peak };
    modelCurveCache.set(scene, sample);
  }
  const currentValue = Math.abs(current[quantity]);
  const percent = sample.peak > 0 && Number.isFinite(currentValue) ? clamp(currentValue / sample.peak * 100, 0, 100) : null;
  return { percent, peak: sample.peak, quantity, basis: `同一模型、同一输入设置，行程每5%采样的${quantity === 'forceN' ? '力' : '力矩'}峰值=100%` };
}

function modelInputSource(sceneKey = telemetry.activeScene) {
  const scene = normalizeSceneKey(sceneKey);
  const mass = sceneLoadKg(scene);
  const kinds = Object.values(BM.modelProfile.sources);
  const geometry = kinds.includes('modelExample') ? '含模型示例尺寸' : kinds.includes('estimatedFromHeight') ? '含按身高估算的尺寸' : '尺寸来自用户填写';
  return `模型输入质量 ${mass.toFixed(mass % 1 ? 1 : 0)} kg；${geometry}；传动与力臂为简化估算`;
}


function currentPecLoad() { return modelCurveComparison('pec').percent ?? 0; }


function currentLatLoad() { return modelCurveComparison('lat').percent ?? 0; }


function isExtraScene(sceneKey) {
  return Boolean(EXTRA_ACTION_MAP[normalizeSceneKey(sceneKey)]);
}

function extraProgress(sceneKey) {
  const key = normalizeSceneKey(sceneKey);
  if (key === 'barbell-squat') return clamp(telemetry.squatDepth, 0, 100);
  if (telemetry.extraProgress[key] == null) telemetry.extraProgress[key] = 50;
  return clamp(Number(telemetry.extraProgress[key]) || 0, 0, 100);
}

function extraLoad(sceneKey) {
  const key = normalizeSceneKey(sceneKey);
  if (key === 'barbell-squat') return Math.max(0, finiteNumber(squatLoadInput?.value, BM.modelLoads[key]));
  if (telemetry.extraLoad[key] == null) telemetry.extraLoad[key] = 60;
  return Math.max(0, finiteNumber(telemetry.extraLoad[key], 60));
}


function extraCurveValue(def, stepPercent = extraProgress(def.key), loadValue = extraLoad(def.key)) {
  const groupGain = def.group === '肩部' ? 1.18 : def.group === '背部' ? 1.08 : def.group === '腿部' ? 1.35 : 1;
  return machineAdjustedLoad(def.key, loadValue * groupGain, stepPercent);
}

function resistanceSampleLabels() {
  return Array.from({ length: 21 }, (_, index) => index * 5);
}

function extraLoadPercent(def, stepPercent = extraProgress(def.key)) { return modelCurveComparison(def.key, stepPercent).percent ?? 0; }


function currentSquatForces() {
  const depth = telemetry.squatDepth / 100;
  const load = Math.max(0, finiteNumber(squatLoadInput.value, BM.modelLoads['barbell-squat']));
  const profile = currentMachineProfile('barbell-squat');
  if (telemetry.squatMode === 'sled') {
    const slope = telemetry.slopeAngle * Math.PI / 180;
    return {
      axial: load * .18,
      shear: load * (Math.sin(slope) + profile.friction * Math.cos(slope)) * (.8 + depth * .3)
    };
  }
  return {
    axial: load * profile.leverRatio * (1.05 + depth * .28),
    shear: load * profile.leverRatio * (.18 + depth * .36)
  };
}

function currentSledForceSnapshot() {
  const slope = telemetry.slopeAngle * Math.PI / 180;
  const profile = currentMachineProfile('incline');
  const push = telemetry.totalMovingMass * (Math.sin(slope) + profile.friction * Math.cos(slope)) * profile.efficiency;
  const drop = telemetry.totalMovingMass * Math.max(0, Math.sin(slope) - profile.friction * Math.cos(slope)) * profile.efficiency;
  const asymmetry = push ? (1 - drop / push) * 100 : 0;
  return { push, drop, asymmetry };
}

function currentLegPressKinematics(progress = telemetry.m3_pos) {
  const t = clamp(Number(progress) || 0, 0, 1);
  const extension = t * 100;
  const kneeAngle = 72 + t * 92;
  const hipFlexion = 96 - t * 52;
  const ankleDistance = 42 + t * 38;
  const stage = t < .18 ? '底部深屈曲' : t > .82 ? '接近锁膝段' : '中段发力区';
  const cue = t > .88
    ? '快到顶端了，别弹锁膝。'
    : t < .18
      ? '底部膝髋最弯，先稳住骨盆再推。'
      : '中段最适合稳定发力，膝盖跟脚尖方向一致。';
  return { extension, kneeAngle, hipFlexion, ankleDistance, stage, cue };
}

function calculatePhysics(sceneKey = telemetry.activeScene) {
  const scene = normalizeSceneKey(sceneKey);
  if (scene === 'overview') return { muscleLoad: null, mainMetric: '选择动作', subMetric: '模型未选择', formulaText: '模型示意与个人训练记录独立。', geekFormula: '', activeMuscleGroup: '未选择', source: null };
  const kernel = updatePhysics({ sceneKey: scene });
  const comparison = modelCurveComparison(scene);
  const principle = getMechanismPrinciple(scene);
  const muscle = currentMachineProfile(scene).target || EXTRA_ACTION_MAP[scene]?.muscle || '相关肌群';
  return {
    // Legacy property name is retained for callers; it is a relative model curve.
    muscleLoad: comparison.percent,
    mainMetric: kernel.primaryMetric,
    subMetric: kernel.secondaryMetric,
    geekFormula: principle.formula,
    formulaText: `${comparison.basis}；只描述机械模型，不能测量实际肌肉激活或个人能力。`,
    activeMuscleGroup: muscle,
    source: modelInputSource(scene),
    relativeModelPercent: comparison.percent,
    kernel
  };
}


function currentActionStep(sceneKey = telemetry.activeScene) {
  const scene = normalizeSceneKey(sceneKey);
  if (scene === 'arm') return clamp(telemetry.armAngle / 90 * 100, 0, 100);
  if (scene === 'cam') return clamp(telemetry.camAngle / 360 * 100, 0, 100);
  if (scene === 'incline') return clamp(telemetry.m3_pos * 100, 0, 100);
  if (scene === 'pec') return clamp(telemetry.pecAngle, 0, 100);
  if (scene === 'lat') return clamp((telemetry.latAngle - 10) / 110 * 100, 0, 100);
  if (scene === 'barbell-squat') return clamp(telemetry.squatDepth, 0, 100);
  if (isExtraScene(scene)) return extraProgress(scene);
  return 0;
}

function getMechanismPrinciple(sceneKey = telemetry.activeScene) {
  const scene = normalizeSceneKey(sceneKey);
  const catalog = {
    incline: {
      type: '斜面与摩擦力学模型',
      mechanism: '斜面分力 + 导轨接触摩擦力',
      formula: 'F_parallel = M g sinθ；F_push = Mg sinθ + μMg cosθ；F_lower = Mg sinθ - μMg cosθ',
      chain: '机械链：滑车和杠铃片形成总重量 → 45° 导轨把重力分解为沿斜面下滑的力 → 推起时还要克服导轨摩擦 → 下放时摩擦反向托住滑车 → 臀腿负责把脚踏板沿导轨反向顶起。',
      effect: '在45°、忽略摩擦的静态模型中，沿轨道的力为总质量×9.81×sin45°，单位N。摩擦使推起力与下放力不同；这不是个人体感或深蹲能力换算。'
    },
    lat: {
      type: '固定转臂与钢索传动',
      mechanism: '固定转臂绕机器轴运动，钢索与传动件连接配重',
      formula: 'F_handle × d_handle = T_cable × d_cable（均为对同一轴的垂直力臂）',
      chain: '配重 → 钢索 → 机器轴与工作臂 → 固定握把；不是自由横杆的 1:1 定滑轮。',
      effect: '理想静力平衡示意，忽略摩擦与惯性。有效力臂函数与手柄垂距均为未标定的模型假设，不据此推断真实手感或肌肉激活。'
    },
    cam: {
      type: '非圆凸轮系统',
      mechanism: '理想有效力臂传动',
      formula: 'τ_load(θ) = F_cable · d⊥(θ)',
      chain: '机械链：配重 → 钢索张力 → 转轴与作用线之间的垂直力臂 → 转臂 → 小腿垫。',
      effect: '当前计算先假定有效力臂函数 d⊥(θ)，它不等于凸轮轮廓极径；尚未反求接触切线或可制造轮廓，不能据此判断个人膝盖风险或肌肉能力。'
    },
    pec: {
      type: '非圆凸轮系统',
      mechanism: '凸轮/转轴把配重转成水平内收阻力',
      formula: 'tau_load(θ) = F_cable · r(θ)；T_pec ≈ F · r_humerus · sinα',
      chain: '机械链：配重或凸轮阻力 → 左右转轴带动肘垫/手柄 → 手臂被向外打开 → 人向中线夹回 → 胸大肌做肩水平内收。',
      effect: '固定夹胸和蝴蝶机通过凸轮让中后段继续有阻力，减少自由重量末端失载。'
    },
    'barbell-squat': {
      type: '自由重力直接作用系统',
      mechanism: '重力垂直向下 + 关节水平力臂投影',
      formula: 'tau = Mg · d_perp = Mg · L · sinθ',
      chain: '机械链：杠铃片重力直接向下压在身体上 → 脊柱承受轴向压力 → 髋膝产生水平力臂 → 股四头、臀和竖脊肌共同伸展顶起杠铃。',
      effect: '没有滑轮和凸轮补偿，姿态角一变，腰膝力矩会立刻明显变化。'
    },
    arm: {
      type: '自由重力 / 绳索张力对比系统',
      mechanism: '配重经定滑轮改变方向，钢索张力沿拉线作用于手柄',
      formula: 'τ = |r × F| = TL|sinφ|；φ = 位置向量 r 与拉力 F 的夹角，θ 为自竖直向下量起的抬臂角',
      chain: '机械链：配重片上升形成钢索张力，定滑轮改变拉力方向，手柄再通过手臂力臂形成肩关节转矩。',
      effect: '固定配重与倍率时，理想手柄拉力 T 不随拉出距离变轻；滑轮位置改变方向、φ 与垂直力臂。竖直重力点负载才使用 mgL|sinθ|。'
    }
  };
  catalog.squat = catalog['barbell-squat'];
  if (catalog[scene]) return catalog[scene];

  const def = EXTRA_ACTION_MAP[scene];
  if (!def) {
    return {
      type: '动作选择中',
      mechanism: '等待绑定机械结构',
      formula: 'Select scene',
      chain: '选择一个动作后，这里会显示负载如何通过机械结构传到目标肌群。',
      effect: '先进入 3D 力学实验室选择具体动作。'
    };
  }
  if (def.key === 'cable-fly') {
    return {
      type: '滑轮与绳索张力系统',
      mechanism: '双塔复合缆绳，常见 2:1 手感折算',
      formula: '1:1: F_handle≈Mg；2:1: F_handle≈Mg/2，绳索行程约翻倍',
      chain: '机械链：左右配重塔向下 → 钢索绕过两侧滑轮 → 手柄被沿钢索方向向外拉 → 人向中线夹回 → 胸大肌持续水平内收。',
      effect: '绳索方向跟着手柄变，动作末端仍能保持胸肌张力。'
    };
  }
  if (def.model === 'fly' || def.model === 'pullover') {
    return {
      type: '非圆凸轮系统',
      mechanism: '凸轮半径 r(θ) 动态改变阻力臂',
      formula: 'tau_load(θ) = F_cable · r(θ)',
      chain: def.model === 'pullover'
        ? '机械链：配重拉动大圆/非圆凸轮 → 摆臂和肘垫传力 → 上臂从头顶向躯干下压 → 背阔肌做肩伸展。'
        : '机械链：配重拉动凸轮/连杆 → 肘垫被向外顶开 → 人把肘垫夹回中线 → 胸大肌做肩水平内收。',
      effect: '凸轮用变力臂匹配肌肉不同角度的强弱，减少死点提前力竭。'
    };
  }
  if (def.key === 'cable-row') {
    return {
      type: '钢索配重与刚性划船架',
      mechanism: '自调节握把带动低转轴划船架，转轴侧的钢索再以 1:1 比例拉起配重片',
      formula: 'F_handle·L_handle≈T_cable·L_cam；tau_row≈T_cable·r_lever·sinα',
      chain: '机械链：插片配重向下 → 钢索绕过低位滑轮 → 手柄获得水平向前牵拉 → 人向后划船 → 肩胛后缩和背阔肩伸展。',
      effect: '低位滑轮让阻力方向对准划船轨迹，比自由重量更容易保持水平拉线。'
    };
  }
  if (def.model.includes('pulldown')) {
    return {
      type: '滑轮与绳索张力系统',
      mechanism: def.key === 'scissor-pulldown' ? '分动杠杆 + 滑轮/装片传力' : '顶端定滑轮 1:1 改向',
      formula: def.key === 'scissor-pulldown' ? 'tau = F_plate·L_load·sinφ1 = F_user·L_effort·sinφ2' : 'F_handle≈Mg；T_cable 沿钢索切线',
      chain: def.key === 'scissor-pulldown'
        ? '机械链：侧置片重或配重产生力矩 → 上方双转点形成分动圆弧 → 手柄沿外侧弧线下压 → 肘向躯干靠近 → 背阔外侧发力。'
        : '机械链：配重塔向下 → 顶端定滑轮把力改成向上拉横杆 → 人向下拉横杆 → 背阔肌做肩内收/伸展。',
      effect: def.key === 'scissor-pulldown' ? '分动圆弧更接近肩关节下拉轨迹。' : '滑轮不改变重量大小，但改变方向并保持全程张力。'
    };
  }
  if (def.key === 'flat-press' || def.key === 'incline-press' || def.key === 'hammer-row' || def.key === 'machine-military-press' || def.key === 'seated-machine-shoulder') {
    return {
      type: '刚性旋转杠杆与四连杆机构',
      mechanism: '装片端/配重端绕偏心转轴驱动手柄弧线',
      formula: 'F_plate · L_load · sinφ1 = F_user · L_effort · sinφ2',
      chain: '机械链：装片杆或配重端产生阻力矩 → 主转轴/连杆把力传到推拉臂 → 手柄沿收敛或发散弧线运动 → 人沿固定轨迹推/拉 → 目标肌群发力。',
      effect: '杠杆和连杆用弧线轨迹贴近肩关节运动，同时动态改变力臂，减少自由重量末端失载。'
    };
  }
  return {
    type: '自由重力直接作用系统',
    mechanism: '重力垂直向下 + 人体关节力臂',
    formula: def.key === 'pushup' ? '双手承重约 0.60-0.70 · BW' : 'tau = Mg · d_perp = Mg · L · sinθ',
    chain: def.key === 'pushup'
      ? '机械链：身体自重落在手脚支点之间 → 双手承担约 60%-70% 体重 → 人推地完成肩水平推和肘伸。'
      : '机械链：杠铃/哑铃重力直接向下 → 手臂或躯干形成水平力臂 → 人体关节产生抗阻力矩 → 目标肌群直接发力。',
    effect: '没有机械补偿，阻力矩完全跟姿态角和重心投影走。'
  };
}

function switchWorkspace(workspaceKey) {
  const key = workspaceKey === 'plan' ? 'plan' : 'lab';
  document.querySelectorAll('.nav-btn').forEach((button) => button.classList.toggle('active', button.dataset.workspace === key));
  document.querySelectorAll('.workspace-page').forEach((page) => page.classList.toggle('active', page.id === `ws-${key}`));
  if (key === 'lab') {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  } else if (key === 'plan') {
    requestAnimationFrame(generatePersonalPlan);
  }
}

function showLabCategory(categoryKey = '') {
  activeLabCategory = categoryKey || '';
  const categoryGrid = document.querySelector('.lab-category-grid');
  const actionGrid = document.querySelector('.lab-gateways-grid');
  const categoryBack = $('btn-back-to-lab-categories');
  if (categoryGrid) categoryGrid.classList.toggle('lab-category-hidden', Boolean(activeLabCategory));
  if (actionGrid) actionGrid.classList.toggle('lab-action-picker-hidden', !activeLabCategory);
  if (categoryBack) categoryBack.classList.toggle('lab-category-back-active', Boolean(activeLabCategory));
  document.querySelectorAll('.lab-gateways-grid .gateway-card').forEach((card) => {
    const group = card.dataset.actionGroup || 'all';
    card.hidden = Boolean(activeLabCategory) && group !== activeLabCategory;
  });
  filterActionTabs(activeLabCategory || 'all');
}

function filterActionTabs(groupKey = 'all') {
  const group = ['chest', 'shoulder', 'back', 'legs'].includes(groupKey) ? groupKey : 'all';
  document.querySelectorAll('.action-group-filter').forEach((button) => {
    const selected = button.dataset.actionFilter === group;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  document.querySelectorAll('.action-tab').forEach((tab) => {
    const tabGroup = tab.dataset.actionGroup || 'all';
    tab.hidden = group !== 'all' && tabGroup !== group;
  });
  const activeTab = document.querySelector('.action-tab.active');
  if (!activeTab || activeTab.hidden) {
    const firstVisible = document.querySelector('.action-tab:not([hidden])');
    if (firstVisible) {
      applySceneChrome(firstVisible.dataset.scene);
      focusSceneHandler?.(firstVisible.dataset.scene);
    }
  }
  const selectedTab = document.querySelector('.action-tab.active:not([hidden])');
  if (selectedTab) selectedTab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function showPortalStage(stageKey = 'welcome') {
  const normalizedStage = ['profile', 'lab', 'branches'].includes(stageKey) ? stageKey : 'welcome';
  const stageId = {
    welcome: 'portal-welcome-stage',
    profile: 'portal-profile-stage',
    branches: 'portal-branches-stage',
    lab: 'portal-lab-stage'
  }[normalizedStage] || 'portal-welcome-stage';
  document.querySelectorAll('#portal-hub-overlay .portal-stage').forEach((stage) => {
    stage.classList.toggle('portal-stage-active', stage.id === stageId);
  });
  if (normalizedStage === 'lab') showLabCategory('');
  $('portal-hub-overlay')?.classList.toggle('portal-can-go-back', normalizedStage !== 'welcome');
  $('portal-hub-overlay')?.classList.toggle('portal-profile-active', normalizedStage === 'profile');
  if ($('portal-hub-overlay')) $('portal-hub-overlay').scrollTop = 0;
  if (normalizedStage === 'profile') $('body-profile-heading')?.focus({ preventScroll: true });
}

function hidePortalOverlay() {
  const overlay = $('portal-hub-overlay');
  if (!overlay) return;
  overlay.style.opacity = '0';
  overlay.style.pointerEvents = 'none';
  setTimeout(() => { overlay.style.display = 'none'; }, 300);
}

function showPortalOverlay(stageKey = 'welcome') {
  const overlay = $('portal-hub-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.style.pointerEvents = 'auto';
  showPortalStage(stageKey);
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });
}

function applySceneChrome(sceneKey) {
  const scene = normalizeSceneKey(sceneKey);
  closeInactiveActionGuides(scene);
  const labels = {
    overview: ['商用健身器械总览', '选择一台器械查看真实结构与运动传动'],
    arm: ['OP-DAP 双塔可调滑轮侧平举', '滑轮高度、钢索方向与肩关节力臂对照'],
    cam: ['Life Fitness Axiom OP-LE 膝伸展机', '凸轮、钢索、配重塔与膝伸转臂同步'],
    incline: ['Hammer Strength 45° 线性倒蹬机', '双导轨滑车、四根挂片轴与斜面分力同步'],
    pec: ['Life Fitness Axiom OP-FLY 胸飞鸟 / 后束机', '双侧转臂通过独立凸轮钢索抬升配重'],
    lat: ['Life Fitness Axiom OP-PD 高位下拉机', '固定转臂、机器轴与钢索配重传动；参数未标定'],
    'barbell-squat': ['奥林匹克深蹲架自由杠铃深蹲', '安全杆、J 杯、杠铃与片重垂直运动'],
    squat: ['奥林匹克深蹲架自由杠铃深蹲', '安全杆、J 杯、杠铃与片重垂直运动']
  };
  EXTRA_ACTION_DEFS.forEach((def) => { labels[def.key] = [def.title, `${def.group} · ${def.metric}`]; });
  telemetry.activeScene = scene;
  syncMachineControlsFromTelemetry();
  document.querySelectorAll('.action-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.scene === scene));
  document.querySelectorAll('.analysis-module').forEach((module) => module.classList.toggle('active', module.dataset.scene === scene));
  const [title, desc] = labels[scene] || labels.overview;
  if ($('hud-scene')) $('hud-scene').textContent = title;
  if ($('hud-description')) $('hud-description').textContent = desc;
  updateCoachHud();
}

function enterPortalWorkspace(workspaceKey) {
  hidePortalOverlay();
  switchWorkspace(workspaceKey || 'lab');
  if (workspaceKey === 'lab') {
    applySceneChrome(telemetry.activeScene || 'overview');
    if (focusSceneHandler) focusSceneHandler(telemetry.activeScene || 'overview');
  }
}

function returnToPreviousLevel() {
  const overlay = $('portal-hub-overlay');
  const overlayVisible = overlay && getComputedStyle(overlay).display !== 'none' && getComputedStyle(overlay).pointerEvents !== 'none';
  if (overlayVisible) {
    if ($('portal-lab-stage')?.classList.contains('portal-stage-active')) {
      if (activeLabCategory) {
        showLabCategory('');
      } else {
        showPortalStage('branches');
      }
    } else if ($('portal-branches-stage')?.classList.contains('portal-stage-active')) {
      showPortalStage('profile');
    } else if ($('portal-profile-stage')?.classList.contains('portal-stage-active')) {
      showPortalStage('welcome');
    }
    return;
  }

  const activeWorkspace = document.querySelector('.workspace-page.active')?.id?.replace('ws-', '') || 'lab';
  if (activeWorkspace === 'lab') {
    showPortalOverlay('lab');
  } else {
    showPortalOverlay('branches');
  }
}

function updateTrainingTracker() {
  const load = nullableNumber(trackerLoadInput?.value, 0, 2000);
  const reps = nullableNumber(trackerRepsInput?.value, 1, 20);
  const rpe = nullableNumber(trackerRpeInput?.value, 6, 10);
  const week = nullableNumber(trackerWeekLoadInput?.value, 0, 1e9);
  const month = nullableNumber(trackerMonthLoadInput?.value, 0, 1e9);
  const estimate = load != null && load > 0 && reps != null && reps <= 10 ? load * (1 + reps / 30) : null;
  if ($('tracker-1rm')) $('tracker-1rm').textContent = estimate == null ? '未知 · 需填写同一动作的实际重量和次数' : `${estimate.toFixed(0)} kg · Epley估算，非实测`;
  if ($('tracker-working-load')) $('tracker-working-load').textContent = rpe == null ? '未填写感受' : `本次填写 RPE ${rpe}`;
  const ratio = week != null && month != null && month > 0 ? week / month : null;
  if ($('tracker-acwr-bar')) $('tracker-acwr-bar').style.width = ratio == null ? '0%' : `${clamp(ratio / 2 * 100, 0, 100).toFixed(0)}%`;
  if ($('tracker-acwr-text')) $('tracker-acwr-text').textContent = ratio == null
    ? '训练量未知。需同一统计口径的本周及近四周平均记录。'
    : `本周/近四周平均记录量之比 ${ratio.toFixed(2)}；只描述记录变化，不作疲劳或伤害风险判断。`;
  updateSetPlan(estimate);
}


function classifyMeasurements(profile = {}) {
  const p = normalizedProfile(profile);
  const ratio = (a, b) => a != null && b != null && b > 0 ? a / b : null;
  return {
    height: p.height, armSpan: p.armSpan, upperArm: p.upperArmLength, forearm: p.forearmLength,
    femur: p.femurLength, tibia: p.tibiaLength, shoulder: p.shoulderWidthCm,
    armSpanRatio: ratio(p.armSpan, p.height),
    armSegmentRatio: p.upperArmLength != null && p.forearmLength != null ? ratio(p.upperArmLength + p.forearmLength, p.height) : null,
    femurRatio: ratio(p.femurLength, p.height), tibiaRatio: ratio(p.tibiaLength, p.height),
    femurToTibia: ratio(p.femurLength, p.tibiaLength), shoulderRatio: ratio(p.shoulderWidthCm, p.height),
    armBalance: ratio(p.upperArmLength, p.forearmLength),
    armCategory: null, femurCategory: null, shoulderCategory: null,
    upperSummary: '仅保留已填写的测量；未测量字段未知，不自动判断体型或动作能力。',
    lowerSummary: '尺寸比例只用于模型几何示意，不生成个人深蹲或伤害风险结论。'
  };
}


function classifyMobilityAndSpine(profile = {}) {
  const p = normalizedProfile(profile);
  return {
    ankleCm: p.ankleDorsiflexionCm, plank: p.plankSeconds, hingeGap: p.hingeGapCm, legRaise: p.legRaiseAngle,
    ankleMobility: null, ankleCategory: null, spineRisk: null, pelvisControl: null, spineCategory: null,
    ankleSummary: '仅保留用户填写的测量，不由距离自动判定活动能力。',
    spineSummary: '未计算腰椎风险评分；模型与这些测量不能诊断个人伤害风险。'
  };
}


function syncUserProfileFromUI(options = {}) {
  telemetry.userProfile = normalizedProfile(telemetry.userProfile);
  BM.modelProfile = buildModelProfile(telemetry.userProfile);
  telemetry.armLinkLength = .35 * BM.modelProfile.armRatio;
  if (armLengthPreset) armLengthPreset.value = telemetry.armLinkLength.toFixed(3);
  if ($('arm-length-readout')) $('arm-length-readout').textContent = `模型几何：臂展/身高 ${BM.modelProfile.armRatio.toFixed(2)} · 等效力臂约 ${(telemetry.armLinkLength * 100).toFixed(0)}cm（估算）`;
  if ($('arm-length-source-note')) {
    const p = BM.modelProfile;
    $('arm-length-source-note').textContent = `身高 ${p.height.toFixed(0)}cm（${sourceLabel(p.sources.height)}）；臂展 ${p.armSpan.toFixed(0)}cm（${sourceLabel(p.sources.armSpan)}）。模型示例/估算没有写入个人档案或训练负荷。`;
  }
  if (options.refresh) { updateControlReadouts(); updateCoachHud(); }
  // Changing body measurements must never regenerate or overwrite a saved plan.
}


function femurValueToUi(value) {
  if (value === 'short' || value === '偏短') return '偏短';
  if (value === 'long' || value === '偏长') return '偏长';
  return '标准';
}

function femurUiToStored(value) {
  if (value === '偏短' || value === 'short') return 'short';
  if (value === '偏长' || value === 'long') return 'long';
  return 'standard';
}

function finiteNumber(value, fallback = 0) {
  if (value == null || (typeof value === 'string' && value.trim() === '') || typeof value === 'boolean') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nullableNumber(value, min, max) {
  const n = finiteNumber(value, null);
  return n != null && n >= min && n <= max ? n : null;
}

function createEmptyUserProfile() {
  const profile = Object.fromEntries(Object.keys(PERSONAL_NUMERIC_FIELDS).map((key) => [key, null]));
  profile.sources = Object.fromEntries(Object.keys(PERSONAL_NUMERIC_FIELDS).map((key) => [key, 'unknown']));
  return { ...profile, armRatio: null, femurRatio: null, shoulderWidth: null, ankleMobility: null, shoulderRisk: null, spineRisk: null, squat1RM: null, lateral1RM: null, lat1RM: null };
}

function sourceLabel(source) {
  const key = typeof source === 'object' ? source?.type || source?.source || 'unknown' : source;
  return ({ user: '用户填写', userEntered: '用户填写', user_entered: '用户填写', 'record-estimate': '由记录估算', 'height-estimate': '按身高估算', 'model-example': '模型示例', estimatedFromHeight: '按身高估算', modelExample: '模型示例', unknown: '未知', legacyPending: '旧数据待确认', pending: '旧数据待确认' })[key] || key || '未知';
}

function normalizedProfile(profile = {}, options = {}) {
  const normalized = createEmptyUserProfile();
  Object.entries(PERSONAL_NUMERIC_FIELDS).forEach(([key, bounds]) => {
    const value = nullableNumber(profile?.[key], ...bounds);
    const source = profile?.sources?.[key];
    const sourceKey = typeof source === 'object' ? source?.type || source?.source : source;
    const confirmedLegacy = ['user', 'userEntered', 'user_entered', '用户填写'].includes(sourceKey);
    const pending = ['legacyPending', 'pending', 'legacyUnknown', 'unknown', '未知', 'model-example', 'height-estimate'].includes(sourceKey);
    if (value == null || pending || (options.legacy && !confirmedLegacy)) return;
    normalized[key] = value;
    normalized.sources[key] = source || 'user';
  });
  if (profile?.pendingLegacy) normalized.pendingLegacy = profile.pendingLegacy;
  return normalized;
}

function buildModelProfile(profile = {}) {
  const raw = normalizedProfile(profile);
  const model = { ...MODEL_PROFILE_EXAMPLE, sources: {} };
  ['height', 'weight'].forEach((key) => {
    model[key] = raw[key] ?? MODEL_PROFILE_EXAMPLE[key];
    model.sources[key] = raw[key] != null ? raw.sources[key] : 'modelExample';
  });
  const heightFractions = { armSpan: 1, upperArmLength: .18, forearmLength: .15, shoulderWidthCm: .236, femurLength: .258, tibiaLength: .242 };
  Object.entries(heightFractions).forEach(([key, fraction]) => {
    const bounds = PERSONAL_NUMERIC_FIELDS[key];
    model[key] = raw[key] ?? (raw.height != null ? clamp(raw.height * fraction, ...bounds) : MODEL_PROFILE_EXAMPLE[key]);
    model.sources[key] = raw[key] != null ? raw.sources[key] : raw.height != null ? 'estimatedFromHeight' : 'modelExample';
  });
  model.armRatio = clamp(model.armSpan / model.height, .9, 1.12);
  return model;
}


function applyProfileToPlatform(profile) {
  telemetry.userProfile = normalizedProfile(profile);
  syncUserProfileFromUI({ refresh: true });
  syncOnboardingFields(telemetry.userProfile);
}


function syncOnboardingFields(profile) {
  onboardingInputs.forEach((input) => {
    const value = profile ? profile[input.dataset.profileKey] ?? '' : '';
    input.value = typeof value === 'number' && Number.isFinite(value)
      ? Number(value.toFixed(input.step === '1' ? 0 : 1)) : value;
  });
}

function finishOnboarding(event) {
  event?.preventDefault();
  if (!onboardingForm.reportValidity()) return;
  const values = { sources: {} };
  onboardingInputs.forEach((input) => {
    const key = input.dataset.profileKey;
    if (!PERSONAL_NUMERIC_FIELDS[key]) return;
    values[key] = input.value === '' ? null : input.valueAsNumber;
    values.sources[key] = values[key] == null ? 'unknown' : 'user';
  });
  const result = BM.store?.saveProfile ? BM.store.saveProfile(values) : { ok: false, error: '本地存储模块尚未就绪' };
  const status = $('onboarding-status');
  if (!result?.ok) {
    if (status) { status.textContent = `保存失败：${result?.error || '请检查浏览器存储设置'}。填写的内容仍在此页。`; status.hidden = false; }
    return false;
  }
  const saved = BM.store.getProfile();
  hasSavedBioProfile = Object.keys(PERSONAL_NUMERIC_FIELDS).some((key) => saved[key] != null);
  applyProfileToPlatform(saved);
  if (status) status.hidden = true;
  showPortalStage('branches');
  return true;
}


function resetUserBioProfile() {
  syncOnboardingFields(telemetry.userProfile);
  $('onboarding-status').hidden = true;
  showPortalOverlay('profile');
}

function initializeOnboarding() {
  if (BM.store?.getProfile) {
    const profile = BM.store.getProfile();
    applyProfileToPlatform(profile);
    hasSavedBioProfile = Object.keys(PERSONAL_NUMERIC_FIELDS).some((key) => telemetry.userProfile[key] != null);
    if (profile.pendingLegacy && Object.keys(profile.pendingLegacy).length && $('onboarding-status')) {
      $('onboarding-status').textContent = '旧档案中来源不明的数值已保留为待确认；没有作为你的测量或能力使用。';
      $('onboarding-status').hidden = false;
    }
    return;
  }
  // Read-only fallback: preserve even malformed legacy strings for later recovery.
  try {
    const raw = localStorage.getItem('user_bio_profile');
    if (raw) {
      const legacy = JSON.parse(raw);
      if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) throw new Error('档案格式无法识别');
      BM.pendingLegacyProfile = legacy;
      applyProfileToPlatform(normalizedProfile(legacy, { legacy: true }));
    } else syncOnboardingFields(null);
  } catch {
    syncOnboardingFields(null);
    if ($('onboarding-status')) { $('onboarding-status').textContent = '旧档案暂时无法读取，原数据仍保留。你可以继续学习动作。'; $('onboarding-status').hidden = false; }
  }
}


function calculatePersonalizedPhysics(sceneKey = telemetry.activeScene) {
  const physics = calculatePhysics(sceneKey);
  return { ...physics, relativeLoadPercent: null, personalizedAdvice: '', scope: 'mechanical-model-only' };
}


function plateStackForSide(totalLoad) {
  const bar = 20;
  const perSide = Math.max(0, (totalLoad - bar) / 2);
  const plates = [25, 20, 15, 10, 5, 2.5, 1.25];
  let remaining = Math.round(perSide / 1.25) * 1.25;
  const stack = [];
  plates.forEach((plate) => {
    const count = Math.floor((remaining + .001) / plate);
    if (count) {
      stack.push(`${plate}kg×${count}`);
      remaining -= plate * count;
    }
  });
  return stack.length ? stack.join(' + ') : '空杆';
}

function updateSetPlan(oneRmValue) {
  const estimate = nullableNumber(oneRmValue, .001, 5000);
  if ($('set-plan-summary')) $('set-plan-summary').textContent = estimate == null
    ? '能力未知。填写同一动作实际完成的重量和1–10次重复，可查看Epley公式估算。'
    : `本次同一动作的Epley估算为 ${estimate.toFixed(0)}kg（质量单位），不是实测1RM；不推算其他动作，也不自动给出工作重量。`;
  if ($('set-warmup-1')) $('set-warmup-1').textContent = '热身：准备步骤与重量由实际所选动作确认。';
  if ($('set-warmup-2')) $('set-warmup-2').textContent = '递增练习：记录实际完成的重量、次数与感受。';
  if ($('set-working')) $('set-working').textContent = '工作重量：尚未给出个人建议；模型数值不会写入这里。';
}


function generatePersonalPlan() {
  if (typeof BM.plan?.renderLegacy === 'function') return BM.plan.renderLegacy();
  const split = $('plan-split-selector')?.value || 'ppl';
  const structures = {
    ppl: [
      ['推类学习日', [['flat-press', '器械推胸'], ['machine-military-press', '器械肩推']]],
      ['拉类学习日', [['lat', '高位下拉'], ['cable-row', '坐姿划船']]],
      ['腿类学习日', [['incline', '倒蹬（深蹲的可选替代，不同时计入）']]]
    ],
    upper_lower: [
      ['上肢学习日', [['flat-press', '器械推胸'], ['cable-row', '坐姿划船']]],
      ['下肢学习日', [['incline', '倒蹬（深蹲的可选替代，不同时计入）']]]
    ],
    hypertrophy: [
      ['全身学习日 A', [['flat-press', '器械推胸'], ['lat', '高位下拉'], ['incline', '倒蹬']]],
      ['全身学习日 B', [['cable-row', '坐姿划船'], ['machine-military-press', '器械肩推'], ['cam', '膝伸展']]],
      ['全身学习日 C', [['flat-press', '器械推胸'], ['cable-row', '坐姿划船'], ['incline', '倒蹬']]]
    ]
  };
  const days = structures[split] || structures.ppl;
  if ($('plan-user-summary')) $('plan-user-summary').textContent = `通用结构草案：${days.length}个学习日。尚未使用你的时间、器械条件或能力记录，未保存为个人计划；不提供个人公斤数。`;
  ['push', 'pull', 'legs'].forEach((key, index) => {
    const target = $(`plan-day-${key}`);
    if (!target) return;
    const card = target.closest('.plan-day-card');
    const day = days[index];
    if (card) card.hidden = !day;
    target.replaceChildren();
    if (!day) return;
    const heading = card?.querySelector('.day-header h3');
    if (heading) heading.textContent = `第 ${index + 1} 日 · ${day[0]}`;
    const tag = card?.querySelector('.day-tag');
    if (tag) tag.textContent = '结构示例 · 先学习，再记录实际训练';
    day[1].forEach(([scene, name]) => {
      const row = document.createElement('div'); row.className = 'exercise-item';
      const title = document.createElement('strong'); title.className = 'ex-name'; title.textContent = name;
      const note = document.createElement('p'); note.className = 'ex-note'; note.textContent = '组数、次数、休息及实际负荷待创建计划时确认；未知重量未按零计入总量。';
      const link = document.createElement('button'); link.type = 'button'; link.textContent = '查看动作与器械'; link.onclick = () => window.transitToWorkspace(scene);
      row.append(title, note, link); target.append(row);
    });
  });
  if ($('plan-total-volume')) $('plan-total-volume').textContent = '未知 · 未填写实际负荷';
  if ($('plan-biomech-warning')) $('plan-biomech-warning').textContent = '没有生成个人伤害风险或体型适用结论。实际动作限制由你填写，模板不替代动作评估。';
}


function pushCurrentLoadToTracker() {
  // Mechanical demonstrations are not a measured performance record.
  switchWorkspace('plan');
  if ($('plan-user-summary')) $('plan-user-summary').textContent = '模型的力、力矩和示例质量没有写入个人能力或课表。请用实际完成的同一动作记录创建计划。';
}


window.switchTab = switchWorkspace;
window.showPortalStage = showPortalStage;
window.enterPortalWorkspace = enterPortalWorkspace;
window.openLabActionGate = () => showPortalStage('lab');
window.showLabCategory = showLabCategory;
window.filterActionTabs = filterActionTabs;
window.returnToPreviousLevel = returnToPreviousLevel;
window.transitToWorkspace = (sceneKey) => {
  const normalized = normalizeSceneKey(sceneKey);
  pendingPortalScene = normalized;
  hidePortalOverlay();
  switchWorkspace('lab');
  applySceneChrome(normalized);
  if (focusSceneHandler) {
    focusSceneHandler(normalized);
    pendingPortalScene = null;
  }
};
window.returnToPortal = () => {
  showPortalOverlay('welcome');
  applySceneChrome('overview');
  if (focusSceneHandler) focusSceneHandler('overview');
};
window.syncUserProfileFromUI = syncUserProfileFromUI;
window.generatePersonalPlan = generatePersonalPlan;
window.applyProfileToPlatform = applyProfileToPlatform;
window.finishOnboarding = finishOnboarding;
window.resetUserBioProfile = resetUserBioProfile;
window.calculatePersonalizedPhysics = calculatePersonalizedPhysics;
BM.profile = { normalize: normalizedProfile, buildModel: buildModelProfile, refresh: initializeOnboarding };
BM.physics = { describe: calculatePhysics, comparison: modelCurveComparison,
  readScene(scene=telemetry.activeScene,step=currentActionStep(scene),overrides={}){const params={...physicsParamsForScene(scene,step),...overrides};return {params,result:updatePhysics(params),step,settings:sceneMachineTuning(scene)};},
};
BM.demo = { setSledProgress: (fraction) => { telemetry.sledUserControlled=true;telemetry.m3_state='idle';telemetry.m3_vel=0;telemetry.m3_pos=clamp(finiteNumber(fraction,0),0,1);updateSledForces();drawChart(); } };

function updateSledForces() {
  telemetry.sledTare = Math.max(0, finiteNumber(sledTareInput.value, 0));
  telemetry.plateMass = Math.max(0, finiteNumber(sledMassInput.value, 0));
  telemetry.totalMovingMass = telemetry.sledTare + telemetry.plateMass;
  const kernel = updatePhysics({ sceneKey: 'incline' });
  $('concentric-force').textContent = `${kernel.pushN.toFixed(0)} N（模型）`;
  $('eccentric-force').textContent = `${kernel.lowerN.toFixed(0)} N（模型）`;
  $('hysteresis-index').textContent = `${kernel.hysteresis.toFixed(0)}% · (推起力−下放力)/推起力`;
  updateControlReadouts();
}


function updateCamRisk() {
  const comparison = modelCurveComparison('cam');
  $('cam-risk-text').textContent = `模型相对力矩：${comparison.percent == null ? '无可比较峰值' : comparison.percent.toFixed(0) + '%'}。${comparison.basis}。有效力臂为理想传动假设，不等于凸轮轮廓极径，不代表个人膝盖风险。`;
}


function currentCamLoadPercent() { return modelCurveComparison('cam').percent ?? 0; }


function extraHudProfile(def, progress, profile) {
  const kernel = updatePhysics({ sceneKey: def.key });
  const comparison = modelCurveComparison(def.key);
  const setting = machineSettingReadout(def.key);
  return {
    primaryLabel: kernel.primaryMetric.endsWith(' N') ? '模型手柄力' : '模型力矩',
    primaryValue: kernel.primaryMetric,
    secondaryLabel: setting.label,
    secondaryValue: setting.value,
    normal: `${modelInputSource(def.key)}；${comparison.basis}`,
    quick: `行程 ${progress.toFixed(0)}%（模型示意）`
  };
}


function updateSceneDecision() {
  const scene = normalizeSceneKey(telemetry.activeScene);
  if (!$('hud-decision')) return;
  const cue = ACTION_GUIDES[scene]?.cue || '选择动作后可查看准备与操作步骤。';
  $('hud-decision').textContent = `通用动作提示：${cue} 模型不能替你判断酸胀、疲劳或疼痛；实际感受由你在训练记录中填写。`;
}


function updateCoachHud() {
  const scene = normalizeSceneKey(telemetry.activeScene);
  telemetry.activeScene = scene;
  const titles = { arm: '滑轮侧平举 · OP-DAP', cam: '膝伸展 · Axiom OP-LE', incline: '倒蹬 · Hammer 45°', pec: '胸飞鸟 · Axiom OP-FLY', lat: '高位下拉 · Axiom OP-PD' };
  if (scene === 'overview') {
    $('hud-scene').textContent = '器械模型总览';
    $('hud-description').textContent = '选择器械学习结构与操作；不要求填写身体测量。';
    $('hud-primary-label').textContent = '机械模型'; $('hud-torque').textContent = '尚未选择动作';
    $('hud-secondary-label').textContent = '个人能力'; $('coach-perceived-load').textContent = '未知';
    $('hud-normal').textContent = '模型示例与真实训练记录独立';
    $('hud-angle').hidden = true;
    $('coach-muscle-bar').style.width = '0%'; $('coach-load-bar').style.width = '0%';
  } else {
    const kernel = updatePhysics({ sceneKey: scene });
    const comparison = modelCurveComparison(scene);
    const progress = currentActionStep(scene);
    $('hud-scene').textContent = titles[scene] || EXTRA_ACTION_MAP[scene]?.title || '当前器械';
    $('hud-description').textContent = '机械模型估算 · 不表示肌肉激活、身体感受或个人承重能力';
    $('hud-primary-label').textContent = scene === 'incline' ? '模型推起力' : kernel.primaryMetric.endsWith(' N') ? '模型手柄力' : '模型力矩';
    $('hud-torque').textContent = kernel.primaryMetric;
    $('hud-angle').hidden = false;
    $('hud-angle').textContent = modelInputSource(scene);
    $('hud-secondary-label').textContent = scene === 'incline' ? '模型下放力 / 阻力差' : '模型相对力矩';
    $('coach-perceived-load').textContent = scene === 'incline' ? `${kernel.lowerN.toFixed(0)} N / ${kernel.hysteresis.toFixed(0)}%` : comparison.percent == null ? '无可比较峰值' : `${comparison.percent.toFixed(0)}%`;
    $('hud-normal').textContent = scene === 'incline' ? `45°静态斜面与摩擦假设；差异=(推起力−下放力)/推起力。质量kg、力N不互换个人能力。` : comparison.basis;
    $('coach-muscle-bar').style.width = `${comparison.percent ?? 0}%`;
    $('coach-muscle-bar').title = comparison.basis;
    $('coach-load-bar').style.width = `${progress}%`;
    $('coach-load-bar').title = '仅表示模型行程0–100%，不是身体负荷';
    if ($('hud-quick-state')) $('hud-quick-state').textContent = `模型行程 ${progress.toFixed(0)}%`;
  }
  updateSceneDecision(); updateFormulaEngine();
}


function updateFormulaEngine() {
  const scene = normalizeSceneKey(telemetry.activeScene);
  const principle = getMechanismPrinciple(scene);
  $('formula-title').textContent = '模型原理与范围';
  $('formula-output').textContent = `${principle.chain} ${principle.effect} 本模型简化几何与传动，不测量肌肉激活、疲劳或个人伤害风险。力以N、力矩以N·m表示；kg仅为输入质量。`;
}


bind(armAngleInput, 'input', () => { telemetry.armAngle = Number(armAngleInput.value); updateControlReadouts(); });
bind(armLengthPreset, 'change', () => { telemetry.armLinkLength = Number(armLengthPreset.value); updateControlReadouts(); });
bind(cableModeInput, 'change', () => { telemetry.cableMode = cableModeInput.checked; });
bind(camAngleInput, 'input', () => { telemetry.camAngle = Number(camAngleInput.value); updateCamRisk(); updateControlReadouts(); });
bind(camAggressionInput, 'input', () => { telemetry.camAggression = Number(camAggressionInput.value); updateCamRisk(); updateControlReadouts(); });
bind(sledTareInput, 'input', updateSledForces);
bind(sledMassInput, 'input', () => { telemetry.plateMass = Number(sledMassInput.value); updateSledForces(); });
bind(squatLoadInput, 'input', () => {
  const target = Math.max(0, Number(squatLoadInput.value) || 0);
  const slope = telemetry.slopeAngle * Math.PI / 180;
  const factor = Math.sin(slope) + telemetry.friction * Math.cos(slope);
  telemetry.plateMass = Math.max(0, target / factor - telemetry.sledTare);
  sledMassInput.value = telemetry.plateMass.toFixed(1);
  updateSledForces();
});
bind(pecAngleInput, 'input', () => { telemetry.pecAngle = Number(pecAngleInput.value); updateControlReadouts(); });
bind(pecCamInput, 'input', () => { telemetry.pecCam = Number(pecCamInput.value); updateControlReadouts(); });
bind(latAngleInput, 'input', () => { telemetry.latAngle = Number(latAngleInput.value); updateControlReadouts(); });
bind(latPulleyInput, 'input', () => { telemetry.latPulley = Number(latPulleyInput.value); updateControlReadouts(); });
bind(squatDepthInput, 'input', () => { telemetry.squatDepth = Number(squatDepthInput.value); updateControlReadouts(); });
bind(squatModeInput, 'change', () => { telemetry.squatMode = squatModeInput.value; updateControlReadouts(); });
document.querySelectorAll('.nav-btn').forEach((button) => bind(button, 'click', () => switchWorkspace(button.dataset.workspace)));
bind($('btn-enter-portal-branches'), 'click', () => showPortalStage('profile'));
bind($('btn-open-lab-gate'), 'click', () => showPortalStage('lab'));
bind($('btn-back-to-profile'), 'click', () => showPortalStage('profile'));
bind($('btn-skip-body-profile'), 'click', () => showPortalStage('branches'));
bind($('btn-back-to-branches'), 'click', () => showPortalStage('branches'));
bind($('btn-back-to-lab-categories'), 'click', () => showLabCategory(''));
bind($('btn-global-back'), 'click', returnToPreviousLevel);
bind($('btn-portal-level-back'), 'click', returnToPreviousLevel);
document.querySelectorAll('.lab-category-card').forEach((button) => bind(button, 'click', () => showLabCategory(button.dataset.labCategory)));
document.querySelectorAll('.action-group-filter').forEach((button) => bind(button, 'click', () => filterActionTabs(button.dataset.actionFilter)));
function handleMachineParamChange() {
  const scene = normalizeSceneKey(telemetry.activeScene);
  const nextValues = {};
  [machinePathAngleInput, machineSeatHeightInput, machineCamBiasInput, machineEfficiencyInput].forEach((input) => {
    if (input?.dataset.machineKey && !input.disabled) nextValues[input.dataset.machineKey] = Number(input.value);
  });
  setSceneMachineTuning(scene, nextValues);
  updateControlReadouts();
  updateCoachHud();
}
[machinePathAngleInput, machineSeatHeightInput, machineCamBiasInput, machineEfficiencyInput].forEach((input) => {
  bind(input, 'input', handleMachineParamChange);
  bind(input, 'change', handleMachineParamChange);
});
[trackerLoadInput, trackerRepsInput, trackerRpeInput, trackerWeekLoadInput, trackerMonthLoadInput].forEach((input) => bind(input, 'input', updateTrainingTracker));
bind($('plan-split-selector'), 'change', generatePersonalPlan);
const customPlanKey = 'bmmd_custom_training_plan_v1';
const customPlanSplit = $('custom-plan-split');
const customPlanDays = $('custom-plan-days');
const customPlans = Array.from({ length: 6 }, () => ({ title: '', content: '', exercises: [blankCustomExercise()] }));
const removedCustomExercises = Array(6).fill(null);
const customPlanStatus = $('custom-plan-status');
const customExerciseFields = [
  { key: 'action', label: '动作', type: 'text', maxLength: 200 },
  { key: 'sets', label: '组数', type: 'number' },
  { key: 'reps', label: '次数', type: 'text', maxLength: 80 },
  { key: 'notes', label: '备注', type: 'textarea', maxLength: 4000 }
];
function blankCustomExercise() {
  return { action: '', sets: '', reps: '', notes: '' };
}
function normalizeCustomPlan(plan) {
  const normalized = { title: '', content: '', exercises: [blankCustomExercise()] };
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return normalized;
  if (typeof plan.title === 'string') normalized.title = plan.title;
  if (typeof plan.content === 'string') normalized.content = plan.content;
  if (Array.isArray(plan.exercises) && plan.exercises.length) {
    normalized.exercises = plan.exercises.map((exercise) => {
      const row = blankCustomExercise();
      customExerciseFields.forEach(({ key }) => {
        const value = exercise?.[key];
        if (typeof value === 'string' || typeof value === 'number') row[key] = String(value);
      });
      return row;
    });
  }
  return normalized;
}
function customPlanActionButton(iconName, label, text = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'custom-plan-action-btn';
  button.title = label;
  button.setAttribute('aria-label', label);
  const icon = document.createElement('img');
  icon.src = `assets/icons/${iconName}.svg`;
  icon.alt = '';
  icon.width = 18;
  icon.height = 18;
  button.append(icon);
  if (text) button.append(document.createTextNode(text));
  return button;
}
function renderCustomPlanDays() {
  customPlanDays.replaceChildren();
  customPlans.slice(0, Number(customPlanSplit.value)).forEach((plan, index) => {
    const article = document.createElement('article');
    article.className = 'custom-plan-day';
    const heading = document.createElement('h3');
    heading.id = `custom-plan-heading-${index}`;
    heading.textContent = `计划 ${index + 1}`;
    article.setAttribute('aria-labelledby', heading.id);
    article.append(heading);
    const titleLabel = document.createElement('label');
    titleLabel.htmlFor = `custom-plan-title-${index}`;
    titleLabel.textContent = '计划名称';
    const titleInput = document.createElement('input');
    titleInput.id = titleLabel.htmlFor;
    titleInput.maxLength = 120;
    titleInput.placeholder = `计划 ${index + 1} 的名称`;
    titleInput.value = plan.title;
    titleInput.addEventListener('input', () => {
      plan.title = titleInput.value;
      customPlanStatus.textContent = '有未保存的修改';
    });
    article.append(titleLabel, titleInput);
    plan.exercises.forEach((exercise, rowIndex) => {
      const row = document.createElement('div');
      row.className = 'custom-plan-exercise';
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', `动作 ${rowIndex + 1}`);
      const rowHeader = document.createElement('div');
      rowHeader.className = 'custom-plan-exercise-header';
      const rowTitle = document.createElement('strong');
      rowTitle.textContent = `动作 ${rowIndex + 1}`;
      const removeButton = customPlanActionButton('trash', `删除计划 ${index + 1} 的动作 ${rowIndex + 1}`);
      removeButton.classList.add('custom-plan-remove');
      removeButton.addEventListener('click', () => {
        removedCustomExercises[index] = { exercise: { ...exercise }, position: rowIndex, placeholderAdded: plan.exercises.length === 1 };
        plan.exercises.splice(rowIndex, 1);
        if (!plan.exercises.length) plan.exercises.push(blankCustomExercise());
        renderCustomPlanDays();
        customPlanStatus.textContent = '有未保存的修改';
        $(`custom-plan-undo-${index}`)?.focus();
      });
      rowHeader.append(rowTitle, removeButton);
      const fields = document.createElement('div');
      fields.className = 'custom-plan-exercise-fields';
      customExerciseFields.forEach((field) => {
        const label = document.createElement('label');
        label.className = `custom-plan-field-${field.key}`;
        label.htmlFor = `custom-plan-${field.key}-${index}-${rowIndex}`;
        label.append(document.createTextNode(field.label));
        const input = document.createElement(field.type === 'textarea' ? 'textarea' : 'input');
        input.id = label.htmlFor;
        if (field.type === 'textarea') input.rows = 2;
        else input.type = field.type;
        if (field.maxLength) input.maxLength = field.maxLength;
        if (field.key === 'sets') {
          input.min = '1';
          input.step = '1';
          input.inputMode = 'numeric';
        }
        input.value = exercise[field.key];
        input.addEventListener('input', () => {
          exercise[field.key] = input.value;
          customPlanStatus.textContent = '有未保存的修改';
        });
        label.append(input);
        fields.append(label);
      });
      row.append(rowHeader, fields);
      article.append(row);
    });
    const rowActions = document.createElement('div');
    rowActions.className = 'custom-plan-row-actions';
    const addButton = customPlanActionButton('plus', `为计划 ${index + 1} 添加动作`, '添加动作');
    addButton.addEventListener('click', () => {
      plan.exercises.push(blankCustomExercise());
      renderCustomPlanDays();
      customPlanStatus.textContent = '有未保存的修改';
      $(`custom-plan-action-${index}-${plan.exercises.length - 1}`)?.focus();
    });
    rowActions.append(addButton);
    if (removedCustomExercises[index]) {
      const undoButton = customPlanActionButton('undo-2', `撤销计划 ${index + 1} 的动作删除`, '撤销删除');
      undoButton.id = `custom-plan-undo-${index}`;
      undoButton.addEventListener('click', () => {
        const removed = removedCustomExercises[index];
        if (removed.placeholderAdded && plan.exercises.length === 1 && Object.values(plan.exercises[0]).every((value) => value === '')) plan.exercises.length = 0;
        const position = Math.min(removed.position, plan.exercises.length);
        plan.exercises.splice(position, 0, removed.exercise);
        removedCustomExercises[index] = null;
        renderCustomPlanDays();
        customPlanStatus.textContent = '有未保存的修改';
        $(`custom-plan-action-${index}-${position}`)?.focus();
      });
      rowActions.append(undoButton);
    }
    article.append(rowActions);
    if (plan.content) {
      const legacy = document.createElement('details');
      legacy.className = 'custom-plan-legacy';
      const summary = document.createElement('summary');
      summary.textContent = '原计划内容';
      const contentInput = document.createElement('textarea');
      contentInput.id = `custom-plan-content-${index}`;
      contentInput.setAttribute('aria-label', '原计划内容');
      contentInput.maxLength = 50000;
      contentInput.value = plan.content;
      contentInput.addEventListener('input', () => {
        plan.content = contentInput.value;
        customPlanStatus.textContent = '有未保存的修改';
      });
      legacy.append(summary, contentInput);
      article.append(legacy);
    }
    customPlanDays.append(article);
  });
}
function setPlanMode(manual) {
  $('custom-plan-editor').hidden = !manual;
  $('generated-plan-panel').hidden = manual;
  $('btn-plan-manual').setAttribute('aria-pressed', String(manual));
  $('btn-plan-auto').setAttribute('aria-pressed', String(!manual));
}

function restoreManualPlans() {
  try {
    const canonical = BM.store?.getState?.().legacyCustomPlan;
    const legacy = canonical ?? BM.store?.getLegacy?.(customPlanKey) ?? localStorage.getItem(customPlanKey);
    const savedPlan = typeof legacy === 'string' ? JSON.parse(legacy) : legacy;
    if (savedPlan && Array.isArray(savedPlan.plans)) {
      savedPlan.plans.slice(0, 6).forEach((plan, index) => { customPlans[index] = normalizeCustomPlan(plan); });
      customPlanSplit.value = String(Number.isInteger(savedPlan.split) && savedPlan.split >= 1 && savedPlan.split <= 6 ? savedPlan.split : 3);
      customPlanStatus.textContent = '已读取本地计划';
    } else if (savedPlan && typeof savedPlan.title === 'string' && typeof savedPlan.content === 'string') {
      customPlans[0] = normalizeCustomPlan(savedPlan); customPlanSplit.value = '1'; customPlanStatus.textContent = '已读取本地计划';
    }
  } catch {
    customPlanStatus.textContent = '旧计划暂时无法读取；原数据仍保留，可以导出备份。';
  }
}
BM.manual = { refresh: () => { customPlans.forEach((_,i)=>{customPlans[i]={title:'',content:'',exercises:[blankCustomExercise()]};});customPlanSplit.value='3';customPlanStatus.textContent='尚未保存';restoreManualPlans();renderCustomPlanDays(); } };
restoreManualPlans();
bind($('btn-plan-manual'), 'click', () => setPlanMode(true));
bind($('btn-plan-auto'), 'click', () => setPlanMode(false));
renderCustomPlanDays();
bind(customPlanSplit, 'change', () => {
  renderCustomPlanDays();
  customPlanStatus.textContent = '有未保存的修改';
});

function saveManualPlan(event) {
  event?.preventDefault();
  const payload = { version: 2, split: Number(customPlanSplit.value), plans: customPlans, updatedAt: new Date().toISOString() };
  const result = BM.store?.transact ? BM.store.transact((state) => { state.legacyCustomPlan = payload; }) : { ok: false, error: '本地存储模块尚未就绪' };
  customPlanStatus.textContent = result?.ok ? '已保存到当前浏览器'
    : `保存失败：${result?.error || '请检查浏览器存储空间或设置'}。编辑仍在此页，暂勿关闭；可导出备份。`;
  return result;
}
bind($('custom-plan-editor'), 'submit', saveManualPlan);
bind($('btn-regenerate-plan'), 'click', generatePersonalPlan);
bind($('btn-plan-to-lab'), 'click', () => switchWorkspace('lab'));
EXTRA_ACTION_DEFS.forEach((def) => {
  const progressInput = $(`${def.key}-progress`);
  const loadInput = $(`${def.key}-load`);
  const updateExtra = (event) => {
    if (event?.target === progressInput) delete telemetry.independentArmProgress[def.key];
    telemetry.extraProgress[def.key] = Number(progressInput?.value) || 0;
    telemetry.extraLoad[def.key] = Math.max(0, finiteNumber(loadInput?.value, 60));
    updateControlReadouts();
    updateCoachHud();
  };
  bind(progressInput, 'input', updateExtra);
  bind(loadInput, 'input', updateExtra);
  updateExtra();
});
syncMachineControlsFromTelemetry();
syncUserProfileFromUI();
generatePersonalPlan();
bind(onboardingForm, 'submit', finishOnboarding);
bind(onboardingForm, 'input', () => { $('onboarding-status').hidden = true; });

document.addEventListener('bm:language-change', () => drawChart());
function drawChart() {
  const canvas = $('m03-hysteresis-chart');
  const history = telemetry.m3_history;
  if (history.length < 2) {
    canvas.style.display = 'none';
    return;
  }
  canvas.style.display = 'block';
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, rect.width * dpr);
  canvas.height = Math.max(1, rect.height * dpr);
  const ctx = canvas.getContext('2d');
  const theme = getComputedStyle(document.body);
  const canvasBg = theme.getPropertyValue('--card-bg').trim() || (document.body.classList.contains('dark-mode') ? '#1a1d24' : '#ffffff');
  const canvasText = theme.getPropertyValue('--text-sub').trim() || (document.body.classList.contains('dark-mode') ? '#94a3b8' : '#71747b');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = canvasBg;
  ctx.fillRect(0, 0, rect.width, rect.height);
  const pad = 32, bottom = 28;
  const minForce = Math.min(0, ...history.map((p) => p.force));
  const maxForce = Math.max(1, ...history.map((p) => p.force));
  const forceSpan = maxForce - minForce;
  ctx.strokeStyle = canvasText; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, 15); ctx.lineTo(pad, rect.height - bottom); ctx.lineTo(rect.width - 10, rect.height - bottom); ctx.stroke();
  ctx.fillStyle = canvasText; ctx.font = '10px system-ui';
  ctx.fillText(BM.i18n?.t('外力 N') ?? '外力 N', 4, 12); ctx.fillText(`${maxForce.toFixed(0)}`, 2, 28);
  ctx.fillText('0', pad - 5, rect.height - 12);
  ctx.fillText(BM.i18n?.t(`行程 ${telemetry.m3_travelM.toFixed(1)} m`) ?? `行程 ${telemetry.m3_travelM.toFixed(1)} m`, Math.max(pad + 10, rect.width - 88), rect.height - 9);
  [['concentric', '#0a84ff'], ['eccentric', '#ff453a']].forEach(([phase, color]) => {
    const points = history.filter((p) => p.phase === phase);
    if (points.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = pad + (p.displacementM ?? p.pos * telemetry.m3_travelM) / telemetry.m3_travelM * (rect.width - pad - 10);
      const y = 20 + (1 - (p.force - minForce) / forceSpan) * (rect.height - 20 - bottom);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    ctx.stroke();
  });
}

async function initializeDigitalTwin() {
  const THREE = await (BM.ThreeRuntime?.THREE || import('three'));
  const { OrbitControls } = await (BM.ThreeRuntime || import('three/addons/controls/OrbitControls.js'));
  const { RoundedBoxGeometry } = await (BM.ThreeRuntime || import('three/addons/geometries/RoundedBoxGeometry.js'));

  const canvas = $('digital-twin-canvas');
  const viewport = canvas.closest('.twin-pane');
  const portalOverlay = $('portal-hub-overlay');
  const labWorkspace = $('ws-lab');
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xe8eef3, .018);
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;

  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: .055, enablePan: true, enableRotate: true, enableZoom: true, rotateSpeed: .72, zoomSpeed: .88, panSpeed: .72, screenSpacePanning: true, minDistance: 2.4, maxDistance: 70 });
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  if (matchMedia('(pointer: coarse)').matches) canvas.style.touchAction = 'pan-y';
  let studioNeedsRender = true, studioRenderCount = 0;
  const invalidateStudio = () => { studioNeedsRender = true; };
  controls.addEventListener('change', invalidateStudio);
  const studioLighting = BM.StudioRendering?.create({ THREE, renderer, scene, onDirty: invalidateStudio });
  if (!studioLighting) {
    scene.add(new THREE.HemisphereLight(0xffffff, 0xa9bac8, 2.3));
    const key = new THREE.DirectionalLight(0xffffff, 4.5); key.position.set(8, 12, 10); scene.add(key);
    const fill = new THREE.DirectionalLight(0x9bd8ff, 2.1); fill.position.set(-10, 5, 7); scene.add(fill);
  }
  ['input','change','click','bm:inspection-change'].forEach(eventName => document.addEventListener(eventName, invalidateStudio, { capture: true }));

  const platinum = new THREE.MeshPhysicalMaterial({ color: 0xe6ebf0, metalness: .68, roughness: .22, clearcoat: .9 });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf8fafb, metalness: .45, roughness: .2, clearcoat: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c2c2e, metalness: .82, roughness: .2 });
  const red = new THREE.MeshStandardMaterial({ color: 0xff453a, emissive: 0x4b0007, emissiveIntensity: .22 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x0a84ff, emissive: 0x002b62, emissiveIntensity: .25 });
  const green = new THREE.MeshStandardMaterial({ color: 0x30d158, emissive: 0x0d4f22, emissiveIntensity: .32 });
  const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const draggableHandles = [];
  const fitBox = new THREE.Box3();
  const tmpBox = new THREE.Box3();
  const dragWorldPoint = new THREE.Vector3();
  const dragScreenA = new THREE.Vector2();
  const dragScreenB = new THREE.Vector2();
  let engineeringBridge = null, engineeringNeedsRender = true, engineeringRenderCount = 0;
  controls.addEventListener('change', () => { engineeringNeedsRender = true; });
  const modelDrag = { active: false, sceneKey: 'arm', control: '', side: 1, startX: 0, startY: 0, value: 0, valuePerPixel: .35, axisX: 0, axisY: -1, hasScreenAxis: false, arm: 44, cam: 0, camAgg: 1, sled: 0, pec: 58, lat: 64, latPulley: 72, squat: 62, extraProgress: 50 };

  function arrow() {
    // Keep transform anchors for existing telemetry without rendering force indicators.
    const anchor = new THREE.Object3D();
    anchor.userData.forceIndicator = true;
    return anchor;
  }
  function alignCylinder(mesh, a, b) {
    const d = new THREE.Vector3().subVectors(b, a);
    mesh.visible = d.length() > .005;
    if (!mesh.visible) return;
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.scale.set(1, d.length(), 1);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  }
  function strut(a, b, material, radius = .028) {
    const d = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, d.length(), 8), material);
    m.position.copy(a).add(b).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return m;
  }
  function addMechanismLabel() {
    return null;
  }
  function addMechanismNode(group, text, pos, mat, labelOffset = [0, .42, 0]) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(.105, 18, 12), mat);
    node.position.set(pos[0], pos[1], pos[2]);
    group.add(node);
    addMechanismLabel(group, text, [pos[0] + labelOffset[0], pos[1] + labelOffset[1], pos[2] + labelOffset[2]], mat === red ? '#d92d20' : mat === blue ? '#0a66d8' : mat === green ? '#137333' : '#111827');
    return node;
  }
  function addMechanismPath(group, a, b, mat = green, radius = .018) {
    const path = strut(new THREE.Vector3(a[0], a[1], a[2]), new THREE.Vector3(b[0], b[1], b[2]), mat, radius);
    group.add(path);
    return path;
  }
  function addMachineChain(group, items) {
    const nodes = items.map((item) => addMechanismNode(group, item.text, item.pos, item.mat, item.labelOffset || [0, .42, 0]));
    for (let i = 0; i < nodes.length - 1; i += 1) {
      addMechanismPath(group, nodes[i].position.toArray(), nodes[i + 1].position.toArray(), items[i + 1].pathMat || green, .016);
    }
    return nodes;
  }
  function addSelectorizedTower(group, opts = {}) {
    const {
      x = 0, y = 0, z = 0, height = 2.55, width = .62, depth = .52,
      plates = 10, label = '插片配重塔', openSide = 1
    } = opts;
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const railX = width * .42;
    const railZ = depth * .42;
    g.add(strut(new THREE.Vector3(-railX, -height / 2, -railZ), new THREE.Vector3(-railX, height / 2, -railZ), platinum, .022));
    g.add(strut(new THREE.Vector3(railX, -height / 2, -railZ), new THREE.Vector3(railX, height / 2, -railZ), platinum, .022));
    g.add(strut(new THREE.Vector3(-railX, -height / 2, railZ), new THREE.Vector3(-railX, height / 2, railZ), platinum, .022));
    g.add(strut(new THREE.Vector3(railX, -height / 2, railZ), new THREE.Vector3(railX, height / 2, railZ), platinum, .022));
    g.add(strut(new THREE.Vector3(-railX, height / 2, -railZ), new THREE.Vector3(railX, height / 2, -railZ), dark, .035));
    g.add(strut(new THREE.Vector3(-railX, height / 2, railZ), new THREE.Vector3(railX, height / 2, railZ), dark, .035));
    for (let i = 0; i < plates; i += 1) {
      const p = new THREE.Mesh(new RoundedBoxGeometry(width, .05, depth, 4, .02), i % 2 ? platinum : dark);
      p.position.set(0, height * .28 - i * .075, 0);
      g.add(p);
    }
    const selectorPin = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, width * 1.18, 14), red);
    selectorPin.rotation.z = Math.PI / 2;
    selectorPin.position.set(0, height * .28 - Math.floor(plates * .45) * .075, openSide * depth * .62);
    g.add(selectorPin);
    const topPulley = new THREE.Mesh(new THREE.TorusGeometry(.16, .026, 10, 28), dark);
    topPulley.rotation.y = Math.PI / 2;
    topPulley.position.set(0, height / 2 + .1, 0);
    g.add(topPulley);
    group.add(g);
    addMechanismLabel(group, label, [x, y + height / 2 + .5, z], '#111827');
    return g;
  }
  function addPivotHub(group, pos, radius = .2, label = '') {
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, .18, 32), dark);
    hub.rotation.x = Math.PI / 2;
    hub.position.set(pos[0], pos[1], pos[2]);
    group.add(hub);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.12, .024, 10, 32), platinum);
    ring.position.copy(hub.position);
    group.add(ring);
    if (label) addMechanismLabel(group, label, [pos[0], pos[1] + .42, pos[2]], '#111827');
    return hub;
  }
  function addPlateHorn(group, pos, side = 1, label = '') {
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .78, 18), platinum);
    horn.rotation.x = Math.PI / 2;
    horn.position.set(pos[0], pos[1], pos[2]);
    group.add(horn);
    for (let i = 0; i < 2; i += 1) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(.32 - i * .07, .32 - i * .07, .1, 30), dark);
      plate.rotation.x = Math.PI / 2;
      plate.position.set(pos[0], pos[1], pos[2] + side * (.28 + i * .12));
      group.add(plate);
    }
    if (label) addMechanismLabel(group, label, [pos[0], pos[1] + .42, pos[2] + side * .45], '#111827');
    return horn;
  }
  function addCableSegment(group, a, b, radius = .014) {
    return addMechanismPath(group, a, b, green, radius);
  }
  function addPrincipleTitle(group, text, pos = [0, 2.85, -1.35]) {
    return addMechanismLabel(group, `机械原理：${text}`, pos, '#0a66d8');
  }
  function addLoadStackIcon(group, pos, label = '片重/负载') {
    const base = new THREE.Group();
    base.position.set(pos[0], pos[1], pos[2]);
    for (let i = 0; i < 5; i += 1) {
      const plate = new THREE.Mesh(new RoundedBoxGeometry(.48, .07, .34, 4, .02), i % 2 ? platinum : dark);
      plate.position.y = i * .085;
      base.add(plate);
    }
    const down = arrow(new THREE.Vector3(0, -1, 0), .72, red, .025);
    down.position.set(.42, .16, 0);
    base.add(down);
    group.add(base);
    addMechanismLabel(group, label, [pos[0], pos[1] - .38, pos[2]], '#d92d20');
    return base;
  }
  function addSimplePulley(group, pos, label = '定滑轮') {
    const pulley = new THREE.Mesh(new THREE.TorusGeometry(.19, .032, 10, 32), dark);
    pulley.position.set(pos[0], pos[1], pos[2]);
    group.add(pulley);
    addMechanismLabel(group, label, [pos[0], pos[1] + .36, pos[2]], '#111827');
    return pulley;
  }
  function addSimplePivot(group, pos, label = '转轴') {
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .16, 28), dark);
    hub.rotation.x = Math.PI / 2;
    hub.position.set(pos[0], pos[1], pos[2]);
    group.add(hub);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.2, .025, 10, 28), blue);
    ring.position.copy(hub.position);
    group.add(ring);
    addMechanismLabel(group, label, [pos[0], pos[1] + .34, pos[2]], '#0a66d8');
    return hub;
  }
  function addPrincipleSketch(group, type, opts = {}) {
    const o = new THREE.Vector3(...(opts.origin || [0, 2.55, -1.35]));
    const s = opts.scale || 1;
    const p = (x, y, z = 0) => [o.x + x * s, o.y + y * s, o.z + z * s];
    const title = opts.title || {
      fixedPulley: '定滑轮 1:1 改变拉力方向',
      lowPulley: '低位定滑轮把片重转成水平拉力',
      dualPulley: '动滑轮/复合缆绳产生 2:1 手感折算',
      camLever: '非圆凸轮 r(θ) 改变阻力曲线',
      plateLever: '刚性旋转杠杆按力臂比传力',
      freeWeight: '自由重力用水平力臂产生关节力矩',
      inclinePlane: '斜面分力 + 导轨摩擦滞后',
      bodyweightLever: '身体自重绕手脚支点形成二类杠杆'
    }[type] || '负载通过机械结构传到目标肌群';
    addPrincipleTitle(group, title, p(0, .7, 0));

    if (type === 'fixedPulley') {
      addLoadStackIcon(group, p(-1.25, -.55, 0), '片重 Mg');
      addSimplePulley(group, p(-.35, .35, 0), '定滑轮 1:1');
      addCableSegment(group, p(-1.25, -.1, 0), p(-.35, .35, 0), .018);
      addCableSegment(group, p(-.35, .35, 0), p(.85, -.28, 0), .018);
      const bar = new THREE.Mesh(new THREE.CapsuleGeometry(.045, .78, 8, 16), dark);
      bar.rotation.z = Math.PI / 2; bar.position.set(...p(.85, -.28, 0)); group.add(bar);
      const pull = arrow(new THREE.Vector3(0, -1, 0), .8, blue, .026);
      pull.position.set(...p(.85, -.34, 0)); group.add(pull);
      addMechanismLabel(group, 'F_handle≈Mg；只改方向不省力', p(.95, -.96, 0), '#0a66d8');
    } else if (type === 'lowPulley') {
      addLoadStackIcon(group, p(-1.45, -.2, 0), '片重 Mg');
      addSimplePulley(group, p(-.75, -.58, 0), '低位滑轮');
      addCableSegment(group, p(-1.45, .25, 0), p(-.75, -.58, 0), .018);
      addCableSegment(group, p(-.75, -.58, 0), p(.95, -.58, 0), .018);
      const pull = arrow(new THREE.Vector3(1, 0, 0), .95, blue, .026);
      pull.position.set(...p(.35, -.58, 0)); group.add(pull);
      addMechanismLabel(group, '竖直片重 → 水平拉力；背部划船', p(.95, -.1, 0), '#0a66d8');
    } else if (type === 'dualPulley') {
      addLoadStackIcon(group, p(-1.65, -.42, 0), '左片重 Mg');
      addLoadStackIcon(group, p(1.65, -.42, 0), '右片重 Mg');
      addSimplePulley(group, p(-1.05, .28, 0), '复合滑轮');
      addSimplePulley(group, p(1.05, .28, 0), '复合滑轮');
      addCableSegment(group, p(-1.65, .05, 0), p(-1.05, .28, 0), .016);
      addCableSegment(group, p(1.65, .05, 0), p(1.05, .28, 0), .016);
      addCableSegment(group, p(-1.05, .28, 0), p(-.18, -.34, 0), .016);
      addCableSegment(group, p(1.05, .28, 0), p(.18, -.34, 0), .016);
      const squeezeL = arrow(new THREE.Vector3(1, 0, 0), .65, blue, .026);
      const squeezeR = arrow(new THREE.Vector3(-1, 0, 0), .65, blue, .026);
      squeezeL.position.set(...p(-.82, -.35, 0)); squeezeR.position.set(...p(.82, -.35, 0));
      group.add(squeezeL, squeezeR);
      addMechanismLabel(group, '2:1 时 F_handle≈Mg/2，行程更长更顺', p(0, -.9, 0), '#0a66d8');
    } else if (type === 'camLever') {
      addLoadStackIcon(group, p(-1.35, -.38, 0), '配重 F_cable');
      addSimplePulley(group, p(-.72, .22, 0), '导向轮');
      const cam = new THREE.Mesh(new THREE.TorusGeometry(.34, .055, 14, 40), blue);
      cam.scale.set(1.28, .72, 1); cam.position.set(...p(.05, .05, 0)); group.add(cam);
      addMechanismLabel(group, '非圆凸轮 r(θ)', p(.12, .55, 0), '#0a66d8');
      addCableSegment(group, p(-1.35, .08, 0), p(-.72, .22, 0), .016);
      addCableSegment(group, p(-.72, .22, 0), p(.05, .22, 0), .016);
      addSimplePivot(group, p(.05, .05, 0), '主轴');
      addMechanismPath(group, p(.05, .05, 0), p(1.1, -.55, 0), green, .032);
      const out = arrow(new THREE.Vector3(1, -.35, 0), .9, blue, .026);
      out.position.set(...p(.58, -.25, 0)); group.add(out);
      addMechanismLabel(group, 'τ_load(θ)=F_cable·r(θ)', p(.9, -.92, 0), '#0a66d8');
    } else if (type === 'plateLever') {
      addPlateHorn(group, p(-1.15, -.2, 0), 1, '装片端');
      addSimplePivot(group, p(0, 0, 0), '主转轴');
      addMechanismPath(group, p(-1.15, -.2, 0), p(0, 0, 0), green, .03);
      addMechanismPath(group, p(0, 0, 0), p(1.35, .32, 0), green, .03);
      const plateDown = arrow(new THREE.Vector3(0, -1, 0), .78, red, .026);
      plateDown.position.set(...p(-1.15, -.08, .28)); group.add(plateDown);
      const handle = new THREE.Mesh(new RoundedBoxGeometry(.42, .13, .18, 4, .05), green);
      handle.position.set(...p(1.35, .32, 0)); group.add(handle);
      const push = arrow(new THREE.Vector3(1, .1, 0), .82, blue, .026);
      push.position.set(...p(.78, .24, 0)); group.add(push);
      addMechanismLabel(group, 'F_plate·L_load = F_user·L_effort', p(.25, -.66, 0), '#0a66d8');
    } else if (type === 'freeWeight') {
      const bar = new THREE.Mesh(new THREE.CapsuleGeometry(.055, 2.15, 8, 16), dark);
      bar.rotation.z = Math.PI / 2; bar.position.set(...p(0, .05, 0)); group.add(bar);
      addPlateHorn(group, p(-1.15, .05, 0), 1, '自由重量');
      addPlateHorn(group, p(1.15, .05, 0), -1, '');
      const down = arrow(new THREE.Vector3(0, -1, 0), 1, red, .03);
      down.position.set(...p(0, .05, 0)); group.add(down);
      addSimplePivot(group, p(.45, -.5, 0), '关节中心');
      addMechanismLabel(group, 'τ=Mg·d⊥=Mg·L·sinθ', p(0, -.95, 0), '#0a66d8');
    } else if (type === 'inclinePlane') {
      const rail = strut(new THREE.Vector3(...p(-1.25, -.55, 0)), new THREE.Vector3(...p(1.25, .7, 0)), platinum, .04);
      group.add(rail);
      const sled = new THREE.Mesh(new RoundedBoxGeometry(.52, .3, .36, 4, .05), dark);
      sled.rotation.z = Math.PI / 4; sled.position.set(...p(.18, .15, 0)); group.add(sled);
      const gravity = arrow(new THREE.Vector3(0, -1, 0), .9, red, .026);
      gravity.position.set(...p(.18, .15, .18)); group.add(gravity);
      const railForce = arrow(new THREE.Vector3(-1, -1, 0), .85, blue, .026);
      railForce.position.set(...p(.24, .18, -.18)); group.add(railForce);
      addMechanismLabel(group, 'F∥=Mg sinθ；推起/下放再加减 μMg cosθ', p(.15, -.82, 0), '#0a66d8');
    } else if (type === 'bodyweightLever') {
      addSimplePivot(group, p(-1.1, -.45, 0), '手掌支点');
      addSimplePivot(group, p(1.1, -.45, 0), '脚尖支点');
      addMechanismPath(group, p(-1.1, -.45, 0), p(1.1, -.45, 0), green, .028);
      const down = arrow(new THREE.Vector3(0, -1, 0), .9, red, .026);
      down.position.set(...p(0, .18, 0)); group.add(down);
      const up = arrow(new THREE.Vector3(0, 1, 0), .75, blue, .026);
      up.position.set(...p(-.8, -.42, 0)); group.add(up);
      addMechanismLabel(group, '双手约承受体重 60%-70%', p(0, -.95, 0), '#0a66d8');
    }
  }
  function limb(material, radius = .09) {
    return new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 14), material);
  }
  function joint(material, radius = .16) {
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), material);
  }
  class CamVariableResistanceMachine {
    constructor(parentGroup, opts = {}) {
      this.group = new THREE.Group();
      this.baseRadiusM = opts.baseRadiusM || .2;
      this.visualScale = opts.visualScale || 5.25;
      this.depth = opts.depth || .36;
      this.eccentricity = opts.eccentricity || .6;
      this.material = opts.material || platinum;
      parentGroup.add(this.group);
      this.initCamGeometry();
    }

    initCamGeometry() {
      const shape = new THREE.Shape();
      const segments = 96;
      for (let i = 0; i <= segments; i += 1) {
        const theta = (i / segments) * Math.PI * 2;
        const r = this.baseRadiusM * this.visualScale * (1 + this.eccentricity * Math.sin(theta));
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }

      const camGeo = new THREE.ExtrudeGeometry(shape, {
        depth: this.depth,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: .035,
        bevelThickness: .035,
        curveSegments: 32
      });
      camGeo.center();
      this.camMesh = new THREE.Mesh(camGeo, this.material);
      this.camMesh.userData.dragScene = 'cam';
      this.group.add(this.camMesh);

      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, this.depth / 2 + .04),
        new THREE.Vector3(0, -1.2, this.depth / 2 + .04)
      ]);
      this.cableLine = new THREE.Line(
        lineGeo,
        new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 })
      );
      this.group.add(this.cableLine);

      this.contactNode = new THREE.Mesh(new THREE.SphereGeometry(.07, 18, 12), green);
      this.group.add(this.contactNode);
      this.radiusPointer = arrow(new THREE.Vector3(1, 0, 0), 1, green, .032);
      this.radiusPointer.position.z = this.depth / 2 + .08;
      this.group.add(this.radiusPointer);
      this.tangentPointer = arrow(new THREE.Vector3(0, -1, 0), 1, blue, .032);
      this.tangentPointer.position.z = this.depth / 2 + .12;
      this.group.add(this.tangentPointer);
    }

    setEccentricity(value) {
      const next = clamp(Number(value), 0, .95);
      if (Math.abs(next - this.eccentricity) < .001) return;
      this.eccentricity = next;
      const shape = new THREE.Shape();
      const segments = 96;
      for (let i = 0; i <= segments; i += 1) {
        const theta = (i / segments) * Math.PI * 2;
        const r = this.baseRadiusM * this.visualScale * (1 + this.eccentricity * Math.sin(theta));
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      const nextGeo = new THREE.ExtrudeGeometry(shape, {
        depth: this.depth,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: .035,
        bevelThickness: .035,
        curveSegments: 32
      });
      nextGeo.center();
      this.camMesh.geometry.dispose();
      this.camMesh.geometry = nextGeo;
    }

    update(jointAngleDeg, stackWeightKg) {
      const rad = (jointAngleDeg * Math.PI) / 180;
      this.camMesh.rotation.z = rad;
      const effectiveRadiusM = this.baseRadiusM * (1 + this.eccentricity * Math.sin(rad));
      const visualRadius = effectiveRadiusM * this.visualScale;
      const torqueNm = stackWeightKg * 9.81 * effectiveRadiusM;
      const contactX = visualRadius * Math.cos(rad + Math.PI / 2);
      const contactY = visualRadius * Math.sin(rad + Math.PI / 2);
      const z = this.depth / 2 + .04;
      const positions = this.cableLine.geometry.attributes.position.array;
      positions[0] = contactX; positions[1] = contactY; positions[2] = z;
      positions[3] = contactX; positions[4] = -2.0; positions[5] = z;
      this.cableLine.geometry.attributes.position.needsUpdate = true;
      this.contactNode.position.set(contactX, contactY, z + .02);

      const radial = new THREE.Vector3(contactX, contactY, 0);
      if (radial.lengthSq() > 0) {
        this.radiusPointer.position.set(0, 0, z + .04);
        this.radiusPointer.scale.y = visualRadius;
        this.radiusPointer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), radial.clone().normalize());
        const tangent = new THREE.Vector3(-radial.y, radial.x, 0).normalize();
        this.tangentPointer.position.set(contactX, contactY, z + .08);
        this.tangentPointer.scale.y = .72;
        this.tangentPointer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      }

      return {
        effectiveArmRadiusM: effectiveRadiusM,
        torqueNm,
        perceivedMultiplier: effectiveRadiusM / this.baseRadiusM,
        contactPoint: new THREE.Vector3(contactX, contactY, z)
      };
    }
  }
  function frameCube(size) {
    const g = new THREE.Group(), h = size / 2;
    const v = [new THREE.Vector3(-h,-h,-h),new THREE.Vector3(h,-h,-h),new THREE.Vector3(h,h,-h),new THREE.Vector3(-h,h,-h),new THREE.Vector3(-h,-h,h),new THREE.Vector3(h,-h,h),new THREE.Vector3(h,h,h),new THREE.Vector3(-h,h,h)];
    [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([a,b]) => g.add(strut(v[a], v[b], dark)));
    return g;
  }

  function buildArmRig() {
    const group = new THREE.Group(); group.position.set(-7, .3, 0);
    const torsoMat = platinum.clone(); torsoMat.emissive = new THREE.Color(0xff7a45); torsoMat.emissiveIntensity = .04;
    const torso = new THREE.Mesh(new RoundedBoxGeometry(.72, 1.65, .42, 5, .12), torsoMat); torso.position.set(.05, -.82, 0); group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.22, 28, 18), white); head.position.set(.05, .22, 0); group.add(head);
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(.28, 28, 18), white); group.add(shoulder);
    const gantry = new THREE.Group();
    gantry.add(strut(new THREE.Vector3(1.45, -1.9, -.55), new THREE.Vector3(1.45, 2.35, -.55), dark, .045));
    gantry.add(strut(new THREE.Vector3(1.45, -1.9, .55), new THREE.Vector3(1.45, 2.35, .55), dark, .045));
    gantry.add(strut(new THREE.Vector3(1.45, 2.35, -.55), new THREE.Vector3(1.45, 2.35, .55), dark, .035));
    const pulley = new THREE.Mesh(new THREE.TorusGeometry(.18, .035, 10, 28), dark); pulley.position.set(1.45, .55, 0); gantry.add(pulley);
    group.add(gantry);
    const moving = new THREE.Group();
    const mat = platinum.clone(); mat.emissive = new THREE.Color(0xff7a45); mat.emissiveIntensity = .04;
    const link = new THREE.Mesh(new THREE.CapsuleGeometry(.21, 3.3, 10, 26), mat); link.rotation.z = -Math.PI / 2; moving.add(link);
    const dumbbell = new THREE.Group();
    dumbbell.add(strut(new THREE.Vector3(-.32, 0, 0), new THREE.Vector3(.32, 0, 0), dark, .055));
    dumbbell.add(new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .16, 24), dark));
    dumbbell.children[1].position.x = -.42; dumbbell.children[1].rotation.z = Math.PI / 2;
    const db2 = dumbbell.children[1].clone(); db2.position.x = .42; dumbbell.add(db2);
    moving.add(dumbbell);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.13, 18, 12), white); moving.add(hand);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.6, 1.6), hitMaterial); hit.userData = { dragScene: 'arm', dragProxy: true }; moving.add(hit); draggableHandles.push(hit);
    group.add(moving);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 1, 8), green); group.add(cable);
    const gravity = arrow(new THREE.Vector3(0, -1, 0), 2.5, red); group.add(gravity);
    const moment = new THREE.Mesh(new THREE.CylinderGeometry(.026, .026, 1, 10), green); group.add(moment);
    addMachineChain(group, [
      { text: '片重/哑铃重力', pos: [-2.05, -2.2, 0], mat: red, labelOffset: [-.2, -.55, 0] },
      { text: '滑轮改变力线', pos: [1.45, .55, 0], mat: green },
      { text: '手柄/哑铃阻力点', pos: [-2.85, -1.45, 0], mat: blue },
      { text: '肩关节转矩', pos: [0, 0, 0], mat: red, labelOffset: [0, .55, 0] }
    ]);
    addPrincipleSketch(group, 'fixedPulley', { origin: [.4, 2.65, -1.2], title: '哑铃是自由重量，绳索用定滑轮改力线' });
    function update(deg) {
      const len = clamp(telemetry.armLinkLength * 10.7, 2.75, 5.25);
      const angle = deg * Math.PI / 180;
      link.position.x = len / 2; link.scale.y = len / 3.75; moving.rotation.z = -Math.PI / 2 - angle;
      hand.position.x = len + .04;
      dumbbell.position.x = len + .62;
      hit.position.x = len / 2; hit.scale.x = len / 3.75;
      const endpoint = new THREE.Vector3(-Math.sin(angle) * len, -Math.cos(angle) * len, 0);
      gravity.position.copy(endpoint);
      alignCylinder(cable, new THREE.Vector3(1.45, .55, 0), endpoint);
      alignCylinder(moment, new THREE.Vector3(), new THREE.Vector3(endpoint.x, 0, 0));
      mat.emissiveIntensity = .04 + Math.sin(angle) * .22;
      torsoMat.emissiveIntensity = .04 + Math.sin(angle) * .12;
    }
    update(telemetry.armAngle); scene.add(group); return { group, update, updatePhysics: (params = {}) => { update(params.angleDeg ?? telemetry.armAngle); return updatePhysics({ sceneKey: 'arm', ...params }); } };
  }

  function buildCamRig() {
    const group = new THREE.Group(); group.position.set(0, .3, 0);
    const seat = new THREE.Mesh(new RoundedBoxGeometry(1.45, .22, 1.05, 5, .08), dark); seat.position.set(-1.55, -1.62, 0); group.add(seat);
    const backPad = new THREE.Mesh(new RoundedBoxGeometry(.24, 1.85, 1.05, 5, .08), platinum); backPad.position.set(-2.05, -.68, 0); group.add(backPad);
    const torso = new THREE.Mesh(new RoundedBoxGeometry(.72, 1.45, .36, 5, .1), platinum); torso.position.set(-1.62, -.68, 0); group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.18, 24, 16), white); head.position.set(-1.62, .2, 0); group.add(head);
    const stackTower = new THREE.Mesh(new RoundedBoxGeometry(.48, 2.3, .55, 5, .05), dark); stackTower.position.set(1.85, -.38, -.62); group.add(stackTower);
    for (let i = 0; i < 9; i += 1) {
      const plate = new THREE.Mesh(new RoundedBoxGeometry(.52, .055, .48, 5, .02), i % 2 ? platinum : dark);
      plate.position.set(1.85, .42 - i * .075, -.62);
      group.add(plate);
    }
    group.add(strut(new THREE.Vector3(1.55,-1.55,-.62), new THREE.Vector3(1.55,1.15,-.62), platinum, .025));
    group.add(strut(new THREE.Vector3(2.15,-1.55,-.62), new THREE.Vector3(2.15,1.15,-.62), platinum, .025));
    const kneePad = new THREE.Mesh(new RoundedBoxGeometry(1.2, .18, .32, 5, .06), dark); kneePad.position.set(-.78, -1.16, 0); group.add(kneePad);
    const shinPad = new THREE.Mesh(new RoundedBoxGeometry(.28, .72, .34, 5, .07), green); shinPad.position.set(.65, -1.5, 0); group.add(shinPad);
    const mat = platinum.clone(); mat.emissive = new THREE.Color(0xff9f0a); mat.emissiveIntensity = .08;
    const variableCam = new CamVariableResistanceMachine(group, {
      baseRadiusM: .2,
      visualScale: 5.25,
      depth: .62,
      eccentricity: .6,
      material: mat
    });
    const cam = variableCam.camMesh;
    draggableHandles.push(cam);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,1.4,36), dark); shaft.rotation.x = Math.PI/2; group.add(shaft);
    addPivotHub(group, [0, 0, 0], .26, '主转轴/凸轮轴承');
    const lever = new THREE.Mesh(new THREE.CapsuleGeometry(.06, 1.65, 8, 18), dark); group.add(lever);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.09, 1.55, 8, 18), platinum); group.add(leg);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(.09, 1.05, 8, 18), platinum); thigh.rotation.z = Math.PI / 2; thigh.position.set(-.55, -1.28, 0); group.add(thigh);
    const kneeAxis = new THREE.Mesh(new THREE.SphereGeometry(.16, 22, 14), dark); kneeAxis.position.set(.05, -1.28, 0); group.add(kneeAxis);
    addPivotHub(group, [.05, -1.28, 0], .16, '膝轴对齐点');
    const padConnector = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1, 8), green); group.add(padConnector);
    addMachineChain(group, [
      { text: '配重片直下', pos: [1.85, .72, -.62], mat: red },
      { text: '钢线拉动凸轮', pos: [.9, .7, -.3], mat: green },
      { text: '变半径凸轮', pos: [0, .15, .5], mat: blue },
      { text: '胫骨垫给阻力', pos: [1.05, -1.5, 0], mat: green, labelOffset: [.25, -.55, 0] },
      { text: '膝关节转矩', pos: [.05, -1.28, 0], mat: red, labelOffset: [-.35, .55, 0] }
    ]);
    addPrincipleSketch(group, 'camLever', { origin: [.05, 2.55, -1.35], title: '插片配重经钢索拉凸轮，再推胫骨垫' });
    function update(deg, aggression=1) {
      const angle = deg * Math.PI / 180;
      const eccentricity = clamp((aggression - .6) / .9 * .72, .08, .82);
      variableCam.setEccentricity(eccentricity);
      const camTelemetry = variableCam.update(deg, Number(squatLoadInput?.value) || 50);
      const knee = new THREE.Vector3(.05, -1.28, 0);
      const shinEnd = new THREE.Vector3(.05 + Math.cos(THREE.MathUtils.lerp(-1.15, .12, deg / 120)) * .95, -1.28 + Math.sin(THREE.MathUtils.lerp(-1.15, .12, deg / 120)) * .95, 0);
      const leverLen = clamp(camTelemetry.perceivedMultiplier * .82, .65, 1.55);
      lever.position.set(.35, -1.02, 0);
      lever.rotation.z = THREE.MathUtils.lerp(-.55, .7, deg / 140);
      lever.scale.y = leverLen;
      shinPad.position.set(1.05 + Math.sin(angle) * .28, -1.48 + Math.sin(angle) * .22, 0);
      alignCylinder(leg, knee, shinEnd);
      alignCylinder(padConnector, knee, shinPad.position);
      mat.emissiveIntensity = .06 + clamp(camTelemetry.perceivedMultiplier / 1.82, 0, 1) * .24;
      telemetry.camEffectiveRadius = camTelemetry.effectiveArmRadiusM;
      telemetry.camPerceivedMultiplier = camTelemetry.perceivedMultiplier;
      telemetry.camTorqueNm = camTelemetry.torqueNm;
    }
    update(telemetry.camAngle); scene.add(group); return { group, update, updatePhysics: (params = {}) => { update(params.angleDeg ?? telemetry.camAngle, params.eccentricity != null ? (.6 + params.eccentricity / .72 * .9) : telemetry.camAggression); return updatePhysics({ sceneKey: 'cam', ...params }); } };
  }

  function buildInclineRig() {
    const group = new THREE.Group(); group.position.set(7, .2, 0);
    const railL = new THREE.Mesh(new RoundedBoxGeometry(6.4,.16,.16,5,.08), platinum); railL.position.z = .9; railL.rotation.z = Math.PI / 4; group.add(railL);
    const railR = railL.clone(); railR.position.z = -.9; group.add(railR);
    const base = new THREE.Mesh(new RoundedBoxGeometry(4.8,.18,2.6,5,.08), dark); base.position.set(.2,-1.95,0); group.add(base);
    const board = new THREE.Mesh(new RoundedBoxGeometry(2.2,.24,2.2,5,.12), platinum); board.rotation.z = Math.PI / 4; group.add(board);
    const footPlate = new THREE.Mesh(new RoundedBoxGeometry(.22,1.85,2.35,5,.1), dark); footPlate.rotation.z = Math.PI / 4; group.add(footPlate);
    const block = frameCube(1.7); block.rotation.z = Math.PI / 4; group.add(block);
    const pad = new THREE.Mesh(new RoundedBoxGeometry(1.25,.18,1.35,5,.08), dark); block.add(pad); pad.position.y = -.65;
    const sledHandleL = new THREE.Mesh(new THREE.CapsuleGeometry(.055, 1.1, 8, 16), dark); sledHandleL.rotation.z = Math.PI / 2; sledHandleL.position.set(.1, .75, .82); block.add(sledHandleL);
    const sledHandleR = sledHandleL.clone(); sledHandleR.position.z = -.82; block.add(sledHandleR);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 3.4), hitMaterial); hit.userData = { dragScene: 'incline', dragProxy: true }; group.add(hit); draggableHandles.push(hit);
    const gravity = arrow(new THREE.Vector3(0,-1,0),2.4,red,.05); group.add(gravity);
    const normal = arrow(new THREE.Vector3(-1,1,0),2.2,blue,.05); group.add(normal);
    const slope = arrow(new THREE.Vector3(-1,-1,0),2.2,dark,.05); group.add(slope);
    addMachineChain(group, [
      { text: '滑车+装片重量', pos: [1.1, 2.1, 0], mat: red },
      { text: '45°导轨分解重力', pos: [.15, 1.15, .9], mat: blue },
      { text: '脚踏板反推', pos: [1.85, 2.1, 0], mat: green },
      { text: '膝髋伸展发力', pos: [.2, .35, 0], mat: red, labelOffset: [-.15, -.55, 0] }
    ]);
    addPrincipleSketch(group, 'inclinePlane', { origin: [.1, 2.95, -1.45], title: '滑车重量沿45度导轨变成脚推阻力' });
    function update(progress) {
      const travel = 1.1 - progress * 2.2;
      const origin = new THREE.Vector3(travel, travel + 1, 0);
      block.position.copy(origin); gravity.position.copy(origin); normal.position.copy(origin); slope.position.copy(origin); hit.position.copy(origin);
      footPlate.position.copy(origin).add(new THREE.Vector3(.72,.72,0));
    }
    update(0); scene.add(group); return { group, update, updatePhysics: (params = {}) => { update(params.travel ?? telemetry.m3_pos); return updatePhysics({ sceneKey: 'incline', ...params }); } };
  }

  function buildPecRig() {
    const group = new THREE.Group(); group.position.set(-3.4, .15, 0);
    const chestMat = platinum.clone(); chestMat.emissive = new THREE.Color(0xff2d55); chestMat.emissiveIntensity = .08;
    const seat = new THREE.Mesh(new RoundedBoxGeometry(1.35,.22,1.15,5,.08), dark); seat.position.set(0,-1.35,0); group.add(seat);
    const back = new THREE.Mesh(new RoundedBoxGeometry(.28,1.95,1.15,5,.08), platinum); back.position.set(0,-.28,0); group.add(back);
    group.add(strut(new THREE.Vector3(-1.55,-1.7,.62), new THREE.Vector3(-1.55,1.45,.62), platinum, .04));
    group.add(strut(new THREE.Vector3(1.55,-1.7,.62), new THREE.Vector3(1.55,1.45,.62), platinum, .04));
    group.add(strut(new THREE.Vector3(-1.55,1.45,.62), new THREE.Vector3(1.55,1.45,.62), platinum, .032));
    group.add(strut(new THREE.Vector3(-1.55,-1.7,-.62), new THREE.Vector3(-1.55,1.45,-.62), platinum, .04));
    group.add(strut(new THREE.Vector3(1.55,-1.7,-.62), new THREE.Vector3(1.55,1.45,-.62), platinum, .04));
    group.add(strut(new THREE.Vector3(-1.55,1.45,-.62), new THREE.Vector3(1.55,1.45,-.62), platinum, .032));
    const chest = new THREE.Mesh(new RoundedBoxGeometry(1.6, 2.4, .42, 5, .18), chestMat); group.add(chest);
    const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(.14, 3.1, 8, 20), dark);
    const rightArm = leftArm.clone();
    leftArm.userData.dragScene = 'pec'; rightArm.userData.dragScene = 'pec'; draggableHandles.push(leftArm, rightArm);
    group.add(leftArm, rightArm);
    const cableL = arrow(new THREE.Vector3(1,0,0),1.7,green,.035), cableR = arrow(new THREE.Vector3(-1,0,0),1.7,green,.035);
    group.add(cableL, cableR);
    addMachineChain(group, [
      { text: '配重/凸轮阻力', pos: [0, .95, -.8], mat: red },
      { text: '左右转轴同步', pos: [0, .42, 0], mat: blue },
      { text: '肘垫水平内收', pos: [-1.25, .1, .42], mat: green },
      { text: '胸大肌夹胸', pos: [0, .1, 0], mat: red, labelOffset: [0, -.58, 0] }
    ]);
    addPrincipleSketch(group, 'camLever', { origin: [0, 2.65, -1.35], title: '配重经凸轮/转轴变成肘垫夹胸阻力' });
    function update(amount, gain = 1) {
      const t = amount / 100;
      const spread = THREE.MathUtils.lerp(1.35, .35, t);
      const y = .15;
      leftArm.position.set(-spread, y, 0); rightArm.position.set(spread, y, 0);
      leftArm.rotation.z = THREE.MathUtils.lerp(-.95, -.22, t);
      rightArm.rotation.z = THREE.MathUtils.lerp(.95, .22, t);
      cableL.position.set(-spread - .9, y, 0); cableR.position.set(spread + .9, y, 0);
      chestMat.emissiveIntensity = .08 + currentPecLoad() / 100 * .45;
      chest.scale.set(1 + t * .08, 1 + t * .05, 1);
    }
    update(telemetry.pecAngle, telemetry.pecCam); scene.add(group); return { group, update, updatePhysics: (params = {}) => { update(params.progress ?? telemetry.pecAngle, params.gain ?? telemetry.pecCam); return updatePhysics({ sceneKey: 'pec', stepPercent: params.progress ?? telemetry.pecAngle, ...params }); } };
  }

  function buildLatRig() {
    const group = new THREE.Group(); group.position.set(3.2, .2, 0);
    const backMat = platinum.clone(); backMat.emissive = new THREE.Color(0x0a84ff); backMat.emissiveIntensity = .08;
    const towerL = strut(new THREE.Vector3(1.55,-1.8,.62), new THREE.Vector3(1.55,3.05,.62), dark, .055);
    const towerR = strut(new THREE.Vector3(1.55,-1.8,-.62), new THREE.Vector3(1.55,3.05,-.62), dark, .055);
    const topBeam = new THREE.Mesh(new RoundedBoxGeometry(2.9,.14,1.38,5,.05), platinum); topBeam.position.set(.15,2.85,0); group.add(towerL,towerR,topBeam);
    const stack = new THREE.Mesh(new RoundedBoxGeometry(.5,2.45,.5,5,.05), dark); stack.position.set(0,-.22,1.08); group.add(stack);
    for (let i = 0; i < 10; i += 1) {
      const plate = new THREE.Mesh(new RoundedBoxGeometry(.58,.055,.46,5,.02), i % 2 ? platinum : dark);
      plate.position.set(0,.58 - i * .075,1.08);
      group.add(plate);
    }
    group.add(strut(new THREE.Vector3(-.34,-1.35,1.08), new THREE.Vector3(-.34,1.42,1.08), platinum, .026));
    group.add(strut(new THREE.Vector3(.34,-1.35,1.08), new THREE.Vector3(.34,1.42,1.08), platinum, .026));
    const seat = new THREE.Mesh(new RoundedBoxGeometry(1.45,.22,1.1,5,.08), dark); seat.position.set(0,-1.7,0); group.add(seat);
    const thighPad = new THREE.Mesh(new RoundedBoxGeometry(1.65,.18,.34,5,.06), dark); thighPad.position.set(0,-1.12,0); group.add(thighPad);
    const torso = new THREE.Mesh(new RoundedBoxGeometry(1.4, 2.8, .5, 5, .16), backMat); torso.position.y = -.8; group.add(torso);
    const pulley = new THREE.Mesh(new THREE.TorusGeometry(.42, .055, 12, 36), dark);
    pulley.userData = { dragScene: 'lat', dragControl: 'pulley' };
    const pulleyHit = new THREE.Mesh(new THREE.SphereGeometry(.72, 20, 14), hitMaterial);
    pulleyHit.userData = { dragScene: 'lat', dragControl: 'pulley', dragProxy: true };
    group.add(pulley, pulleyHit); draggableHandles.push(pulley, pulleyHit);
    const bar = new THREE.Mesh(new THREE.CapsuleGeometry(.09, 2.6, 8, 20), dark); bar.rotation.z = Math.PI / 2; group.add(bar);
    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(.12, 2.2, 8, 20), platinum);
    const armR = armL.clone(); armL.userData = { dragScene: 'lat', dragControl: 'angle' }; armR.userData = { dragScene: 'lat', dragControl: 'angle' }; draggableHandles.push(armL, armR); group.add(armL, armR);
    const cable = arrow(new THREE.Vector3(0,-1,0),2.3,green,.035); group.add(cable);
    addCableSegment(group, [0, .72, 1.08], [0, 2.55, 1.08]);
    addCableSegment(group, [0, 2.55, 1.08], [0, 2.55, 0]);
    addCableSegment(group, [0, 2.55, 0], [0, 1.15, .05]);
    addPivotHub(group, [0, 2.55, 0], .2, '顶端滑轮轮组');
    addMachineChain(group, [
      { text: '前方配重片', pos: [0, .72, 1.08], mat: red },
      { text: '上滑轮改向', pos: [0, 2.55, 0], mat: green },
      { text: '横杆向上牵引', pos: [0, 1.1, 0], mat: blue },
      { text: '肘向下吃背', pos: [-.75, .45, 0], mat: red, labelOffset: [-.3, -.52, 0] }
    ]);
    addPrincipleSketch(group, 'fixedPulley', { origin: [0, 3.15, -1.35], title: '通用定滑轮示意；不是 OP-PD 机构' });
    function update(angleDeg, pulleyPct) {
      const angle = angleDeg * Math.PI / 180;
      const pY = THREE.MathUtils.lerp(1.8, 3.3, pulleyPct / 100);
      pulley.position.set(0, pY, 0); pulleyHit.position.copy(pulley.position); cable.position.set(0, pY - 2.3, 0);
      bar.position.set(0, THREE.MathUtils.lerp(1.2, -.35, (angleDeg - 10) / 110), 0);
      armL.position.set(-.75, bar.position.y - .25, 0); armR.position.set(.75, bar.position.y - .25, 0);
      armL.rotation.z = -angle * .55; armR.rotation.z = angle * .55;
      backMat.emissiveIntensity = .08 + currentLatLoad() / 100 * .42;
      torso.scale.x = 1 + currentLatLoad() / 500;
    }
    update(telemetry.latAngle, telemetry.latPulley); scene.add(group); return { group, update, updatePhysics: (params = {}) => { update(params.angleDeg ?? telemetry.latAngle, params.pulleyPercent ?? telemetry.latPulley); return updatePhysics({ sceneKey: 'lat', stepPercent: ((params.angleDeg ?? telemetry.latAngle) - 10) / 110 * 100, ...params }); } };
  }

  function buildSquatRig() {
    const group = new THREE.Group(); group.position.set(10.2, .15, 0);
    const spineMat = platinum.clone(); spineMat.emissive = new THREE.Color(0xff9f0a); spineMat.emissiveIntensity = .08;
    group.add(strut(new THREE.Vector3(-1.65,-1.95,.72), new THREE.Vector3(-1.65,2.25,.72), dark, .06));
    group.add(strut(new THREE.Vector3(1.65,-1.95,.72), new THREE.Vector3(1.65,2.25,.72), dark, .06));
    group.add(strut(new THREE.Vector3(-1.65,-1.95,-.72), new THREE.Vector3(-1.65,2.25,-.72), dark, .06));
    group.add(strut(new THREE.Vector3(1.65,-1.95,-.72), new THREE.Vector3(1.65,2.25,-.72), dark, .06));
    group.add(strut(new THREE.Vector3(-1.65,.55,.72), new THREE.Vector3(1.65,.55,.72), platinum, .04));
    group.add(strut(new THREE.Vector3(-1.65,.55,-.72), new THREE.Vector3(1.65,.55,-.72), platinum, .04));
    const floorMark = new THREE.Mesh(new RoundedBoxGeometry(2.5,.05,1.55,5,.04), dark); floorMark.position.y = -2.02; group.add(floorMark);
    const hip = new THREE.Mesh(new THREE.SphereGeometry(.28, 28, 18), dark); group.add(hip);
    const spine = new THREE.Mesh(new THREE.CapsuleGeometry(.13, 2.3, 8, 20), spineMat); group.add(spine);
    const femur = new THREE.Mesh(new THREE.CapsuleGeometry(.13, 2.2, 8, 20), platinum); group.add(femur);
    const tibia = femur.clone(); group.add(tibia);
    const bar = new THREE.Mesh(new THREE.CapsuleGeometry(.08, 3.2, 8, 20), dark); bar.rotation.z = Math.PI / 2; group.add(bar);
    const axialArrow = arrow(new THREE.Vector3(0,-1,0),2.2,red,.045); group.add(axialArrow);
    const shearArrow = arrow(new THREE.Vector3(1,-.2,0),1.8,blue,.04); group.add(shearArrow);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 2), hitMaterial); hit.userData = { dragScene: 'squat', dragProxy: true }; group.add(hit); draggableHandles.push(hit);
    function update(depth, mode) {
      const t = depth / 100;
      hip.position.set(0, THREE.MathUtils.lerp(.45, -.8, t), 0);
      spine.position.set(0, hip.position.y + .95, 0); spine.rotation.z = mode === 'free' ? THREE.MathUtils.lerp(.08, .42, t) : .16;
      femur.position.set(-.45, hip.position.y - .55, 0); femur.rotation.z = THREE.MathUtils.lerp(-.45, -1.1, t);
      tibia.position.set(.45, hip.position.y - 1.4, 0); tibia.rotation.z = THREE.MathUtils.lerp(.18, .7, t);
      bar.position.set(0, spine.position.y + 1.25, 0);
      axialArrow.position.set(-1.15, spine.position.y + .9, 0); shearArrow.position.set(.75, hip.position.y, 0);
      const f = currentSquatForces();
      spineMat.emissiveIntensity = .08 + clamp(f.axial / 180, 0, 1) * .5;
      axialArrow.scale.y = clamp(f.axial / 110, .7, 1.8); shearArrow.scale.y = clamp(f.shear / 90, .6, 1.8);
    }
    update(telemetry.squatDepth, telemetry.squatMode); scene.add(group); return { group, update, updatePhysics: (params = {}) => { update(params.depth ?? telemetry.squatDepth, params.mode ?? telemetry.squatMode); return updatePhysics({ sceneKey: 'barbell-squat', stepPercent: params.depth ?? telemetry.squatDepth, ...params }); } };
  }

  function buildExtraRig(def, index) {
    const group = new THREE.Group();
    const col = index % 4;
    const row = Math.floor(index / 4);
    group.position.set(-9 + col * 6, .2, -6 - row * 3.2);
    const heatColor = def.group === '胸部' ? 0xff2d55 : def.group === '背部' ? 0x0a84ff : def.group === '肩部' ? 0xff9f0a : 0x30d158;
    const heatMat = platinum.clone();
    heatMat.emissive = new THREE.Color(heatColor);
    heatMat.emissiveIntensity = .08;
    const parts = {};
    const addBox = (name, size, pos, mat = platinum, radius = .08) => {
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 5, radius), mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      parts[name] = mesh;
      group.add(mesh);
      return mesh;
    };
    const addPlate = (name, pos, scale = 1) => {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(.34 * scale, .34 * scale, .12, 28), dark);
      plate.rotation.x = Math.PI / 2;
      plate.position.set(pos[0], pos[1], pos[2]);
      parts[name] = plate;
      group.add(plate);
      return plate;
    };
    const addCapsule = (name, radius, length, pos, mat = platinum) => {
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 8, 18), mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      parts[name] = mesh;
      group.add(mesh);
      return mesh;
    };
    const addPulley = (name, pos, scale = 1) => {
      const pulley = new THREE.Mesh(new THREE.TorusGeometry(.3 * scale, .045, 12, 34), dark);
      pulley.position.set(pos[0], pos[1], pos[2]);
      parts[name] = pulley;
      group.add(pulley);
      return pulley;
    };
    const addStackPlates = (prefix, x, y, z, count = 8, width = .5) => {
      for (let i = 0; i < count; i += 1) {
        addBox(`${prefix}${i}`, [width, .055, .42], [x, y - i * .075, z], i % 2 ? platinum : dark, .025);
      }
    };
    const addHead = (name, pos, scale = 1) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(.18 * scale, 22, 16), platinum);
      mesh.position.set(pos[0], pos[1], pos[2]);
      parts[name] = mesh;
      group.add(mesh);
      return mesh;
    };
    const addHandlePair = (leftName, rightName, x, y, spread, mat = green) => {
      const left = addBox(leftName, [.42, .14, .16], [x, y, spread], mat, .055);
      const right = addBox(rightName, [.42, .14, .16], [x, y, -spread], mat, .055);
      return [left, right];
    };
    const addSymBox = (name, size, x, y, z, mat = platinum, radius = .06) => {
      const left = addBox(`${name}L`, size, [x, y, Math.abs(z)], mat, radius);
      const right = addBox(`${name}R`, size, [x, y, -Math.abs(z)], mat, radius);
      return [left, right];
    };
    const addSymCapsule = (name, radius, length, x, y, z, mat = platinum) => {
      const left = addCapsule(`${name}L`, radius, length, [x, y, Math.abs(z)], mat);
      const right = addCapsule(`${name}R`, radius, length, [x, y, -Math.abs(z)], mat);
      return [left, right];
    };

    const isCableFly = def.key === 'cable-fly';
    const isMachineFly = def.key === 'machine-fly';
    const isBarbellBench = def.key === 'barbell-bench';
    const isFlatPress = def.key === 'flat-press';
    const isInclinePress = def.key === 'incline-press';
    const isPushup = def.key === 'pushup';
    const isPulldown = def.model.includes('pulldown');
    const isPullover = def.model === 'pullover';
    const isCableRow = def.key === 'cable-row';
    const isHammerRow = def.key === 'hammer-row';
    const isBentRow = def.key === 'bent-row';
    const isShoulder = def.model.includes('shoulder');
    const isSquat = def.model === 'squat';
    const principleTypeForDef = () => {
      if (isCableFly) return 'dualPulley';
      if (isMachineFly || isPullover) return 'camLever';
      if (isPulldown && def.key !== 'scissor-pulldown') return 'fixedPulley';
      if (isCableRow) return 'lowPulley';
      if (isFlatPress || isInclinePress || isHammerRow || def.key === 'machine-military-press' || def.key === 'seated-machine-shoulder' || def.key === 'scissor-pulldown') return 'plateLever';
      if (isPushup) return 'bodyweightLever';
      if (isBarbellBench || isBentRow || isSquat || def.key === 'db-shoulder-press') return 'freeWeight';
      return 'plateLever';
    };
    const principleTitleForDef = () => {
      const titles = {
        'cable-row': '低转轴划船架通过 1:1 钢索拉起配重片',
        'barbell-bench': '杠铃没有机械改向，重量直接压向胸肩肘',
        'flat-press': '后置装片杆绕转轴变成前方推柄阻力',
        'incline-press': '侧后装片绕上斜转轴变成斜上推阻力',
        pushup: '身体自重绕手脚两个支点形成胸推动作',
        'cable-fly': '双塔定滑轮让左右手柄持续向外拉',
        'machine-fly': '插片配重经凸轮变成两侧肘垫合拢阻力',
        'scissor-pulldown': '装片端绕上方转点变成分动下拉阻力',
        'nautilus-pullover': '大圆凸轮把配重变成肘垫下压阻力',
        'bent-row': '杠铃重力直接通过手臂力臂考验背和腰背',
        'hammer-row': '胸托划船用独立杠杆臂把装片转成后拉阻力',
        'cable-pulldown': '同一配重塔经顶轮驱动宽杆下拉，也经低位导轮驱动窄把划船',
        'db-shoulder-press': '哑铃自由重量直接压到肩肘推举链',
        'machine-military-press': '装片杠杆绕肩上转轴变成向上推柄阻力',
        'seated-machine-shoulder': '插片/导轨系统把负载导向固定推举轨迹',
        'barbell-squat': '杠铃重量直接形成脊柱轴压和髋膝力矩'
      };
      return titles[def.key] || `${def.title}的负载传力路径`;
    };

    if (isBarbellBench) {
      const angle = 0;
      const bench = addBox('bench', [3.4, .24, 1.05], [0, -1.35, -.4], platinum, .1);
      bench.rotation.z = angle;
      addBox('rackL', [.14, 2.35, .14], [-1.65, -.2, -.1], dark, .04);
      addBox('rackR', [.14, 2.35, .14], [1.65, -.2, -.1], dark, .04);
      addCapsule('torso', .18, 1.65, [0, -.85, .08], heatMat).rotation.z = Math.PI / 2 + angle;
      addCapsule('upperL', .07, .95, [-.52, -.5, .1], platinum);
      addCapsule('upperR', .07, .95, [.52, -.5, .1], platinum);
      addCapsule('foreL', .065, .9, [-.72, .15, .1], platinum);
      addCapsule('foreR', .065, .9, [.72, .15, .1], platinum);
      addCapsule('bar', .055, 2.75, [0, .65, .1], dark).rotation.z = Math.PI / 2;
      addPlate('plateL', [-1.55, .65, .1], 1);
      addPlate('plateR', [1.55, .65, .1], 1);
      addBox('barTrack', [.08, 2.2, .08], [0, .15, -.28], green, .04);
      parts.force = arrow(new THREE.Vector3(0, 1, 0), 1.6, blue, .035);
      group.add(parts.force);
    } else if (isFlatPress) {
      addSymBox('rearPivotPost', [.13, 2.25, .13], 1.62, -.36, .62, dark, .04);
      addSymBox('rearPlateHorn', [.62, .1, .1], 1.92, .28, .72, platinum, .035);
      addPlate('rearPlateL1', [2.12, .28, .82], .78);
      addPlate('rearPlateR1', [2.12, .28, -.82], .78);
      addPlate('rearPlateL2', [2.26, .28, .82], .58);
      addPlate('rearPlateR2', [2.26, .28, -.82], .58);
      addBox('baseFrame', [3.9, .16, 1.6], [0, -1.72, 0], dark, .04);
      addBox('frontBase', [.18, .18, 1.8], [-1.15, -1.62, 0], dark, .04);
      addBox('seat', [1.25, .22, 1.05], [.45, -1.24, 0], dark, .08);
      addBox('backPad', [.28, 1.95, 1.05], [.8, -.18, 0], platinum, .09);
      addBox('torso', [.78, 1.55, .36], [.52, -.25, 0], heatMat, .12);
      addHead('head', [.52, .7, 0], .9);
      addCapsule('legL', .08, 1.05, [.45, -1.55, .38], platinum).rotation.z = Math.PI / 2;
      addCapsule('legR', .08, 1.05, [.45, -1.55, -.38], platinum).rotation.z = Math.PI / 2;
      addCapsule('pressArmL', .07, 1.25, [.25, .25, .55], dark);
      addCapsule('pressArmR', .07, 1.25, [.25, .25, -.55], dark);
      addCapsule('pivotArmL', .05, .85, [.88, .15, .55], platinum);
      addCapsule('pivotArmR', .05, .85, [.88, .15, -.55], platinum);
      addBox('handleL', [.22, .72, .16], [-.45, .18, .52], green, .06);
      addBox('handleR', [.22, .72, .16], [-.45, .18, -.52], green, .06);
      addCapsule('upperArmL', .055, .72, [.04, .08, .42], platinum).rotation.z = 1.18;
      addCapsule('upperArmR', .055, .72, [.04, .08, -.42], platinum).rotation.z = 1.18;
      parts.cable = limb(green, .022); group.add(parts.cable);
      parts.force = arrow(new THREE.Vector3(-1, 0, 0), 1.55, blue, .035);
      group.add(parts.force);
    } else if (isInclinePress) {
      addBox('baseRail', [4.2, .18, 1.65], [0, -1.72, 0], dark, .05);
      addSymBox('rearUpright', [.15, 2.8, .15], 1.62, -.18, .65, dark, .04);
      addSymBox('frontUpright', [.12, 1.55, .12], -1.42, -1.02, .65, dark, .04);
      addBox('frontFootL', [.18, .16, 1.05], [-1.85, -1.62, .45], dark, .04);
      addBox('frontFootR', [.18, .16, 1.05], [-1.85, -1.62, -.45], dark, .04);
      const back = addBox('inclineBackPad', [2.25, .26, 1.05], [-.45, -.65, 0], platinum, .09);
      back.rotation.z = .82;
      const seat = addBox('inclineSeat', [1.05, .22, 1.05], [-1.2, -1.42, 0], dark, .08);
      seat.rotation.z = .18;
      addCapsule('torso', .15, 1.65, [-.35, -.65, 0], heatMat).rotation.z = .82 + Math.PI / 2;
      addHead('head', [.2, .06, 0], .85);
      addCapsule('leverL', .07, 1.85, [.85, .62, .48], dark).rotation.z = 1.02;
      addCapsule('leverR', .07, 1.85, [.85, .62, -.48], dark).rotation.z = 1.02;
      addCapsule('lowerLinkL', .045, 1.75, [.58, -.2, .48], platinum).rotation.z = .58;
      addCapsule('lowerLinkR', .045, 1.75, [.58, -.2, -.48], platinum).rotation.z = .58;
      addBox('handleL', [.58, .14, .14], [-.05, .82, .58], green, .05);
      addBox('handleR', [.58, .14, .14], [-.05, .82, -.58], green, .05);
      addPlate('plateL1', [1.68, .82, .62], .92);
      addPlate('plateR1', [1.68, .82, -.62], .92);
      addPlate('plateL2', [1.82, .82, .62], .72);
      addPlate('plateR2', [1.82, .82, -.62], .72);
      addCapsule('crossBar', .055, 2.8, [.35, 1.12, 0], platinum).rotation.z = Math.PI / 2;
      parts.force = arrow(new THREE.Vector3(-.55, .85, 0), 1.55, blue, .035);
      group.add(parts.force);
    } else if (isPushup) {
      addBox('floorPad', [3.8, .08, 1.35], [0, -1.75, 0], dark, .05);
      addCapsule('bodyLine', .16, 2.55, [0, -.62, 0], heatMat).rotation.z = Math.PI / 2;
      addCapsule('armL', .065, 1.1, [-.78, -1.12, .35], platinum);
      addCapsule('armR', .065, 1.1, [-.78, -1.12, -.35], platinum);
      addBox('handL', [.34, .1, .22], [-1.25, -1.72, .42], green, .05);
      addBox('handR', [.34, .1, .22], [-1.25, -1.72, -.42], green, .05);
      parts.force = arrow(new THREE.Vector3(0, 1, 0), 1.35, blue, .035);
      group.add(parts.force);
    } else if (isCableFly || isMachineFly) {
      addBox('seat', [1.35, .2, 1.15], [0, -1.35, 0], dark, .08);
      addBox('backPad', [.24, 1.75, 1.15], [0, -.32, 0], platinum, .08);
      addBox('torso', [.82, 1.55, .34], [0, -.25, 0], heatMat, .12);
      if (isCableFly) {
        addBox('towerL', [.16, 3.9, .16], [-2.35, .45, 0], dark, .04);
        addBox('towerR', [.16, 3.9, .16], [2.35, .45, 0], dark, .04);
        addStackPlates('flyStackL', -2.35, .08, -.34, 10, .34);
        addStackPlates('flyStackR', 2.35, .08, -.34, 10, .34);
        addBox('bridge', [4.9, .12, .12], [0, 2.35, 0], platinum, .04);
        addBox('baseL', [.62, .12, 1.1], [-2.35, -1.72, 0], dark, .04);
        addBox('baseR', [.62, .12, 1.1], [2.35, -1.72, 0], dark, .04);
        addPulley('pulleyL', [-2.35, .82, 0]);
        addPulley('pulleyR', [2.35, .82, 0]);
        parts.cableL = limb(green, .025); parts.cableR = limb(green, .025); group.add(parts.cableL, parts.cableR);
      } else {
        parts.pecPostL = strut(new THREE.Vector3(-1.55,-1.55,.7), new THREE.Vector3(-1.55,1.42,.7), platinum, .045); group.add(parts.pecPostL);
        parts.pecPostR = strut(new THREE.Vector3(1.55,-1.55,.7), new THREE.Vector3(1.55,1.42,.7), platinum, .045); group.add(parts.pecPostR);
        parts.pecPostLB = strut(new THREE.Vector3(-1.55,-1.55,-.7), new THREE.Vector3(-1.55,1.42,-.7), platinum, .045); group.add(parts.pecPostLB);
        parts.pecPostRB = strut(new THREE.Vector3(1.55,-1.55,-.7), new THREE.Vector3(1.55,1.42,-.7), platinum, .045); group.add(parts.pecPostRB);
        parts.pecTopF = strut(new THREE.Vector3(-1.55,1.42,.7), new THREE.Vector3(1.55,1.42,.7), platinum, .035); group.add(parts.pecTopF);
        parts.pecTopB = strut(new THREE.Vector3(-1.55,1.42,-.7), new THREE.Vector3(1.55,1.42,-.7), platinum, .035); group.add(parts.pecTopB);
        addBox('weightStack', [.42, 1.8, .54], [0, -.28, 1.05], dark, .04);
        addStackPlates('pecStackPlate', 0, .42, 1.05, 9, .48);
        addPulley('camL', [-1.45, .72, -.55], .85);
        addPulley('camR', [1.45, .72, .55], .85);
      }
      addCapsule('armL', .07, 1.35, [-1, .05, .42], platinum);
      addCapsule('armR', .07, 1.35, [1, .05, -.42], platinum);
      addBox('padL', [.18, .75, .24], [-1.35, .05, .42], green, .06);
      addBox('padR', [.18, .75, .24], [1.35, .05, -.42], green, .06);
      parts.force = arrow(new THREE.Vector3(0, 1, 0), 1.35, blue, .03);
      group.add(parts.force);
    } else if (isPulldown && def.key === 'scissor-pulldown') {
      addBox('baseFrame', [2.8, .16, 1.55], [0, -1.72, 0], dark, .05);
      addBox('frontPlatformL', [.72, .08, .44], [-.8, -1.58, .48], platinum, .03);
      addBox('frontPlatformR', [.72, .08, .44], [-.8, -1.58, -.48], platinum, .03);
      addBox('seat', [1.18, .2, .95], [-.55, -1.2, 0], dark, .08);
      addBox('kneeRoll', [1.25, .18, .28], [-.55, -.68, .08], platinum, .07);
      addBox('backTower', [.38, 2.3, .65], [.42, -.28, 0], dark, .06);
      addBox('torso', [.76, 1.45, .36], [-.55, -.25, 0], heatMat, .11);
      addCapsule('xArmL', .075, 1.85, [-.68, .65, .48], green).rotation.z = -.42;
      addCapsule('xArmR', .075, 1.85, [-.68, .65, -.48], green).rotation.z = -.42;
      addPulley('pivotL', [-.32, 1.38, .55], .72);
      addPulley('pivotR', [-.32, 1.38, -.55], .72);
      addBox('topHandleL', [.78, .14, .16], [-1.22, .85, .62], dark, .05);
      addBox('topHandleR', [.78, .14, .16], [-1.22, .85, -.62], dark, .05);
      addPlate('plateL', [1.35, -.25, .62], .75);
      addPlate('plateR', [1.35, -.25, -.62], .75);
      parts.force = arrow(new THREE.Vector3(-.3, -1, 0), 1.45, blue, .035);
      group.add(parts.force);
    } else if (isPulldown) {
      addBox('seat', [1.45, .2, 1.1], [0, -1.35, 0], dark, .08);
      addBox('thighPad', [1.7, .2, .34], [0, -.75, 0], platinum, .07);
      addBox('weightStack', [.38, 2.45, .62], [0, -.18, 1.28], dark, .04);
      addStackPlates('latStackPlate', 0, .72, 1.28, 10, .46);
      addBox('towerBack', [.28, 4.0, .28], [1.35, .45, -.62], dark, .05);
      addBox('towerFront', [.28, 4.0, .28], [1.35, .45, .62], dark, .05);
      addBox('frontWeightGuideL', [.06, 2.85, .06], [-.26, -.08, 1.28], platinum, .025);
      addBox('frontWeightGuideR', [.06, 2.85, .06], [.26, -.08, 1.28], platinum, .025);
      addBox('topBeam', [2.8, .14, 1.35], [0, 2.35, 0], platinum, .04);
      addPulley('topPulley', [.25, 2.16, 0]);
      addBox('torso', [.85, 1.7, .38], [0, -.3, 0], heatMat, .12);
      addCapsule('bar', .055, def.model === 'pulldown-wide' ? 2.55 : 1.65, [0, 1.15, .05], dark).rotation.z = Math.PI / 2;
      addCapsule('armL', .065, 1.3, [-.65, .55, .05], platinum);
      addCapsule('armR', .065, 1.3, [.65, .55, .05], platinum);
      parts.cable = limb(green, .025); group.add(parts.cable);
      parts.force = arrow(new THREE.Vector3(0, -1, 0), 1.45, blue, .035);
      group.add(parts.force);
    } else if (isPullover) {
      addBox('seat', [1.35, .2, 1.12], [0, -1.35, 0], dark, .08);
      addBox('backPad', [.28, 2.05, 1.12], [0, -.2, 0], platinum, .08);
      addBox('torso', [.82, 1.55, .34], [0, -.3, 0], heatMat, .12);
      addSymBox('sideFrame', [.16, 2.8, .16], -1.45, .2, .62, dark, .04);
      addSymBox('sideFrameRear', [.16, 2.8, .16], 1.45, .2, .62, dark, .04);
      addPulley('nautilusCamL', [-1.12, .92, .62], 1.1);
      addPulley('nautilusCamR', [1.12, .92, -.62], 1.1);
      addCapsule('sweepArmL', .06, 1.7, [-.72, .78, .38], dark);
      addCapsule('sweepArmR', .06, 1.7, [.72, .78, -.38], dark);
      addBox('elbowPad', [1.75, .2, .3], [0, .72, .18], green, .07);
      parts.force = arrow(new THREE.Vector3(0, -1, 0), 1.45, blue, .035);
      group.add(parts.force);
    } else if (isCableRow || isHammerRow || isBentRow) {
      if (isBentRow) {
        addCapsule('torso', .16, 1.85, [.08, -.12, 0], heatMat).rotation.z = -1.08;
        addCapsule('head', .12, .42, [-.62, .52, 0], platinum).rotation.z = -1.08;
        addCapsule('hip', .12, .9, [.72, -.9, 0], platinum).rotation.z = .72;
        addCapsule('legL', .09, 1.35, [1.08, -1.45, .38], platinum).rotation.z = .28;
        addCapsule('legR', .09, 1.35, [1.08, -1.45, -.38], platinum).rotation.z = .28;
        addCapsule('armL', .055, .92, [-.58, -.58, .38], platinum).rotation.z = -.78;
        addCapsule('armR', .055, .92, [-.58, -.58, -.38], platinum).rotation.z = -.78;
        addCapsule('bar', .06, 2.55, [-.85, -1.05, 0], dark).rotation.x = Math.PI / 2;
        addPlate('plateL', [-.85, -1.05, .98], .82);
        addPlate('plateR', [-.85, -1.05, -.98], .82);
      } else {
        addBox('seat', [1.65, .18, .82], [.8, -1.35, 0], dark, .08);
        addBox('torso', [.8, 1.55, .34], [.42, -.38, 0], heatMat, .12);
        addBox('footPlateL', [.16, .78, .54], [-1.42, -1.12, .38], dark, .06).rotation.z = -.42;
        addBox('footPlateR', [.16, .78, .54], [-1.42, -1.12, -.38], dark, .06).rotation.z = -.42;
        if (isHammerRow) {
          addBox('chestPad', [.28, 1.65, 1.05], [-.18, -.18, 0], platinum, .08);
          addSymBox('frontTower', [.15, 2.35, .15], -1.35, -.25, .65, dark, .04);
          addSymBox('rearTower', [.15, 2.35, .15], 1.25, -.25, .65, dark, .04);
          addPlate('plateL', [1.45, -.1, .72], .82);
          addPlate('plateR', [1.45, -.1, -.72], .82);
          addCapsule('leverL', .065, 1.8, [.42, .12, .42], dark);
          addCapsule('leverR', .065, 1.8, [.42, .12, -.42], dark);
        } else {
          addBox('cableStack', [.4, 2.65, .62], [-2.3, -.28, 0], dark, .05);
          addStackPlates('rowStackPlate', -2.3, .72, 0, 11, .42);
          addBox('stackGuideL', [.06, 2.95, .06], [-2.55, -.18, .24], platinum, .03);
          addBox('stackGuideR', [.06, 2.95, .06], [-2.55, -.18, -.24], platinum, .03);
          addPulley('lowPulley', [-1.75, -.72, 0], .75);
          addBox('longBenchRail', [2.65, .08, .18], [.28, -1.55, 0], platinum, .03);
          addBox('seatPad', [.85, .16, .72], [.92, -1.2, 0], dark, .06);
          parts.cable = limb(green, .025); group.add(parts.cable);
        }
      }
      if (!isBentRow) {
        addBox('handleL', [.52, .14, .14], [-.95, .1, .35], green, .05);
        addBox('handleR', [.52, .14, .14], [-.95, .1, -.35], green, .05);
        addCapsule('armL', .065, 1.05, [-.55, .0, .35], platinum);
        addCapsule('armR', .065, 1.05, [-.55, .0, -.35], platinum);
      }
      parts.force = arrow(new THREE.Vector3(-1, 0, 0), 1.45, blue, .035);
      group.add(parts.force);
    } else if (isShoulder && def.key === 'db-shoulder-press') {
      addBox('seat', [1.25, .2, 1.12], [0, -1.35, 0], dark, .08);
      addBox('backPad', [.24, 1.85, 1.08], [.25, -.32, 0], platinum, .08);
      addBox('torso', [.82, 1.55, .38], [.05, -.28, 0], heatMat, .12);
      addCapsule('armL', .07, 1.2, [-.62, .45, .42], platinum);
      addCapsule('armR', .07, 1.2, [.62, .45, -.42], platinum);
      addCapsule('dbBarL', .04, .52, [-.78, 1.0, .48], dark).rotation.z = Math.PI / 2;
      addCapsule('dbBarR', .04, .52, [.78, 1.0, -.48], dark).rotation.z = Math.PI / 2;
      addPlate('dbL1', [-1.05, 1.0, .48], .42); addPlate('dbL2', [-.52, 1.0, .48], .42);
      addPlate('dbR1', [.52, 1.0, -.48], .42); addPlate('dbR2', [1.05, 1.0, -.48], .42);
      parts.force = arrow(new THREE.Vector3(0, 1, 0), 1.45, blue, .035);
      group.add(parts.force);
    } else if (isShoulder && def.key === 'machine-military-press') {
      addCapsule('body', .16, 1.85, [0, -.35, 0], heatMat);
      addHead('head', [0, .75, 0], .9);
      addCapsule('legL', .085, 1.25, [-.28, -1.55, .22], platinum);
      addCapsule('legR', .085, 1.25, [.28, -1.55, -.22], platinum);
      addCapsule('armL', .065, 1.35, [-.62, .78, .42], platinum);
      addCapsule('armR', .065, 1.35, [.62, .78, -.42], platinum);
      addCapsule('bar', .055, 2.25, [0, 1.55, 0], dark).rotation.z = Math.PI / 2;
      addPlate('plateL', [-1.25, 1.55, .5], .68);
      addPlate('plateR', [1.25, 1.55, -.5], .68);
      parts.force = arrow(new THREE.Vector3(0, 1, 0), 1.65, blue, .035);
      group.add(parts.force);
    } else if (isShoulder) {
      const machine = def.key !== 'db-shoulder-press';
      addBox('seat', [1.25, .2, 1.12], [0, -1.35, 0], dark, .08);
      addBox('backPad', [.22, 1.85, 1.08], [0, -.32, 0], platinum, .08);
      addBox('torso', [.82, 1.55, .38], [0, -.28, 0], heatMat, .12);
      if (machine) {
        parts.pressPostBL = strut(new THREE.Vector3(-1.18,-1.62,-.72), new THREE.Vector3(-1.18,1.86,-.72), dark, .05); group.add(parts.pressPostBL);
        parts.pressPostBR = strut(new THREE.Vector3(1.18,-1.62,-.72), new THREE.Vector3(1.18,1.86,-.72), dark, .05); group.add(parts.pressPostBR);
        parts.pressPostFL = strut(new THREE.Vector3(-1.18,-1.62,.72), new THREE.Vector3(-1.18,1.86,.72), dark, .05); group.add(parts.pressPostFL);
        parts.pressPostFR = strut(new THREE.Vector3(1.18,-1.62,.72), new THREE.Vector3(1.18,1.86,.72), dark, .05); group.add(parts.pressPostFR);
        parts.pressTopBack = strut(new THREE.Vector3(-1.18,1.86,-.72), new THREE.Vector3(1.18,1.86,-.72), platinum, .035); group.add(parts.pressTopBack);
        parts.pressTopFront = strut(new THREE.Vector3(-1.18,1.86,.72), new THREE.Vector3(1.18,1.86,.72), platinum, .035); group.add(parts.pressTopFront);
        addCapsule('guideL', .05, 1.85, [-.95, .65, .52], dark).rotation.z = -.08;
        addCapsule('guideR', .05, 1.85, [.95, .65, -.52], dark).rotation.z = .08;
      }
      addCapsule('armL', .07, 1.2, [-.62, .45, .42], platinum);
      addCapsule('armR', .07, 1.2, [.62, .45, -.42], platinum);
      addBox('handleL', [.34, .34, .34], [-.72, .72, .52], green, .08);
      addBox('handleR', [.34, .34, .34], [.72, .72, -.52], green, .08);
      parts.force = arrow(new THREE.Vector3(0, 1, 0), 1.45, blue, .035);
      group.add(parts.force);
    } else if (isSquat) {
      addBox('rackL', [.14, 3.0, .14], [-1.55, .15, -.2], dark, .04);
      addBox('rackR', [.14, 3.0, .14], [1.55, .15, -.2], dark, .04);
      addBox('floorMark', [2.2, .04, 1.25], [0, -1.92, 0], dark, .03);
      addCapsule('torso', .14, 1.55, [0, .15, 0], heatMat);
      addHead('head', [0, 1.05, 0], .82);
      addCapsule('femurL', .09, 1.25, [-.42, -.75, .28], platinum);
      addCapsule('femurR', .09, 1.25, [-.42, -.75, -.28], platinum);
      addCapsule('tibiaL', .085, 1.22, [.35, -1.48, .28], platinum);
      addCapsule('tibiaR', .085, 1.22, [.35, -1.48, -.28], platinum);
      addCapsule('bar', .06, 2.7, [0, 1.18, 0], dark).rotation.x = Math.PI / 2;
      addPlate('plateL', [0, 1.18, .92], .85);
      addPlate('plateR', [0, 1.18, -.92], .85);
      parts.force = arrow(new THREE.Vector3(0, -1, 0), 1.65, blue, .035);
      group.add(parts.force);
    }

    if (isBarbellBench) {
      addPivotHub(group, [-1.65, .7, -.1], .12, 'J-hook挂钩');
      addPivotHub(group, [1.65, .7, -.1], .12, '');
      addMachineChain(group, [
        { text: '杠铃片重力', pos: [1.55, .65, .1], mat: red },
        { text: '直杠传力', pos: [0, .65, .1], mat: green },
        { text: '手腕垂直推', pos: [.72, .15, .1], mat: blue },
        { text: '胸肩肘转矩', pos: [0, -.45, .1], mat: red, labelOffset: [0, -.52, 0] }
      ]);
    } else if (isFlatPress) {
      addPivotHub(group, [1.62, .28, .62], .18, '独立转轴轴承');
      addPivotHub(group, [1.62, .28, -.62], .18, '');
      addPlateHorn(group, [2.02, .28, .8], 1, '后方装片杆');
      addPlateHorn(group, [2.02, .28, -.8], -1, '');
      addCableSegment(group, [2.02, .28, .8], [1.62, .28, .62]);
      addCableSegment(group, [1.62, .28, .62], [-.45, .18, .52]);
      addMachineChain(group, [
        { text: '后方装片杆', pos: [2.22, .28, .82], mat: red },
        { text: '转轴杠杆臂', pos: [1.62, .28, .62], mat: green },
        { text: '前方推柄', pos: [-.45, .18, .52], mat: blue },
        { text: '胸大肌水平推', pos: [.05, -.05, 0], mat: red, labelOffset: [0, -.58, 0] }
      ]);
    } else if (isInclinePress) {
      addPivotHub(group, [.98, .55, .55], .18, '上斜主转轴');
      addPivotHub(group, [.98, .55, -.55], .18, '');
      addPlateHorn(group, [1.78, .82, .68], 1, '侧后装片杆');
      addPlateHorn(group, [1.78, .82, -.68], -1, '');
      addCableSegment(group, [1.78, .82, .68], [.98, .55, .55]);
      addCableSegment(group, [.98, .55, .55], [-.05, .82, .58]);
      addMachineChain(group, [
        { text: '侧后方装片', pos: [1.78, .85, .62], mat: red },
        { text: '上斜杠杆臂', pos: [.86, .62, .48], mat: green },
        { text: '斜上推柄', pos: [-.05, .82, .58], mat: blue },
        { text: '上胸/肩前束', pos: [-.35, -.45, 0], mat: red, labelOffset: [0, -.55, 0] }
      ]);
    } else if (isPushup) {
      addMachineChain(group, [
        { text: '身体自重', pos: [0, -.62, 0], mat: red },
        { text: '手掌支点', pos: [-1.25, -1.72, .42], mat: blue },
        { text: '胸肩推地', pos: [-.8, -1.1, 0], mat: green },
        { text: '核心抗塌腰', pos: [.35, -.62, 0], mat: red, labelOffset: [0, .5, 0] }
      ]);
    } else if (isCableFly) {
      addSelectorizedTower(group, { x: -2.35, y: -.22, z: -.62, height: 2.45, width: .44, depth: .42, label: '左配重塔', openSide: -1 });
      addSelectorizedTower(group, { x: 2.35, y: -.22, z: -.62, height: 2.45, width: .44, depth: .42, label: '右配重塔', openSide: -1 });
      addCableSegment(group, [-2.35, .95, -.62], [-2.35, .82, 0]);
      addCableSegment(group, [2.35, .95, -.62], [2.35, .82, 0]);
      addMachineChain(group, [
        { text: '双塔配重', pos: [-2.35, .72, -.34], mat: red },
        { text: '滑轮改向', pos: [-2.35, .82, 0], mat: green },
        { text: '手柄向外拉', pos: [-1.35, .05, .42], mat: blue },
        { text: '胸肌水平内收', pos: [0, -.08, 0], mat: red, labelOffset: [0, -.55, 0] }
      ]);
    } else if (isMachineFly) {
      addSelectorizedTower(group, { x: 0, y: -.28, z: 1.12, height: 2.05, width: .5, depth: .46, label: '后置插片塔' });
      addPivotHub(group, [-1.45, .72, -.55], .22, '左凸轮/转轴');
      addPivotHub(group, [1.45, .72, .55], .22, '右凸轮/转轴');
      addCableSegment(group, [0, .72, 1.12], [-1.45, .72, -.55]);
      addCableSegment(group, [0, .72, 1.12], [1.45, .72, .55]);
      addMachineChain(group, [
        { text: '配重片直下', pos: [0, .42, 1.05], mat: red },
        { text: '凸轮变阻力', pos: [-1.45, .72, -.55], mat: green },
        { text: '肘垫合拢', pos: [-1.35, .05, .42], mat: blue },
        { text: '胸大肌夹胸', pos: [0, -.08, 0], mat: red, labelOffset: [0, -.55, 0] }
      ]);
    } else if (isPulldown && def.key === 'scissor-pulldown') {
      addPivotHub(group, [-.32, 1.38, .55], .22, '左上转点');
      addPivotHub(group, [-.32, 1.38, -.55], .22, '右上转点');
      addPlateHorn(group, [1.35, -.25, .62], 1, '侧置片杆');
      addPlateHorn(group, [1.35, -.25, -.62], -1, '');
      addCableSegment(group, [1.35, -.25, .62], [-.32, 1.38, .55]);
      addCableSegment(group, [1.35, -.25, -.62], [-.32, 1.38, -.55]);
      addMachineChain(group, [
        { text: '片加载/配重', pos: [1.35, -.25, .62], mat: red },
        { text: '上方双转点', pos: [-.32, 1.38, .55], mat: green },
        { text: '分动圆弧手柄', pos: [-1.22, .85, .62], mat: blue },
        { text: '肘下压背阔', pos: [-.55, -.15, 0], mat: red, labelOffset: [-.15, -.58, 0] }
      ]);
    } else if (isPulldown) {
      addSelectorizedTower(group, { x: 0, y: -.18, z: 1.28, height: 2.7, width: .5, depth: .5, label: '前方插片塔' });
      addPivotHub(group, [.25, 2.16, 0], .2, '顶部滑轮轮组');
      addCableSegment(group, [0, 1.05, 1.28], [.25, 2.16, 0]);
      addCableSegment(group, [.25, 2.16, 0], [0, 1.15, .05]);
      addMachineChain(group, [
        { text: '前方配重塔', pos: [0, .72, 1.28], mat: red },
        { text: '顶端滑轮', pos: [.25, 2.16, 0], mat: green },
        { text: '横杆被上拉', pos: [0, 1.15, .05], mat: blue },
        { text: '肘向下收背', pos: [-.65, .55, .05], mat: red, labelOffset: [-.35, -.52, 0] }
      ]);
    } else if (isPullover) {
      addSelectorizedTower(group, { x: 1.72, y: -.22, z: 0, height: 2.35, width: .48, depth: .46, label: '侧后配重塔' });
      addPivotHub(group, [-1.12, .92, .62], .3, '大圆凸轮轴');
      addPivotHub(group, [1.12, .92, -.62], .3, '');
      addCableSegment(group, [1.72, .82, 0], [-1.12, .92, .62]);
      addCableSegment(group, [1.72, .82, 0], [1.12, .92, -.62]);
      addMachineChain(group, [
        { text: '圆盘凸轮', pos: [-1.12, .92, .62], mat: red },
        { text: '摆臂传力', pos: [-.72, .78, .38], mat: green },
        { text: '肘垫下压', pos: [0, .72, .18], mat: blue },
        { text: '背阔肩伸展', pos: [0, -.22, 0], mat: red, labelOffset: [0, -.55, 0] }
      ]);
    } else if (isCableRow) {
      addSelectorizedTower(group, { x: -2.3, y: -.28, z: 0, height: 2.75, width: .5, depth: .5, label: '低位插片塔' });
      addPivotHub(group, [-1.75, -.72, 0], .18, '低滑轮轮组');
      addCableSegment(group, [-2.3, .86, 0], [-1.75, -.72, 0]);
      addCableSegment(group, [-1.75, -.72, 0], [-.95, .1, 0]);
      addMachineChain(group, [
        { text: '低位配重塔', pos: [-2.3, .72, 0], mat: red },
        { text: '低滑轮改向', pos: [-1.75, -.72, 0], mat: green },
        { text: '手柄水平拉', pos: [-.95, .1, .35], mat: blue },
        { text: '肩胛后缩', pos: [.42, -.18, 0], mat: red, labelOffset: [0, -.55, 0] }
      ]);
    } else if (isHammerRow) {
      addPivotHub(group, [.42, .12, .42], .19, '左独立转轴');
      addPivotHub(group, [.42, .12, -.42], .19, '右独立转轴');
      addPlateHorn(group, [1.45, -.1, .72], 1, '胸托划船装片杆');
      addPlateHorn(group, [1.45, -.1, -.72], -1, '');
      addPlateHorn(group, [1.28, -1.0, .72], 1, '储片杆');
      addPlateHorn(group, [1.28, -1.0, -.72], -1, '');
      addMachineChain(group, [
        { text: '侧后方装片', pos: [1.45, -.1, .72], mat: red },
        { text: '独立杠杆臂', pos: [.42, .12, .42], mat: green },
        { text: '手柄向后拉', pos: [-.95, .1, .35], mat: blue },
        { text: '背阔/中背收缩', pos: [.1, -.35, 0], mat: red, labelOffset: [0, -.55, 0] }
      ]);
    } else if (isBentRow) {
      addMachineChain(group, [
        { text: '杠铃片重力', pos: [-.85, -1.05, .98], mat: red },
        { text: '手臂悬垂力臂', pos: [-.58, -.58, .38], mat: green },
        { text: '肘向后拉杠', pos: [-.85, -1.05, 0], mat: blue },
        { text: '背部+腰背等长', pos: [.08, -.12, 0], mat: red, labelOffset: [0, .58, 0] }
      ]);
    } else if (isShoulder && def.key === 'db-shoulder-press') {
      addMachineChain(group, [
        { text: '哑铃重力', pos: [-.78, 1, .48], mat: red },
        { text: '前臂竖直承重', pos: [-.62, .45, .42], mat: green },
        { text: '向上推举', pos: [0, 1.2, 0], mat: blue },
        { text: '三角肌稳定', pos: [.05, -.28, 0], mat: red, labelOffset: [0, -.55, 0] }
      ]);
    } else if (isShoulder && def.key === 'machine-military-press') {
      addPivotHub(group, [0, 1.55, .55], .17, '杠杆转轴');
      addPivotHub(group, [0, 1.55, -.55], .17, '');
      addPlateHorn(group, [-1.25, 1.55, .5], 1, '装片端');
      addPlateHorn(group, [1.25, 1.55, -.5], -1, '');
      addMachineChain(group, [
        { text: '两侧装片', pos: [1.25, 1.55, -.5], mat: red },
        { text: '直杆/杠杆传力', pos: [0, 1.55, 0], mat: green },
        { text: '站姿上推', pos: [0, 1.85, 0], mat: blue },
        { text: '核心抗后仰', pos: [0, -.35, 0], mat: red, labelOffset: [0, -.55, 0] }
      ]);
    } else if (isShoulder) {
      addSelectorizedTower(group, { x: 1.55, y: -.18, z: 0, height: 2.55, width: .5, depth: .5, label: '后置插片塔' });
      addPivotHub(group, [-.95, .65, .52], .14, '导向滑轮/轨道');
      addPivotHub(group, [.95, .65, -.52], .14, '');
      addCableSegment(group, [1.55, .95, 0], [-.95, .65, .52]);
      addCableSegment(group, [1.55, .95, 0], [.95, .65, -.52]);
      addMachineChain(group, [
        { text: '导轨/配重阻力', pos: [1.18, 1.2, .72], mat: red },
        { text: '推柄轨迹', pos: [.72, .72, .52], mat: green },
        { text: '手向上推', pos: [.72, 1.25, .52], mat: blue },
        { text: '三角肌发力', pos: [0, -.28, 0], mat: red, labelOffset: [0, -.55, 0] }
      ]);
    } else if (isSquat) {
      addMachineChain(group, [
        { text: '杠铃片重力', pos: [0, 1.18, .92], mat: red },
        { text: '脊柱轴向压力', pos: [0, .7, 0], mat: blue },
        { text: '膝髋伸展', pos: [-.42, -.75, .28], mat: green },
        { text: '腹压抗剪切', pos: [0, .15, 0], mat: red, labelOffset: [0, -.58, 0] }
      ]);
    }

    addPrincipleSketch(group, principleTypeForDef(), {
      origin: [0, 2.85, -1.55],
      scale: .88,
      title: principleTitleForDef()
    });

    const hit = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.8, 2.5), hitMaterial);
    hit.userData = { dragScene: def.key, dragProxy: true };
    group.add(hit);
    draggableHandles.push(hit);
    group.scale.setScalar(1.22);

    function update(progress) {
      const profile = currentMachineProfile(def.key);
      const v = profile.controlValues || {};
      const t = clamp(progress + (profile.camBias || 0) * .18, 0, 100) / 100;
      const heat = extraLoadPercent(def, progress);
      heatMat.emissiveIntensity = .08 + heat / 100 * .5;
      if (isBarbellBench) {
        if (parts.bench) parts.bench.position.y = -1.35 + ((v.benchHeightCm || 44) - 44) / 85;
        const y = THREE.MathUtils.lerp(.18, 1.0, t);
        const gripScale = clamp((v.gripWidthCm || 72) / 72, .72, 1.35);
        parts.bar.scale.y = gripScale;
        parts.bar.position.y = y; parts.plateL.position.y = y; parts.plateR.position.y = y;
        parts.plateL.position.x = -1.55 * gripScale; parts.plateR.position.x = 1.55 * gripScale;
        parts.upperL.rotation.z = THREE.MathUtils.lerp(-.9, -.25, t); parts.upperR.rotation.z = -parts.upperL.rotation.z;
        parts.foreL.rotation.z = THREE.MathUtils.lerp(.35, .05, t); parts.foreR.rotation.z = -parts.foreL.rotation.z;
        parts.force.position.set(0, y + .15, 0); parts.force.scale.y = clamp(heat / 70, .55, 1.8);
      } else if (isFlatPress) {
        const seatLift = ((v.seatHeightCm || 50) - 50) / 95;
        parts.seat.position.y = -1.24 + seatLift;
        parts.backPad.position.y = -.18 + seatLift;
        parts.torso.position.y = -.25 + seatLift;
        const handleSpread = clamp((v.handleWidthCm || 58) / 58, .72, 1.32);
        parts.handleL.position.z = .52 * handleSpread; parts.handleR.position.z = -.52 * handleSpread;
        const x = THREE.MathUtils.lerp(-.55, -1.38, t);
        parts.handleL.position.x = x; parts.handleR.position.x = x;
        const pathTilt = THREE.MathUtils.degToRad((v.pressPathDeg || 4) * .45);
        parts.pressArmL.rotation.z = THREE.MathUtils.lerp(-.58, -.08, t) + pathTilt;
        parts.pressArmR.rotation.z = parts.pressArmL.rotation.z;
        alignCylinder(parts.cable, new THREE.Vector3(1.62, .28, 0), new THREE.Vector3(x, .1, 0));
        parts.force.position.set(x - .15, .18, 0); parts.force.scale.y = clamp(heat / 72, .55, 1.75);
      } else if (isInclinePress) {
        const backAngle = THREE.MathUtils.degToRad(v.benchAngleDeg || 35);
        parts.inclineBackPad.rotation.z = backAngle + .2;
        parts.torso.rotation.z = backAngle + Math.PI / 2 + .2;
        const dx = THREE.MathUtils.lerp(.35, -.32, t);
        const dy = THREE.MathUtils.lerp(.72, 1.24, t);
        const handleSpread = clamp((v.handleWidthCm || 62) / 62, .75, 1.3);
        parts.handleL.position.set(dx, dy, .58); parts.handleR.position.set(dx, dy, -.58);
        parts.handleL.position.z *= handleSpread; parts.handleR.position.z *= handleSpread;
        parts.leverL.rotation.z = THREE.MathUtils.lerp(.72, 1.16, t);
        parts.leverR.rotation.z = parts.leverL.rotation.z;
        parts.plateL1.position.set(THREE.MathUtils.lerp(1.45, 1.82, t), THREE.MathUtils.lerp(.55, 1.05, t), .62);
        parts.plateR1.position.set(parts.plateL1.position.x, parts.plateL1.position.y, -.62);
        parts.force.position.set(dx - .1, dy + .15, 0); parts.force.scale.y = clamp(heat / 72, .55, 1.75);
      } else if (isPushup) {
        const elevation = (v.footElevationCm || 0) / 160;
        const y = THREE.MathUtils.lerp(-1.05, -.58, t);
        parts.bodyLine.position.y = y + elevation * .2; parts.bodyLine.rotation.z = THREE.MathUtils.lerp(Math.PI / 2 - .12 + elevation, Math.PI / 2 + .05 + elevation, t);
        parts.armL.scale.y = THREE.MathUtils.lerp(.72, 1.05, t); parts.armR.scale.y = parts.armL.scale.y;
        parts.force.position.set(-.55, y + .35, 0); parts.force.scale.y = clamp(heat / 75, .55, 1.65);
      } else if (isCableFly || isMachineFly) {
        const spread = THREE.MathUtils.lerp(1.45, .38, t);
        const widthFactor = isCableFly ? clamp((v.towerWidthCm || 190) / 190, .75, 1.32) : clamp((v.armPadWidthCm || 68) / 68, .75, 1.28);
        parts.armL.position.x = -spread; parts.armR.position.x = spread;
        parts.armL.rotation.z = THREE.MathUtils.lerp(-1.05, -.18, t); parts.armR.rotation.z = -parts.armL.rotation.z;
        parts.padL.position.x = (-spread - .28) * widthFactor; parts.padR.position.x = (spread + .28) * widthFactor;
        if (parts.pulleyL) parts.pulleyL.position.y = ((v.pulleyHeightCm || 135) - 135) / 120 + .82;
        if (parts.pulleyR) parts.pulleyR.position.y = ((v.pulleyHeightCm || 135) - 135) / 120 + .82;
        if (parts.cableL) {
          alignCylinder(parts.cableL, parts.pulleyL.position, parts.padL.position);
          alignCylinder(parts.cableR, parts.pulleyR.position, parts.padR.position);
        }
        parts.force.position.set(0, .42, 0); parts.force.scale.y = clamp(heat / 72, .55, 1.7);
      } else if (isPulldown && def.key === 'scissor-pulldown') {
        const arcGain = clamp((v.handleArcDeg || 82) / 82, .72, 1.32);
        const angle = THREE.MathUtils.lerp(-.72, -.28, t);
        parts.xArmL.rotation.z = angle * arcGain;
        parts.xArmR.rotation.z = angle * arcGain;
        const hx = THREE.MathUtils.lerp(-1.45, -.78, t);
        const hy = THREE.MathUtils.lerp(1.62, .72, t) + ((v.pivotHeightCm || 162) - 162) / 120;
        parts.topHandleL.position.set(hx, hy, .45);
        parts.topHandleR.position.set(hx, hy, -.45);
        parts.force.position.set(hx + .15, hy - .35, 0); parts.force.scale.y = clamp(heat / 72, .55, 1.75);
      } else if (isPulldown) {
        const pulleyLift = ((v.pulleyHeightCm || 220) - 220) / 140;
        parts.topPulley.position.y = 2.16 + pulleyLift;
        const y = THREE.MathUtils.lerp(1.25 + pulleyLift * .35, -.18, t);
        const gripScale = clamp((v.gripWidthCm || 78) / 78, .7, 1.35);
        parts.bar.scale.y = gripScale;
        parts.bar.position.y = y;
        parts.armL.position.y = y - .42; parts.armR.position.y = y - .42;
        parts.armL.rotation.z = THREE.MathUtils.lerp(-.9, -.2, t); parts.armR.rotation.z = -parts.armL.rotation.z;
        alignCylinder(parts.cable, parts.topPulley.position, new THREE.Vector3(0, y, .05));
        parts.force.position.set(0, y - .1, .05); parts.force.scale.y = clamp(heat / 72, .55, 1.7);
      } else if (isPullover) {
        const padLift = ((v.elbowPadHeightCm || 122) - 122) / 120;
        const angle = THREE.MathUtils.lerp(-.95, .35, t);
        parts.sweepArmL.rotation.z = angle; parts.sweepArmR.rotation.z = -angle;
        parts.elbowPad.position.y = THREE.MathUtils.lerp(1.1, .15, t) + padLift;
        parts.elbowPad.position.x = THREE.MathUtils.lerp(0, -.15, t);
        parts.force.position.set(0, parts.elbowPad.position.y - .2, .15); parts.force.scale.y = clamp(heat / 70, .55, 1.75);
      } else if (isCableRow || isHammerRow || isBentRow) {
        const torsoShift = ((v.torsoLeanDeg || v.chestPadAngleDeg || 45) - 45) / 120;
        if (isBentRow) {
          const barY = THREE.MathUtils.lerp(-1.12, -.76, t);
          const barX = THREE.MathUtils.lerp(-.98, -.62, t);
          parts.bar.position.set(barX, barY, 0);
          parts.plateL.position.set(barX, barY, .98);
          parts.plateR.position.set(barX, barY, -.98);
          parts.armL.position.set(THREE.MathUtils.lerp(-.64, -.38, t), THREE.MathUtils.lerp(-.7, -.36, t), .38);
          parts.armR.position.set(parts.armL.position.x, parts.armL.position.y, -.38);
          parts.armL.rotation.z = THREE.MathUtils.lerp(-.78, -.42, t);
          parts.armR.rotation.z = parts.armL.rotation.z;
          parts.torso.rotation.z = THREE.MathUtils.lerp(-1.12, -.88, t) - torsoShift;
          parts.force.position.set(barX - .16, barY + .2, 0);
        } else {
          const x = THREE.MathUtils.lerp(-1.3, -.35, t);
          if (parts.lowPulley) parts.lowPulley.position.y = -.72 + ((v.pulleyHeightCm || 28) - 28) / 90;
          if (parts.chestPad) parts.chestPad.rotation.z = THREE.MathUtils.degToRad((v.chestPadAngleDeg || 72) - 72) * .4;
          parts.handleL.position.x = x; parts.handleR.position.x = x;
          parts.armL.position.x = x + .38; parts.armR.position.x = x + .38;
          parts.armL.rotation.z = THREE.MathUtils.lerp(1.0, .25, t); parts.armR.rotation.z = parts.armL.rotation.z;
          if (parts.cable) alignCylinder(parts.cable, parts.lowPulley.position, new THREE.Vector3(x, .1, 0));
          if (parts.leverL) { parts.leverL.rotation.z = THREE.MathUtils.lerp(-.65, -.12, t); parts.leverR.rotation.z = parts.leverL.rotation.z; }
          parts.force.position.set(x - .1, .18, 0);
        }
        parts.force.scale.y = clamp(heat / 72, .55, 1.75);
      } else if (isShoulder && def.key === 'db-shoulder-press') {
        if (parts.backPad) parts.backPad.rotation.z = THREE.MathUtils.degToRad((v.benchAngleDeg || 82) - 82) * .35;
        const y = THREE.MathUtils.lerp(.78, 1.55, t);
        parts.armL.position.y = y - .25; parts.armR.position.y = y - .25;
        parts.armL.rotation.z = THREE.MathUtils.lerp(-.88, -.12, t); parts.armR.rotation.z = -parts.armL.rotation.z;
        ['dbBarL','dbBarR','dbL1','dbL2','dbR1','dbR2'].forEach((name) => { parts[name].position.y = y; });
        parts.force.position.set(0, y + .2, .3); parts.force.scale.y = clamp(heat / 72, .55, 1.75);
      } else if (isShoulder && def.key === 'machine-military-press') {
        const pathLean = THREE.MathUtils.degToRad((v.pressPathDeg || 88) - 88) * .5;
        const y = THREE.MathUtils.lerp(.72, 1.85, t);
        parts.armL.position.y = y - .35; parts.armR.position.y = y - .35;
        parts.armL.rotation.z = THREE.MathUtils.lerp(-.62, -.04, t) + pathLean; parts.armR.rotation.z = -parts.armL.rotation.z;
        parts.bar.position.y = y; parts.plateL.position.y = y; parts.plateR.position.y = y;
        parts.force.position.set(0, y + .2, 0); parts.force.scale.y = clamp(heat / 70, .55, 1.85);
      } else if (isShoulder) {
        const backLean = THREE.MathUtils.degToRad((v.backrestAngleDeg || 82) - 82) * .45;
        if (parts.backPad) parts.backPad.rotation.z = backLean;
        const y = THREE.MathUtils.lerp(.15, 1.55, t);
        parts.handleL.position.y = y; parts.handleR.position.y = y;
        parts.armL.position.y = y - .28; parts.armR.position.y = y - .28;
        parts.armL.rotation.z = THREE.MathUtils.lerp(-.85, -.12, t); parts.armR.rotation.z = -parts.armL.rotation.z;
        parts.force.position.set(0, y + .1, 0); parts.force.scale.y = clamp(heat / 72, .55, 1.75);
      } else if (isSquat) {
        const stance = clamp((v.stanceWidthCm || 55) / 55, .7, 1.45);
        const hipY = THREE.MathUtils.lerp(-.15, -1.05, t);
        parts.torso.position.y = hipY + .75; parts.torso.rotation.z = THREE.MathUtils.lerp(.08, .45, t) + THREE.MathUtils.degToRad((v.trunkLeanDeg || 22) - 22) * .5;
        parts.bar.position.y = parts.torso.position.y + .95; parts.plateL.position.y = parts.bar.position.y; parts.plateR.position.y = parts.bar.position.y;
        parts.plateL.position.z = .92 * stance; parts.plateR.position.z = -.92 * stance;
        parts.femurL.rotation.z = THREE.MathUtils.lerp(-.42, -1.05, t); parts.femurR.rotation.z = parts.femurL.rotation.z;
        parts.tibiaL.rotation.z = THREE.MathUtils.lerp(.18, .72, t); parts.tibiaR.rotation.z = parts.tibiaL.rotation.z;
        parts.force.position.set(-.8, parts.bar.position.y + .15, 0); parts.force.scale.y = clamp(heat / 70, .55, 1.85);
      }
    }
    update(extraProgress(def.key));
    scene.add(group);
    return { group, update, updatePhysics: (params = {}) => {
      const progress = params.progress ?? extraProgress(def.key);
      update(progress);
      return updatePhysics({ sceneKey: def.key, stepPercent: progress, ...params });
    } };
  }

  const equipmentFrame = new THREE.MeshPhysicalMaterial({ color: 0x11161d, metalness: .76, roughness: .24, clearcoat: .72 });
  const equipmentSteel = new THREE.MeshPhysicalMaterial({ color: 0xbcc8d1, metalness: .9, roughness: .18, clearcoat: .85 });
  const equipmentPad = new THREE.MeshPhysicalMaterial({ color: 0x20252c, metalness: .08, roughness: .56, clearcoat: .28 });
  const equipmentAxiomSilver = new THREE.MeshPhysicalMaterial({ color: 0x9da7aa, metalness: .74, roughness: .28, clearcoat: .68 });
  const equipmentHammerGraphite = new THREE.MeshPhysicalMaterial({ color: 0x4d5255, metalness: .7, roughness: .3, clearcoat: .58 });
  const equipmentRedUpholstery = new THREE.MeshPhysicalMaterial({ color: 0x9f1f2f, metalness: .04, roughness: .5, clearcoat: .36 });
  const equipmentAccent = new THREE.MeshStandardMaterial({ color: 0xe6b522, metalness: .3, roughness: .4 });
  const equipmentCable = new THREE.MeshStandardMaterial({ color: 0x26292b, metalness: .45, roughness: .38 });
  const equipmentOak = new THREE.MeshPhysicalMaterial({ color: 0xb88345, metalness: .02, roughness: .5, clearcoat: .28 });
  const equipmentRubber = new THREE.MeshPhysicalMaterial({ color: 0x101419, metalness: .03, roughness: .82, clearcoat: .08 });
  const equipmentGold = new THREE.MeshPhysicalMaterial({ color: 0xc9a44d, metalness: .84, roughness: .22, clearcoat: .72 });
  const insigniaUpholstery = new THREE.MeshPhysicalMaterial({ color: 0xb8242f, metalness: .02, roughness: .5, clearcoat: .4 });

  BM.ModelViewTools?.finish(THREE, [equipmentFrame, equipmentSteel, equipmentAxiomSilver, equipmentHammerGraphite, equipmentGold], 'metal', .018);
  BM.ModelViewTools?.finish(THREE, [equipmentPad, equipmentRedUpholstery, equipmentRubber, insigniaUpholstery], 'matte', .025);

  function buildCommercialEquipmentRig(sceneKey, def = null, index = 0) {
    if (sceneKey === 'cam' && BM.EquipmentModels?.createOPLE) {
      const rig = BM.EquipmentModels.createOPLE({ THREE, RoundedBoxGeometry });
      rig.group.position.set(-9 + (index % 4) * 6, .18, -Math.floor(index / 4) * 5.4);
      rig.group.scale.setScalar(1.08);
      draggableHandles.push(rig.parts.actionHit);
      const progressFor = (params = {}) => clamp(Number(params.angleDeg ?? telemetry.camAngle), 0, 360) / 3.6;
      rig.update(progressFor());
      scene.add(rig.group);
      return { ...rig, updatePhysics(params = {}) {
        const progress = progressFor(params); rig.update(progress, params);
        return updatePhysics({ sceneKey, stepPercent: progress, ...params, angleDeg: (-.1 + progress / 100 * 1.46) * 180 / Math.PI });
      } };
    }
    const group = new THREE.Group();
    const slot = index;
    group.name = MACHINE_REFERENCES[sceneKey]?.name || sceneKey;
    group.position.set(-9 + (slot % 4) * 6, .18, -Math.floor(slot / 4) * 5.4);
    group.scale.setScalar(1.08);
    const parts = {};
    const moving = new THREE.Group();
    group.add(moving);

    const box = (name, size, pos, mat = equipmentFrame, radius = .045, parent = group) => {
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 5, Math.min(radius, ...size.map((n) => n / 3))), mat);
      mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); if (name) parts[name] = mesh; return mesh;
    };
    const tube = (name, a, b, radius = .045, mat = equipmentFrame, parent = group) => {
      const mesh = strut(new THREE.Vector3(...a), new THREE.Vector3(...b), mat, radius);
      mesh.castShadow = true; parent.add(mesh); if (name) parts[name] = mesh; return mesh;
    };
    const beam = (name, a, b, section = [.15, .11], mat = equipmentFrame, parent = group) => {
      const start = new THREE.Vector3(...a);
      const end = new THREE.Vector3(...b);
      const delta = new THREE.Vector3().subVectors(end, start);
      const mesh = new THREE.Mesh(
        new RoundedBoxGeometry(delta.length(), section[0], section[1], 4, Math.min(.035, section[0] / 4, section[1] / 4)),
        mat
      );
      mesh.position.copy(start).add(end).multiplyScalar(.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), delta.normalize());
      mesh.castShadow = true;
      parent.add(mesh);
      if (name) parts[name] = mesh;
      return mesh;
    };
    const bentBeam = (name, points, section = [.15, .11], mat = equipmentFrame, parent = group) => {
      const assembly = new THREE.Group();
      points.slice(0, -1).forEach((point, pointIndex) => beam('', point, points[pointIndex + 1], section, mat, assembly));
      parent.add(assembly);
      if (name) parts[name] = assembly;
      return assembly;
    };
    const curvedTube = (name, points, radius = .055, mat = equipmentFrame, parent = group) => {
      const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, 'centripetal');
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(16, points.length * 8), radius, 12, false), mat);
      mesh.castShadow = true;
      parent.add(mesh);
      if (name) parts[name] = mesh;
      return mesh;
    };
    const pivotBlock = (name, pos, parent = group) => {
      const housing = box(name, [.34, .38, .24], pos, equipmentSteel, .045, parent);
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .42, 20), equipmentPad);
      axle.rotation.x = Math.PI / 2;
      axle.position.copy(housing.position);
      parent.add(axle);
      return housing;
    };
    const dynamicRod = (name, radius = .018, mat = equipmentCable, parent = group) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 10), mat);
      mesh.castShadow = true; parent.add(mesh); parts[name] = mesh; return mesh;
    };
    const pulley = (name, pos, radius = .2, parent = group, axis = 'z') => {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(radius, .035, 12, 40), equipmentFrame);
      wheel.position.set(...pos); if (axis === 'x') wheel.rotation.y = Math.PI / 2; if (axis === 'y') wheel.rotation.x = Math.PI / 2;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .18, 20), equipmentSteel);
      hub.rotation.x = Math.PI / 2; wheel.add(hub); parent.add(wheel); if (name) parts[name] = wheel; return wheel;
    };
    const plate = (name, pos, scale = 1, parent = group, axis = 'x') => {
      const g = new THREE.Group(); g.position.set(...pos);
      const outline = new THREE.Shape();
      const radius = .34 * scale;
      if (sceneKey === 'barbell-bench') {
        for (let i = 0; i <= 12; i += 1) {
          const angle = i / 12 * Math.PI * 2;
          const x = radius * Math.cos(angle), y = radius * Math.sin(angle);
          if (i) outline.lineTo(x, y); else outline.moveTo(x, y);
        }
      } else outline.absarc(0, 0, radius, 0, Math.PI * 2, false);
      const bore = new THREE.Path(); bore.absarc(0, 0, .054, 0, Math.PI * 2, true); outline.holes.push(bore);
      for (let i = 0; i < 3; i += 1) {
        const angle = i / 3 * Math.PI * 2;
        const cutout = new THREE.Path();
        cutout.absellipse(Math.cos(angle) * radius * .66, Math.sin(angle) * radius * .66, radius * .13, radius * .23, 0, Math.PI * 2, true, angle);
        outline.holes.push(cutout);
      }
      const geometry = new THREE.ExtrudeGeometry(outline, { depth: .1, bevelEnabled: true, bevelSize: .008, bevelThickness: .005, bevelSegments: 2, curveSegments: 24 });
      geometry.translate(0, 0, -.05);
      const p = new THREE.Mesh(geometry, equipmentPad);
      const hub = new THREE.Mesh(new THREE.TorusGeometry(.063, .009, 8, 24), equipmentSteel);
      if (axis === 'x') { p.rotation.y = Math.PI / 2; hub.rotation.y = Math.PI / 2; }
      g.add(p, hub);
      parent.add(g); if (name) parts[name] = g; return g;
    };
    const plateHorn = (name, pos, side = 1, parent = group, plateCount = 2, plateScale = .74) => {
      const g = new THREE.Group(); g.position.set(...pos);
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(.052, .052, .92, 18), equipmentSteel); horn.rotation.x = Math.PI / 2; horn.position.z = side * .25; g.add(horn);
      Array.from({ length: plateCount }).forEach((_, i) => plate('', [0, 0, side * (.2 + i * .1)], plateScale * (1 - i * .1), g, 'z'));
      parent.add(g); if (name) parts[name] = g; return g;
    };
    const handle = (name, pos, length = .55, parent = moving) => {
      const h = new THREE.Mesh(new THREE.CapsuleGeometry(.055, length, 8, 18), equipmentPad); h.rotation.z = Math.PI / 2; h.position.set(...pos); parent.add(h); parts[name] = h; return h;
    };
    const strapHandle = (name, pos, parent = moving) => {
      const g = new THREE.Group();
      g.position.set(...pos);
      parent.add(g);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.07, .018, 10, 24), equipmentSteel);
      ring.position.y = .22;
      g.add(ring);
      tube('', [0, .16, 0], [-.16, -.08, 0], .018, equipmentPad, g);
      tube('', [0, .16, 0], [.16, -.08, 0], .018, equipmentPad, g);
      tube('', [-.16, -.08, 0], [.16, -.08, 0], .045, equipmentPad, g);
      parts[name] = g;
      return g;
    };
    const pad = (name, size, pos, rotationZ = 0, parent = group) => {
      const p = box(name, size, pos, equipmentPad, .1, parent); p.rotation.z = rotationZ; return p;
    };
    const contouredPad = (name, size, pos, rotationZ = 0, parent = group) => {
      const [depth, height, width] = size;
      const outline = new THREE.Shape();
      outline.moveTo(-width * .35, -height / 2);
      outline.bezierCurveTo(-width * .64, -height / 2, -width * .5, -height * .15, -width * .4, height * .04);
      outline.bezierCurveTo(-width * .34, height * .22, -width * .56, height * .44, -width * .32, height / 2);
      outline.quadraticCurveTo(0, height * .56, width * .32, height / 2);
      outline.bezierCurveTo(width * .56, height * .44, width * .34, height * .22, width * .4, height * .04);
      outline.bezierCurveTo(width * .5, -height * .15, width * .64, -height / 2, width * .35, -height / 2);
      outline.closePath();
      const geometry = new THREE.ExtrudeGeometry(outline, { depth, bevelEnabled: true, bevelSegments: 4, bevelSize: .035, bevelThickness: .025, curveSegments: 16 });
      geometry.translate(0, 0, -depth / 2);
      geometry.rotateY(Math.PI / 2);
      const cushion = new THREE.Mesh(geometry, equipmentPad);
      cushion.position.set(...pos); cushion.rotation.z = rotationZ;
      cushion.castShadow = true; parent.add(cushion); parts[name] = cushion;
      return cushion;
    };
    const rollerPad = (name, pos, length = .82, radius = .18, parent = group, axis = 'z') => {
      const roll = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(.08, length - radius * 2), 8, 20), equipmentPad);
      if (axis === 'z') roll.rotation.x = Math.PI / 2;
      if (axis === 'x') roll.rotation.z = Math.PI / 2;
      roll.position.set(...pos);
      roll.castShadow = true;
      parent.add(roll);
      if (name) parts[name] = roll;
      return roll;
    };
    const selectorTower = (name, pos, height = 3.2, parent = group) => {
      const tower = new THREE.Group(); tower.position.set(...pos); parent.add(tower);
      box('', [.16, height, .16], [-.42, 0, -.32], equipmentFrame, .035, tower);
      box('', [.16, height, .16], [.42, 0, -.32], equipmentFrame, .035, tower);
      box('', [.16, height, .16], [-.42, 0, .32], equipmentFrame, .035, tower);
      box('', [.16, height, .16], [.42, 0, .32], equipmentFrame, .035, tower);
      box('', [1.02, .14, .82], [0, -height / 2, 0], equipmentFrame, .04, tower);
      box('', [1.02, .14, .82], [0, height / 2, 0], equipmentFrame, .04, tower);
      box('', [.08, height - .45, .08], [-.18, 0, 0], equipmentSteel, .025, tower);
      box('', [.08, height - .45, .08], [.18, 0, 0], equipmentSteel, .025, tower);
      box('', [.08, height - .32, .72], [-.5, 0, 0], equipmentPad, .025, tower);
      box('', [.08, height - .32, .72], [.5, 0, 0], equipmentPad, .025, tower);
      const lift = new THREE.Group(); tower.add(lift);
      for (let i = 0; i < 12; i += 1) {
        const target = i >= 8 ? lift : tower;
        box('', [.72, .06, .54], [0, -height / 2 + .35 + i * .082, 0], i % 2 ? equipmentSteel : equipmentPad, .018, target);
      }
      const selector = box('', [.08, .08, .22], [0, -height / 2 + 1.05, .34], equipmentAccent, .02, lift);
      const topPulley = pulley('', [0, height / 2 + .13, 0], .19, tower);
      parts[name] = tower;
      parts[`${name}Lift`] = lift;
      return { tower, lift, topPulley, top: new THREE.Vector3(pos[0], pos[1] + height / 2 + .13, pos[2]) };
    };
    const axiomTower = (pos, height = 2.7, rotationY = 0) => {
      const tower = new THREE.Group();
      tower.position.set(...pos);
      tower.rotation.y = rotationY;
      group.add(tower);
      box('towerBackCover', [1.06, height - .16, .16], [0, 0, -.16], equipmentPad, .07, tower);
      [-.53, .53].forEach((x) => box('', [.16, height, .44], [x, 0, 0], equipmentAxiomSilver, .07, tower));
      box('towerCrown', [1.2, .15, .46], [0, height / 2, 0], equipmentPad, .065, tower);
      box('towerFoot', [1.2, .1, .48], [0, -height / 2, 0], equipmentAxiomSilver, .04, tower);
      box('towerPlacard', [.98, .4, .055], [0, height / 2 - .27, .245], equipmentPad, .025, tower);
      [-.14, .14].forEach((x) => tube('', [x, -height / 2 + .18, .08], [x, height / 2 - .5, .08], .025, equipmentSteel, tower));
      const lift = new THREE.Group();
      tower.add(lift);
      for (let i = 0; i < 12; i += 1) box('', [.77, .045, .25], [0, -height / 2 + .2 + i * .052, .06], equipmentPad, .012, i >= 8 ? lift : tower);
      box('towerFrontCoverL', [.38, height - .68, .045], [-.29, .02, .23], equipmentPad, .018, tower);
      box('towerFrontCoverR', [.38, height - .68, .045], [.29, .02, .23], equipmentPad, .018, tower);
      box('weightPin', [.075, .075, .15], [.03, -height / 2 + .68, .25], equipmentAccent, .02, lift);
      const top = new THREE.Vector3(0, height / 2 - .46, .08).applyQuaternion(tower.quaternion).add(tower.position);
      pulley('', [0, height / 2 - .46, .08], .13, tower);
      return { tower, lift, top };
    };
    const baseFrame = (length = 3.8, width = 1.7, y = -1.72) => {
      box('', [length, .16, .16], [0, y, width / 2], equipmentFrame, .035);
      box('', [length, .16, .16], [0, y, -width / 2], equipmentFrame, .035);
      box('', [.16, .16, width], [-length / 2, y, 0], equipmentFrame, .035);
      box('', [.16, .16, width], [length / 2, y, 0], equipmentFrame, .035);
    };
    const forceArrow = (name, direction, length = 1.25, parent = moving) => {
      const a = arrow(new THREE.Vector3(...direction), length, blue, .032); parent.add(a); parts[name] = a; return a;
    };
    const dumbbell = (name, pos, parent = moving) => {
      const g = new THREE.Group(); g.position.set(...pos);
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .72, 16), equipmentSteel); bar.rotation.x = Math.PI / 2; g.add(bar);
      [-.42, .42].forEach((z) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .18, 28), equipmentPad); p.rotation.x = Math.PI / 2; p.position.z = z; g.add(p); });
      parent.add(g); parts[name] = g; return g;
    };
    const tearDropCam = (name, pos, scale = 1, parent = group, material = equipmentAccent) => {
      const shape = new THREE.Shape();
      for (let i = 0; i <= 72; i += 1) { const a = i / 72 * Math.PI * 2; const r = (.34 + .13 * Math.sin(a)) * scale; const x = Math.cos(a) * r; const y = Math.sin(a) * r; if (i) shape.lineTo(x, y); else shape.moveTo(x, y); }
      const geo = new THREE.ExtrudeGeometry(shape, { depth: .16, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 2 }); geo.center();
      const cam = new THREE.Mesh(geo, material); cam.position.set(...pos); parent.add(cam); parts[name] = cam; return cam;
    };
    const hitProxy = (name, size, pos, control = '', parent = moving) => {
      const hit = new THREE.Mesh(new THREE.BoxGeometry(...size), hitMaterial); hit.position.set(...pos); hit.userData = { dragScene: sceneKey, dragControl: control, dragProxy: true }; parent.add(hit); draggableHandles.push(hit); parts[name] = hit; return hit;
    };

    const isPecDeck = sceneKey === 'pec';
    const isInsigniaFly = sceneKey === 'machine-fly';
    const isPulldownRow = sceneKey === 'cable-pulldown';
    const isPlatePress = ['incline-press', 'machine-military-press'].includes(sceneKey);
    const isFreeBar = ['barbell-bench', 'bent-row', 'barbell-squat'].includes(sceneKey);
    let towerInfo = null;

    if (sceneKey === 'arm' || sceneKey === 'cable-fly') {
      // OP-DAP has one central dual-stack shroud, not a stack at each outer rail.
      box('centralShroud', [1.22, 3.02, .5], [0, -.04, -.48], equipmentPad, .12);
      box('shroudCrown', [1.34, .18, .58], [0, 1.5, -.48], equipmentHammerGraphite, .07);
      box('shroudFoot', [1.27, .15, .62], [0, -1.58, -.48], equipmentHammerGraphite, .06);
      [-.42, .42].forEach((x, i) => {
        box('', [.12, 2.32, .025], [x, -.12, -.205], equipmentFrame, .015);
        box('', [.055, 2.1, .03], [x, -.16, -.183], equipmentSteel, .01);
        const liftGroup = new THREE.Group(); group.add(liftGroup);
        for (let p = 0; p < 5; p += 1) box('', [.28, .048, .21], [x, -1.3 + p * .063, -.25], equipmentSteel, .012, liftGroup);
        parts[i ? 'rightStackLift' : 'leftStackLift'] = liftGroup;
      });
      [-1, 1].forEach((side) => {
        const x = side * 1.08;
        tube('', [x, -1.62, .5], [x, 1.56, .5], .055, equipmentSteel);
        box('', [.1, 3.14, .1], [x, -.03, .27], equipmentFrame, .03);
        bentBeam('', [[side * .55, -1.5, -.67], [x, -1.6, .5], [x, -1.6, 1.2]], [.13, .1]);
        beam('', [side * .58, 1.45, -.4], [x, 1.53, .5], [.13, .1]);
        bentBeam('', [[side * .5, 1.28, -.35], [side * .94, 1.65, .5], [x, 1.53, .5]], [.095, .075]);
        for (let i = 0; i < 12; i += 1) box('', [.08, .018, .025], [x - side * .09, -1.19 + i * .21, .59], equipmentPad, .006);
        pulley('', [x, 1.24, .59], .13, group, 'x');
      });
      tube('pullupBar', [-1.08, 1.65, .5], [1.08, 1.65, .5], .047, equipmentPad);
      curvedTube('pullupLeft', [[-.8, 1.65, .5], [-.42, 1.84, .5], [-.12, 1.66, .5]], .04, equipmentPad);
      curvedTube('pullupRight', [[.8, 1.65, .5], [.42, 1.84, .5], [.12, 1.66, .5]], .04, equipmentPad);
      parts.carriage = box('carriage', [.22, .32, .3], [-1.08, -.62, .54], equipmentFrame, .045);
      parts.carriagePulley = pulley('carriagePulley', [-1.08, -.62, .87], .14, group, 'x');
      parts.rightCarriage = box('rightCarriage', [.22, .32, .3], [1.08, -.62, .54], equipmentFrame, .045);
      parts.rightPulley = pulley('rightPulley', [1.08, -.62, .87], .14, group, 'x');
      box('leftPin', [.08, .08, .11], [.13, 0, .15], equipmentAccent, .02, parts.carriage);
      box('rightPin', [.08, .08, .11], [-.13, 0, .15], equipmentAccent, .02, parts.rightCarriage);
      strapHandle('handle', [-1.08, -1.15, 1.07]);
      strapHandle('rightHandle', [1.08, -1.15, 1.07]);
      parts.cable = dynamicRod('cable');
      parts.rightCable = dynamicRod('rightCable');
      forceArrow('force', [1, 1, 0], 1.15);
      if (sceneKey === 'arm') {
        hitProxy('leftPulleyHit', [.34, .42, .35], [-1.08, -.62, .87], 'pulley-left', group);
        hitProxy('rightPulleyHit', [.34, .42, .35], [1.08, -.62, .87], 'pulley-right', group);
        hitProxy('actionHit', [.4, .42, .36], [-1.08, -1.15, 1.07]);
        hitProxy('rightActionHit', [.4, .42, .36], [1.08, -1.15, 1.07], 'right');
        parts.actionHit.userData.dragTarget = parts.handle;
        parts.rightActionHit.userData.dragTarget = parts.rightHandle;
      } else {
        parts.handleL = parts.handle;
        parts.handleR = parts.rightHandle;
        parts.pulleyL = parts.carriagePulley;
        parts.pulleyR = parts.rightPulley;
        parts.cableL = parts.cable;
        parts.cableR = parts.rightCable;
        parts.leftLift = parts.leftStackLift;
        parts.rightLift = parts.rightStackLift;
        hitProxy('actionHit', [2.5, .65, .55], [0, .08, 1.1], 'pair');
      }
    } else if (sceneKey === 'cam') {
      // OP-LE uses two open floor runners and a compact inclined seat support.
      towerInfo = axiomTower([-.55, -.22, -.95]);
      [-.67, .67].forEach((z) => {
        beam('', [-.94, -1.58, z], [1.38, -1.58, z], [.14, .11]);
        beam('', [-.62, -1.55, z], [.13, -.98, z], [.13, .1]);
      });
      beam('frontCrossFoot', [1.38, -1.58, -.67], [1.38, -1.58, .67], [.14, .11]);
      pad('seat', [1.06, .18, .94], [.13, -.88, 0], .24);
      pad('backPad', [.2, 1.5, .86], [-.57, -.01, 0], .32);
      beam('backAdjustRail', [-.53, -.79, 0], [-.98, .71, 0], [.12, .1], equipmentSteel);
      beam('towerBackBrace', [-.55, .32, -.74], [-.55, .22, -.45], [.1, .075], equipmentSteel);
      beam('frontSupport', [1.08, -1.55, 0], [.82, -.66, 0], [.16, .12]);
      [-1, 1].forEach((side) => curvedTube(`sideGrip${side}`, [[-.28, -.63, side * .55], [.06, -.65, side * .61], [.45, -.54, side * .61], [.46, -.75, side * .61], [.12, -.84, side * .61]], .045, equipmentPad));
      parts.cam = tearDropCam('cam', [.82, -.65, -.58], .48, group, equipmentSteel);
      parts.guidePulley = pulley('guidePulley', [-.68, -1.31, -.62], .14);
      const armPivot = new THREE.Group(); armPivot.position.set(.82, -.65, 0); group.add(armPivot); parts.armPivot = armPivot;
      bentBeam('workArm', [[0, 0, -.52], [.12, -.37, -.52], [.18, -.76, -.52]], [.15, .11], equipmentFrame, armPivot);
      tube('', [.18, -.76, -.52], [.18, -.76, .52], .065, equipmentFrame, armPivot);
      rollerPad('shinRoll', [.18, -.78, 0], 1.08, .19, armPivot);
      rollerPad('kneeRoll', [.73, -.59, 0], .95, .13);
      parts.cableA = dynamicRod('cableA'); parts.cableB = dynamicRod('cableB');
      forceArrow('force', [1, .15, 0], 1.18, armPivot);
      hitProxy('actionHit', [.48, .48, 1.25], [.18, -.78, 0], '', armPivot);
    } else if (sceneKey === 'incline') {
      // Hammer Strength HSLLP: 45-degree sealed-bearing guides, moving work horns and fixed four-horn storage.
      beam('frontFoot', [-2.3, -1.72, -1.04], [-2.3, -1.72, 1.04], [.18, .14]);
      beam('rearFoot', [1.52, -1.72, -1.3], [1.52, -1.72, 1.3], [.18, .14]);
      beam('floorSpine', [-2.3, -1.72, 0], [1.52, -1.72, 0], [.2, .15]);
      bentBeam('mainSideL', [[-2.3, -1.72, 1.04], [-.15, .44, 1.04], [1.52, 2.12, 1.04]], [.2, .13]);
      bentBeam('mainSideR', [[-2.3, -1.72, -1.04], [-.15, .44, -1.04], [1.52, 2.12, -1.04]], [.2, .13]);
      beam('', [-2.3, -1.72, 1.04], [-2.3, -1.72, -1.04], [.19, .14]);
      beam('', [1.52, 2.12, 1.04], [1.52, 2.12, -1.04], [.19, .14]);
      tube('railL', [-1.78, -1.34, .72], [1.35, 1.79, .72], .062, equipmentSteel);
      tube('railR', [-1.78, -1.34, -.72], [1.35, 1.79, -.72], .062, equipmentSteel);
      tube('shockL', [-1.35, -1.25, .9], [-.42, -.32, .9], .035, equipmentSteel);
      tube('shockR', [-1.35, -1.25, -.9], [-.42, -.32, -.9], .035, equipmentSteel);
      for (let i = 0; i < 5; i += 1) {
        const s = i / 4;
        const x = THREE.MathUtils.lerp(-1.42, .72, s);
        const y = THREE.MathUtils.lerp(-1.08, 1.06, s);
        box('', [.14, .08, .25], [x, y, .94], equipmentAccent, .02);
        box('', [.14, .08, .25], [x, y, -.94], equipmentAccent, .02);
      }
      pad('backPad', [1.72, .34, 1.38], [-1.45, -.57, 0], -Math.PI / 4);
      pad('headPad', [.68, .32, 1.34], [-2.28, .26, 0], -Math.PI / 4);
      pad('seat', [.94, .25, 1.28], [-.23, -1.35, 0], .05);
      beam('seatLink', [-1.93, -1.62, 0], [-.65, -1.35, 0], [.16, .14]);
      beam('backSupport', [-1.93, -1.62, 0], [-2.28, .08, 0], [.14, .11]);
      handle('rackHandleL', [-1.28, -.68, .84], .34, group);
      handle('rackHandleR', [-1.28, -.68, -.84], .34, group);
      box('rangeStopL', [.22, .18, .28], [-.52, -.22, .91], equipmentAccent, .03);
      box('rangeStopR', [.22, .18, .28], [-.52, -.22, -.91], equipmentAccent, .03);
      box('carriage', [1.08, .34, 1.82], [0, 0, 0], equipmentFrame, .07, moving); moving.rotation.z = Math.PI / 4;
      parts.footPlate = box('footPlate', [.2, 2.14, 2.22], [.58, .34, 0], equipmentPad, .05, moving);
      [-.72, -.48, -.24, 0, .24, .48, .72].forEach((z) => tube('', [.69, -.6, z], [.69, 1.16, z], .012, equipmentSteel, moving));
      beam('', [-.5, -.2, .72], [.38, .18, .72], [.15, .12], equipmentFrame, moving);
      beam('', [-.5, -.2, -.72], [.38, .18, -.72], [.15, .12], equipmentFrame, moving);
      plateHorn('hornWorkL', [-.34, .12, .86], 1, moving, 2, .78);
      plateHorn('hornWorkR', [-.34, .12, -.86], -1, moving, 2, .78);
      beam('', [1.52, -1.72, .96], [1.52, 1.1, .96], [.18, .14]);
      beam('', [1.52, -1.72, -.96], [1.52, 1.1, -.96], [.18, .14]);
      [-.92, .34].forEach((y) => {
        plateHorn('', [1.52, y, .96], 1, group, 1, .67);
        plateHorn('', [1.52, y, -.96], -1, group, 1, .67);
      });
      forceArrow('force', [-1, -1, 0], 1.35, moving);
      hitProxy('actionHit', [2.15, 2.3, 2.45], [0, 0, 0], '', moving);
    } else if (isInsigniaFly) {
      // Life Fitness Insignia SS-PEC: compact low tower, reclined seat station and two
      // independent low-mounted cams driving curved fly arms around vertical pivots.
      beam('rearGroundRail', [.7, -1.66, -.7], [1.7, -1.66, -.7], [.16, .12]);
      beam('rearGroundRailR', [.7, -1.66, .7], [1.7, -1.66, .7], [.16, .12]);
      beam('frontGroundRail', [-1.45, -1.66, -.72], [-.48, -1.66, -.72], [.16, .12]);
      beam('frontGroundRailR', [-1.45, -1.66, .72], [-.48, -1.66, .72], [.16, .12]);
      beam('groundSpine', [-1.3, -1.66, 0], [1.5, -1.66, 0], [.17, .13]);
      towerInfo = selectorTower('tower', [1.18, -.16, 0], 2.78);
      box('towerSideL', [1.06, 2.46, .09], [1.18, -.12, .5], equipmentPad, .065);
      box('towerSideR', [1.06, 2.46, .09], [1.18, -.12, -.5], equipmentPad, .065);
      box('towerTopCap', [1.18, .34, 1.08], [1.18, 1.34, 0], equipmentFrame, .13);
      box('towerLowerCap', [1.12, .22, 1.04], [1.18, -1.5, 0], equipmentFrame, .08);
      bentBeam('lowerBridgeL', [[1.05, -1.53, .5], [.42, -1.46, .62], [-.38, -1.3, .62]], [.16, .11]);
      bentBeam('lowerBridgeR', [[1.05, -1.53, -.5], [.42, -1.46, -.62], [-.38, -1.3, -.62]], [.16, .11]);
      beam('seatSpine', [-.72, -1.57, 0], [-.26, .45, 0], [.18, .14]);
      beam('frontStabilizer', [-1.35, -1.64, -.72], [-1.35, -1.64, .72], [.2, .15]);

      parts.seat = box('seat', [1.14, .23, .9], [-1.01, -.81, 0], insigniaUpholstery, .1);
      parts.seat.rotation.z = -.1;
      parts.backPivot = new THREE.Group();
      parts.backPivot.position.set(-.48, -.52, 0);
      group.add(parts.backPivot);
      contouredPad('backPad', [.24, 1.52, .9], [.12, .72, 0], -.22, parts.backPivot).material = insigniaUpholstery;
      pad('headPad', [.29, .52, .8], [.37, 1.72, 0], -.22, parts.backPivot).material = insigniaUpholstery;
      tube('backPost', [.3, -.22, 0], [.56, 1.7, 0], .065, equipmentSteel, parts.backPivot);
      box('seatAdjust', [.18, .58, .18], [-.98, -1.23, 0], equipmentSteel, .045);
      tube('entryGripL', [-.68, -.46, .64], [-.68, -.08, .64], .045, equipmentPad);
      tube('entryGripR', [-.68, -.46, -.64], [-.68, -.08, -.64], .045, equipmentPad);

      const buildInsigniaArm = (name, side) => {
        const arm = new THREE.Group();
        arm.position.set(-.50, -1.08, side * .34);
        group.add(arm);
        curvedTube('', [[0, 0, 0], [-.3, .01, side * .12], [-.82, .08, side * .4], [-1.03, .3, side * .54], [-1.03, 1.2, side * .54]], .075, equipmentSteel, arm);
        curvedTube('', [[-1.03, 1.2, side * .54], [-1.03, 1.37, side * .54], [-1.12, 1.42, side * .66], [-1.25, 1.42, side * .82], [-1.25, 1.64, side * .82]], .045, equipmentSteel, arm);
        tube(`${name}Grip`, [-1.25, 1.64, side * .82], [-1.25, 2.05, side * .82], .055, equipmentPad, arm);
        const stop = box('', [.18, .16, .22], [-.04, .08, side * .12], equipmentAccent, .04, arm);
        stop.rotation.y = side * .2;
        const force = arrow(new THREE.Vector3(0, 0, -side), .58, blue, .026);
        force.position.set(-1.25, 1.83, side * .82);
        arm.add(force);
        parts[`${name}Force`] = force;
        parts[name] = arm;
        return arm;
      };
      parts.leftArm = buildInsigniaArm('leftArm', 1);
      parts.rightArm = buildInsigniaArm('rightArm', -1);
      pivotBlock('pivotL', [-.50, -1.08, .34]);
      pivotBlock('pivotR', [-.50, -1.08, -.34]);
      parts.camL = tearDropCam('camL', [-.36, -1.04, .56], .62, group, equipmentSteel);
      parts.camR = tearDropCam('camR', [-.36, -1.04, -.56], .62, group, equipmentSteel);
      parts.camL.rotation.x = Math.PI / 2; parts.camR.rotation.x = Math.PI / 2;
      parts.lowGuideL = pulley('lowGuideL', [.62, -1.26, .34], .14, group, 'y');
      parts.lowGuideR = pulley('lowGuideR', [.62, -1.26, -.34], .14, group, 'y');
      parts.splitPulley = pulley('splitPulley', [1.15, 1.05, 0], .15, group, 'y');
      parts.cableStack = dynamicRod('cableStack');
      parts.cableL = dynamicRod('cableL');
      parts.cableR = dynamicRod('cableR');
      parts.cableCamL = dynamicRod('cableCamL');
      parts.cableCamR = dynamicRod('cableCamR');
      hitProxy('actionHit', [3.05, 2.45, 2.25], [-.45, -.04, 0], '', group);
    } else if (isPecDeck) {
      // OP-FLY has a tall rear stack and two overhead, independently cammed work arms.
      beam('towerFootL', [.82, -1.66, .62], [1.98, -1.66, .62], [.17, .12]);
      beam('towerFootR', [.82, -1.66, -.62], [1.98, -1.66, -.62], [.17, .12]);
      towerInfo = axiomTower([.86, .06, -.65], 3.5);
      pad('seat', [1.07, .24, 1.02], [-.8, -.90, 0]);
      pad('backPad', [.22, 1.35, .74], [-.11, -.10, 0], -.08);
      beam('seatPost', [-.8, -1.62, 0], [-.8, -.85, 0], [.16, .12]);
      beam('backPost', [-.05, -1.55, 0], [-.05, .42, 0], [.15, .12]);
      bentBeam('lowerLinkL', [[1.3, -1.66, .44], [.08, -1.55, .44], [-.8, -1.55, .44]], [.15, .11]);
      bentBeam('lowerLinkR', [[1.3, -1.66, -.44], [.08, -1.55, -.44], [-.8, -1.55, -.44]], [.15, .11]);
      tube('frontStabilizer', [-.88, -1.66, -.76], [-.88, -1.66, .76], .075);
      bentBeam('overheadLinkL', [[1.12, 1.52, .43], [.42, 1.97, .43], [-.35, 1.97, .37]], [.14, .1]);
      bentBeam('overheadLinkR', [[1.12, 1.52, -.43], [.42, 1.97, -.43], [-.35, 1.97, -.37]], [.14, .1]);
      parts.leftArm = new THREE.Group(); parts.rightArm = new THREE.Group();
      parts.leftArm.position.set(-.35, 1.97, .37); parts.rightArm.position.set(-.35, 1.97, -.37); group.add(parts.leftArm, parts.rightArm);
      [-1, 1].forEach((side) => {
        const arm = side > 0 ? parts.leftArm : parts.rightArm;
        beam('', [0, 0, 0], [-1.02, .02, side * .08], [.12, .09], equipmentFrame, arm);
        const drop = new THREE.Group(); drop.position.set(-1.02, .02, side * .08); arm.add(drop);
        parts[side > 0 ? 'dropL' : 'dropR'] = drop;
        tube('', [0, 0, 0], [0, -1.13, 0], .046, equipmentSteel, drop);
        curvedTube('', [[0, -1.13, 0], [-.12, -1.13, 0], [-.19, -1.2, 0], [-.19, -1.45, 0]], .041, equipmentSteel, drop);
        tube(side > 0 ? 'gripL' : 'gripR', [-.19, -1.45, 0], [-.19, -1.22, 0], .052, equipmentPad, drop);
        tube('', [-.04, -1.17, 0], [-.04, -1.17, side * .25], .046, equipmentPad, drop);
      });
      pivotBlock('pivotL', [-.35, 1.97, .37]); pivotBlock('pivotR', [-.35, 1.97, -.37]);
      parts.camL = tearDropCam('camL', [-.35, 2.03, .37], .66, group, equipmentSteel);
      parts.camR = tearDropCam('camR', [-.35, 2.03, -.37], .66, group, equipmentSteel);
      parts.camL.rotation.x = Math.PI / 2; parts.camR.rotation.x = Math.PI / 2;
      parts.cableA = dynamicRod('cableA'); parts.cableB = dynamicRod('cableB');
      parts.cableC = dynamicRod('cableC'); parts.cableD = dynamicRod('cableD');
      forceArrow('force', [1, 0, 0], 1.15);
      hitProxy('actionHit', [1.15, .9, 2.0], [-1.48, -.9, 0]);
    } else if (sceneKey === 'lat') {
      // OP-PD assembly 1013943: side tower, side main frame and front-mounted thigh rollers.
      beam('mainFloorRail', [-1.42, -1.62, .86], [1.32, -1.62, .86], [.15, .11]);
      beam('towerFoot', [-1.42, -1.62, -1.38], [.34, -1.62, -1.38], [.15, .11]);
      bentBeam('bottomCrossBrace', [[.95, -1.62, .86], [.86, -1.62, .15], [.18, -1.62, -1.38]], [.15, .11]);
      beam('seatFoot', [-.84, -1.62, -.5], [-.84, -1.62, .86], [.15, .11]);
      towerInfo = axiomTower([-.55, -.22, -1.38]);
      pad('seat', [1.04, .18, .84], [-.68, -.72, 0], -.04);
      beam('seatPost', [-.84, -1.62, 0], [-.68, -.86, 0], [.14, .1]);
      beam('seatMount', [-1.08, -1.15, 0], [-.29, -1.15, 0], [.12, .1]);
      bentBeam('mainPost', [[1.25, -1.62, .86], [1.1, -.42, .86], [1.08, .58, .86]], [.18, .14], equipmentFrame);
      bentBeam('towerLink', [[.02, .24, -1.22], [.7, .24, -1.22], [1.08, .24, -.72], [1.08, .24, .86]], [.14, .1], equipmentFrame);
      curvedTube('thighSupport', [[1.16, -.5, .86], [.65, .06, .86], [.15, .06, .86], [-.15, -.14, .86]], .07, equipmentFrame);
      tube('thighPadAxle', [-.15, -.14, -.57], [-.15, -.14, .86], .045, equipmentSteel);
      rollerPad('thighPadL', [-.15, -.14, .29], .51, .16);
      rollerPad('thighPadR', [-.15, -.14, -.29], .51, .16);
      parts.latYoke = new THREE.Group(); parts.latYoke.position.set(1.08, .58, 0); group.add(parts.latYoke);
      bentBeam('latArmL', [[0, 0, .59], [-.4, .5, .7], [-1.5, 1.48, .91]], [.15, .105], equipmentFrame, parts.latYoke);
      bentBeam('latArmR', [[0, 0, -.59], [-.4, .5, -.7], [-1.5, 1.48, -.91]], [.15, .105], equipmentFrame, parts.latYoke);
      beam('yokeBridge', [-.18, .16, -.62], [-.18, .16, .62], [.12, .09], equipmentFrame, parts.latYoke);
      tube('gripL', [-1.5, 1.48, .91], [-1.24, 1.48, .61], .052, equipmentPad, parts.latYoke);
      tube('gripR', [-1.5, 1.48, -.91], [-1.24, 1.48, -.61], .052, equipmentPad, parts.latYoke);
      pivotBlock('latPivotL', [1.08, .58, .59]); pivotBlock('latPivotR', [1.08, .58, -.59]);
      tube('latPivotAxle', [1.08, .58, -.78], [1.08, .58, .98], .07, equipmentSteel);
      parts.driveCam = tearDropCam('driveCam', [1.08, .58, .98], .42, group, equipmentSteel);
      parts.stackExit = pulley('stackExit', [-.55, -1.49, -1.14], .13, group, 'x');
      parts.baseTurn = pulley('baseTurn', [1.08, -1.49, -1.14], .13, group, 'y');
      parts.lowGuide = pulley('lowGuide', [1.08, -1.49, .98], .14);
      parts.cableA = dynamicRod('cableA'); parts.cableB = dynamicRod('cableB'); parts.cableC = dynamicRod('cableC');
      forceArrow('force', [0, -1, 0], 1.15, parts.latYoke);
      parts.force.position.set(-1.74, 1.8, 0);
      hitProxy('actionHit', [.55, .45, 1.95], [-1.37, 1.48, 0], '', parts.latYoke);
    } else if (isPulldownRow) {
      // Life Fitness Axiom OP-LR: 200 x 89 x 216 cm tower with a lat bar, low-row pulley,
      // neutral row handle, angled thigh pads and fixed foot pegs sharing one 101.25 kg stack.
      towerInfo = axiomTower([-1.2, .3, -.55], 3.9);
      beam('groundRunner', [-1.76, -1.66, 0], [1.26, -1.66, 0], [.18, .14]);
      beam('rearBrace', [-1.35, -.85, -.6], [-2.05, -1.66, -.6], [.14, .1]);
      bentBeam('topBoomL', [[-1.2, 1.66, -.12], [-.75, 2.02, -.12], [.25, 2.6, -.12]], [.16, .1]);
      bentBeam('topBoomR', [[-1.2, 1.66, .12], [-.75, 2.02, .12], [.25, 2.6, .12]], [.16, .1]);
      parts.stackFixedPulley = pulley('stackFixedPulley', [-1.2, 2.1, 0], .14);
      parts.stackFloatingPulley = pulley('stackFloatingPulley', [-.96, .95, 0], .13);
      parts.topPulleyA = pulley('topPulleyA', [-.75, 2.02, 0], .14);
      parts.topPulleyB = pulley('topPulleyB', [.25, 2.47, 0], .14);

      pad('seat', [1.68, .18, .92], [.32, -1.02, 0]);
      beam('seatSupport', [.88, -1.65, 0], [.7, -1.1, 0], [.14, .1]);
      beam('thighPadPost', [-.78, -1.6, 0], [-.52, -.4, 0], [.12, .09]);
      const thighAngle = THREE.MathUtils.degToRad(16);
      const thighL = rollerPad('thighPadL', [-.52, -.43, .28], .58, .15);
      const thighR = rollerPad('thighPadR', [-.52, -.43, -.28], .58, .15);
      thighL.rotation.y = -thighAngle; thighR.rotation.y = thighAngle;

      parts.lowStackGuide = pulley('lowStackGuide', [-1.06, -1.23, 0], .13);
      parts.lowPulley = pulley('lowPulley', [-.92, -.18, 0], .14);
      tube('rowFootPegL', [-.8, -1.0, .31], [-.8, -1.0, .68], .046, equipmentPad);
      tube('rowFootPegR', [-.8, -1.0, -.31], [-.8, -1.0, -.68], .046, equipmentPad);

      parts.rowHandle = new THREE.Group();
      parts.rowHandle.position.set(-.63, -.2, 0); group.add(parts.rowHandle);
      tube('', [0, 0, 0], [.28, .02, .22], .042, equipmentSteel, parts.rowHandle);
      tube('', [0, 0, 0], [.28, .02, -.22], .042, equipmentSteel, parts.rowHandle);
      tube('rowGripL', [.28, -.15, .22], [.28, .17, .22], .052, equipmentPad, parts.rowHandle);
      tube('rowGripR', [.28, -.15, -.22], [.28, .17, -.22], .052, equipmentPad, parts.rowHandle);

      parts.barAssembly = new THREE.Group();
      parts.barAssembly.position.set(.25, 1.9, 0); moving.add(parts.barAssembly);
      tube('bar', [0, 0, -1.21], [0, 0, 1.21], .055, equipmentSteel, parts.barAssembly);
      tube('barEndL', [0, 0, -1.21], [0, -.23, -1.52], .045, equipmentPad, parts.barAssembly);
      tube('barEndR', [0, 0, 1.21], [0, -.23, 1.52], .045, equipmentPad, parts.barAssembly);
      const barEye = new THREE.Mesh(new THREE.TorusGeometry(.1, .025, 10, 28), equipmentSteel);
      barEye.position.set(0, .12, 0); parts.barAssembly.add(barEye);

      parts.cableA = dynamicRod('cableA'); parts.cableB = dynamicRod('cableB');
      parts.cableC = dynamicRod('cableC'); parts.cableD = dynamicRod('cableD');
      parts.cableE = dynamicRod('cableE'); parts.cableF = dynamicRod('cableF');
      forceArrow('force', [0, 1, 0], 1.2);
      hitProxy('actionHit', [.5, .4, 3.2], [0, -.1, 0], '', parts.barAssembly);
      hitProxy('rowActionHit', [.6, .5, .75], [.1, 0, 0], 'row', parts.rowHandle);
      parts.rowActionHit.userData.dragTarget = parts.rowHandle;
    } else if (sceneKey === 'barbell-squat') {
      // Hammer Strength HD Athletic NX: 4-post cage, 86/91-inch uprights and flexible safeties.
      [-.86, .86].forEach((z) => beam('', [-1.32, -1.58, z], [1.32, -1.58, z], [.15, .11]));
      beam('rearLower', [1.32, -1.58, -.86], [1.32, -1.58, .86], [.15, .11]);
      [-1.32, 1.32].forEach((x) => {
        [-.86, .86].forEach((z) => {
          box('', [.18, 3.45, .18], [x, -.01, z], equipmentFrame, .03);
          box('', [.25, .08, .24], [x, -1.72, z], equipmentPad, .02);
          for (let i = 0; i < 14; i += 1) box('', [.195, .025, .025], [x - .095, -1.2 + i * .18, z], equipmentSteel, .008);
        });
      });
      beam('topLeft', [-1.32, 1.7, .86], [1.32, 1.7, .86], [.18, .16]);
      beam('topRight', [-1.32, 1.7, -.86], [1.32, 1.7, -.86], [.18, .16]);
      beam('rearTop', [1.32, 1.7, .86], [1.32, 1.7, -.86], [.18, .16]);
      tube('pullupBar', [-1.32, 1.61, .72], [-1.32, 1.61, -.72], .055, equipmentPad);
      box('jCupL', [.4, .14, .24], [1.12, .94, .86], equipmentPad, .03);
      box('jCupR', [.4, .14, .24], [1.12, .94, -.86], equipmentPad, .03);
      curvedTube('safetyL', [[-1.24, -.55, .86], [0, -.8, .86], [1.24, -.55, .86]], .045, equipmentPad);
      curvedTube('safetyR', [[-1.24, -.55, -.86], [0, -.8, -.86], [1.24, -.55, -.86]], .045, equipmentPad);
      [-.62, .18].forEach((y) => {
        plateHorn('', [1.34, y, .9], 1, group, 1, .6);
        plateHorn('', [1.34, y, -.9], -1, group, 1, .6);
      });
      tube('barShaft', [0, 0, -1.72], [0, 0, 1.72], .038, equipmentSteel, moving);
      tube('sleeveL', [0, 0, -1.15], [0, 0, -1.8], .058, equipmentSteel, moving);
      tube('sleeveR', [0, 0, 1.15], [0, 0, 1.8], .058, equipmentSteel, moving);
      plate('plateL', [0, 0, -1.5], .88, moving, 'z'); plate('plateLOuter', [0, 0, -1.62], .76, moving, 'z');
      plate('plateR', [0, 0, 1.5], .88, moving, 'z'); plate('plateROuter', [0, 0, 1.62], .76, moving, 'z');
      parts.bar = moving;
      moving.position.x = 1.04;
      forceArrow('force', [0,-1,0], 1.05, moving); parts.force.position.set(0, .08, 0);
      parts.force.visible = false;
      hitProxy('actionHit',[3.9,1.0,1.35],[0,0,0],'',moving);
    } else if (sceneKey === 'cable-row') {
      // Life Fitness Axiom OP-RW: self-aligning dual grips, angled foot plates and a low-pivot 1:1 cable-driven row yoke.
      [-.61, .61].forEach((z) => beam('', [-1.95, -1.62, z], [1.45, -1.62, z], [.14, .11]));
      beam('frontFoot', [1.45, -1.62, -.61], [1.45, -1.62, .61], [.14, .11]);
      towerInfo = axiomTower([-1.25, -.22, -1.05]);
      pad('seat', [1.38, .24, .94], [-.85, -.96, 0]);
      bentBeam('seatSupport', [[-1.3, -1.62, .48], [-1.12, -1.22, .48], [-.62, -1.18, .48]], [.14, .11]);
      bentBeam('seatSupportR', [[-1.3, -1.62, -.48], [-1.12, -1.22, -.48], [-.62, -1.18, -.48]], [.14, .11]);
      beam('fixedMast', [1.27, -1.6, -.86], [1.27, .76, -.86], [.14, .1]);
      bentBeam('towerBridge', [[-.67, .76, -1.05], [.94, .76, -1.05], [1.27, .76, -.86]], [.12, .09]);
      bentBeam('bottomCrossBrace', [[.74, -1.56, -.61], [.3, -1.56, -.89], [-.67, -1.56, -1.05]], [.14, .1]);
      [-1, 1].forEach((side) => {
        const foot = new THREE.Group();
        foot.position.set(.98, -1.0, side * .43); foot.rotation.z = .42; group.add(foot);
        parts[side > 0 ? 'footL' : 'footR'] = foot;
        box('', [.1, .7, .4], [0, 0, 0], equipmentPad, .035, foot);
        const tread = new THREE.InstancedMesh(new THREE.CylinderGeometry(.018, .018, .006, 10), equipmentHammerGraphite, 40);
        const stamp = new THREE.Object3D(); stamp.rotation.z = Math.PI / 2;
        for (let row = 0; row < 8; row += 1) {
          for (let col = 0; col < 5; col += 1) {
            stamp.position.set(-.054, -.27 + row * .077, -.14 + col * .07); stamp.updateMatrix();
            tread.setMatrixAt(row * 5 + col, stamp.matrix);
          }
        }
        foot.add(tread);
      });
      parts.guidePulley = pulley('guidePulley', [1.27, -.2, -.72], .16);
      parts.lowerGuidePulley = pulley('lowerGuidePulley', [1.27, -1.37, -.72], .16);
      parts.towerLowerPulley = pulley('towerLowerPulley', [-.65, -1.32, -.91], .13);
      parts.rowYoke = new THREE.Group(); parts.rowYoke.position.set(.72, -1.43, 0); group.add(parts.rowYoke);
      bentBeam('rowWorkArm', [[0, 0, 0], [-.16, .32, 0], [.12, 1.02, 0], [.12, 2.06, 0]], [.18, .14], equipmentFrame, parts.rowYoke);
      [-1, 1].forEach((side) => {
        const handlePivot = new THREE.Group();
        handlePivot.position.set(.12, 2.06, side * .16);
        parts.rowYoke.add(handlePivot);
        parts[side > 0 ? 'rowHandlePivotL' : 'rowHandlePivotR'] = handlePivot;
        tube('', [0, 0, -side * .08], [0, 0, side * .13], .055, equipmentSteel, handlePivot);
        curvedTube('', [[0, 0, side * .13], [0, 0, side * .25], [-.03, -.07, side * .34], [-.03, -.25, side * .39], [-.03, -.45, side * .47], [.02, -.53, side * .57], [.05, -.49, side * .64]], .052, equipmentPad, handlePivot);
        tube(side > 0 ? 'neutralGripL' : 'neutralGripR', [-.03, -.18, side * .37], [-.03, -.39, side * .44], .053, equipmentPad, handlePivot);
        tube(side > 0 ? 'underGripL' : 'underGripR', [0, 0, side * .13], [0, 0, side * .3], .053, equipmentPad, handlePivot);
        tube('', [.05, -.49, side * .64], [.06, -.48, side * .7], .053, equipmentSteel, handlePivot);
      });
      pivotBlock('rowPivotL', [.72, -1.43, .18]); pivotBlock('rowPivotR', [.72, -1.43, -.18]);
      tube('rowPivotBarrel', [.72, -1.43, -.31], [.72, -1.43, .31], .14, equipmentSteel);
      parts.rowCableAnchor = new THREE.Object3D();
      parts.rowCableAnchor.position.set(.18, 1.7, -.18); parts.rowYoke.add(parts.rowCableAnchor);
      parts.cableA = dynamicRod('cableA'); parts.cableB = dynamicRod('cableB'); parts.cableC = dynamicRod('cableC');
      forceArrow('force', [-1, 0, 0], .8, parts.rowYoke); parts.force.position.set(.03, 1.9, 0);
      hitProxy('actionHit', [.65, .75, 1.95], [.03, 1.9, 0], '', parts.rowYoke);
    } else if (sceneKey === 'barbell-bench') {
      // Hammer Strength O-FB: fixed 130 x 132 x 130 cm Olympic bench with flared uprights.
      pad('bench', [2.45, .2, .72], [.28, -.89, 0]);
      beam('benchSpine', [-1.05, -1.5, 0], [1.6, -1.5, 0], [.17, .13]);
      beam('frontLeg', [1.35, -1.62, -.48], [1.35, -1.62, .48], [.18, .14]);
      beam('rearCrossFoot', [-1.35, -1.62, -.95], [-1.35, -1.62, .95], [.18, .14]);
      beam('benchFrontPost', [1.35, -1.62, 0], [1.35, -.98, 0], [.16, .13]);
      [-1, 1].forEach((side) => {
        const z = side * .74;
        bentBeam(side>0?'benchRackL':'benchRackR', [[-1.35, -1.62, z], [-1.22, -.72, z], [-1.22, .79, z]], [.2, .15]);
        beam('', [-1.22, -.8, z], [-.5, -1.37, side * .48], [.14, .11]);
        box('', [.22, .14, .28], [-1.28, -1.67, z], equipmentPad, .035);
        box('', [.34, .12, .22], [-1.08, .54, z], equipmentPad, .025);
        box('', [.3, .1, .18], [-1.1, .42, z], equipmentSteel, .02);
      });
      tube('barShaft', [0, 0, -1.78], [0, 0, 1.78], .038, equipmentSteel, moving);
      tube('sleeveL', [0, 0, -1.18], [0, 0, -1.88], .06, equipmentSteel, moving);
      tube('sleeveR', [0, 0, 1.18], [0, 0, 1.88], .06, equipmentSteel, moving);
      plate('plateL', [0, 0, -1.52], .92, moving, 'z'); plate('plateLOuter', [0, 0, -1.65], .78, moving, 'z');
      plate('plateR', [0, 0, 1.52], .92, moving, 'z'); plate('plateROuter', [0, 0, 1.65], .78, moving, 'z');
      moving.position.set(-.82, .62, 0);
      parts.bar = moving;
      forceArrow('force',[0,-1,0],.95,moving); parts.force.position.set(0,.08,0);
      hitProxy('actionHit',[4.0,1.0,1.3],[0,0,0],'',moving);
    } else if (sceneKey === 'flat-press') {
      // Life Fitness Axiom OP-CP: 112 x 129 x 135 cm, low common pivot and dual-position grips.
      beam('baseRunnerL', [-1.62, -1.67, .8], [1.72, -1.67, .8], [.17, .12]);
      beam('baseRunnerR', [-1.62, -1.67, -.8], [1.72, -1.67, -.8], [.17, .12]);
      beam('rearFoot', [1.58, -1.67, -.94], [1.58, -1.67, .94], [.17, .12]);
      towerInfo = axiomTower([.7, -.22, -1.04]);

      pad('seat', [.86, .2, .87], [-.36, -.94, 0], -.1);
      contouredPad('backPad', [.23, 1.72, .89], [.2, .03, 0], -.2);
      beam('seatPost', [-.58, -1.62, 0], [-.58, -1.18, 0], [.2, .16]);
      box('seatAdjust', [.2, .42, .24], [-.58, -1.39, 0], equipmentSteel, .035);
      beam('backSupport', [-.38, -1.48, 0], [.17, .68, 0], [.18, .14]);

      [-1, 1].forEach((side) => {
        const z = side * .79;
        beam('', [.74, -1.62, z], [.74, .38, side * .69], [.18, .14]);
        beam('', [.2, -1.34, z], [1.7, -1.34, z], [.15, .12]);
        box('', [.2, .18, .28], [-1.52, -1.67, z], equipmentPad, .04);
      });
      tube('pivotShaft', [-1.0, -1.43, .7], [-1.0, -1.43, -.7], .1, equipmentSteel);
      pivotBlock('pivotL', [-1.0, -1.43, .69]);
      pivotBlock('pivotR', [-1.0, -1.43, -.69]);

      parts.armL = new THREE.Group(); parts.armR = new THREE.Group();
      parts.armL.position.set(-1, -1.43, .69); parts.armR.position.set(-1, -1.43, -.69); group.add(parts.armL, parts.armR);
      [-1, 1].forEach((side) => {
        const arm = side > 0 ? parts.armL : parts.armR;
        curvedTube('', [[0, 0, 0], [.55, .25, side * .08], [1.05, .72, side * .13], [1.15, 1.4, side * .13], [1.15, 1.83, side * .13]], .075, equipmentPad, arm);
        curvedTube('', [[1.15, 1.83, side * .13], [1.15, 2.02, side * .13], [.93, 2.1, side * .13], [.53, 2.1, side * .08]], .052, equipmentPad, arm);
        tube(side > 0 ? 'pronatedGripL' : 'pronatedGripR', [.53, 2.1, side * .08], [.53, 2.1, -side * .22], .055, equipmentPad, arm);
        tube(side > 0 ? 'neutralGripL' : 'neutralGripR', [.20, 1.67, side * .13], [.20, 1.99, side * .13], .055, equipmentPad, arm);
        tube('', [.53, 2.1, side * .08], [.20, 1.99, side * .13], .045, equipmentSteel, arm);
      });

      parts.driveCam = tearDropCam('driveCam', [-1, -1.43, -.66], .4, group, equipmentSteel);
      parts.lowGuide = pulley('lowGuide', [.96, -1.27, -.62], .15);
      parts.cableA = dynamicRod('cableA'); parts.cableB = dynamicRod('cableB');
      forceArrow('force', [-1, .08, 0], .7, parts.armL); parts.force.position.set(.53, 2.1, .08);
      hitProxy('actionHit', [3.25, 2.55, 2.15], [-.35, -.05, 0], '', group);
    } else if (sceneKey === 'seated-machine-shoulder') {
      // Life Fitness Axiom OP-SP: 154 x 140 x 135 cm, high pivots, counterbalance and dual grips.
      baseFrame(3.85, 2.45);
      towerInfo = axiomTower([.9, -.22, -1.08]);

      pad('seat', [1.08, .24, 1.06], [-.57, -.91, 0]);
      contouredPad('backPad', [.25, 1.78, .94], [.12, -.15, 0], -.28);
      beam('seatPost', [-.58, -1.66, 0], [-.58, -.90, 0], [.2, .16]);
      box('seatAdjust', [.2, .44, .24], [-.58, -1.42, 0], equipmentSteel, .035);
      beam('backSupport', [-.14, -1.48, 0], [.48, .76, 0], [.18, .14]);

      [-1, 1].forEach((side) => {
        const z = side * .86;
        bentBeam('', [[-1.74, -1.66, z], [-.62, -1.61, z], [.74, -1.48, z], [1.08, -.52, z], [1.08, .72, side * .72]], [.18, .14]);
        beam('', [-1.56, -1.48, z], [1.65, -1.48, z], [.15, .12]);
        beam('', [.96, -.52, z], [1.68, -.52, z], [.14, .11]);
        box('', [.2, .18, .28], [-1.74, -1.71, z], equipmentPad, .04);
      });
      tube('pivotShaft', [1.08, .72, .72], [1.08, .72, -.72], .1, equipmentSteel);
      pivotBlock('pivotL', [1.08, .72, .72]);
      pivotBlock('pivotR', [1.08, .72, -.72]);

      parts.armL = new THREE.Group(); parts.armR = new THREE.Group();
      parts.armL.position.set(1.08, .72, .72); parts.armR.position.set(1.08, .72, -.72); group.add(parts.armL, parts.armR);
      bentBeam('', [[0, 0, 0], [-.42, .04, .02], [-1.12, .02, .05], [-2.02, -.12, .12]], [.18, .14], equipmentFrame, parts.armL);
      bentBeam('', [[0, 0, 0], [-.42, .04, -.02], [-1.12, .02, -.05], [-2.02, -.12, -.12]], [.18, .14], equipmentFrame, parts.armR);
      bentBeam('', [[-2.02, -.12, .12], [-2.22, -.08, .12], [-2.24, -.37, .12]], [.075, .065], equipmentFrame, parts.armL);
      bentBeam('', [[-2.02, -.12, -.12], [-2.22, -.08, -.12], [-2.24, -.37, -.12]], [.075, .065], equipmentFrame, parts.armR);
      tube('overhandGripL', [-2.22, -.06, -.1], [-2.22, -.06, .32], .055, equipmentPad, parts.armL);
      tube('overhandGripR', [-2.22, -.06, .1], [-2.22, -.06, -.32], .055, equipmentPad, parts.armR);
      tube('neutralGripL', [-2.24, -.4, .12], [-2.24, -.08, .12], .055, equipmentPad, parts.armL);
      tube('neutralGripR', [-2.24, -.4, -.12], [-2.24, -.08, -.12], .055, equipmentPad, parts.armR);
      plate('counterbalanceL', [.16, .02, .05], .48, parts.armL, 'z');
      plate('counterbalanceR', [.16, .02, -.05], .48, parts.armR, 'z');

      parts.driveCam = tearDropCam('driveCam', [1.06, -1.02, -.66], .72, group, equipmentSteel);
      parts.lowGuide = pulley('lowGuide', [.58, -1.27, -.66], .15);
      parts.upperGuide = pulley('upperGuide', [1.08, .05, -.66], .13);
      parts.cableA = dynamicRod('cableA'); parts.cableB = dynamicRod('cableB'); parts.cableC = dynamicRod('cableC');
      forceArrow('force', [0, 1, 0], .82, parts.armL); parts.force.position.set(-1.78, -.08, .12);
      hitProxy('actionHit', [3.7, 2.55, 2.25], [-.25, .05, 0], '', group);
    } else if (sceneKey === 'incline-press') {
      // Hammer Strength IL-IP: 117 x 140 x 191 cm, six storage horns and two independent converging work arms.
      baseFrame(3.42, 2.42);
      pad('seat', [1.08, .25, 1.04], [-.58, -1.1, 0], -.12);
      pad('backPad', [.32, 2.04, 1.04], [-.22, -.18, 0], -.29);
      beam('seatPost', [-.62, -1.65, 0], [-.52, -1.17, 0], [.18, .15]);
      box('seatAdjust', [.18, .46, .22], [-.47, -1.37, 0], equipmentSteel, .035);

      [-1, 1].forEach((side) => {
        const z = side * .9;
        bentBeam('', [[1.26, -1.67, z], [.98, -.3, z], [1.02, .76, z], [.65, 1.55, side * .76]], [.18, .14]);
        beam('', [-1.55, -1.66, z], [1.3, -1.66, z], [.18, .14]);
        beam('', [.5, .85, side * .76], [.65, 1.55, side * .76], [.16, .1]);
        box('', [.12, .66, .3], [.68, 1.42, side * .76], equipmentHammerGraphite, .015).rotation.z = .28;
      });
      beam('topCrossbar', [.65, 1.55, .82], [.65, 1.55, -.82], [.17, .13]);
      beam('rearCrossbar', [1.1, -.28, .9], [1.1, -.28, -.9], [.16, .12]);

      parts.armL = new THREE.Group(); parts.armR = new THREE.Group();
      parts.armL.position.set(.65, 1.38, .64); parts.armR.position.set(.65, 1.38, -.64); group.add(parts.armL, parts.armR);
      bentBeam('', [[0, 0, 0], [-.5, -.12, .03], [-1.08, -.5, .1], [-1.90, -1.13, .15]], [.17, .13], equipmentFrame, parts.armL);
      bentBeam('', [[0, 0, 0], [-.5, -.12, -.03], [-1.08, -.5, -.1], [-1.90, -1.13, -.15]], [.17, .13], equipmentFrame, parts.armR);
      beam('', [-.12, -.12, .05], [-1.12, -.68, .12], [.1, .08], equipmentSteel, parts.armL);
      beam('', [-.12, -.12, -.05], [-1.12, -.68, -.12], [.1, .08], equipmentSteel, parts.armR);
      tube('handleL', [-1.90, -1.13, .15], [-1.90, -1.13, -.28], .055, equipmentPad, parts.armL);
      tube('handleR', [-1.90, -1.13, -.15], [-1.90, -1.13, .28], .055, equipmentPad, parts.armR);
      plateHorn('hornL', [-.73, -.43, .23], 1, parts.armL, 2, .72);
      plateHorn('hornR', [-.73, -.43, -.23], -1, parts.armR, 2, .72);
      [-.92, -.08, .76].forEach((y) => {
        plateHorn('', [1.14, y, 1.02], 1, group, 1, y > .5 ? .53 : .7);
        plateHorn('', [1.14, y, -1.02], -1, group, 1, y > .5 ? .53 : .7);
      });
      pivotBlock('pivotL', [.65, 1.38, .64]); pivotBlock('pivotR', [.65, 1.38, -.64]);
      forceArrow('force', [-1, 1, 0], 1.2); hitProxy('actionHit', [3.45, 2.75, 2.45], [-.18, .04, 0]);
    } else if (sceneKey === 'hammer-row') {
      // Hammer Strength IL-ROW: no storage horns; arched center frame, angled seat/chest pad and independent work arms.
      beam('frontGroundFoot', [-1.78, -1.68, -1.12], [-1.78, -1.68, 1.12], [.18, .13]);
      beam('rearGroundFoot', [1.52, -1.68, -1.12], [1.52, -1.68, 1.12], [.18, .13]);
      beam('centerGroundSpine', [-1.78, -1.68, 0], [1.52, -1.68, 0], [.17, .12]);
      pad('seat', [1.02, .24, .98], [-1.06, -1.18, 0], .18);
      pad('chestPad', [.36, 1.34, .9], [-.68, -.12, 0], -.18);
      beam('seatPost', [-1.1, -1.65, 0], [-.98, -1.14, 0], [.18, .14]);
      beam('chestPost', [-.98, -1.48, 0], [-.68, -.18, 0], [.18, .14]);
      [-1, 1].forEach((side) => {
        const z = side * .74;
        bentBeam('', [[-1.65, -1.65, z], [-.82, -1.5, z], [.26, -.55, side * .62]], [.18, .13]);
        bentBeam('', [[1.55, -1.65, z], [.95, -1.4, z], [.26, -.55, side * .62]], [.18, .13]);
        beam('', [-.82, -1.5, z], [.95, -1.4, z], [.16, .12]);
      });
      parts.armL = new THREE.Group(); parts.armR = new THREE.Group();
      parts.armL.position.set(.26, -.55, .62); parts.armR.position.set(.26, -.55, -.62); group.add(parts.armL, parts.armR);
      bentBeam('', [[0, 0, 0], [.20, .44, .03], [.18, .58, .12], [-.18, 0.68, .20]], [.18, .13], equipmentPad, parts.armL);
      bentBeam('', [[0, 0, 0], [.20, .44, -.03], [.18, .58, -.12], [-.18, 0.68, -.20]], [.18, .13], equipmentPad, parts.armR);
      [-1, 1].forEach((side) => {
        const arm = side > 0 ? parts.armL : parts.armR;
        curvedTube('', [[-.18, 0.68, side * .20], [-.28, 0.86, side * .28], [.08, 0.83, side * .28], [.18, 0.63, side * .28], [-.18, .58, side * .20], [-.18, 0.68, side * .20]], .05, equipmentPad, arm);
        tube(side > 0 ? 'handleL' : 'handleR', [.08, 0.83, side * .28], [-.28, 0.86, side * .28], .06, equipmentPad, arm);
        tube('', [-.18, .58, side * .20], [.18, 0.63, side * .28], .06, equipmentPad, arm);
      });
      plateHorn('hornL', [.42, -.22, .28], 1, parts.armL, 2, .74); plateHorn('hornR', [.42, -.22, -.28], -1, parts.armR, 2, .74);
      pivotBlock('pivotL', [.26, -.55, .62]); pivotBlock('pivotR', [.26, -.55, -.62]);
      forceArrow('force', [-1, 0, 0], 1.2); hitProxy('actionHit', [3.7, 2.8, 2.25], [-.25, .15, 0]);
    } else if (sceneKey === 'scissor-pulldown') {
      // Hammer Strength IL-WPD: low front seat, arched side frames and long back-up-and-out lever arms.
      baseFrame(4.5, 2.42);
      pad('seat', [1.12, .25, 1.05], [-1.08, -.8, 0]);
      pad('thighL', [.7, .3, .36], [-.92, -.22, .4]); pad('thighR', [.7, .3, .36], [-.92, -.22, -.4]);
      beam('seatPost', [-1.15, -1.66, 0], [-1.05, -.68, 0], [.18, .15]);
      [-1, 1].forEach((side) => {
        const z = side * .92;
        bentBeam('', [[-1.32, -1.67, z], [-1.18, -.15, z], [-.52, .62, z], [.28, .78, side * .76]], [.2, .14]);
        bentBeam('', [[1.28, -1.67, z], [1.02, -.15, z], [.52, .72, side * .76]], [.2, .14]);
        beam('', [-1.16, -.04, z], [1.02, .02, z], [.16, .12]);
      });
      beam('pivotBridge', [.28, .78, .76], [.52, .72, .76], [.2, .14]);
      beam('', [.28, .78, -.76], [.52, .72, -.76], [.2, .14]);
      parts.armL = new THREE.Group(); parts.armR = new THREE.Group();
      parts.armL.position.set(.4, .76, .68); parts.armR.position.set(.4, .76, -.68); group.add(parts.armL, parts.armR);
      bentBeam('', [[0, 0, 0], [-.45, .95, .12], [-.9, 1.72, .28]], [.19, .14], equipmentFrame, parts.armL);
      bentBeam('', [[0, 0, 0], [-.45, .95, -.12], [-.9, 1.72, -.28]], [.19, .14], equipmentFrame, parts.armR);
      tube('handleL', [-.9, 1.72, .28], [-1.03, 1.7, -.13], .055, equipmentPad, parts.armL);
      tube('handleR', [-.9, 1.72, -.28], [-1.03, 1.7, .13], .055, equipmentPad, parts.armR);
      beam('', [0, 0, 0], [.45, -.85, .18], [.18, .13], equipmentPad, parts.armL);
      beam('', [0, 0, 0], [.45, -.85, -.18], [.18, .13], equipmentPad, parts.armR);
      plateHorn('hornL', [.45, -.85, .28], 1, parts.armL, 1, .72); plateHorn('hornR', [.45, -.85, -.28], -1, parts.armR, 1, .72);
      [-.72, .03, .76].forEach((y) => { plateHorn('', [1.18, y, .98], 1, group, 1, y > .5 ? .53 : .7); plateHorn('', [1.18, y, -.98], -1, group, 1, y > .5 ? .53 : .7); });
      pivotBlock('pivotL', [.4, .76, .68]); pivotBlock('pivotR', [.4, .76, -.68]);
      forceArrow('force', [-1, -1, 0], 1.2);
      hitProxy('leftGripHit', [.4, .35, .7], [-.97, 1.72, .08], '', parts.armL);
      hitProxy('rightGripHit', [.4, .35, .7], [-.97, 1.72, -.08], '', parts.armR);
      parts.leftGripHit.userData.dragTarget = parts.handleL;
      parts.rightGripHit.userData.dragTarget = parts.handleR;
    } else if (sceneKey === 'machine-military-press') {
      // Hammer Strength IL-SP: 132 x 152 x 185 cm, 26-degree seat position, eight storage horns and independent overhead arms.
      beam('leftGroundFoot', [-1.5, -1.68, 1.02], [1.48, -1.68, 1.02], [.18, .13]);
      beam('rightGroundFoot', [-1.5, -1.68, -1.02], [1.48, -1.68, -1.02], [.18, .13]);
      beam('seatGroundSpine', [-.28, -1.68, -.72], [-.28, -1.68, .72], [.15, .11]);
      pad('seat', [1.12, .25, 1.08], [-.28, -.98, 0], .12);
      pad('backPad', [.36, 1.82, 1.08], [.06, -.27, 0], -THREE.MathUtils.degToRad(26));
      beam('seatPost', [-.4, -1.65, 0], [-.27, -.84, 0], [.18, .15]);
      box('seatAdjust', [.18, .48, .22], [-.22, -1.37, 0], equipmentSteel, .035);

      [-1, 1].forEach((side) => {
        const z = side * .94;
        bentBeam('', [[1.38, -1.67, z], [1.2, -.45, z], [.88, .56, z], [.58, 1.42, side * .76]], [.2, .14]);
        beam('', [-.52, 1.38, side * .76], [.58, 1.42, side * .76], [.18, .14]);
        beam('', [-.52, 1.38, side * .76], [-.8, 1.72, side * .76], [.14, .1]);
        beam('', [.58, 1.42, side * .76], [.45, 1.75, side * .76], [.14, .1]);
        beam('', [-1.28, -1.5, z], [1.24, -1.5, z], [.16, .12]);
      });
      beam('rearLowerCrossbar', [.98, -.48, .94], [.98, -.48, -.94], [.15, .11]);
      beam('topRailL', [-1.02, 1.49, .76], [1.02, 1.49, .76], [.16, .12]);
      beam('topRailR', [-1.02, 1.49, -.76], [1.02, 1.49, -.76], [.16, .12]);
      beam('topFrontCrossbar', [-1.02, 1.49, -.76], [-1.02, 1.49, .76], [.14, .1]);
      beam('topRearCrossbar', [1.02, 1.49, -.76], [1.02, 1.49, .76], [.14, .1]);

      parts.armL = new THREE.Group(); parts.armR = new THREE.Group();
      parts.armL.position.set(.02, 1.36, .66); parts.armR.position.set(.02, 1.36, -.66); group.add(parts.armL, parts.armR);
      beam('', [0, .08, .02], [-.9, .08, .08], [.18, .13], equipmentFrame, parts.armL);
      beam('', [0, .08, -.02], [-.9, .08, -.08], [.18, .13], equipmentFrame, parts.armR);
      beam('', [0, -.18, .02], [-.82, -.18, .08], [.14, .1], equipmentFrame, parts.armL);
      beam('', [0, -.18, -.02], [-.82, -.18, -.08], [.14, .1], equipmentFrame, parts.armR);
      tube('', [-.9, .08, .08], [-.82, -.18, .08], .055, equipmentSteel, parts.armL);
      tube('', [-.9, .08, -.08], [-.82, -.18, -.08], .055, equipmentSteel, parts.armR);
      bentBeam('', [[-.86, -.06, .08], [-1.17, -.58, .1], [-1.16, -1.03, .1]], [.16, .12], equipmentFrame, parts.armL);
      bentBeam('', [[-.86, -.06, -.08], [-1.17, -.58, -.1], [-1.16, -1.03, -.1]], [.16, .12], equipmentFrame, parts.armR);
      tube('handleL', [-1.16, -1.03, .1], [-1.16, -1.03, -.38], .055, equipmentPad, parts.armL);
      tube('handleR', [-1.16, -1.03, -.1], [-1.16, -1.03, .38], .055, equipmentPad, parts.armR);
      plateHorn('hornL', [-.48, -.6, .28], 1, parts.armL, 2, .74);
      plateHorn('hornR', [-.48, -.6, -.28], -1, parts.armR, 2, .74);
      [-1.08, -.42, .24, .9].forEach((y) => {
        plateHorn('', [1.16, y, 1.04], 1, group, 1, y > .5 ? .53 : .7);
        plateHorn('', [1.16, y, -1.04], -1, group, 1, y > .5 ? .53 : .7);
      });
      pivotBlock('pivotL', [.02, 1.36, .66]); pivotBlock('pivotR', [.02, 1.36, -.66]);
      forceArrow('force', [0, 1, 0], 1.2); hitProxy('actionHit', [3.45, 2.75, 2.5], [-.08, .17, 0]);
    } else if (sceneKey === 'nautilus-pullover') {
      // IPPO3 reference: the stack and pivot supports flank, rather than close, the user space.
      beam('leftFloorRunner', [-2.05, -1.67, .88], [1.82, -1.67, .88], [.18, .13]);
      beam('rightFloorRunner', [-2.05, -1.67, -.88], [1.82, -1.67, -.88], [.18, .13]);
      beam('frontFoot', [1.82, -1.67, -.98], [1.82, -1.67, .98], [.18, .13]);
      towerInfo = selectorTower('tower', [.55, -.14, -1.44], 3.02);
      towerInfo.tower.scale.z = .72;
      towerInfo.topPulley.position.y -= .63;
      towerInfo.top.y -= .63;
      box('towerRearShroud', [1.14, 2.74, .12], [.55, -.1, -1.8], equipmentPad, .12);
      box('towerFrontShroud', [1.08, 2.6, .12], [.55, -.14, -1.1], equipmentPad, .1);
      box('towerTop', [1.22, .36, .84], [.55, 1.3, -1.44], equipmentPad, .16);
      box('stackWindow', [.5, 1.88, .04], [.55, -.02, -1.025], equipmentSteel, .04);
      bentBeam('rightHousingL', [[1.42, -1.6, .96], [1.42, -.15, .96], [.68, .6, .96]], [.22, .15], equipmentPad);
      bentBeam('rightHousingR', [[1.42, -1.6, -1.2], [1.42, -.15, -1.2], [.68, .6, -1.2]], [.22, .15], equipmentPad);
      bentBeam('', [[-2.08, -1.58, .98], [-.52, -1.64, .98], [1.7, -1.48, .98], [1.86, -.82, .98]], [.16, .11]);
      bentBeam('', [[-2.08, -1.58, -.98], [-.52, -1.64, -.98], [1.7, -1.48, -.98], [1.86, -.82, -.98]], [.16, .11]);
      tube('seatPost', [.52, -1.58, 0], [.58, -1.3, 0], .11, equipmentFrame);
      pad('seat', [1.18, .26, 1.12], [.68, -1.13, 0]);
      contouredPad('backPad', [.28, 1.06, 1.06], [.92, -.02, 0], -.04);
      beam('seatRearMount', [1.43, -1.58, -.88], [1.43, -1.58, .88], [.14, .1]);
      bentBeam('backSupport', [[1.43, -1.58, 0], [1.43, -.8, 0], [1.23, -.56, 0], [1.27, .5, 0]], [.16, .12]);
      box('seatBelt', [.08, .035, 1.24], [.67, -.94, 0], equipmentRubber, .012);
      parts.assistPivot = new THREE.Group();
      parts.assistPivot.position.set(.8, -1.4, 0);
      group.add(parts.assistPivot);
      [-1, 1].forEach((side) => {
        beam(side > 0 ? 'assistMountL' : 'assistMountR', [.8, -1.65, side * .94], [.8, -1.4, side * .94], [.12, .1]);
        pivotBlock(side > 0 ? 'assistPivotL' : 'assistPivotR', [.8, -1.4, side * .94]);
        bentBeam(side > 0 ? 'assistLeverL' : 'assistLeverR', [[0, 0, side * .94], [-.55, .26, side * .94], [-1.84, .56, side * .94]], [.1, .075], equipmentFrame, parts.assistPivot);
      });
      tube('assistAxle', [.8, -1.4, -.94], [.8, -1.4, .94], .055, equipmentSteel);
      tube('assistBar', [-1.84, .56, -.94], [-1.84, .56, .94], .075, equipmentPad, parts.assistPivot);
      parts.assistBar.geometry.computeBoundingBox();
      const assistHitSize = parts.assistBar.geometry.boundingBox.getSize(new THREE.Vector3()).toArray().map(n => n + .18);
      const assistHit = hitProxy('assistHit', assistHitSize, [0, 0, 0], 'assist', parts.assistBar);
      assistHit.userData.dragTarget = parts.assistBar;
      assistHit.userData.preciseGrip = true;
      handle('entryGripL', [.38, -.7, .67], .36, group);
      handle('entryGripR', [.38, -.7, -.67], .36, group);
      pivotBlock('pulloverPivotL', [.68, .6, .65]);
      pivotBlock('pulloverPivotR', [.68, .6, -.65]);
      parts.cam = tearDropCam('cam', [.68, .6, -.95], 1.32, group, equipmentPad);
      parts.cam.scale.z = .32;
      parts.guidePulley = pulley('guidePulley', [-.24, 1.03, -.95], .17);
      parts.arcArm = new THREE.Group(); parts.arcArm.position.set(.68, .6, 0); group.add(parts.arcArm);
      bentBeam('pulloverArmL', [[0, 0, .68], [-.52, .18, .72], [-1.16, .3, .72]], [.14, .1], equipmentFrame, parts.arcArm);
      bentBeam('pulloverArmR', [[0, 0, -.68], [-.52, .18, -.72], [-1.16, .3, -.72]], [.14, .1], equipmentFrame, parts.arcArm);
      tube('elbowBridge', [-1.16, .3, .72], [-1.16, .3, -.72], .075, equipmentFrame, parts.arcArm);
      pad('elbowPadL', [.64, .28, .38], [-1.16, .3, .69], -.08, parts.arcArm);
      pad('elbowPadR', [.64, .28, .38], [-1.16, .3, -.69], -.08, parts.arcArm);
      tube('arcGrip', [-.37, 1.21, -.72], [-.37, 1.21, .72], .055, equipmentPad, parts.arcArm);
      curvedTube('', [[-1.16, .3, -.72], [-.37, 1.21, -.72], [-.37, 1.21, .72], [-1.16, .3, .72]], .048, equipmentSteel, parts.arcArm);
      parts.cableA = dynamicRod('cableA');
      parts.cableB = dynamicRod('cableB');
      forceArrow('force', [0, -1, 0], 1.25, parts.arcArm);
      parts.force.position.set(-1.08, .3, 0);
      hitProxy('actionHit', [.8, .55, 1.6], [-1.25, .34, 0], '', parts.arcArm);
    } else if (sceneKey === 'bent-row') {
      // Eleiko IWF competition bar on a full-oak platform. The bar keeps its 2200 mm proportions,
      // 28 mm grip, 50 mm sleeves, collars and independent bumper plates while following a row path.
      box('platformBed', [4.35, .13, 2.5], [0, -1.68, 0], equipmentRubber, .025);
      for (let i = 0; i < 10; i += 1) {
        box('', [3.55, .075, .18], [0, -1.57, -.9 + i * .2], equipmentOak, .012);
      }
      box('', [4.25, .08, .22], [0, -1.55, 1.14], equipmentRubber, .02);
      box('', [4.25, .08, .22], [0, -1.55, -1.14], equipmentRubber, .02);
      box('', [.28, .08, 2.12], [-1.98, -1.55, 0], equipmentRubber, .02);
      box('', [.28, .08, 2.12], [1.98, -1.55, 0], equipmentRubber, .02);

      tube('barShaft', [-1.1, 0, 0], [1.1, 0, 0], .036, equipmentSteel, moving);
      tube('centerKnurl', [-.26, 0, 0], [.26, 0, 0], .044, equipmentPad, moving);
      tube('gripKnurlL', [-.82, 0, 0], [-.36, 0, 0], .041, equipmentPad, moving);
      tube('gripKnurlR', [.36, 0, 0], [.82, 0, 0], .041, equipmentPad, moving);
      tube('sleeveL', [-1.1, 0, 0], [-1.72, 0, 0], .064, equipmentSteel, moving);
      tube('sleeveR', [1.1, 0, 0], [1.72, 0, 0], .064, equipmentSteel, moving);
      plate('plateL', [-1.38, 0, 0], .98, moving); plate('plateLOuter', [-1.51, 0, 0], .82, moving);
      plate('plateR', [1.38, 0, 0], .98, moving); plate('plateROuter', [1.51, 0, 0], .82, moving);
      const collarL = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .09, 24), equipmentGold);
      collarL.rotation.z = Math.PI / 2; collarL.position.set(-1.65, 0, 0); moving.add(collarL);
      const collarR = collarL.clone(); collarR.position.x = 1.65; moving.add(collarR);
      tube('barPath', [-.28, -1.18, 0], [.25, -.4, 0], .018, equipmentCable, group);
      parts.force = arrow(new THREE.Vector3(0, -1, 0), 1.05, red, .032); moving.add(parts.force);
      parts.force.position.set(0, .08, 0);
      hitProxy('actionHit', [3.8, 1.25, 1.35], [0, 0, 0], '', moving);
    } else if (sceneKey === 'db-shoulder-press') {
      // Hammer Strength HDLADJ: 130.3 x 62.9 x 45.7 cm, six back angles, three seat angles,
      // rolling handle and Dock 'n' Lock rail. Only the dumbbells move through the press path.
      beam('leftBaseRail', [-1.62, -1.62, .48], [1.42, -1.62, .48], [.17, .13]);
      beam('rightBaseRail', [-1.62, -1.62, -.48], [1.42, -1.62, -.48], [.17, .13]);
      beam('rearFoot', [1.26, -1.62, -.72], [1.26, -1.62, .72], [.18, .14]);
      beam('frontFoot', [-1.44, -1.62, -.6], [-1.44, -1.62, .6], [.18, .14]);
      beam('centerSpine', [-1.28, -1.5, 0], [.98, -1.5, 0], [.18, .14]);
      tube('dockRail', [-1.55, -1.7, 0], [1.52, -1.7, 0], .045, equipmentSteel);
      box('dockLock', [.34, .2, .4], [.92, -1.53, 0], equipmentAccent, .04);
      tube('releaseHandle', [.94, -1.42, 0], [1.45, -1.17, 0], .04, equipmentSteel);

      parts.backPivot = new THREE.Group(); parts.backPivot.position.set(.46, -1.33, 0); group.add(parts.backPivot);
      pad('backPad', [.32, 1.98, .86], [0, .96, 0], 0, parts.backPivot);
      beam('', [-.08, .02, .38], [-.08, 1.78, .38], [.12, .09], equipmentFrame, parts.backPivot);
      beam('', [-.08, .02, -.38], [-.08, 1.78, -.38], [.12, .09], equipmentFrame, parts.backPivot);
      parts.seatPivot = new THREE.Group(); parts.seatPivot.position.set(-.64, -1.34, 0); group.add(parts.seatPivot);
      pad('seat', [1.02, .24, .88], [-.25, .08, 0], 0, parts.seatPivot);
      pivotBlock('benchHinge', [.24, -1.27, 0]);
      bentBeam('backBraceL', [[.32, -1.42, .35], [.82, -.84, .35], [1.02, -.3, .35]], [.11, .08]);
      bentBeam('backBraceR', [[.32, -1.42, -.35], [.82, -.84, -.35], [1.02, -.3, -.35]], [.11, .08]);
      for (let i = 0; i < 6; i += 1) {
        box('', [.08, .06, .78], [.74 + i * .07, -1.17 + i * .13, 0], equipmentSteel, .018);
      }
      [-.48, .48].forEach((z) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .08, 24), equipmentRubber);
        wheel.rotation.x = Math.PI / 2; wheel.position.set(1.3, -1.47, z); group.add(wheel);
      });

      dumbbell('dbL', [-.74, .12, .5]); dumbbell('dbR', [.74, .12, -.5]);
      parts.forceL = arrow(new THREE.Vector3(0, 1, 0), .7, blue, .03); moving.add(parts.forceL);
      parts.forceR = arrow(new THREE.Vector3(0, 1, 0), .7, blue, .03); moving.add(parts.forceR);
      parts.gravityL = arrow(new THREE.Vector3(0, -1, 0), .55, red, .028); moving.add(parts.gravityL);
      parts.gravityR = arrow(new THREE.Vector3(0, -1, 0), .55, red, .028); moving.add(parts.gravityR);
      hitProxy('actionHit', [2.55, 2.65, 1.9], [0, .45, 0]);
    } else if (sceneKey === 'pushup') {
      // Rogue bolt-together parallettes: each unit uses a 61 x 38 cm footprint, 35.6 cm height,
      // 3.8 cm U-handle, bolted channels and four independent rubber feet.
      box('trainingMat', [3.75, .08, 2.2], [0, -1.7, 0], equipmentRubber, .035);
      const buildParallette = (name, side) => {
        const g = new THREE.Group(); g.position.z = side * .5; group.add(g); parts[name] = g;
        tube('', [-.76, -1.48, -.38], [-.76, -1.48, .38], .065, equipmentFrame, g);
        tube('', [.76, -1.48, -.38], [.76, -1.48, .38], .065, equipmentFrame, g);
        tube('', [-.68, -1.43, 0], [-.68, -.88, 0], .052, equipmentFrame, g);
        tube('', [.68, -1.43, 0], [.68, -.88, 0], .052, equipmentFrame, g);
        tube('', [-.68, -.88, 0], [.68, -.88, 0], .058, equipmentFrame, g);
        box('', [.22, .22, .16], [-.68, -1.34, 0], equipmentFrame, .025, g);
        box('', [.22, .22, .16], [.68, -1.34, 0], equipmentFrame, .025, g);
        [-.76, .76].forEach((x) => [-.42, .42].forEach((z) => box('', [.18, .06, .18], [x, -1.56, z], equipmentRubber, .025, g)));
        [-.68, .68].forEach((x) => {
          const bolt = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .19, 12), equipmentSteel);
          bolt.rotation.x = Math.PI / 2; bolt.position.set(x, -1.34, 0); g.add(bolt);
        });
        return g;
      };
      buildParallette('paralletteL', 1); buildParallette('paralletteR', -1);
      parts.footBlock = box('footBlock', [.9, .16, 1.25], [1.3, -1.56, 0], equipmentPad, .055);
      parts.bodyLever = dynamicRod('bodyLever', .018, equipmentAccent, group);
      parts.forceL = forceArrow('forceL', [0, 1, 0], .95, group);
      parts.forceR = forceArrow('forceR', [0, 1, 0], .95, group);
      parts.forceL.position.set(-.35, -.82, .5); parts.forceR.position.set(-.35, -.82, -.5);
      hitProxy('actionHit', [3.5, 1.25, 2.2], [0, -1.05, 0], '', group);
    }

    const recolorMaterial = (from, to) => {
      group.traverse((node) => {
        if (node.isMesh && node.material === from) node.material = to;
      });
    };
    const recolorPart = (name, material) => {
      parts[name]?.traverse?.((node) => {
        if (node.isMesh) node.material = material;
      });
      if (parts[name]?.isMesh) parts[name].material = material;
    };
    const axiomSilverScenes = new Set(['cam', 'pec', 'lat', 'cable-row', 'cable-pulldown', 'seated-machine-shoulder']);
    const hammerGraphiteScenes = new Set(['incline', 'barbell-bench', 'incline-press', 'hammer-row', 'scissor-pulldown', 'machine-military-press', 'db-shoulder-press']);
    if (axiomSilverScenes.has(sceneKey) || isInsigniaFly) recolorMaterial(equipmentFrame, equipmentAxiomSilver);
    if (hammerGraphiteScenes.has(sceneKey)) recolorMaterial(equipmentFrame, equipmentHammerGraphite);

    const redUpholsteryByScene = {
      cam: ['seat', 'backPad', 'kneeRoll', 'shinRoll'],
      pec: ['seat', 'backPad'],
      lat: ['seat', 'thighPadL', 'thighPadR'],
      'cable-row': ['seat'],
      'machine-fly': ['seat', 'backPad', 'headPad'],
      'cable-pulldown': ['seat', 'thighPadL', 'thighPadR'],
      'seated-machine-shoulder': ['seat', 'backPad']
    };
    (redUpholsteryByScene[sceneKey] || []).forEach((name) => recolorPart(name, equipmentRedUpholstery));

    const dragEndpoint = [
      'handleL', 'leftArmGrip', 'neutralGripL', 'pronatedGripL', 'overhandGripL',
      'gripL', 'arcGrip', 'shinRoll', 'footPlate', 'bar', 'barShaft'
    ].map((name) => parts[name]).find(Boolean);
    if (parts.actionHit && dragEndpoint) parts.actionHit.userData.dragTarget = dragEndpoint;
    if (!['arm', 'cable-fly'].includes(sceneKey)) {
      const gripNames = ['handleL', 'handleR', 'leftArmGrip', 'rightArmGrip', 'neutralGripL', 'neutralGripR', 'pronatedGripL', 'pronatedGripR', 'overhandGripL', 'overhandGripR', 'gripL', 'gripR', 'arcGrip', 'shinRoll'];
      gripNames.forEach((name) => {
        const grip = parts[name];
        if (!grip?.geometry) return;
        grip.geometry.computeBoundingBox();
        const size = grip.geometry.boundingBox.getSize(new THREE.Vector3()).toArray().map((n) => n + .18);
        const side = INDEPENDENT_ARM_SCENES.has(sceneKey) ? (name.endsWith('R') ? 'right' : 'left') : '';
        const hit = hitProxy(`gripHit_${name}`, size, [0, 0, 0], side, grip);
        hit.userData.dragTarget = grip;
        hit.userData.preciseGrip = true;
      });
    }

    const seatBase = parts.seat ? { y: parts.seat.position.y } : null;

    function update(progress, params = {}) {
      const t = clamp(progress, 0, 100) / 100;
      const controlValues = currentMachineProfile(sceneKey).controlValues || {};
      const lift = (amount = .24) => { if (towerInfo?.lift) towerInfo.lift.position.y = t * amount; };
      if (seatBase && ['pec', 'flat-press', 'seated-machine-shoulder'].includes(sceneKey)) {
        const defaultSeat = defaultMachineControlValues(sceneKey).seatHeightCm;
        const shift = (controlValues.seatHeightCm - defaultSeat) * .032;
        parts.seat.position.y = seatBase.y + shift;
      }
      if (sceneKey === 'arm') {
        const leftY = THREE.MathUtils.lerp(-1.15, 1.15, controlValues.pulleyLeftPercent / 100);
        const rightY = THREE.MathUtils.lerp(-1.15, 1.15, controlValues.pulleyRightPercent / 100);
        parts.carriage.position.y = leftY; parts.carriagePulley.position.y = leftY; parts.leftPulleyHit.position.y = leftY;
        parts.rightCarriage.position.y = rightY; parts.rightPulley.position.y = rightY; parts.rightPulleyHit.position.y = rightY;
        const rightT = params.fitProgress != null ? clamp(params.fitProgress, 0, 100) / 100 : clamp((telemetry.armRightAngle ?? telemetry.armAngle) / 90, 0, 1);
        const leftEnd = new THREE.Vector3(THREE.MathUtils.lerp(-1.08,-2.02,t), THREE.MathUtils.lerp(-1.15,.6,t), 1.07);
        const rightEnd = new THREE.Vector3(THREE.MathUtils.lerp(1.08,2.02,rightT), THREE.MathUtils.lerp(-1.15,.6,rightT), 1.07);
        parts.handle.position.copy(leftEnd);
        parts.rightHandle.position.copy(rightEnd);
        parts.actionHit.position.copy(leftEnd);
        parts.rightActionHit.position.copy(rightEnd);
        alignCylinder(parts.cable, parts.carriagePulley.position, leftEnd.clone().add(new THREE.Vector3(0,.22,0)));
        alignCylinder(parts.rightCable, parts.rightPulley.position, rightEnd.clone().add(new THREE.Vector3(0,.22,0)));
        parts.force.position.copy(leftEnd); parts.force.scale.y=.65+t*.7;
        parts.leftStackLift.position.y = t * .18;
        parts.rightStackLift.position.y = rightT * .18;
      } else if (sceneKey === 'cam') {
        parts.armPivot.rotation.z = THREE.MathUtils.lerp(-.1,1.36,t); parts.cam.rotation.z = parts.armPivot.rotation.z; lift(.24);
        alignCylinder(parts.cableA, towerInfo.top, parts.guidePulley.position); alignCylinder(parts.cableB, parts.guidePulley.position, parts.cam.position); parts.force.position.set(.18,-.78,0); parts.force.scale.y=.7+t*.65;
      } else if (sceneKey === 'incline') {
        const p=new THREE.Vector3(-.12,-.02,0).lerp(new THREE.Vector3(.95,1.08,0),t); moving.position.copy(p); parts.force.scale.y=.75+t*.8;
      } else if (isInsigniaFly) {
        const startOpen = THREE.MathUtils.degToRad(clamp(controlValues.startOpenDeg || 108, 72, 125) * .48);
        const armAngle = THREE.MathUtils.lerp(startOpen, -.70, t);
        parts.leftArm.rotation.y = armAngle;
        parts.rightArm.rotation.y = -armAngle;
        parts.camL.rotation.y = armAngle;
        parts.camR.rotation.y = -armAngle;
        const seatShift = ((controlValues.seatHeightCm || 50) - 50) / 42;
        parts.seat.position.y = -.82 + seatShift;
        parts.backPivot.position.y = -.52;
        parts.backPivot.rotation.z = .22 - THREE.MathUtils.degToRad(90 - clamp(controlValues.backrestAngleDeg || 72, 65, 82));
        alignCylinder(parts.cableStack, towerInfo.top, parts.splitPulley.position);
        alignCylinder(parts.cableL, parts.splitPulley.position, parts.lowGuideL.position);
        alignCylinder(parts.cableR, parts.splitPulley.position, parts.lowGuideR.position);
        alignCylinder(parts.cableCamL, parts.lowGuideL.position, parts.camL.position);
        alignCylinder(parts.cableCamR, parts.lowGuideR.position, parts.camR.position);
        parts.leftArmForce.scale.y = .7 + t * .52;
        parts.rightArmForce.scale.y = .7 + t * .52;
        lift(.26);
      } else if (isPecDeck) {
        const startOpen = 1.0 + THREE.MathUtils.degToRad((controlValues.startOpenDeg - 110) * .5);
        const a=THREE.MathUtils.lerp(startOpen,-.25,t);
        parts.leftArm.rotation.y=a; parts.rightArm.rotation.y=-a;
        parts.dropL.rotation.y = -a * .65; parts.dropR.rotation.y = a * .65;
        parts.camL.rotation.y=a; parts.camR.rotation.y=-a; lift(.22);
        alignCylinder(parts.cableA,towerInfo.top,parts.camL.position); alignCylinder(parts.cableB,towerInfo.top,parts.camR.position);
        alignCylinder(parts.cableC,parts.camL.position,parts.leftArm.position); alignCylinder(parts.cableD,parts.camR.position,parts.rightArm.position);
        parts.force.scale.y=.7+t*.65;
      } else if (sceneKey === 'lat') {
        const angle=THREE.MathUtils.lerp(0,.86,t); parts.latYoke.rotation.z=angle; parts.driveCam.rotation.z=angle; lift(.25);
        alignCylinder(parts.cableA,parts.stackExit.position,parts.baseTurn.position);
        alignCylinder(parts.cableC,parts.baseTurn.position,parts.lowGuide.position);
        alignCylinder(parts.cableB,parts.lowGuide.position,parts.driveCam.position);
        parts.force.scale.y=.72+t*.65;
      } else if (isPulldownRow) {
        const y = THREE.MathUtils.lerp(1.9, .25, t);
        const rowT = params.fitProgress != null ? clamp(params.fitProgress, 0, 100) / 100 : (telemetry.oplrRowProgress || 0) / 100;
        parts.rowHandle.position.set(THREE.MathUtils.lerp(-.63, .5, rowT), THREE.MathUtils.lerp(-.2, -.05, rowT), 0);
        parts.barAssembly.position.y = y;
        parts.stackFloatingPulley.position.y = THREE.MathUtils.lerp(.95, 1.16, t);
        moving.position.set(0, 0, 0);
        alignCylinder(parts.cableA, towerInfo.top, parts.stackFloatingPulley.position);
        alignCylinder(parts.cableB, parts.stackFloatingPulley.position, parts.topPulleyA.position);
        alignCylinder(parts.cableC, parts.topPulleyA.position, parts.topPulleyB.position);
        alignCylinder(parts.cableD, parts.topPulleyB.position, new THREE.Vector3(.25, y + .12, 0));
        alignCylinder(parts.cableE, parts.lowStackGuide.position, parts.lowPulley.position);
        alignCylinder(parts.cableF, parts.lowPulley.position, parts.rowHandle.position);
        parts.force.position.set(.25, y, 0); parts.force.scale.y = .72 + t * .65;
        towerInfo.lift.position.y = Math.max(t, rowT) * .28;
      } else if (sceneKey === 'barbell-squat') {
        moving.position.y=THREE.MathUtils.lerp(1.05,-.25,t); parts.force.scale.y=.75+t*.8;
      } else if (sceneKey === 'cable-row') {
        parts.rowYoke.rotation.z = THREE.MathUtils.lerp(0, .4, t);
        parts.rowHandlePivotL.rotation.z = parts.rowHandlePivotR.rotation.z = -parts.rowYoke.rotation.z;
        parts.rowYoke.updateMatrix();
        const anchor = parts.rowCableAnchor.position.clone().applyMatrix4(parts.rowYoke.matrix);
        alignCylinder(parts.cableA, parts.towerLowerPulley.position, parts.lowerGuidePulley.position);
        alignCylinder(parts.cableB, parts.lowerGuidePulley.position, parts.guidePulley.position);
        alignCylinder(parts.cableC, parts.guidePulley.position, anchor);
        const restingAnchor = new THREE.Vector3(.9, .27, -.18);
        towerInfo.lift.position.y = Math.max(0, anchor.distanceTo(parts.guidePulley.position) - restingAnchor.distanceTo(parts.guidePulley.position));
        parts.force.scale.y = .7 + t * .65;
      } else if (sceneKey === 'barbell-bench') {
        moving.position.y=THREE.MathUtils.lerp(-.35,.62,t); moving.position.x = THREE.MathUtils.lerp(-.45,-.82,t); parts.force.scale.y=.72+t*.7;
      } else if (sceneKey === 'flat-press' || sceneKey === 'seated-machine-shoulder') {
        const shoulderMode=sceneKey==='seated-machine-shoulder';
        const angle=THREE.MathUtils.lerp(0, shoulderMode ? -.78 : .4, t);
        parts.armL.rotation.z=angle; parts.armR.rotation.z=angle;
        parts.armL.rotation.y=THREE.MathUtils.lerp(0,-.1,t); parts.armR.rotation.y=THREE.MathUtils.lerp(0,.1,t);
        parts.driveCam.rotation.z=(shoulderMode ? -1 : 1) * t*Math.PI*.78;
        lift(.24);
        alignCylinder(parts.cableA,towerInfo.top,parts.lowGuide.position);
        alignCylinder(parts.cableB,parts.lowGuide.position,parts.driveCam.position);
        if (shoulderMode && parts.cableC && parts.upperGuide) alignCylinder(parts.cableC,parts.driveCam.position,parts.upperGuide.position);
        parts.force.scale.y=shoulderMode ? .55+t*.45 : .7+t*.7;
      } else if (isPlatePress || sceneKey === 'hammer-row' || sceneKey === 'scissor-pulldown') {
        const rowMode=sceneKey==='hammer-row'; const pullMode=sceneKey==='scissor-pulldown';
        const amount = pullMode ? 1.10 : rowMode ? .48 : sceneKey==='incline-press' ? -.55 : -.78;
        const sideProgress = params.fitProgress != null ? { left: params.fitProgress, right: params.fitProgress } : telemetry.independentArmProgress[sceneKey];
        const leftT = sideProgress ? sideProgress.left / 100 : t;
        const rightT = sideProgress ? sideProgress.right / 100 : t;
        parts.armL.rotation.z=THREE.MathUtils.lerp(0,amount,leftT); parts.armR.rotation.z=THREE.MathUtils.lerp(0,amount,rightT);
        const converge=pullMode?-.26:rowMode?-.1:.16;
        parts.armL.rotation.y=THREE.MathUtils.lerp(0,-converge,leftT); parts.armR.rotation.y=THREE.MathUtils.lerp(0,converge,rightT);
        parts.force.scale.y=.72+t*.72; parts.force.rotation.y=rowMode?Math.PI:0;
      } else if (sceneKey === 'cable-fly') {
        const x=THREE.MathUtils.lerp(.85,.2,t);
        const pair=telemetry.cableFlyPair;
        const pulleyY = .58 + (controlValues.pulleyHeightCm - 135) * .013;
        parts.carriage.position.y = parts.carriagePulley.position.y = pulleyY;
        parts.rightCarriage.position.y = parts.rightPulley.position.y = pulleyY;
        parts.handleL.position.set(-x+pair.x,.08+pair.y,1.1+pair.z);
        parts.handleR.position.set(x+pair.x,.08+pair.y,1.1+pair.z);
        parts.actionHit.position.set(pair.x,.12+pair.y,1.1+pair.z);
        alignCylinder(parts.cableL,parts.pulleyL.position,parts.handleL.position.clone().add(new THREE.Vector3(0,.22,0)));
        alignCylinder(parts.cableR,parts.pulleyR.position,parts.handleR.position.clone().add(new THREE.Vector3(0,.22,0)));
        const ringL = parts.handleL.position.clone().add(new THREE.Vector3(0, .22, 0));
        const ringR = parts.handleR.position.clone().add(new THREE.Vector3(0, .22, 0));
        const restingCableLength = new THREE.Vector3(-.85, .3, 1.1).distanceTo(parts.pulleyL.position);
        parts.leftLift.position.y = Math.max(0, ringL.distanceTo(parts.pulleyL.position) - restingCableLength) / 2;
        parts.rightLift.position.y = Math.max(0, ringR.distanceTo(parts.pulleyR.position) - restingCableLength) / 2;
        parts.force.scale.y=.7+t*.65;
      } else if (sceneKey === 'nautilus-pullover') {
        parts.arcArm.rotation.z = THREE.MathUtils.lerp(-.9, .8, t);
        parts.cam.rotation.z = parts.arcArm.rotation.z;
        // One visible linkage coordinate keeps the pedal, elbow pads and grip in the same pose.
        parts.assistPivot.rotation.z = THREE.MathUtils.lerp(0, .32, t);
        alignCylinder(parts.cableA, towerInfo.top, parts.guidePulley.position);
        alignCylinder(parts.cableB, parts.guidePulley.position, parts.cam.position);
        lift(.26);
        parts.force.scale.y = .7 + t * .75;
      } else if (sceneKey === 'bent-row') {
        const pathGain = clamp((controlValues.barPathCm || 22) / 22, .62, 1.45);
        const trunkBias = ((controlValues.trunkAngleDeg || 45) - 45) / 120;
        moving.position.set(
          THREE.MathUtils.lerp(-.28, .25 * pathGain, t) - trunkBias,
          THREE.MathUtils.lerp(-1.18, -.42 * pathGain, t),
          0
        );
        parts.force.scale.y = .72 + t * .7;
      } else if (sceneKey === 'db-shoulder-press') {
        const benchAngle = THREE.MathUtils.degToRad(clamp(controlValues.benchAngleDeg || 75, 0, 75));
        const horizontalPath = clamp((controlValues.dumbbellPathCm || 10) / 10, .35, 1.8);
        parts.backPivot.rotation.z = THREE.MathUtils.degToRad(90) - benchAngle;
        parts.seatPivot.rotation.z = THREE.MathUtils.degToRad((benchAngle >= THREE.MathUtils.degToRad(70) ? 15 : 0));
        const y = THREE.MathUtils.lerp(.15, 1.24, t);
        const x = THREE.MathUtils.lerp(.82, .44 * horizontalPath, t);
        parts.dbL.position.set(-x, y, .5); parts.dbR.position.set(x, y, -.5);
        parts.forceL.position.set(-x, y - .05, .5); parts.forceR.position.set(x, y - .05, -.5);
        parts.gravityL.position.set(-x, y + .42, .5); parts.gravityR.position.set(x, y + .42, -.5);
        parts.forceL.scale.y = .55 + t * .35; parts.forceR.scale.y = parts.forceL.scale.y;
        parts.gravityL.scale.y = .78; parts.gravityR.scale.y = .78;
      } else if (sceneKey === 'pushup') {
        const spread = clamp((controlValues.handWidthCm || 62) / 62, .62, 1.5) * .5;
        const footLift = clamp((controlValues.footElevationCm || 0) / 60, 0, 1) * .6;
        parts.paralletteL.position.z = spread; parts.paralletteR.position.z = -spread;
        parts.forceL.position.z = spread; parts.forceR.position.z = -spread;
        parts.footBlock.position.y = -1.56 + footLift * .5;
        parts.footBlock.scale.y = 1 + footLift * 5;
        const handPoint = new THREE.Vector3(-.35, THREE.MathUtils.lerp(-1.18, -.82, t), 0);
        const footPoint = new THREE.Vector3(1.3, -1.48 + footLift, 0);
        alignCylinder(parts.bodyLever, handPoint, footPoint);
        const scale = .65 + t * .8; parts.forceL.scale.y = scale; parts.forceR.scale.y = scale;
      }
    }

    function progressFor(params = {}) {
      if (sceneKey === 'arm') return (params.angleDeg ?? telemetry.armAngle) / 90 * 100;
      if (sceneKey === 'cam') {
        const angle = clamp(Number(params.angleDeg ?? telemetry.camAngle), 0, 360);
        return angle / 3.6;
      }
      if (sceneKey === 'incline') return (params.travel ?? telemetry.m3_pos) * 100;
      if (sceneKey === 'pec') return params.progress ?? telemetry.pecAngle;
      if (sceneKey === 'lat') return clamp((120 - (params.angleDeg ?? telemetry.latAngle)) / 1.1, 0, 100);
      if (sceneKey === 'barbell-squat') return params.depth ?? telemetry.squatDepth;
      return params.progress ?? extraProgress(sceneKey);
    }
    update(progressFor());
    scene.add(group);
    return {
      group,
      parts,
      anchors: BM.LessonProfiles?.anchors(sceneKey,parts)||{},
      update: (value, params = {}) => update(sceneKey === 'incline' && value <= 1 && !params.percentProgress ? value * 100 : value, params),
      updatePhysics: (params = {}) => {
        const progress = progressFor(params); update(progress, params);
        const physicalParams = sceneKey === 'cam' ? { ...params, angleDeg: (-.1 + progress / 100 * 1.46) * 180 / Math.PI } : params;
        return updatePhysics({ sceneKey, stepPercent: progress, ...physicalParams });
      }
    };
  }

  // Retain every original factory and rig interface, but build a rig only when
  // it is first used. Park inactive rigs outside the render tree: Three updates
  // world matrices even for invisible children of a rendered scene.
  const rigCache = new Map();
  const parkedRigs = new THREE.Group();
  function deferredRig(key, def, index) {
    const resolve = () => {
      if (!rigCache.has(key)) {
        const rig = buildCommercialEquipmentRig(key, def, index);
        rig.group.visible = false; parkedRigs.add(rig.group);
        rigCache.set(key, rig);
      }
      return rigCache.get(key);
    };
    return new Proxy({}, {
      get: (_, name) => resolve()[name],
      set: (_, name, value) => Reflect.set(resolve(), name, value),
      has: (_, name) => name in resolve(),
      ownKeys: () => Reflect.ownKeys(resolve()),
      getOwnPropertyDescriptor: (_, name) => {
        const descriptor = Object.getOwnPropertyDescriptor(resolve(), name);
        return descriptor && { ...descriptor, configurable: true };
      }
    });
  }
  const armRig = deferredRig('arm', null, 0);
  const camRig = deferredRig('cam', null, 1);
  const inclineRig = deferredRig('incline', null, 2);
  const pecRig = deferredRig('pec', null, 3);
  const latRig = deferredRig('lat', null, 4);
  const squatRig = deferredRig('barbell-squat', EXTRA_ACTION_MAP['barbell-squat'], 5);
  const extraRigs = Object.fromEntries(EXTRA_ACTION_DEFS.filter((def) => def.key !== 'barbell-squat').map((def, index) => [def.key, deferredRig(def.key, def, index + 6)]));
  const availableRigs = {arm:armRig,cam:camRig,incline:inclineRig,pec:pecRig,lat:latRig,'barbell-squat':squatRig,...extraRigs};
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 14), new THREE.ShadowMaterial({ color: 0x52687a, opacity: .1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -3.2; scene.add(floor);
  const grid = new THREE.GridHelper(34, 34, 0x9ccbe8, 0xcbd8e1); grid.position.y = -3.17; grid.material.transparent = true; grid.material.opacity = .25; scene.add(grid);

  const labels = {
    overview: ['商用健身器械总览', '选择一台器械查看真实结构与运动传动', 1.55],
    arm: ['OP-DAP 双塔可调滑轮侧平举实验台', '滑轮高度与钢索拉力方向实时联动', 1.48],
    cam: ['Life Fitness Axiom OP-LE 膝伸展机', '凸轮、钢索、配重塔与膝伸转臂同步', 1.52],
    incline: ['Hammer Strength 45° 线性倒蹬机', '双导轨滑车、四根挂片轴与斜面分力同步', 1.5],
    pec: ['Life Fitness Axiom OP-FLY 胸飞鸟 / 后束机', '双侧转臂通过独立凸轮钢索抬升配重', 1.5],
    lat: ['Life Fitness Axiom OP-PD 高位下拉机', '固定转臂、机器轴与钢索配重传动；参数未标定', 1.58],
    'barbell-squat': ['奥林匹克深蹲架自由杠铃深蹲', '安全杆、J 杯、杠铃与片重垂直运动', 1.5],
    squat: ['奥林匹克深蹲架自由杠铃深蹲', '安全杆、J 杯、杠铃与片重垂直运动', 1.5]
  };
  EXTRA_ACTION_DEFS.forEach((def) => { labels[def.key] = [def.title, `${def.group} · ${def.metric}`, def.group === '腿部' ? 1.34 : 1.42]; });
  const cameraFitScale = {
    arm: 1.34,
    cam: 1.34,
    incline: 1.42,
    pec: 1.55,
    lat: 1.55,
    'cable-pulldown': 1.28,
    'cable-row': 1.3,
    'flat-press': 1.34,
    'incline-press': 1.48,
    'hammer-row': 1.26,
    'scissor-pulldown': 1.54,
    'machine-military-press': 1.48,
    'seated-machine-shoulder': 1.34,
    'machine-fly': 1.55,
    'nautilus-pullover': 1.34,
    'cable-fly': 1.68
  };
  // Teaching uses the complete movement envelope and a modest shape-specific
  // margin. The older presets remain in use outside an action route.
  const teachingCameraFitScale = {
    arm: 1.12, cam: 1.08, incline: 1.10, pec: 1.12, lat: 1.10,
    'barbell-squat': 1.10, 'barbell-bench': 1.10,
    'cable-pulldown': 1.10, 'cable-row': 1.08, 'flat-press': 1.10,
    'incline-press': 1.12, 'hammer-row': 1.10, 'scissor-pulldown': 1.12,
    'machine-military-press': 1.12, 'seated-machine-shoulder': 1.10,
    'machine-fly': 1.13, 'nautilus-pullover': 1.12, 'cable-fly': 1.16,
    'db-shoulder-press': 1.10, 'bent-row': 1.08, pushup: 1.08
  };
  const cameraViewByScene = {
    // Match the viewing side and elevation of each displayed manufacturer reference.
    arm: [0, .06, 1],
    cam: [.9, .24, .7],
    incline: [-.72, .12, .69],
    pec: [-.88, .1, .48],
    lat: [-.86, .2, .51],
    'barbell-squat': [-.9, .08, .43],
    'cable-row': [-.92, .25, .4],
    'barbell-bench': [.65, .18, .76],
    'flat-press': [-.96, .1, .28],
    'incline-press': [-.8, .1, .6],
    'cable-fly': [0, .06, 1],
    'machine-fly': [-.6, .09, -.8],
    'scissor-pulldown': [-.75, .1, .66],
    'nautilus-pullover': [-.88, .1, .48],
    'hammer-row': [.5, .16, .87],
    'cable-pulldown': [.45, .08, -.89],
    'machine-military-press': [-.95, .1, .31],
    'seated-machine-shoulder': [-.94, .1, .34]
  };
  function groupsFor(sceneKey) {
    sceneKey = normalizeSceneKey(sceneKey);
    if (engineeringBridge?.isActive()) { const engineeringRig = { arm: armRig, cam: camRig, incline: inclineRig }[sceneKey]; if (engineeringRig) return [engineeringRig.group, engineeringBridge.getFitGroup()]; }
    if (extraRigs[sceneKey]) return [extraRigs[sceneKey].group];
    if (sceneKey === 'arm') return [armRig.group];
    if (sceneKey === 'cam') return [camRig.group];
    if (sceneKey === 'incline') return [inclineRig.group];
    if (sceneKey === 'pec') return [pecRig.group];
    if (sceneKey === 'lat') return [latRig.group];
    if (sceneKey === 'barbell-squat') return [squatRig.group];
    return [armRig.group, camRig.group, inclineRig.group, pecRig.group, latRig.group, squatRig.group, ...Object.values(extraRigs).map((rig) => rig.group)];
  }
  function setSceneVisibility(sceneKey) {
    sceneKey = normalizeSceneKey(sceneKey);
    if (sceneKey === 'overview') Object.values(availableRigs).forEach(rig => void rig.group);
    else if (availableRigs[sceneKey]) void availableRigs[sceneKey].group;
    rigCache.forEach((rig, key) => {
      const visible = sceneKey === key || sceneKey === 'overview';
      rig.group.visible = visible;
      const parent = visible ? scene : parkedRigs;
      if (rig.group.parent !== parent) parent.add(rig.group);
    });
    const visibleGroup = sceneKey === 'overview' ? null : groupsFor(sceneKey)[0];
    studioLighting?.fitFloor(visibleGroup); studioNeedsRender = true;
  }
  function updateRigForScene(sceneKey) {
    if (engineeringBridge?.isActive()) return null;
    sceneKey = normalizeSceneKey(sceneKey);
    if (sceneKey === 'arm') return armRig.updatePhysics({ angleDeg: telemetry.armAngle });
    if (sceneKey === 'cam') return camRig.updatePhysics({ angleDeg: telemetry.camAngle });
    if (sceneKey === 'incline') return inclineRig.updatePhysics({ travel: telemetry.m3_pos });
    if (sceneKey === 'pec') return pecRig.updatePhysics({ progress: telemetry.pecAngle });
    if (sceneKey === 'lat') return latRig.updatePhysics({ angleDeg: telemetry.latAngle, pulleyPercent: telemetry.latPulley });
    if (sceneKey === 'barbell-squat') return squatRig.updatePhysics({ depth: telemetry.squatDepth, mode: telemetry.squatMode });
    if (extraRigs[sceneKey]) return extraRigs[sceneKey].updatePhysics({ progress: extraProgress(sceneKey) });
    return null;
  }
  function updateAllRigsOnce() {
    armRig.updatePhysics({ angleDeg: telemetry.armAngle });
    camRig.updatePhysics({ angleDeg: telemetry.camAngle });
    inclineRig.updatePhysics({ travel: telemetry.m3_pos });
    pecRig.updatePhysics({ progress: telemetry.pecAngle });
    latRig.updatePhysics({ angleDeg: telemetry.latAngle, pulleyPercent: telemetry.latPulley });
    squatRig.updatePhysics({ depth: telemetry.squatDepth, mode: telemetry.squatMode });
    Object.entries(extraRigs).forEach(([key, rig]) => rig.updatePhysics({ progress: extraProgress(key) }));
  }
  function expandFitBox(obj) {
    obj.updateWorldMatrix(true, true);
    obj.traverse((child) => {
      if (!child.isMesh || child.userData?.dragProxy || !child.geometry) return;
      if (engineeringBridge?.isActive()) { let node = child; while (node) { if (!node.visible) return; node = node.parent; } }
      if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
      tmpBox.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld);
      fitBox.union(tmpBox);
    });
  }
  function collectTeachingFitPoints(group, points) {
    group.updateWorldMatrix(true, true);
    group.traverseVisible((child) => {
      if (!child.isMesh || child.userData?.dragProxy || !child.geometry) return;
      if (engineeringBridge?.isActive()) { let node = child; while (node) { if (!node.visible) return; node = node.parent; } }
      if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
      const box = child.geometry.boundingBox;
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const point = new THREE.Vector3(x, y, z).applyMatrix4(child.matrixWorld);
        points.push(point);
        fitBox.expandByPoint(point);
      }
    });
  }
  function teachingMotionFitPoints(sceneKey, groups) {
    const rig = ({ arm: armRig, cam: camRig, incline: inclineRig, pec: pecRig, lat: latRig, 'barbell-squat': squatRig })[sceneKey] || extraRigs[sceneKey];
    const points = [];
    fitBox.makeEmpty();
    if (!rig) { groups.forEach((group) => collectTeachingFitPoints(group, points)); return points; }
    const transforms = [];
    rig.group.traverse((node) => transforms.push({ node, position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone(), visible: node.visible }));
    try {
      // Sample the real rig update without invoking physics or changing telemetry.
      // Extra samples cover curved arm paths between the three teaching stages.
      for (let progress = 0; progress <= 100; progress += 12.5) {
        rig.update(progress, { fitProgress: progress });
        collectTeachingFitPoints(rig.group, points);
      }
    } finally {
      transforms.forEach(({ node, position, quaternion, scale, visible }) => {
        node.position.copy(position); node.quaternion.copy(quaternion); node.scale.copy(scale); node.visible = visible;
      });
      rig.group.updateWorldMatrix(true, true);
    }
    return points;
  }
  function fitTeachingCamera(groups, sceneKey, viewDirection) {
    const points = teachingMotionFitPoints(sceneKey, groups);
    if (!points.length) return null;
    const center = fitBox.getCenter(new THREE.Vector3());
    const rect = viewport.getBoundingClientRect();
    const width = Math.max(1, viewport.clientWidth), height = Math.max(1, viewport.clientHeight);
    const overlap = (selector) => {
      const node = viewport.querySelector(selector);
      if (!node || node.hidden || !node.getClientRects().length || getComputedStyle(node).visibility === 'hidden') return null;
      const other = node.getBoundingClientRect();
      return other.right > rect.left && other.left < rect.right && other.bottom > rect.top && other.top < rect.bottom ? other : null;
    };
    const hud = overlap('.coach-hud');
    const toolbar = overlap('.viewport-control-toolbar');
    const help = overlap('.viewport-help');
    const left = Math.min(20, width * .055);
    const right = hud ? Math.max(left, rect.right - hud.left + 14) : left;
    const top = Math.min(20, height * .06);
    const bottom = Math.max(top, toolbar ? rect.bottom - toolbar.top + 12 : 0, help ? rect.bottom - help.top + 10 : 0);
    const obstacles = [[hud, 14], [toolbar, 12], [help, 10]].filter(([overlay]) => overlay).map(([overlay, gap]) => ({
      left: Math.max(0, overlay.left - rect.left - gap), right: Math.min(width, overlay.right - rect.left + gap),
      top: Math.max(0, overlay.top - rect.top - gap), bottom: Math.min(height, overlay.bottom - rect.top + gap)
    }));
    let safe = { left, right: width - right, top, bottom: height - bottom };
    let safeSource = 'preferred';
    if (safe.right - safe.left <= 2 || safe.bottom - safe.top <= 2) {
      // If an overlay fills a row or column, look for a genuinely uncovered
      // rectangle rather than truncating its boundary to an arbitrary percent.
      const clampX = (value) => clamp(value, left, width - left);
      const clampY = (value) => clamp(value, top, height - top);
      const xs = [...new Set([left, width - left, ...obstacles.flatMap((overlay) => [clampX(overlay.left), clampX(overlay.right)])])].sort((a, b) => a - b);
      const ys = [...new Set([top, height - top, ...obstacles.flatMap((overlay) => [clampY(overlay.top), clampY(overlay.bottom)])])].sort((a, b) => a - b);
      let largestArea = 0, uncovered = null;
      for (let x1 = 0; x1 < xs.length - 1; x1++) for (let x2 = x1 + 1; x2 < xs.length; x2++) {
        if (xs[x2] - xs[x1] <= 2) continue;
        for (let y1 = 0; y1 < ys.length - 1; y1++) for (let y2 = y1 + 1; y2 < ys.length; y2++) {
          if (ys[y2] - ys[y1] <= 2) continue;
          const candidate = { left: xs[x1], right: xs[x2], top: ys[y1], bottom: ys[y2] };
          if (obstacles.some((overlay) => candidate.left < overlay.right && candidate.right > overlay.left && candidate.top < overlay.bottom && candidate.bottom > overlay.top)) continue;
          const area = (candidate.right - candidate.left) * (candidate.bottom - candidate.top);
          if (area > largestArea) { largestArea = area; uncovered = candidate; }
        }
      }
      if (!uncovered) {
        canvas.dataset.cameraFit = JSON.stringify({ scene: sceneKey, state: 'occluded', viewport: { width, height }, safe, overlays: obstacles });
        return { target: controls.target.clone(), position: camera.position.clone() };
      }
      safe = uncovered; safeSource = 'uncovered';
    }
    const direction = viewDirection ? viewDirection.clone().normalize() : new THREE.Vector3(...(cameraViewByScene[sceneKey] || [.34, .08, .86])).normalize();
    const screenRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
    const screenUp = new THREE.Vector3().crossVectors(direction, screenRight).normalize();
    const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov * .5));
    const tanX = tanY * camera.aspect;
    const limits = { left: 2 * safe.left / width - 1, right: 2 * safe.right / width - 1, bottom: 1 - 2 * safe.bottom / height, top: 1 - 2 * safe.top / height };
    const offsetX = -(limits.left + limits.right) * .5 * tanX;
    const offsetY = -(limits.bottom + limits.top) * .5 * tanY;
    let fitDistance = 0;
    points.forEach((point) => {
      const relative = point.clone().sub(center);
      const x = relative.dot(screenRight), y = relative.dot(screenUp), depth = relative.dot(direction);
      // Solve each safe-rectangle boundary including perspective depth and the
      // shifted target, rather than projecting a large world-axis Box3.
      fitDistance = Math.max(fitDistance, depth + camera.near * 2,
        (x + limits.left * depth * tanX) / (limits.left * tanX + offsetX),
        (x + limits.right * depth * tanX) / (limits.right * tanX + offsetX),
        (y + limits.bottom * depth * tanY) / (limits.bottom * tanY + offsetY),
        (y + limits.top * depth * tanY) / (limits.top * tanY + offsetY));
    });
    const scale = teachingCameraFitScale[sceneKey] || 1.10;
    const distance = Math.max(3.2, fitDistance * scale);
    const target = center.clone().addScaledVector(screenRight, offsetX * distance).addScaledVector(screenUp, offsetY * distance);
    const position = target.clone().addScaledVector(direction, distance);
    const projected = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    points.forEach((point) => {
      const relative = point.clone().sub(target), depth = distance - relative.dot(direction);
      const x = width * (.5 + relative.dot(screenRight) / (2 * depth * tanX));
      const y = height * (.5 - relative.dot(screenUp) / (2 * depth * tanY));
      projected.left = Math.min(projected.left, x); projected.right = Math.max(projected.right, x);
      projected.top = Math.min(projected.top, y); projected.bottom = Math.max(projected.bottom, y);
    });
    canvas.dataset.cameraFit = JSON.stringify({ scene: sceneKey, state: 'ready', safeSource, scale, distance: +distance.toFixed(3), samples: 9,
      bounds: { min: fitBox.min.toArray(), max: fitBox.max.toArray() },
      viewport: { width, height }, safe, overlays: obstacles,
      projected: Object.fromEntries(Object.entries(projected).map(([key, value]) => [key, +value.toFixed(2)])) });
    return { target, position };
  }
  function fitEngineeringCamera(groups, sceneKey, viewDirection) {
    const points = [];
    groups.forEach((group) => collectTeachingFitPoints(group, points));
    points.push(...engineeringBridge.getMotionEnvelope());
    if (!points.length) return null;
    const box = new THREE.Box3().setFromPoints(points), center = box.getCenter(new THREE.Vector3());
    const width = Math.max(1, viewport.clientWidth), height = Math.max(1, viewport.clientHeight);
    const direction = (viewDirection || new THREE.Vector3(.46, .18, 1)).clone().normalize();
    const screenRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
    const screenUp = new THREE.Vector3().crossVectors(direction, screenRight).normalize();
    const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov * .5));
    const tanX = tanY * camera.aspect;
    const safeHeight = Math.max(80, height - 68), safeWidth = Math.max(100, width - 32);
    const usableY = tanY * safeHeight / height, usableX = tanX * safeWidth / width;
    let distance = 0;
    points.forEach((point) => { const relative = point.clone().sub(center), depth = relative.dot(direction); distance = Math.max(distance, depth + camera.near * 2, Math.abs(relative.dot(screenRight)) / usableX + depth, Math.abs(relative.dot(screenUp)) / usableY + depth); });
    distance = Math.max(2.4, distance * 1.06);
    // Move the object slightly upward into the area above the camera toolbar.
    const target = center.clone().addScaledVector(screenUp, -.065 * distance * tanY);
    canvas.dataset.engineeringFit = JSON.stringify({ scene: sceneKey, distance, margin: 1.06, viewport: { width, height }, bounds: { min: box.min.toArray(), max: box.max.toArray() }, points: points.length });
    return { target, position: target.clone().addScaledVector(direction, distance) };
  }
  function fitCameraToModel(activeGroup, sceneKey = telemetry.activeScene, viewDirection = null) {
    sceneKey = normalizeSceneKey(sceneKey);
    const groups = Array.isArray(activeGroup) ? activeGroup : [activeGroup];
    if (engineeringBridge?.isActive()) { const fit = fitEngineeringCamera(groups, sceneKey, viewDirection); if (fit) return fit; }
    if (sceneKey !== 'overview' && (document.body.dataset.bmRoute || '').startsWith('action/')) {
      const teachingFit = fitTeachingCamera(groups, sceneKey, viewDirection);
      if (teachingFit) return teachingFit;
    }
    delete canvas.dataset.cameraFit;
    fitBox.makeEmpty(); groups.forEach(expandFitBox);
    const center = new THREE.Vector3();
    fitBox.getCenter(center);
    const viewportRect = viewport.getBoundingClientRect();
    const width = viewport.clientWidth, height = viewport.clientHeight;
    const overview = sceneKey === 'overview';
    const panelRect = (selector) => {
      const node = document.querySelector(selector);
      return !overview && node && getComputedStyle(node).display !== 'none' && !node.hidden ? node.getBoundingClientRect() : null;
    };
    const referenceRect = panelRect('.machine-reference-card');
    const hudRect = panelRect('.coach-hud');
    const left = referenceRect ? Math.max(20, referenceRect.right - viewportRect.left + 16) : 20;
    const right = hudRect ? viewportRect.right - hudRect.left + 16 : 20;
    const safeWidth = Math.max(160, width - left - right);
    const safeHeight = Math.max(220, height - 110);
    const view = cameraViewByScene[sceneKey] || [.34, .08, .86];
    const direction = viewDirection ? viewDirection.clone().normalize() : new THREE.Vector3(...(overview ? [0, 0, 1] : view)).normalize();
    const screenRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
    const screenUp = new THREE.Vector3().crossVectors(direction, screenRight).normalize();
    const fov = THREE.MathUtils.degToRad(camera.fov * .5);
    const tanY = Math.tan(fov) * safeHeight / Math.max(height, 1);
    const tanX = Math.tan(fov) * camera.aspect * safeWidth / Math.max(width, 1);
    let fitDistance = 0;
    for (const x of [fitBox.min.x, fitBox.max.x]) for (const y of [fitBox.min.y, fitBox.max.y]) for (const z of [fitBox.min.z, fitBox.max.z]) {
      const corner = new THREE.Vector3(x, y, z).sub(center);
      const depth = corner.dot(direction);
      fitDistance = Math.max(fitDistance, Math.abs(corner.dot(screenRight)) / tanX + depth, Math.abs(corner.dot(screenUp)) / tanY + depth);
    }
    const distance = Math.max(6.2, fitDistance * (cameraFitScale[sceneKey] || 1.35));
    const target = center.clone();
    // Offset along the camera axes so the full model sits between the real overlays.
    const centerX = (left + width - right) / 2;
    target.addScaledVector(screenRight, (width / 2 - centerX) * 2 * distance * Math.tan(fov) * camera.aspect / Math.max(width, 1));
    target.addScaledVector(screenUp, -25 * 2 * distance * Math.tan(fov) / Math.max(height, 1));
    const position = target.clone().addScaledVector(direction, distance);
    return {
      target: { x: target.x, y: target.y, z: target.z },
      position: { x: position.x, y: position.y, z: position.z }
    };
  }
  const partCallouts = document.createElement('div');
  partCallouts.className = 'bm-part-callouts';
  partCallouts.hidden = true;
  partCallouts.setAttribute('aria-hidden', 'true');
  Object.assign(partCallouts.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden' });
  const camPartLabels = [
    { part: camRig.parts.armPivot, name: '转轴中心', preparationOnly: true },
    { part: camRig.parts.shinRoll, name: '小腿垫', preparationOnly: false }
  ].map((definition) => {
    const element = document.createElement('div');
    element.className = 'bm-part-callout';
    element.hidden = true;
    Object.assign(element.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none' });
    const dot = document.createElement('i');
    const label = document.createElement('span');
    label.textContent = definition.name;
    element.append(dot, label); partCallouts.append(element);
    return { ...definition, element };
  });
  viewport.append(partCallouts);
  const calloutPosition = new THREE.Vector3();
  function updateTeachingPartCallouts() {
    const body = document.body;
    const learningMode = body.dataset.learningMode || document.querySelector('.bm-modes [aria-pressed="true"]')?.dataset.mode;
    const phase = body.dataset.learningPhase || (document.querySelector('.bm-stage-nav [aria-pressed="true"]')?.dataset.stage === '0' ? 'prepare' : 'work');
    const active = telemetry.activeScene === 'cam' && (body.dataset.bmRoute || '').startsWith('action/') && ['how', 'setup'].includes(learningMode) && !cameraTransition;
    if (partCallouts.hidden === active) partCallouts.hidden = !active;
    if (!active) return;
    camera.updateMatrixWorld();
    const width = viewport.clientWidth, height = viewport.clientHeight;
    camPartLabels.forEach(({ part, element, preparationOnly }) => {
      if (preparationOnly && phase !== 'prepare' && learningMode !== 'setup') { if (!element.hidden) element.hidden = true; return; }
      part.getWorldPosition(calloutPosition).project(camera);
      const x = (calloutPosition.x + 1) * width / 2, y = (1 - calloutPosition.y) * height / 2;
      const hidden = calloutPosition.z < -1 || calloutPosition.z > 1 || x < 12 || x > width - 12 || y < 12 || y > height - 12;
      if (element.hidden !== hidden) element.hidden = hidden;
      if (element.hidden) return;
      element.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      element.dataset.align = x > width * .68 ? 'left' : 'right';
    });
  }
  let cameraTransition = null;
  function stopCameraTransition(settle = false) {
    const transition = cameraTransition;
    if (!transition) return;
    gsap.killTweensOf(transition);
    if (settle) {
      transition.progress = 1;
      applyCameraTransition(transition);
    }
    controls.enabled = transition.controlsEnabled;
    cameraTransition = null;
    canvas.dataset.cameraState = 'ready';
  }
  function applyCameraTransition(transition) {
    if (cameraTransition !== transition) return;
    const autoRotate = controls.autoRotate;
    const damping = controls.enableDamping;
    controls.autoRotate = false;
    controls.enableDamping = false;
    controls.update();
    camera.position.lerpVectors(transition.startPosition, transition.endPosition, transition.progress);
    controls.target.lerpVectors(transition.startTarget, transition.endTarget, transition.progress);
    controls.update();
    controls.autoRotate = autoRotate;
    controls.enableDamping = damping;
    camera.updateMatrixWorld(true);
  }
  function entryCameraOffset(position, target) {
    const direction = position.clone().sub(target).normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
    const distance = position.distanceTo(target);
    const tanX = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    let offset = 0;
    for (const x of [fitBox.min.x, fitBox.max.x]) for (const y of [fitBox.min.y, fitBox.max.y]) for (const z of [fitBox.min.z, fitBox.max.z]) {
      const corner = new THREE.Vector3(x, y, z).sub(target);
      offset = Math.max(offset, (distance - corner.dot(direction)) * tanX + corner.dot(right));
    }
    // Shift the camera and its target together so the entire model starts past the left edge.
    return right.multiplyScalar(offset + Math.max(.5, distance * tanX * .1));
  }
  function focusScene(sceneKey, { animateEntry = true } = {}) {
    stopCameraTransition();
    endModelDrag();
    sceneKey = normalizeSceneKey(sceneKey);
    closeInactiveActionGuides(sceneKey);
    telemetry.activeScene = sceneKey;
    setSceneVisibility(sceneKey);
    if (sceneKey === 'overview') updateAllRigsOnce();
    else updateRigForScene(sceneKey);
    updateMachineReference(sceneKey);
    resize();
    document.querySelectorAll('.action-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.scene === sceneKey));
    document.querySelectorAll('.analysis-module').forEach((m) => m.classList.toggle('active', m.dataset.scene === sceneKey));
    const [title, desc] = labels[sceneKey] || labels.overview;
    $('hud-scene').textContent = title; $('hud-description').textContent = desc;
    const preset = fitCameraToModel(groupsFor(sceneKey), sceneKey);
    gsap.killTweensOf(camera.position); gsap.killTweensOf(controls.target);
    const endPosition = new THREE.Vector3(preset.position.x, preset.position.y, preset.position.z);
    const endTarget = new THREE.Vector3(preset.target.x, preset.target.y, preset.target.z);
    const entering = animateEntry && sceneKey !== 'overview';
    const offset = entering ? entryCameraOffset(endPosition, endTarget) : null;
    const transition = {
      progress: 0,
      sceneKey,
      entering,
      startPosition: entering ? endPosition.clone().add(offset) : camera.position.clone(),
      startTarget: entering ? endTarget.clone().add(offset) : controls.target.clone(),
      endPosition,
      endTarget,
      controlsEnabled: controls.enabled
    };
    cameraTransition = transition;
    canvas.dataset.cameraState = 'moving';
    controls.enabled = false;
    applyCameraTransition(transition);
    gsap.to(transition, {
      progress: 1,
      duration: .9,
      ease: 'power3.inOut',
      onUpdate: () => applyCameraTransition(transition),
      onComplete: () => {
        if (cameraTransition === transition) stopCameraTransition(true);
      }
    });
    updateCoachHud();
  }
  focusSceneHandler = focusScene;

  function setPointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }
  function dragSceneFor(object) {
    let obj = object;
    while (obj) { if (obj.userData?.dragScene) return obj.userData.dragScene; obj = obj.parent; }
    return '';
  }
  function dragControlFor(object) {
    let obj = object;
    while (obj) { if (obj.userData?.dragControl) return obj.userData.dragControl; obj = obj.parent; }
    return '';
  }
  function dragSceneMatches(handleScene, sceneKey) {
    const normalizedHandle = normalizeSceneKey(handleScene);
    return normalizedHandle === sceneKey || handleScene === sceneKey || (sceneKey === 'barbell-squat' && handleScene === 'squat');
  }
  function currentControlScene() {
    if (engineeringBridge?.isActive()) return engineeringBridge.getScene();
    const sceneKey = normalizeSceneKey(telemetry.activeScene);
    return ['arm','cam','incline','pec','lat','squat'].includes(sceneKey) || isExtraScene(sceneKey) ? sceneKey : null;
  }
  function hitHandle(event) {
    const sceneKey = currentControlScene();
    if (!sceneKey) return null;
    setPointer(event); raycaster.setFromCamera(pointer, camera);
    const engineering = engineeringBridge?.isActive();
    const candidates = engineering ? engineeringBridge.getDragHandles() : draggableHandles;
    const hits = raycaster.intersectObjects(candidates, true).filter((hit) => dragSceneMatches(dragSceneFor(hit.object), sceneKey));
    const preciseHits = hits.filter((hit) => hit.object.userData.preciseGrip);
    if (!preciseHits.length) return hits[0] || null;
    const rect = canvas.getBoundingClientRect();
    const cursor = new THREE.Vector2(event.clientX - rect.left, event.clientY - rect.top);
    // Overlapping grip proxies should select the grip nearest the cursor, not just the frontmost box.
    return preciseHits.reduce((closest, hit) => {
      const point = dragScreenPosition(hit.object.userData.dragTarget || hit.object, new THREE.Vector2());
      const distance = point.distanceToSquared(cursor);
      return !closest || distance < closest.distance ? { hit, distance } : closest;
    }, null).hit;
  }
  function dragScreenPosition(object, target = dragScreenA) {
    object.updateWorldMatrix(true, false);
    dragWorldPoint.setFromMatrixPosition(object.matrixWorld).project(camera);
    const rect = canvas.getBoundingClientRect();
    target.set((dragWorldPoint.x + 1) * rect.width / 2, (1 - dragWorldPoint.y) * rect.height / 2);
    return target;
  }
  function dragValueFor(sceneKey, control = '') {
    if (engineeringBridge?.isActive()) return engineeringBridge.getProgress() * 100;
    if (INDEPENDENT_ARM_SCENES.has(sceneKey) && ['left', 'right'].includes(control)) return telemetry.independentArmProgress[sceneKey]?.[control] ?? extraProgress(sceneKey);
    if (sceneKey === 'cable-pulldown' && control === 'row') return telemetry.oplrRowProgress || 0;
    if (sceneKey === 'arm') {
      if (control === 'pulley-left' || control === 'pulley-right') {
        const side = control === 'pulley-left' ? 'armPulleyLeft' : 'armPulleyRight';
        const height = currentMachineProfile('arm').controlValues?.pulleyHeightCm ?? 105;
        return telemetry[side] ?? clamp((height - 20) / 200 * 100, 0, 100);
      }
      return control === 'right' ? telemetry.armRightAngle : telemetry.armAngle;
    }
    if (sceneKey === 'cam') return telemetry.camAngle;
    if (sceneKey === 'incline') return telemetry.m3_pos * 100;
    if (sceneKey === 'pec') return telemetry.pecAngle;
    if (sceneKey === 'lat') return control === 'pulley' ? telemetry.latPulley : telemetry.latAngle;
    if (sceneKey === 'barbell-squat' || sceneKey === 'squat') return telemetry.squatDepth;
    if (isExtraScene(sceneKey)) return extraProgress(sceneKey);
    return 0;
  }
  function dragSampleStep(sceneKey, control = '') {
    if (engineeringBridge?.isActive()) return 4;
    if (sceneKey === 'cam') return 14;
    if (sceneKey === 'lat' && control !== 'pulley') return 10;
    if (sceneKey === 'incline') return 10;
    return 8;
  }
  function dragValuePerPixel(sceneKey, control = '') {
    if (sceneKey === 'arm' && control.startsWith('pulley-')) return .5;
    if (sceneKey === 'cam') return .78;
    if (sceneKey === 'lat' && control === 'pulley') return .62;
    if (sceneKey === 'incline') return .28;
    if (sceneKey === 'pec') return .45;
    return .36;
  }
  function applyDragValue(sceneKey, control, value) {
    if (engineeringBridge?.isActive()) { engineeringBridge.setProgress(clamp(value, 0, 100) / 100, false); return; }
    if (sceneKey === 'cable-pulldown' && control === 'row') {
      telemetry.oplrRowProgress = clamp(value, 0, 100);
    } else if (sceneKey === 'arm') {
      if (control === 'pulley-left') telemetry.armPulleyLeft = clamp(value, 0, 100);
      else if (control === 'pulley-right') telemetry.armPulleyRight = clamp(value, 0, 100);
      else if (control === 'right') telemetry.armRightAngle = clamp(value, 0, 90);
      else {
        telemetry.armAngle = clamp(value, 0, 90);
        armAngleInput.value = telemetry.armAngle.toFixed(0);
      }
    } else if (sceneKey === 'cam') {
      telemetry.camAngle = clamp(value, 0, 360);
      camAngleInput.value = telemetry.camAngle.toFixed(0);
      updateCamRisk();
    } else if (sceneKey === 'incline') {
      telemetry.sledUserControlled = true;
      telemetry.m3_state = 'idle';
      telemetry.m3_vel = 0;
      telemetry.m3_pos = clamp(value, 0, 100) / 100;
    } else if (sceneKey === 'pec') {
      telemetry.pecAngle = clamp(value, 0, 100);
      pecAngleInput.value = telemetry.pecAngle.toFixed(0);
    } else if (sceneKey === 'lat') {
      if (control === 'pulley') {
        telemetry.latPulley = clamp(value, 0, 100);
        latPulleyInput.value = telemetry.latPulley.toFixed(0);
      } else {
        telemetry.latAngle = clamp(value, 10, 120);
        latAngleInput.value = telemetry.latAngle.toFixed(0);
      }
    } else if (sceneKey === 'barbell-squat' || sceneKey === 'squat') {
      telemetry.squatDepth = clamp(value, 0, 100);
      squatDepthInput.value = telemetry.squatDepth.toFixed(0);
    } else if (isExtraScene(sceneKey)) {
      if (INDEPENDENT_ARM_SCENES.has(sceneKey)) {
        if (control === 'left' || control === 'right') {
          const progress = extraProgress(sceneKey);
          const sides = telemetry.independentArmProgress[sceneKey] ||= { left: progress, right: progress };
          sides[control] = clamp(value, 0, 100);
        } else delete telemetry.independentArmProgress[sceneKey];
      }
      telemetry.extraProgress[sceneKey] = clamp(value, 0, 100);
      const input = $(`${sceneKey}-progress`);
      if (input) input.value = telemetry.extraProgress[sceneKey].toFixed(0);
    }
    updateRigForScene(sceneKey);
  }
  function computeDragScreenAxis(sceneKey, control, object) {
    const startValue = dragValueFor(sceneKey, control);
    const step = dragSampleStep(sceneKey, control);
    const target = object.userData.dragTarget || object;
    dragScreenPosition(target, dragScreenA);
    applyDragValue(sceneKey, control, startValue + step);
    dragScreenPosition(target, dragScreenB);
    applyDragValue(sceneKey, control, startValue);
    let dx = dragScreenB.x - dragScreenA.x;
    let dy = dragScreenB.y - dragScreenA.y;
    let length = Math.hypot(dx, dy);
    if (length < 2) {
      applyDragValue(sceneKey, control, startValue - step);
      dragScreenPosition(target, dragScreenB);
      applyDragValue(sceneKey, control, startValue);
      dx = dragScreenA.x - dragScreenB.x;
      dy = dragScreenA.y - dragScreenB.y;
      length = Math.hypot(dx, dy);
    }
    if (length < 2) return null;
    return { x: dx / length, y: dy / length };
  }
  function followProjectedPath(sceneKey, control, target, desired) {
    // Backtrack on curved paths so a large cursor move cannot send a grip the opposite way.
    for (let iteration = 0; iteration < 4; iteration += 1) {
      const value = dragValueFor(sceneKey, control);
      const step = dragSampleStep(sceneKey, control) / 4;
      const point = dragScreenPosition(target, new THREE.Vector2());
      const error = point.distanceToSquared(desired);
      if (error < .04) break;
      applyDragValue(sceneKey, control, value + step);
      let sampledValue = dragValueFor(sceneKey, control);
      if (Math.abs(sampledValue - value) < .001) {
        applyDragValue(sceneKey, control, value - step);
        sampledValue = dragValueFor(sceneKey, control);
      }
      const tangent = dragScreenPosition(target, new THREE.Vector2()).sub(point);
      const lengthSq = tangent.lengthSq();
      applyDragValue(sceneKey, control, value);
      let bestValue = value, bestError = error;
      const tryValue = (candidate) => {
        applyDragValue(sceneKey, control, candidate);
        const candidateError = dragScreenPosition(target, new THREE.Vector2()).distanceToSquared(desired);
        if (candidateError < bestError - .000001) {
          bestValue = dragValueFor(sceneKey, control);
          bestError = candidateError;
          return true;
        }
        return false;
      };
      if (lengthSq > .00000001) {
        const correction = clamp(desired.clone().sub(point).dot(tangent) / lengthSq * (sampledValue - value), -step * 8, step * 8);
        for (let fraction = 1; fraction >= 1 / 32; fraction /= 2) {
          if (tryValue(value + correction * fraction)) break;
        }
      }
      if (bestValue === value) {
        for (const offset of [-step, step, -step / 4, step / 4]) tryValue(value + offset);
      }
      applyDragValue(sceneKey, control, bestValue);
      if (Math.abs(bestValue - value) < .0001) break;
    }
  }
  function beginModelDrag(event) {
    if (BM.CourseScene?.isActive()) return; // Courses use the shared progress control; keep orbit gestures separate from mechanism dragging.
    if (currentControlScene() === 'cam' && camRig.getExplode?.() > 0) return;
    if (cameraTransition) return;
    if (event.button !== 0) return;
    const sceneKey = currentControlScene();
    const hit = sceneKey ? hitHandle(event) : null;
    if (!sceneKey || !hit) return;
    const rect = canvas.getBoundingClientRect();
    const control = dragControlFor(hit.object);
    const screenAxis = control === 'pair' ? null : computeDragScreenAxis(sceneKey, control, hit.object);
    const target = hit.object.userData.dragTarget || hit.object;
    const screenStart = dragScreenPosition(target, new THREE.Vector2());
    Object.assign(modelDrag, {
      active: true,
      pointerId: event.pointerId,
      sceneKey,
      control,
      side: event.clientX < rect.left + rect.width / 2 ? -1 : 1,
      startX: event.clientX,
      startY: event.clientY,
      value: dragValueFor(sceneKey, control),
      valuePerPixel: dragValuePerPixel(sceneKey, control),
      axisX: screenAxis?.x || 0,
      axisY: screenAxis?.y || -1,
      hasScreenAxis: Boolean(screenAxis),
      target,
      screenStart,
      arm: telemetry.armAngle,
      cam: telemetry.camAngle,
      camAgg: telemetry.camAggression,
      sled: telemetry.m3_pos,
      pec: telemetry.pecAngle,
      lat: telemetry.latAngle,
      latPulley: telemetry.latPulley,
      squat: telemetry.squatDepth,
      extraProgress: extraProgress(sceneKey),
      pair: { ...telemetry.cableFlyPair }
    });
    controls.enabled = false; canvas.setPointerCapture?.(event.pointerId); event.preventDefault(); event.stopImmediatePropagation();
  }
  let lastDragUiUpdate = 0;
  function refreshDragUi(force = false) {
    if (engineeringBridge?.isActive()) { engineeringBridge.emitProgress(); return; }
    const now = performance.now();
    if (!force && now - lastDragUiUpdate < 60) return;
    lastDragUiUpdate = now;
    updateControlReadouts();
  }
  function extraDragDelta(sceneKey, dx, dy, side) {
    if (sceneKey === 'cable-fly' || sceneKey === 'machine-fly') return -side * dx * .42;
    if (['scissor-pulldown', 'nautilus-pullover', 'cable-pulldown'].includes(sceneKey)) return dy * .4;
    if (sceneKey === 'cable-row' || sceneKey === 'hammer-row') return -dx * .36;
    if (sceneKey === 'bent-row') return -dy * .38;
    if (['barbell-bench', 'flat-press', 'incline-press', 'db-shoulder-press', 'machine-military-press', 'seated-machine-shoulder'].includes(sceneKey)) return -dy * .38;
    if (sceneKey === 'pushup') return dy * .36;
    return -dy * .34;
  }
  function updateModelDrag(event) {
    if (!modelDrag.active) return;
    studioNeedsRender = true;
    const dx = event.clientX - modelDrag.startX, dy = event.clientY - modelDrag.startY;
    if (modelDrag.sceneKey === 'cable-fly' && modelDrag.control === 'pair') {
      const rect = canvas.getBoundingClientRect();
      camera.updateMatrixWorld();
      const pairWorld = modelDrag.target.getWorldPosition(new THREE.Vector3());
      const depth = pairWorld.sub(camera.position).dot(camera.getWorldDirection(new THREE.Vector3()));
      const scale = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * depth / Math.max(rect.height, 1);
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const delta = right.multiplyScalar(dx * scale).add(up.multiplyScalar(-dy * scale));
      const rigGroup = extraRigs['cable-fly'].group;
      rigGroup.updateWorldMatrix(true, false);
      delta.applyMatrix3(new THREE.Matrix3().setFromMatrix4(rigGroup.matrixWorld).invert());
      telemetry.cableFlyPair.x = clamp(modelDrag.pair.x + delta.x, -.72, .72);
      telemetry.cableFlyPair.y = clamp(modelDrag.pair.y + delta.y, -.65, .85);
      telemetry.cableFlyPair.z = clamp(modelDrag.pair.z + delta.z, -.55, .55);
      updateRigForScene('cable-fly');
      refreshDragUi();
    } else if (modelDrag.target) {
      followProjectedPath(modelDrag.sceneKey, modelDrag.control, modelDrag.target, modelDrag.screenStart.clone().add(new THREE.Vector2(dx, dy)));
      refreshDragUi();
    } else if (modelDrag.sceneKey === 'arm') {
      applyDragValue('arm', modelDrag.control, modelDrag.value - dy * .5); refreshDragUi();
    } else if (modelDrag.sceneKey === 'cam') {
      telemetry.camAngle = clamp(modelDrag.cam - dy * .9, 0, 360);
      camAngleInput.value = telemetry.camAngle.toFixed(0); updateCamRisk(); refreshDragUi();
    } else if (modelDrag.sceneKey === 'incline') {
      telemetry.sledUserControlled = true; telemetry.m3_state = 'idle'; telemetry.m3_vel = 0; telemetry.m3_pos = clamp(modelDrag.sled + dx * .003 - dy * .003, 0, 1); refreshDragUi();
    } else if (modelDrag.sceneKey === 'pec') {
      telemetry.pecAngle = clamp(modelDrag.pec - modelDrag.side * dx * .45 - dy * .05, 0, 100); pecAngleInput.value = telemetry.pecAngle.toFixed(0); refreshDragUi();
    } else if (modelDrag.sceneKey === 'lat') {
      if (modelDrag.control === 'pulley') {
        telemetry.latPulley = clamp(modelDrag.latPulley - dy * .62, 0, 100);
        latPulleyInput.value = telemetry.latPulley.toFixed(0);
      } else {
        telemetry.latAngle = clamp(modelDrag.lat + dy * .45, 10, 120);
        latAngleInput.value = telemetry.latAngle.toFixed(0);
      }
      refreshDragUi();
    } else if (modelDrag.sceneKey === 'squat' || modelDrag.sceneKey === 'barbell-squat') {
      telemetry.squatDepth = clamp(modelDrag.squat + dy * .32, 0, 100); squatDepthInput.value = telemetry.squatDepth.toFixed(0); refreshDragUi();
    } else if (isExtraScene(modelDrag.sceneKey)) {
      const input = $(`${modelDrag.sceneKey}-progress`);
      telemetry.extraProgress[modelDrag.sceneKey] = clamp(modelDrag.extraProgress + extraDragDelta(modelDrag.sceneKey, dx, dy, modelDrag.side), 0, 100);
      if (input) input.value = telemetry.extraProgress[modelDrag.sceneKey].toFixed(0);
      refreshDragUi();
    }
    event.preventDefault(); event.stopImmediatePropagation();
  }
  function endModelDrag(event) {
    if (!modelDrag.active) return;
    modelDrag.active = false;
    refreshDragUi(true);
    if (!engineeringBridge?.isActive()) updateCoachHud();
    else engineeringBridge.emitProgress();
    controls.enabled = true;
    canvas.classList.toggle('drag-handle-hover', Boolean(event && hitHandle(event)));
    const pointerId = event?.pointerId ?? modelDrag.pointerId;
    if (pointerId != null && canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId);
  }
  canvas.addEventListener('pointerdown', beginModelDrag, { capture: true });
  canvas.addEventListener('pointermove', (e) => { if (!modelDrag.active && !BM.CourseScene?.isActive()) canvas.classList.toggle('drag-handle-hover', Boolean(hitHandle(e))); });
  canvas.addEventListener('pointermove', updateModelDrag, { capture: true });
  canvas.addEventListener('pointerup', endModelDrag, { capture: true });
  canvas.addEventListener('pointercancel', endModelDrag, { capture: true });
  canvas.addEventListener('pointerleave', () => { if (!modelDrag.active) canvas.classList.remove('drag-handle-hover'); });

  const hudPanel = document.querySelector('.coach-hud');
  if (hudPanel) {
    ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove'].forEach((type) => {
      hudPanel.addEventListener(type, (event) => event.stopPropagation(), { passive: true });
    });
    hudPanel.addEventListener('wheel', (event) => event.stopPropagation(), { passive: false });
  }

  function stepModule03(dt) {
    if (telemetry.m3_state === 'idle') return;
    // Prescribed quasi-static motion, not a dynamics solver. No arbitrary
    // per-frame damping or unmeasured user force enters these force/work values.
    const direction = telemetry.m3_state === 'concentric' ? 'up' : 'down';
    const previous = telemetry.m3_pos;
    const speedMps = .3;
    const travelM = telemetry.m3_travelM;
    const profile = currentMachineProfile('incline');
    const evaluated = BM.Mechanics?.evaluate('incline', { massKg: telemetry.totalMovingMass, inclineRad: telemetry.slopeAngle * Math.PI / 180, friction: profile.friction, travelM, direction }, previous);
    const fallback = updatePhysics({ sceneKey: 'incline' });
    const userForce = evaluated?.valid ? evaluated.forceN : direction === 'up' ? fallback.pushN : fallback.lowerN;
    const frictionN = evaluated?.valid ? evaluated.geometry.frictionN : profile.friction * telemetry.totalMovingMass * 9.81 * Math.cos(telemetry.slopeAngle * Math.PI / 180);
    telemetry.m3_vel = (direction === 'up' ? 1 : -1) * speedMps / travelM;
    telemetry.m3_pos = clamp(previous + telemetry.m3_vel * dt, 0, 1);
    const distanceM = Math.abs(telemetry.m3_pos - previous) * travelM;
    telemetry.m3_energyLoss += frictionN * distanceM;
    if (telemetry.m3_pos === 0 || telemetry.m3_pos === 1) telemetry.m3_vel = 0;
    if (!distanceM) return;
    telemetry.m3_history.push({ pos: telemetry.m3_pos, displacementM: telemetry.m3_pos * travelM, force: userForce, phase: telemetry.m3_state });
    if (telemetry.m3_history.length > 360) telemetry.m3_history.shift();
  }
  function bindHoldButton(id, state) {
    const btn = $(id);
    if (!btn) return;
    bind(btn, 'pointerdown', () => { telemetry.sledUserControlled = false; telemetry.m3_state = state; });
    ['pointerup','pointerleave','pointercancel'].forEach((type) => bind(btn, type, () => { if (telemetry.m3_state === state) telemetry.m3_state = 'idle'; }));
  }
  bindHoldButton('btn-m3-push', 'concentric');
  bindHoldButton('btn-m3-release', 'eccentric');
  bind($('btn-m3-reset'), 'click', () => { telemetry.m3_pos = 0; telemetry.m3_vel = 0; telemetry.m3_state = 'idle'; telemetry.m3_history = []; telemetry.m3_energyLoss = 0; $('energy-loss-val').textContent = '0.0 J'; drawChart(); });
  bind($('btn-reset-camera'), 'click', () => { BM.equipmentInspection?.reset(); if (engineeringBridge?.isActive()) resetEngineeringCamera(); else focusScene(telemetry.activeScene, { animateEntry: false }); });
  bind($('btn-zoom-in'), 'click', () => { stopCameraTransition(true); camera.position.sub(controls.target).multiplyScalar(.82).add(controls.target); controls.update(); });
  bind($('btn-zoom-out'), 'click', () => { stopCameraTransition(true); camera.position.sub(controls.target).multiplyScalar(1.18).add(controls.target); controls.update(); });
  bind($('btn-auto-rotate'), 'click', (e) => { controls.autoRotate = !controls.autoRotate; controls.autoRotateSpeed = .75; e.currentTarget.classList.toggle('active', controls.autoRotate); });
  document.querySelectorAll('.action-tab').forEach((tab) => tab.addEventListener('click', () => {
    hidePortalOverlay();
    applySceneChrome(tab.dataset.scene);
    focusScene(normalizeSceneKey(tab.dataset.scene));
  }));
  window.transitToWorkspace = (sceneKey) => {
    sceneKey = normalizeSceneKey(sceneKey);
    hidePortalOverlay();
    switchWorkspace('lab');
    applySceneChrome(sceneKey);
    requestAnimationFrame(() => resize());
    focusSceneHandler?.(sceneKey);
  };
  window.returnToPortal = () => {
    showPortalOverlay('welcome');
    applySceneChrome('overview');
    focusSceneHandler?.('overview');
  };

  function resetEngineeringCamera() {
    const directions = { arm: [0, .12, 1], cam: [.46, .18, 1], incline: [-.62, .2, 1] };
    const direction = new THREE.Vector3(...(directions[telemetry.activeScene] || [0, .15, 1])).normalize();
    camera.position.copy(controls.target).addScaledVector(direction, 10);
    controls.update(); resize(true, true);
  }
  function resize(reframe = false, forceReframe = false) {
    studioNeedsRender = true;
    // setSize clears the drawing buffer even when the camera is unchanged.
    // A static engineering scene must repaint after every resize.
    engineeringNeedsRender = true;
    const rect = viewport.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || viewport.clientWidth || canvas.clientWidth || 300));
    const height = Math.max(1, Math.round(rect.height || viewport.clientHeight || canvas.clientHeight || 150));
    const previousSize = renderer.getSize(new THREE.Vector2());
    const changed = previousSize.x !== width || previousSize.y !== height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);
    if (changed) renderer.setSize(width, height, false);
    if (camera.aspect !== width / height) { camera.aspect = width / height; camera.updateProjectionMatrix(); }
    if (reframe && (changed || forceReframe) && rect.width > 0 && rect.height > 0) {
      stopCameraTransition();
      const direction = camera.position.clone().sub(controls.target);
      const preset = fitCameraToModel(groupsFor(telemetry.activeScene), telemetry.activeScene, direction);
      gsap.killTweensOf(camera.position); gsap.killTweensOf(controls.target);
      camera.position.set(preset.position.x, preset.position.y, preset.position.z);
      controls.target.set(preset.target.x, preset.target.y, preset.target.z);
      controls.update();
    }
  }
  function ensureRendererSize() {
    const rect = viewport.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || viewport.clientWidth || canvas.clientWidth || 300));
    const height = Math.max(1, Math.round(rect.height || viewport.clientHeight || canvas.clientHeight || 150));
    const pixelRatio = renderer.getPixelRatio();
    const expectedWidth = Math.round(width * pixelRatio);
    const expectedHeight = Math.round(height * pixelRatio);
    if (Math.abs(canvas.width - expectedWidth) > 2 || Math.abs(canvas.height - expectedHeight) > 2 || Math.abs(camera.aspect - width / height) > .001) {
      resize(true);
    }
  }
  function resizeSoon() {
    resize(true);
    requestAnimationFrame(() => resize(true));
  }
  new ResizeObserver(resizeSoon).observe(viewport); resizeSoon();
  window.forceDigitalTwinResize = () => resize(true, true);
  let engineeringViewportVisible = true;
  new IntersectionObserver(([entry]) => { engineeringViewportVisible = entry.isIntersecting; if (entry.isIntersecting) { engineeringNeedsRender = true; studioNeedsRender = true; } }).observe(viewport);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) engineeringNeedsRender = true; });
  let last = performance.now(), lastHudUpdate = 0, frameCount = 0, lastStudioSledProgress = NaN;
  function render(now) {
    const dt = Math.min((now - last) / 1000, .05); last = now;
    // The portal covers this renderer; resume as soon as a lab action is opened.
    const portalCoversLab = portalOverlay && portalOverlay.style.display !== 'none' &&
      portalOverlay.style.pointerEvents !== 'none';
    const engineeringActive = engineeringBridge?.isActive();
    const visibleEngineering = engineeringActive && viewport.getBoundingClientRect().width > 0 && viewport.getBoundingClientRect().height > 0;
    if (document.hidden || !engineeringViewportVisible || document.body.hasAttribute('data-explore-open') || document.querySelector('#bm-dialog[open]') || (!BM.CourseScene?.isActive() && !visibleEngineering && (!labWorkspace?.classList.contains('active') || portalCoversLab))) {
      requestAnimationFrame(render);
      return;
    }
    if (!engineeringActive && viewport.hasAttribute('data-studio-principle')) { canvas.dataset.studioRenderState = 'covered-by-diagram'; requestAnimationFrame(render); return; }
    if (!engineeringActive && !BM.CourseScene?.isActive()) { stepModule03(dt); updateRigForScene(telemetry.activeScene); }
    const courseActive = BM.CourseScene?.isActive();
    if (!engineeringActive && !courseActive && now - lastHudUpdate > 90) {
      updateCoachHud();
      $('energy-loss-val').textContent = `${telemetry.m3_energyLoss.toFixed(1)} J`;
      lastHudUpdate = now;
    }
    if (!engineeringActive && !courseActive && telemetry.m3_history.length && frameCount % 3 === 0) drawChart();
    if (frameCount % 30 === 0) ensureRendererSize();
    frameCount += 1;
    if (!cameraTransition) controls.update();
    const teachingRoute = BM.CourseScene?.isActive() || (document.body.dataset.bmRoute || '').startsWith('action/');
    if (teachingRoute && telemetry.activeScene === 'incline' && lastStudioSledProgress !== telemetry.m3_pos) { lastStudioSledProgress = telemetry.m3_pos; studioNeedsRender = true; }
    if (!engineeringActive && teachingRoute && !studioNeedsRender && !cameraTransition && !controls.autoRotate) { canvas.dataset.studioRenderState = 'idle'; requestAnimationFrame(render); return; }
    if (engineeringActive && !engineeringNeedsRender && !controls.autoRotate) { canvas.dataset.engineeringRenderState = 'idle'; requestAnimationFrame(render); return; }
    if (engineeringActive) { engineeringNeedsRender = false; canvas.dataset.engineeringRenderState = 'drawn'; canvas.dataset.engineeringRenderCount = String(++engineeringRenderCount); }
    renderer.render(scene, camera);
    studioNeedsRender = false; canvas.dataset.studioRenderState = 'drawn'; canvas.dataset.studioRenderCount = String(++studioRenderCount);
    BM.equipmentInspection?.project();
    if (engineeringActive) { partCallouts.hidden = true; engineeringBridge.projectLabels(); canvas.dataset.engineeringRenderFlags = JSON.stringify({ ...engineeringBridge.getRenderFlags(), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }); } else if (!courseActive) updateTeachingPartCallouts(); else if (!partCallouts.hidden) partCallouts.hidden = true;
    requestAnimationFrame(render);
  }
  syncUserProfileFromUI(); updateControlReadouts(); updateSledForces(); updateCamRisk(); updateTrainingTracker(); drawChart();
  if (BM.createEngineering3DBridge && BM.Mechanics) {
    engineeringBridge = BM.createEngineering3DBridge({ THREE, scene, canvas, viewport, camera, controls,
      rigs: { pulley: armRig, cam: camRig, incline: inclineRig },
      evaluate: (model, params, progress) => BM.Mechanics.evaluate(model, params, progress),
      activate(sceneKey) {
        const previous = { sceneKey: telemetry.activeScene, position: camera.position.clone(), target: controls.target.clone(), autoRotate: controls.autoRotate, floorVisible: floor.visible, gridVisible: grid.visible };
        floor.visible = false; grid.visible = false;
        stopCameraTransition(); endModelDrag(); controls.autoRotate = false;
        telemetry.activeScene = sceneKey; setSceneVisibility(sceneKey); controls.enabled = true;
        return previous;
      },
      restore(previous) {
        if (!previous) return;
        telemetry.activeScene = previous.sceneKey; setSceneVisibility(previous.sceneKey);
        camera.position.copy(previous.position); controls.target.copy(previous.target); controls.autoRotate = previous.autoRotate; $('btn-auto-rotate')?.classList.toggle('active', previous.autoRotate); delete canvas.dataset.engineeringFit; floor.visible = previous.floorVisible; grid.visible = previous.gridVisible; controls.update();
      }, requestResize: (resetDirection = false) => resetDirection ? resetEngineeringCamera() : resize(true, true), requestDraw: () => { engineeringNeedsRender = true; }
    });
    let engineeringClickStart = null;
    viewport.addEventListener('pointerdown', (event) => { if (engineeringBridge.isActive()) engineeringClickStart = { x: event.clientX, y: event.clientY }; }, { capture: true });
    canvas.addEventListener('pointercancel', () => { engineeringClickStart = null; });
    document.addEventListener('scroll', () => { if (engineeringBridge.isActive()) engineeringBridge.projectLabels(); }, { capture: true, passive: true });
    canvas.addEventListener('pointerup', (event) => {
      if (!engineeringBridge.isActive() || !engineeringClickStart) return;
      const start = engineeringClickStart; engineeringClickStart = null;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
      setPointer(event); raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(engineeringBridge.getPartMeshes(), false)[0];
      if (hit) engineeringBridge.selectPart(hit.object);
    });
  }
  // Finish the async renderer setup on the current route. A direct action load
  // may have queued its scene before Three.js finished importing.
  if (BM.createEquipmentInspector && camRig.anchors) {
    BM.equipmentInspection = BM.createEquipmentInspector({ THREE, rig: camRig, rigs:{arm:armRig,cam:camRig,incline:inclineRig,pec:pecRig,lat:latRig,'barbell-squat':squatRig,...extraRigs}, viewport, canvas, camera, controls,
      fitScene:(key,direction)=>fitCameraToModel(({arm:armRig,cam:camRig,incline:inclineRig,pec:pecRig,lat:latRig,'barbell-squat':squatRig,...extraRigs})[key].group,key,direction),
      fit: direction => fitCameraToModel(camRig.group, 'cam', direction), cancelCamera: () => stopCameraTransition(false) });
  }
  // One renderer, original rig geometry, and an additive display-only course adapter.
  const courseRigs={arm:armRig,cam:camRig,incline:inclineRig,pec:pecRig,lat:latRig,'barbell-squat':squatRig,...extraRigs};
  const courseHuman=BM.HumanLessons?.attach({THREE,scene,rigs:courseRigs,canvas,anatomy:BM.HumanAnatomy,requestDraw:()=>studioNeedsRender=true});
  let courseId='',courseProgress=0,courseInput=0,courseBad=false,courseInspect=false,courseObserve=false;
  scene.traverse(node=>{if(node.isLight)node.layers.enable(1);});
  BM.CourseScene={
    open(id){courseHuman?.hide();courseId=id;courseProgress=0;courseBad=false;courseInspect=false;const a=BM.flow.byId[id];document.body.dataset.bmRoute='action/'+id;document.body.dataset.learningMode='how';portalOverlay.style.display='none';portalOverlay.style.pointerEvents='none';labWorkspace.classList.add('active');
      if(a.sceneKey){telemetry.activeScene=a.sceneKey;setSceneVisibility(a.sceneKey);focusScene(a.sceneKey);}else{rigCache.forEach(r=>{r.group.visible=false;parkedRigs.add(r.group);});telemetry.activeScene='overview';}
      courseHuman?.open(id);this.pose(0);this.view('oblique');controls.autoRotate=false;studioNeedsRender=true;},
    pose(fraction){if(!courseId)return;courseInput=clamp(fraction,0,1);courseProgress=courseInput;courseProgress*=BM.HumanLessons.profiles[courseId]?.machineRange??1;const a=BM.flow.byId[courseId],key=a.sceneKey;
      if(key){const p=courseProgress;if(key==='arm'){telemetry.armAngle=telemetry.armRightAngle=p*90;}else if(key==='cam')telemetry.camAngle=p*360;else if(key==='incline')telemetry.m3_pos=p;else if(key==='pec')telemetry.pecAngle=p*100;else if(key==='lat')telemetry.latAngle=120-p*110;else if(key==='barbell-squat')telemetry.squatDepth=p*100;else{telemetry.extraProgress[key]=p*100;if(telemetry.independentArmProgress[key])telemetry.independentArmProgress[key]={left:p*100,right:p*100};}updateRigForScene(key);}
      const pose=courseHuman?.update(courseId,courseInput,courseBad);const floorPoint=courseHuman?.getFloorWorld(courseId);if(floorPoint){floor.position.copy(floorPoint);grid.position.copy(floorPoint).add(new THREE.Vector3(0,.025,0));}if(courseInspect)courseHuman?.hide();studioNeedsRender=true;return pose;},
    inspect(value){courseInspect=!!value;this.pose(courseInput);},
    anatomy(value) {
      if(!courseId)return;
      courseObserve=!!value;
      camera.layers.set(courseObserve?1:0);
      courseHuman.showFocus(courseObserve);
      this.view();
    },
    coordinate:()=>courseProgress,
    compare(value){if(courseBad===!!value)return;courseBad=!!value;this.pose(courseInput);},
    fields(){return machineEditableFields(BM.flow.byId[courseId]?.sceneKey||'unknown').map(f=>({...f,current:sceneMachineTuning(BM.flow.byId[courseId]?.sceneKey)[f.key]}));},
    adjust(key,value){const sceneKey=BM.flow.byId[courseId]?.sceneKey,field=machineEditableFields(sceneKey).find(f=>f.key===key);if(!field)return false;const previous=sceneMachineTuning(sceneKey)[key];setSceneMachineTuning(sceneKey,{[key]:value});const pose=this.pose(courseInput);if(pose?.contacts.some(c=>c.handError>.03||c.footError>.03)){setSceneMachineTuning(sceneKey,{[key]:previous});this.pose(courseInput);return false;}return true;},
    view(name='oblique'){
      if(!courseId)return;
      stopCameraTransition();
      const group=courseHuman?.getGroup(courseId)||courseRigs[courseId]?.group;
      if(!group)return;
      group.updateWorldMatrix(true,false);
      const profile=BM.HumanLessons.profiles[courseId],rotation=group.getWorldQuaternion(new THREE.Quaternion());
      const face=new THREE.Vector3(...(courseId==='barbell-bench'?[-1,0,0]:profile.front)).applyQuaternion(rotation);
      const side=new THREE.Vector3().crossVectors(face,new THREE.Vector3(0,1,0));
      const oblique=profile.camera?new THREE.Vector3(...profile.camera).applyQuaternion(rotation):
        face.clone().multiplyScalar(.45).addScaledVector(side,1.6).add(new THREE.Vector3(0,.38,0));
      if(courseObserve){
        const sign=BM.HumanAnatomy.rearView(profile.kind)?-1:1;
        oblique.copy(face).multiplyScalar(sign*1.7).addScaledVector(side,1.05).add(new THREE.Vector3(0,.36,0));
        if(profile.kind==='bench')oblique.y=1.75;
      }
      const dirs={front:face.clone().add(new THREE.Vector3(0,.08,0)),side:side.clone().add(new THREE.Vector3(0,.1,0)),oblique};
      const savedInput=courseInput,box=new THREE.Box3();
      for(const progress of [0,.25,.5,.75,1]){
        if(!courseObserve&&progress!==0&&progress!==.5&&progress!==1)continue;
        this.pose(progress);
        group.updateWorldMatrix(true,true);
        if(courseObserve)courseHuman.focusBounds(box);
        else box.expandByObject(group);
      }
      this.pose(savedInput);
      if(box.isEmpty())return;
      if(courseObserve)box.expandByScalar(.28);
      const center=box.getCenter(new THREE.Vector3()),unit=(dirs[name]||dirs.oblique).normalize();
      const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),unit).normalize();
      const up=new THREE.Vector3().crossVectors(unit,right);
      const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2),tanH=tanV*camera.aspect;
      let distance=1;
      for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
        const offset=new THREE.Vector3(x,y,z).sub(center),depth=offset.dot(unit);
        distance=Math.max(distance,Math.abs(offset.dot(right))/(tanH*.90)+depth,Math.abs(offset.dot(up))/(tanV*.90)+depth);
      }
      camera.position.copy(center).addScaledVector(unit,distance);
      controls.target.copy(center);controls.update();studioNeedsRender=true;
    },
    highlight(part){BM.equipmentInspection?.highlight(part,{contextual:true});studioNeedsRender=true;},
    zoom(factor){const delta=camera.position.clone().sub(controls.target),length=THREE.MathUtils.clamp(delta.length()*factor,controls.minDistance||.5,controls.maxDistance||60);camera.position.copy(controls.target).add(delta.normalize().multiplyScalar(length));controls.update();studioNeedsRender=true;},
    isActive:()=>!!courseId, close(){courseHuman?.showFocus(false);courseId='';courseInspect=false;courseObserve=false;camera.layers.set(0);courseHuman?.hide();floor.position.set(0,-3.2,0);grid.position.set(0,-3.17,0);BM.equipmentInspection?.reset();}, viewport,canvas,
    parts(){return courseRigs[courseId]?.anchors||{};}
  };
  const startupRoute = document.body.dataset.bmRoute || '';
  const startupAction = /^(action|course)\//.test(startupRoute) ? BM.flow?.byId[startupRoute.slice(startupRoute.indexOf('/')+1)] : null;
  const startupScene = startupAction?.sceneKey || (startupRoute ? 'overview' : pendingPortalScene) || 'overview';
  pendingPortalScene = null;
  // A course will select/fill its viewport immediately after this promise. Do
  // not build the full overview while it is waiting for the first model.
  if (startupAction) {
    if (startupAction.sceneKey) { telemetry.activeScene=startupAction.sceneKey;setSceneVisibility(startupAction.sceneKey); }
    else rigCache.forEach(rig=>{rig.group.visible=false;parkedRigs.add(rig.group);});
  } else focusScene(startupScene);
  engineeringBridge?.flushPending();
  requestAnimationFrame(render);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOnboarding, { once: true });
} else {
  initializeOnboarding();
}

// The same renderer and initialization run once, when the existing workspace
// first needs them. The photograph-only homepage never allocates hidden rigs.
let digitalTwinPromise = null;
function requestDigitalTwin(){
  if(digitalTwinPromise)return digitalTwinPromise;
  const started=performance.now(),canvas=$('digital-twin-canvas');
  canvas.dataset.modelStatus='loading';
  digitalTwinPromise=initializeDigitalTwin().then(()=>{
    canvas.dataset.modelStatus='ready';
    const ms=+performance.now().toFixed(1),buildMs=+(performance.now()-started).toFixed(1);
    canvas.dataset.modelBuildMs=String(buildMs);
    document.dispatchEvent(new CustomEvent('bm:model-ready',{detail:{ms,buildMs}}));
  }).catch(error=>{canvas.dataset.modelStatus='failed';console.error(error);$('hud-scene').textContent='3D 画面加载失败';});
  return digitalTwinPromise;
}
function requestVisibleDigitalTwin(){
  const route=document.body.dataset.bmRoute||'',portal=$('portal-hub-overlay');
  const nativeVisible=$('ws-lab')?.classList.contains('active')&&portal?.style.display==='none';
  if(route.startsWith('engineering/')||route==='body'||(route.startsWith('action/')&&BM.flow?.byId[route.slice(7)]?.sceneKey)||nativeVisible)requestDigitalTwin();
}
const digitalTwinVisibility=new MutationObserver(requestVisibleDigitalTwin);
digitalTwinVisibility.observe(document.body,{attributes:true,attributeFilter:['data-bm-route']});
digitalTwinVisibility.observe($('ws-lab'),{attributes:true,attributeFilter:['class']});
digitalTwinVisibility.observe($('portal-hub-overlay'),{attributes:true,attributeFilter:['style']});
window.addEventListener('hashchange',requestVisibleDigitalTwin);
requestVisibleDigitalTwin();
