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
    body: '#E88020', bodyDark: '#C06010', bodyLight: '#FFA040',
    claw: '#F09030', clawDark: '#C06010',
    belly: '#FFD0A0', accent: '#D87020',
    eye: '#111', eyeRing: '#F09030',
    compact: true // squats are rounder, shorter tail
  },
  spiny: {
    body: '#D07028', bodyDark: '#A05018', bodyLight: '#E89048',
    claw: '#C08038', clawDark: '#A05018',
    belly: '#F0C090', accent: '#E08838',
    eye: '#111', eyeRing: '#D07028',
    spiny: true // has spines/thorns on body
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
  
  // Spiny: add thorns on body
  if (p.spiny) {
    extras += `
      <circle cx="38" cy="52" r="2.5" fill="${p.accent}" stroke="${p.bodyDark}" stroke-width="0.8"/>
      <circle cx="82" cy="52" r="2.5" fill="${p.accent}" stroke="${p.bodyDark}" stroke-width="0.8"/>
      <circle cx="36" cy="62" r="2" fill="${p.accent}" stroke="${p.bodyDark}" stroke-width="0.8"/>
      <circle cx="84" cy="62" r="2" fill="${p.accent}" stroke="${p.bodyDark}" stroke-width="0.8"/>
      <circle cx="40" cy="72" r="2" fill="${p.accent}" stroke="${p.bodyDark}" stroke-width="0.8"/>
      <circle cx="80" cy="72" r="2" fill="${p.accent}" stroke="${p.bodyDark}" stroke-width="0.8"/>
    `;
  }
  
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
  
  // Tail length (squat = shorter)
  const tailY = p.compact ? 82 : 78;
  const tailH = p.compact ? 7 : 10;
  const seg2Y = p.compact ? 87 : 86;
  const seg2H = p.compact ? 6 : 8;
  const fanY = p.compact ? 91 : 92;
  
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
