/**
 * LOBSTER SVG PAPERDOLLS — Caverns & Clawds
 * Cute cartoon lobster art for all 10 races.
 * Usage: createLobsterSVG('american') → returns HTML string
 */

// Race color palettes
const LOBSTER_PALETTES = {
  american: {
    body: '#B83220', bodyDark: '#8B2500', bodyLight: '#D44030',
    claw: '#CC3828', clawDark: '#8B2500',
    belly: '#E8A090', accent: '#9B2800',
    eye: '#111', eyeRing: '#D44030'
  },
  european: {
    body: '#3B5FB8', bodyDark: '#2A4580', bodyLight: '#5B80D8',
    claw: '#4B70C8', clawDark: '#2A4580',
    belly: '#8BA8E8', accent: '#6B90E0',
    eye: '#111', eyeRing: '#5B80D8'
  },
  slipper: {
    body: '#C4A060', bodyDark: '#9A7840', bodyLight: '#DCC088',
    claw: '#D4B070', clawDark: '#9A7840',
    belly: '#E8D8B0', accent: '#B89850',
    eye: '#111', eyeRing: '#C4A060',
    flat: true // slipper lobsters have flat shovel-like antennae
  },
  squat: {
    body: '#E86898', bodyDark: '#C04878', bodyLight: '#FF88B8',
    claw: '#F078A0', clawDark: '#C04878',
    belly: '#FFD0E0', accent: '#D85888',
    eye: '#111', eyeRing: '#F078A0',
    compact: true // squats are crab-like: wide round body, big claws, stubby tail
  },
  spiny: {
    body: '#8B6840', bodyDark: '#6B4820', bodyLight: '#AB8860',
    claw: '#9B7848', clawDark: '#6B4820',
    belly: '#D0B890', accent: '#7B5830',
    eye: '#111', eyeRing: '#8B6840',
    spiny: true // long antennae, tiny claws, thorns everywhere, elongated
  },
  reef: {
    body: '#E06050', bodyDark: '#B04040', bodyLight: '#FF8070',
    claw: '#E07060', clawDark: '#B04040',
    belly: '#FFB0A0', accent: '#D05848',
    eye: '#111', eyeRing: '#E06050',
    colorful: true // rainbow patches
  },
  pistol: {
    body: '#5A7850', bodyDark: '#3A5830', bodyLight: '#7A9870',
    claw: '#6A8860', clawDark: '#3A5830',
    belly: '#A8C8A0', accent: '#4A6840',
    eye: '#111', eyeRing: '#6A8860',
    bigClaw: true // one claw is huge (the snapping claw)
  },
  calico: {
    body: '#D8B888', bodyDark: '#B09060', bodyLight: '#F0D8B8',
    claw: '#E0C898', clawDark: '#B09060',
    belly: '#F8E8D0', accent: '#C8A878',
    eye: '#111', eyeRing: '#D8B888',
    spotted: true // has spots
  },
  ghost: {
    body: 'rgba(200,240,255,0.6)', bodyDark: 'rgba(150,200,220,0.5)', bodyLight: 'rgba(230,250,255,0.7)',
    claw: 'rgba(210,245,255,0.55)', clawDark: 'rgba(150,200,220,0.5)',
    belly: 'rgba(240,252,255,0.5)', accent: 'rgba(180,230,245,0.6)',
    eye: 'rgba(100,200,220,0.8)', eyeRing: 'rgba(200,240,255,0.6)',
    ghost: true
  },
  split: {
    // Left side red, right side blue (bilateral gynandromorph)
    bodyL: '#CC3828', bodyR: '#3B5FB8',
    bodyDarkL: '#8B2500', bodyDarkR: '#2A4580',
    bodyLightL: '#E04838', bodyLightR: '#5B80D8',
    claw: '#CC3828', clawDark: '#8B2500',
    clawR: '#4B70C8', clawDarkR: '#2A4580',
    belly: '#D8A8C8', accent: '#A868A0',
    eye: '#111', eyeRing: '#CC3828',
    split: true
  }
};

function createLobsterSVG(race) {
  const r = race ? race.toLowerCase().replace(' lobster', '').replace('pistol shrimp', 'pistol') : 'american';
  const p = LOBSTER_PALETTES[r] || LOBSTER_PALETTES.american;
  const cssClass = `race-${r}`;
  
  let svg = '';
  
  if (p.split) {
    svg = buildSplitLobster(p);
  } else if (p.compact) {
    svg = buildSquatLobster(p);
  } else if (p.spiny) {
    svg = buildSpinyLobster(p);
  } else {
    svg = buildLobster(p, r);
  }
  
  return `<div class="lobster-svg ${cssClass}">${svg}</div>`;
}

function buildLobster(p, race) {
  const bigClawLeft = p.bigClaw;
  
  // Determine claw sizes
  const lClawRx = bigClawLeft ? 18 : 13;
  const lClawRy = bigClawLeft ? 14 : 10;
  const rClawRx = 13;
  const rClawRy = 10;
  
  let extras = '';
  
  // Calico: add spots
  if (p.spotted) {
    extras += `
      <circle cx="52" cy="58" r="4" fill="#C09060" opacity="0.5"/>
      <circle cx="68" cy="55" r="3" fill="#A07848" opacity="0.5"/>
      <circle cx="56" cy="70" r="3.5" fill="#B08050" opacity="0.4"/>
      <circle cx="65" cy="68" r="2.5" fill="#C09868" opacity="0.45"/>
    `;
  }
  
  // Reef: rainbow patches on body
  if (p.colorful) {
    extras += `
      <circle cx="50" cy="57" r="4" fill="#FFD93D" opacity="0.4"/>
      <circle cx="70" cy="57" r="3.5" fill="#4ECDC4" opacity="0.4"/>
      <circle cx="55" cy="68" r="3" fill="#9B59B6" opacity="0.35"/>
      <circle cx="65" cy="70" r="3.5" fill="#3498DB" opacity="0.35"/>
      <circle cx="60" cy="55" r="2.5" fill="#2ECC71" opacity="0.35"/>
    `;
  }
  
  // Ghost: less visible outline, ethereal
  const strokeW = p.ghost ? '0.8' : '1.5';
  const bodyStroke = p.ghost ? 'rgba(150,220,240,0.4)' : p.bodyDark;
  
  // Antenna style
  let antennae = '';
  if (p.flat) {
    // Slipper lobsters have flat paddle-like antennae
    antennae = `
      <ellipse cx="42" cy="18" rx="8" ry="5" fill="${p.body}" stroke="${p.bodyDark}" stroke-width="1" transform="rotate(-15 42 18)"/>
      <ellipse cx="78" cy="18" rx="8" ry="5" fill="${p.body}" stroke="${p.bodyDark}" stroke-width="1" transform="rotate(15 78 18)"/>
    `;
  } else {
    antennae = `
      <line x1="47" y1="30" x2="32" y2="6" stroke="${p.accent}" stroke-width="2" stroke-linecap="round"/>
      <line x1="73" y1="30" x2="88" y2="6" stroke="${p.accent}" stroke-width="2" stroke-linecap="round"/>
    `;
  }
  
  // Tail positioning
  const tailY = 78;
  const tailH = 10;
  const seg2Y = 86;
  const seg2H = 8;
  const fanY = 92;
  
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <!-- Antennae -->
    ${antennae}
    
    <!-- Claw Arms -->
    <rect x="22" y="32" width="6" height="16" rx="3" fill="${p.accent}" transform="rotate(-20 25 40)"/>
    <rect x="92" y="32" width="6" height="16" rx="3" fill="${p.accent}" transform="rotate(20 95 40)"/>
    
    <!-- Left Claw -->
    <ellipse cx="${bigClawLeft ? 14 : 16}" cy="26" rx="${lClawRx}" ry="${lClawRy}" fill="${p.claw}" stroke="${p.clawDark}" stroke-width="${strokeW}"/>
    <path d="M ${bigClawLeft ? 4 : 8} 19 Q ${bigClawLeft ? 14 : 16} ${bigClawLeft ? 13 : 15} ${bigClawLeft ? 24 : 24} 19" fill="none" stroke="${p.clawDark}" stroke-width="1.5" stroke-linecap="round"/>
    ${bigClawLeft ? `<circle cx="14" cy="26" r="3" fill="${p.bodyLight}" opacity="0.3"/>` : ''}
    
    <!-- Right Claw -->
    <ellipse cx="104" cy="26" rx="${rClawRx}" ry="${rClawRy}" fill="${p.claw}" stroke="${p.clawDark}" stroke-width="${strokeW}"/>
    <path d="M 96 19 Q 104 15 112 19" fill="none" stroke="${p.clawDark}" stroke-width="1.5" stroke-linecap="round"/>
    
    <!-- Legs (3 pairs) -->
    <line x1="42" y1="56" x2="26" y2="50" stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="40" y1="64" x2="24" y2="63" stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="42" y1="72" x2="26" y2="76" stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="78" y1="56" x2="94" y2="50" stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="80" y1="64" x2="96" y2="63" stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="78" y1="72" x2="94" y2="76" stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round"/>
    
    <!-- Body (main carapace) -->
    <ellipse cx="60" cy="62" rx="22" ry="20" fill="${p.body}" stroke="${bodyStroke}" stroke-width="${strokeW}"/>
    
    <!-- Belly highlight -->
    <ellipse cx="60" cy="64" rx="14" ry="12" fill="${p.belly}" opacity="0.35"/>
    
    <!-- Shell detail lines -->
    <path d="M 42 58 Q 60 53 78 58" fill="none" stroke="${p.bodyLight}" stroke-width="0.8" opacity="0.4"/>
    <path d="M 44 66 Q 60 62 76 66" fill="none" stroke="${p.bodyLight}" stroke-width="0.6" opacity="0.3"/>
    
    ${extras}
    
    <!-- Head -->
    <ellipse cx="60" cy="38" rx="19" ry="14" fill="${p.body}" stroke="${bodyStroke}" stroke-width="${strokeW}"/>
    
    <!-- Head highlight -->
    <ellipse cx="58" cy="34" rx="8" ry="5" fill="${p.bodyLight}" opacity="0.25"/>
    
    <!-- Eyes (big and cute!) -->
    <circle cx="50" cy="36" r="7" fill="white" stroke="${p.bodyDark}" stroke-width="1"/>
    <circle cx="70" cy="36" r="7" fill="white" stroke="${p.bodyDark}" stroke-width="1"/>
    <!-- Pupils -->
    <circle cx="51" cy="37" r="4.5" fill="${p.eye}"/>
    <circle cx="71" cy="37" r="4.5" fill="${p.eye}"/>
    <!-- Eye highlights -->
    <circle cx="48.5" cy="34.5" r="2" fill="#fff"/>
    <circle cx="68.5" cy="34.5" r="2" fill="#fff"/>
    <!-- Small bottom highlight -->
    <circle cx="52" cy="39" r="1" fill="#fff" opacity="0.5"/>
    <circle cx="72" cy="39" r="1" fill="#fff" opacity="0.5"/>
    
    <!-- Mouth (cute little smile) -->
    <path d="M 56 44 Q 60 47 64 44" fill="none" stroke="${p.bodyDark}" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
    
    <!-- Tail segments -->
    <rect x="47" y="${tailY}" width="26" height="${tailH}" rx="5" fill="${p.body}" stroke="${bodyStroke}" stroke-width="1"/>
    <rect x="50" y="${seg2Y}" width="20" height="${seg2H}" rx="4" fill="${p.accent}" stroke="${bodyStroke}" stroke-width="0.8"/>
    
    <!-- Tail fan -->
    <path d="M 50 ${fanY} Q 42 ${fanY + 14} 36 ${fanY + 16} Q 48 ${fanY + 10} 60 ${fanY + 12} Q 72 ${fanY + 10} 84 ${fanY + 16} Q 78 ${fanY + 14} 70 ${fanY}" 
          fill="${p.body}" stroke="${bodyStroke}" stroke-width="1"/>
    <!-- Fan lines -->
    <line x1="53" y1="${fanY + 2}" x2="46" y2="${fanY + 12}" stroke="${p.bodyDark}" stroke-width="0.6" opacity="0.4"/>
    <line x1="60" y1="${fanY + 3}" x2="60" y2="${fanY + 12}" stroke="${p.bodyDark}" stroke-width="0.6" opacity="0.4"/>
    <line x1="67" y1="${fanY + 2}" x2="74" y2="${fanY + 12}" stroke="${p.bodyDark}" stroke-width="0.6" opacity="0.4"/>
    
    ${p.ghost ? `
    <!-- Ghost: ethereal wisps -->
    <path d="M 38 75 Q 30 85 35 95" fill="none" stroke="rgba(180,240,255,0.3)" stroke-width="1.5"/>
    <path d="M 82 75 Q 90 85 85 95" fill="none" stroke="rgba(180,240,255,0.3)" stroke-width="1.5"/>
    ` : ''}
  </svg>`;
}

// ================================================================
// SQUAT LOBSTER — compact crab-like body, big claws, tiny tail
// ================================================================
function buildSquatLobster(p) {
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <!-- Short antennae (squats have stubby ones) -->
    <line x1="48" y1="32" x2="40" y2="18" stroke="${p.accent}" stroke-width="2" stroke-linecap="round"/>
    <line x1="72" y1="32" x2="80" y2="18" stroke="${p.accent}" stroke-width="2" stroke-linecap="round"/>
    
    <!-- Big claw arms (squats have chunky claws) -->
    <rect x="18" y="30" width="8" height="18" rx="4" fill="${p.accent}" transform="rotate(-25 22 39)"/>
    <rect x="94" y="30" width="8" height="18" rx="4" fill="${p.accent}" transform="rotate(25 98 39)"/>
    
    <!-- Left Claw (BIG — squats are known for oversized claws) -->
    <ellipse cx="12" cy="24" rx="15" ry="12" fill="${p.claw}" stroke="${p.clawDark}" stroke-width="1.5"/>
    <path d="M 3 17 Q 12 11 21 17" fill="none" stroke="${p.clawDark}" stroke-width="1.5" stroke-linecap="round"/>
    <ellipse cx="12" cy="24" rx="6" ry="4" fill="${p.bodyLight}" opacity="0.2"/>
    
    <!-- Right Claw (also big) -->
    <ellipse cx="108" cy="24" rx="15" ry="12" fill="${p.claw}" stroke="${p.clawDark}" stroke-width="1.5"/>
    <path d="M 99 17 Q 108 11 117 17" fill="none" stroke="${p.clawDark}" stroke-width="1.5" stroke-linecap="round"/>
    <ellipse cx="108" cy="24" rx="6" ry="4" fill="${p.bodyLight}" opacity="0.2"/>
    
    <!-- Legs (shorter, crab-like, splayed wide) -->
    <line x1="38" y1="58" x2="20" y2="52" stroke="${p.accent}" stroke-width="3" stroke-linecap="round"/>
    <line x1="36" y1="66" x2="18" y2="66" stroke="${p.accent}" stroke-width="3" stroke-linecap="round"/>
    <line x1="38" y1="74" x2="20" y2="80" stroke="${p.accent}" stroke-width="3" stroke-linecap="round"/>
    <line x1="82" y1="58" x2="100" y2="52" stroke="${p.accent}" stroke-width="3" stroke-linecap="round"/>
    <line x1="84" y1="66" x2="102" y2="66" stroke="${p.accent}" stroke-width="3" stroke-linecap="round"/>
    <line x1="82" y1="74" x2="100" y2="80" stroke="${p.accent}" stroke-width="3" stroke-linecap="round"/>
    
    <!-- Body (WIDE and ROUND — crab-like) -->
    <ellipse cx="60" cy="62" rx="28" ry="22" fill="${p.body}" stroke="${p.bodyDark}" stroke-width="1.5"/>
    
    <!-- Shell pattern (concentric) -->
    <ellipse cx="60" cy="62" rx="20" ry="15" fill="none" stroke="${p.bodyLight}" stroke-width="0.8" opacity="0.3"/>
    <ellipse cx="60" cy="62" rx="12" ry="9" fill="none" stroke="${p.bodyLight}" stroke-width="0.6" opacity="0.2"/>
    
    <!-- Belly highlight -->
    <ellipse cx="60" cy="65" rx="16" ry="12" fill="${p.belly}" opacity="0.3"/>
    
    <!-- Head (small relative to body — crab proportions) -->
    <ellipse cx="60" cy="38" rx="17" ry="12" fill="${p.body}" stroke="${p.bodyDark}" stroke-width="1.5"/>
    <ellipse cx="58" cy="35" rx="6" ry="4" fill="${p.bodyLight}" opacity="0.25"/>
    
    <!-- Eyes (big, cute, on short stalks) -->
    <ellipse cx="47" cy="30" rx="3" ry="5" fill="${p.accent}" transform="rotate(-10 47 30)"/>
    <ellipse cx="73" cy="30" rx="3" ry="5" fill="${p.accent}" transform="rotate(10 73 30)"/>
    <circle cx="46" cy="26" r="7" fill="white" stroke="${p.bodyDark}" stroke-width="1"/>
    <circle cx="74" cy="26" r="7" fill="white" stroke="${p.bodyDark}" stroke-width="1"/>
    <circle cx="47" cy="27" r="4.5" fill="${p.eye}"/>
    <circle cx="75" cy="27" r="4.5" fill="${p.eye}"/>
    <circle cx="44.5" cy="24.5" r="2" fill="#fff"/>
    <circle cx="72.5" cy="24.5" r="2" fill="#fff"/>
    <circle cx="48" cy="29" r="1" fill="#fff" opacity="0.5"/>
    <circle cx="76" cy="29" r="1" fill="#fff" opacity="0.5"/>
    
    <!-- Mouth -->
    <path d="M 56 43 Q 60 46 64 43" fill="none" stroke="${p.bodyDark}" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
    
    <!-- Tiny tucked tail (squats curl their tail under) -->
    <ellipse cx="60" cy="84" rx="10" ry="5" fill="${p.accent}" stroke="${p.bodyDark}" stroke-width="0.8"/>
    <path d="M 54 88 Q 60 93 66 88" fill="${p.body}" stroke="${p.bodyDark}" stroke-width="0.8"/>
  </svg>`;
}

// ================================================================
// SPINY LOBSTER — long antennae, tiny claws, spikes, elongated
// ================================================================
function buildSpinyLobster(p) {
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <!-- LONG antennae (the defining feature! way longer than others) -->
    <line x1="48" y1="28" x2="15" y2="2" stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="72" y1="28" x2="105" y2="2" stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Antenna barbs/segments -->
    <circle cx="28" cy="12" r="1.5" fill="${p.bodyLight}"/>
    <circle cx="92" cy="12" r="1.5" fill="${p.bodyLight}"/>
    <circle cx="38" cy="20" r="1.2" fill="${p.bodyLight}"/>
    <circle cx="82" cy="20" r="1.2" fill="${p.bodyLight}"/>
    <!-- Secondary shorter antennae -->
    <line x1="50" y1="30" x2="38" y2="14" stroke="${p.bodyLight}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="70" y1="30" x2="82" y2="14" stroke="${p.bodyLight}" stroke-width="1.5" stroke-linecap="round"/>
    
    <!-- Tiny claw arms (spiny lobsters have NO big claws) -->
    <rect x="28" y="34" width="4" height="12" rx="2" fill="${p.accent}" transform="rotate(-15 30 40)"/>
    <rect x="88" y="34" width="4" height="12" rx="2" fill="${p.accent}" transform="rotate(15 90 40)"/>
    
    <!-- Tiny claws (just little nubs) -->
    <ellipse cx="24" cy="32" rx="6" ry="5" fill="${p.claw}" stroke="${p.clawDark}" stroke-width="1"/>
    <ellipse cx="96" cy="32" rx="6" ry="5" fill="${p.claw}" stroke="${p.clawDark}" stroke-width="1"/>
    
    <!-- Legs (3 pairs) -->
    <line x1="44" y1="54" x2="28" y2="48" stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="42" y1="62" x2="26" y2="61" stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="44" y1="70" x2="28" y2="74" stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="76" y1="54" x2="92" y2="48" stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="78" y1="62" x2="94" y2="61" stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="76" y1="70" x2="92" y2="74" stroke="${p.accent}" stroke-width="2.5" stroke-linecap="round"/>
    
    <!-- Body (slightly narrower, more elongated) -->
    <ellipse cx="60" cy="62" rx="20" ry="20" fill="${p.body}" stroke="${p.bodyDark}" stroke-width="1.5"/>
    
    <!-- SPINES on body edges (the whole point!) -->
    <polygon points="37,52 34,48 40,50" fill="${p.bodyLight}" stroke="${p.bodyDark}" stroke-width="0.8"/>
    <polygon points="83,52 86,48 80,50" fill="${p.bodyLight}" stroke="${p.bodyDark}" stroke-width="0.8"/>
    <polygon points="36,60 32,58 38,59" fill="${p.bodyLight}" stroke="${p.bodyDark}" stroke-width="0.8"/>
    <polygon points="84,60 88,58 82,59" fill="${p.bodyLight}" stroke="${p.bodyDark}" stroke-width="0.8"/>
    <polygon points="37,68 33,68 38,66" fill="${p.bodyLight}" stroke="${p.bodyDark}" stroke-width="0.8"/>
    <polygon points="83,68 87,68 82,66" fill="${p.bodyLight}" stroke="${p.bodyDark}" stroke-width="0.8"/>
    <polygon points="40,75 36,76 40,73" fill="${p.bodyLight}" stroke="${p.bodyDark}" stroke-width="0.8"/>
    <polygon points="80,75 84,76 80,73" fill="${p.bodyLight}" stroke="${p.bodyDark}" stroke-width="0.8"/>
    
    <!-- Belly highlight -->
    <ellipse cx="60" cy="64" rx="12" ry="12" fill="${p.belly}" opacity="0.3"/>
    
    <!-- Armored shell lines -->
    <path d="M 44 56 Q 60 51 76 56" fill="none" stroke="${p.bodyLight}" stroke-width="0.8" opacity="0.35"/>
    <path d="M 44 64 Q 60 60 76 64" fill="none" stroke="${p.bodyLight}" stroke-width="0.6" opacity="0.25"/>
    <path d="M 46 72 Q 60 69 74 72" fill="none" stroke="${p.bodyLight}" stroke-width="0.6" opacity="0.25"/>
    
    <!-- Head (armored, angular, spines on top) -->
    <ellipse cx="60" cy="38" rx="18" ry="13" fill="${p.body}" stroke="${p.bodyDark}" stroke-width="1.5"/>
    <!-- Head spines -->
    <polygon points="50,26 48,20 53,25" fill="${p.bodyLight}" stroke="${p.bodyDark}" stroke-width="0.8"/>
    <polygon points="60,24 60,17 62,24" fill="${p.bodyLight}" stroke="${p.bodyDark}" stroke-width="0.8"/>
    <polygon points="70,26 72,20 67,25" fill="${p.bodyLight}" stroke="${p.bodyDark}" stroke-width="0.8"/>
    
    <!-- Eyes (slightly smaller, more fierce) -->
    <circle cx="50" cy="36" r="6" fill="white" stroke="${p.bodyDark}" stroke-width="1"/>
    <circle cx="70" cy="36" r="6" fill="white" stroke="${p.bodyDark}" stroke-width="1"/>
    <circle cx="51" cy="37" r="4" fill="${p.eye}"/>
    <circle cx="71" cy="37" r="4" fill="${p.eye}"/>
    <circle cx="49" cy="34.5" r="1.8" fill="#fff"/>
    <circle cx="69" cy="34.5" r="1.8" fill="#fff"/>
    
    <!-- Mouth (slight frown — tough guy) -->
    <path d="M 56 44 Q 60 43 64 44" fill="none" stroke="${p.bodyDark}" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
    
    <!-- Tail segments (normal length) -->
    <rect x="47" y="78" width="26" height="10" rx="5" fill="${p.body}" stroke="${p.bodyDark}" stroke-width="1"/>
    <!-- Tail spines -->
    <circle cx="44" cy="82" r="2" fill="${p.bodyLight}" stroke="${p.bodyDark}" stroke-width="0.6"/>
    <circle cx="76" cy="82" r="2" fill="${p.bodyLight}" stroke="${p.bodyDark}" stroke-width="0.6"/>
    
    <rect x="50" y="86" width="20" height="8" rx="4" fill="${p.accent}" stroke="${p.bodyDark}" stroke-width="0.8"/>
    
    <!-- Tail fan -->
    <path d="M 50 92 Q 42 106 36 108 Q 48 102 60 104 Q 72 102 84 108 Q 78 106 70 92" 
          fill="${p.body}" stroke="${p.bodyDark}" stroke-width="1"/>
    <line x1="53" y1="94" x2="46" y2="104" stroke="${p.bodyDark}" stroke-width="0.6" opacity="0.4"/>
    <line x1="60" y1="95" x2="60" y2="104" stroke="${p.bodyDark}" stroke-width="0.6" opacity="0.4"/>
    <line x1="67" y1="94" x2="74" y2="104" stroke="${p.bodyDark}" stroke-width="0.6" opacity="0.4"/>
  </svg>`;
}

function buildSplitLobster(p) {
  // Split lobster: left half red, right half blue
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="leftHalf"><rect x="0" y="0" width="60" height="120"/></clipPath>
      <clipPath id="rightHalf"><rect x="60" y="0" width="60" height="120"/></clipPath>
    </defs>
    
    <!-- Antennae -->
    <line x1="47" y1="30" x2="32" y2="6" stroke="${p.bodyDarkL}" stroke-width="2" stroke-linecap="round"/>
    <line x1="73" y1="30" x2="88" y2="6" stroke="${p.bodyDarkR}" stroke-width="2" stroke-linecap="round"/>
    
    <!-- Claw Arms -->
    <rect x="22" y="32" width="6" height="16" rx="3" fill="${p.bodyDarkL}" transform="rotate(-20 25 40)"/>
    <rect x="92" y="32" width="6" height="16" rx="3" fill="${p.bodyDarkR}" transform="rotate(20 95 40)"/>
    
    <!-- Left Claw (red) -->
    <ellipse cx="16" cy="26" rx="13" ry="10" fill="${p.claw}" stroke="${p.clawDark}" stroke-width="1.5"/>
    <path d="M 8 19 Q 16 15 24 19" fill="none" stroke="${p.clawDark}" stroke-width="1.5" stroke-linecap="round"/>
    
    <!-- Right Claw (blue) -->
    <ellipse cx="104" cy="26" rx="13" ry="10" fill="${p.clawR}" stroke="${p.clawDarkR}" stroke-width="1.5"/>
    <path d="M 96 19 Q 104 15 112 19" fill="none" stroke="${p.clawDarkR}" stroke-width="1.5" stroke-linecap="round"/>
    
    <!-- Legs -->
    <line x1="42" y1="56" x2="26" y2="50" stroke="${p.bodyDarkL}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="40" y1="64" x2="24" y2="63" stroke="${p.bodyDarkL}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="42" y1="72" x2="26" y2="76" stroke="${p.bodyDarkL}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="78" y1="56" x2="94" y2="50" stroke="${p.bodyDarkR}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="80" y1="64" x2="96" y2="63" stroke="${p.bodyDarkR}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="78" y1="72" x2="94" y2="76" stroke="${p.bodyDarkR}" stroke-width="2.5" stroke-linecap="round"/>
    
    <!-- Body LEFT (red) -->
    <ellipse cx="60" cy="62" rx="22" ry="20" fill="${p.bodyL}" stroke="${p.bodyDarkL}" stroke-width="1.5" clip-path="url(#leftHalf)"/>
    <!-- Body RIGHT (blue) -->
    <ellipse cx="60" cy="62" rx="22" ry="20" fill="${p.bodyR}" stroke="${p.bodyDarkR}" stroke-width="1.5" clip-path="url(#rightHalf)"/>
    <!-- Center seam -->
    <line x1="60" y1="42" x2="60" y2="82" stroke="${p.accent}" stroke-width="1" opacity="0.5" stroke-dasharray="2,2"/>
    
    <!-- Belly highlight -->
    <ellipse cx="60" cy="64" rx="14" ry="12" fill="${p.belly}" opacity="0.25"/>
    
    <!-- Head LEFT -->
    <ellipse cx="60" cy="38" rx="19" ry="14" fill="${p.bodyL}" stroke="${p.bodyDarkL}" stroke-width="1.5" clip-path="url(#leftHalf)"/>
    <!-- Head RIGHT -->
    <ellipse cx="60" cy="38" rx="19" ry="14" fill="${p.bodyR}" stroke="${p.bodyDarkR}" stroke-width="1.5" clip-path="url(#rightHalf)"/>
    
    <!-- Eyes -->
    <circle cx="50" cy="36" r="7" fill="white" stroke="${p.bodyDarkL}" stroke-width="1"/>
    <circle cx="70" cy="36" r="7" fill="white" stroke="${p.bodyDarkR}" stroke-width="1"/>
    <circle cx="51" cy="37" r="4.5" fill="${p.eye}"/>
    <circle cx="71" cy="37" r="4.5" fill="${p.eye}"/>
    <circle cx="48.5" cy="34.5" r="2" fill="#fff"/>
    <circle cx="68.5" cy="34.5" r="2" fill="#fff"/>
    <circle cx="52" cy="39" r="1" fill="#fff" opacity="0.5"/>
    <circle cx="72" cy="39" r="1" fill="#fff" opacity="0.5"/>
    
    <!-- Mouth -->
    <path d="M 56 44 Q 60 47 64 44" fill="none" stroke="${p.accent}" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
    
    <!-- Tail -->
    <rect x="47" y="78" width="13" height="10" rx="5" fill="${p.bodyL}" stroke="${p.bodyDarkL}" stroke-width="1"/>
    <rect x="60" y="78" width="13" height="10" rx="5" fill="${p.bodyR}" stroke="${p.bodyDarkR}" stroke-width="1"/>
    <rect x="50" y="86" width="10" height="8" rx="4" fill="${p.bodyDarkL}" stroke="${p.bodyDarkL}" stroke-width="0.8"/>
    <rect x="60" y="86" width="10" height="8" rx="4" fill="${p.bodyDarkR}" stroke="${p.bodyDarkR}" stroke-width="0.8"/>
    
    <!-- Tail fan -->
    <path d="M 50 92 Q 42 106 36 108 Q 48 102 60 104 Q 72 102 84 108 Q 78 106 70 92" 
          fill="${p.belly}" stroke="${p.accent}" stroke-width="1" opacity="0.7"/>
  </svg>`;
}

// Export for use in HTML
if (typeof window !== 'undefined') {
  window.createLobsterSVG = createLobsterSVG;
  window.LOBSTER_PALETTES = LOBSTER_PALETTES;
}
