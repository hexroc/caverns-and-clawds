/**
 * CLASS ICONS — SVG art for Caverns & Clawds classes
 * Each class gets a unique weapon/item icon with animations
 * Usage: createClassIcon('fighter') → returns HTML string
 */

function createClassIcon(classId) {
  const builders = {
    fighter: buildFighterIcon,
    rogue: buildRogueIcon,
    cleric: buildClericIcon,
    wizard: buildWizardIcon,
    warlock: buildWarlockIcon,
    paladin: buildPaladinIcon,
    bard: buildBardIcon
  };
  const builder = builders[classId] || builders.fighter;
  return `<div class="class-icon-svg">${builder()}</div>`;
}

// ⚔️ FIGHTER — Crossed coral swords
function buildFighterIcon() {
  return `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <!-- Left sword -->
    <g>
      <rect x="18" y="8" width="5" height="42" rx="2" fill="#B0B8C8" stroke="#7A8498" stroke-width="1" transform="rotate(-20 20 30)"/>
      <rect x="18" y="8" width="5" height="8" rx="2" fill="#D4D8E0" transform="rotate(-20 20 30)"/>
      <rect x="12" y="46" width="17" height="5" rx="2" fill="#C8A060" stroke="#A08040" stroke-width="1" transform="rotate(-20 20 30)"/>
      <rect x="17" y="50" width="7" height="10" rx="2" fill="#8B4513" transform="rotate(-20 20 30)"/>
      <animateTransform attributeName="transform" type="rotate" values="0 40 40; -3 40 40; 0 40 40; 2 40 40; 0 40 40" dur="4s" repeatCount="indefinite"/>
    </g>
    <!-- Right sword -->
    <g>
      <rect x="57" y="8" width="5" height="42" rx="2" fill="#B0B8C8" stroke="#7A8498" stroke-width="1" transform="rotate(20 60 30)"/>
      <rect x="57" y="8" width="5" height="8" rx="2" fill="#D4D8E0" transform="rotate(20 60 30)"/>
      <rect x="51" y="46" width="17" height="5" rx="2" fill="#C8A060" stroke="#A08040" stroke-width="1" transform="rotate(20 60 30)"/>
      <rect x="57" y="50" width="7" height="10" rx="2" fill="#8B4513" transform="rotate(20 60 30)"/>
      <animateTransform attributeName="transform" type="rotate" values="0 40 40; 3 40 40; 0 40 40; -2 40 40; 0 40 40" dur="4s" repeatCount="indefinite" begin="0.3s"/>
    </g>
    <!-- Impact spark -->
    <circle cx="40" cy="28" r="4" fill="#FFD700" opacity="0.6">
      <animate attributeName="opacity" values="0.6;1;0.6;0.3;0.6" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite"/>
    </circle>
  </svg>`;
}

// 🗡️ ROGUE — Dagger with poison drip
function buildRogueIcon() {
  return `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <g>
      <!-- Blade -->
      <path d="M 40 8 L 46 45 L 40 50 L 34 45 Z" fill="linear-gradient(#C8D0E0, #8890A8)" stroke="#6A7088" stroke-width="1"/>
      <path d="M 40 8 L 46 45 L 40 50 L 34 45 Z" fill="#A8B0C8" stroke="#6A7088" stroke-width="1"/>
      <!-- Blade edge highlight -->
      <line x1="40" y1="12" x2="40" y2="48" stroke="#D0D8E8" stroke-width="1" opacity="0.5"/>
      <!-- Crossguard -->
      <ellipse cx="40" cy="50" rx="12" ry="3" fill="#4A2060" stroke="#3A1850" stroke-width="1"/>
      <!-- Handle -->
      <rect x="37" y="52" width="6" height="14" rx="2" fill="#2A0A40" stroke="#1A0030" stroke-width="0.8"/>
      <!-- Wrap bands -->
      <rect x="37" y="55" width="6" height="2" rx="1" fill="#6A4080" opacity="0.6"/>
      <rect x="37" y="60" width="6" height="2" rx="1" fill="#6A4080" opacity="0.6"/>
      <!-- Pommel -->
      <circle cx="40" cy="68" r="4" fill="#4A2060" stroke="#3A1850" stroke-width="1"/>
      <circle cx="40" cy="68" r="1.5" fill="#8A60B0"/>
      <!-- Poison drip -->
      <ellipse cx="43" cy="36" rx="2" ry="3" fill="#50C878" opacity="0.7">
        <animate attributeName="cy" values="36;46;36" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.7;0.3;0.7" dur="3s" repeatCount="indefinite"/>
      </ellipse>
      <animateTransform attributeName="transform" type="translate" values="0,0; 0,-2; 0,0" dur="3s" repeatCount="indefinite"/>
    </g>
  </svg>`;
}

// ✨ CLERIC — Holy shell staff with glow
function buildClericIcon() {
  return `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <!-- Staff -->
    <rect x="38" y="20" width="4" height="50" rx="2" fill="#C8A060" stroke="#A08040" stroke-width="1"/>
    <!-- Shell top piece -->
    <path d="M 28 22 Q 40 5 52 22 Q 48 16 40 14 Q 32 16 28 22" fill="#FFD700" stroke="#D4A800" stroke-width="1"/>
    <path d="M 30 21 Q 40 8 50 21" fill="none" stroke="#FFF8DC" stroke-width="0.8" opacity="0.5"/>
    <!-- Cross/holy symbol -->
    <rect x="37" y="10" width="6" height="16" rx="1" fill="#FFD700" stroke="#D4A800" stroke-width="0.8"/>
    <rect x="32" y="14" width="16" height="5" rx="1" fill="#FFD700" stroke="#D4A800" stroke-width="0.8"/>
    <!-- Holy glow -->
    <circle cx="40" cy="18" r="10" fill="none" stroke="#FFD700" stroke-width="1" opacity="0.4">
      <animate attributeName="r" values="10;14;10" dur="2.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.4;0.15;0.4" dur="2.5s" repeatCount="indefinite"/>
    </circle>
    <circle cx="40" cy="18" r="6" fill="#FFD700" opacity="0.15">
      <animate attributeName="r" values="6;9;6" dur="2.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.15;0.05;0.15" dur="2.5s" repeatCount="indefinite"/>
    </circle>
    <!-- Staff wraps -->
    <rect x="37" y="38" width="6" height="2" rx="1" fill="#8B6914" opacity="0.5"/>
    <rect x="37" y="44" width="6" height="2" rx="1" fill="#8B6914" opacity="0.5"/>
  </svg>`;
}

// 🔮 WIZARD — Arcane orb on coral staff
function buildWizardIcon() {
  return `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <!-- Staff (coral) -->
    <rect x="38" y="28" width="4" height="44" rx="2" fill="#E06050" stroke="#B04040" stroke-width="1"/>
    <!-- Coral branches at top -->
    <path d="M 34 30 Q 30 22 32 16" fill="none" stroke="#E06050" stroke-width="3" stroke-linecap="round"/>
    <path d="M 46 30 Q 50 22 48 16" fill="none" stroke="#E06050" stroke-width="3" stroke-linecap="round"/>
    <path d="M 36 28 Q 34 20 36 14" fill="none" stroke="#D05848" stroke-width="2" stroke-linecap="round"/>
    <path d="M 44 28 Q 46 20 44 14" fill="none" stroke="#D05848" stroke-width="2" stroke-linecap="round"/>
    <!-- Arcane orb -->
    <circle cx="40" cy="18" r="10" fill="#3A2080" stroke="#6A40C0" stroke-width="1.5"/>
    <circle cx="40" cy="18" r="7" fill="#5030A0" opacity="0.6"/>
    <circle cx="37" cy="15" r="3" fill="#8060D0" opacity="0.4"/>
    <circle cx="40" cy="18" r="10" fill="none" stroke="#8A60E0" stroke-width="0.5" opacity="0.6">
      <animate attributeName="r" values="10;12;10" dur="3s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.6;0.2;0.6" dur="3s" repeatCount="indefinite"/>
    </circle>
    <!-- Arcane sparkles -->
    <circle cx="34" cy="12" r="1" fill="#C0A0FF">
      <animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="47" cy="20" r="1" fill="#C0A0FF">
      <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="40" cy="8" r="0.8" fill="#E0C0FF">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite"/>
    </circle>
  </svg>`;
}

// 👁️ WARLOCK — Eldritch eye tome
function buildWarlockIcon() {
  return `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <!-- Book -->
    <rect x="16" y="18" width="48" height="50" rx="3" fill="#1A0A30" stroke="#3A1860" stroke-width="1.5"/>
    <!-- Book spine -->
    <rect x="16" y="18" width="8" height="50" rx="2" fill="#2A1040" stroke="#3A1860" stroke-width="1"/>
    <!-- Pages edge -->
    <rect x="24" y="20" width="38" height="46" rx="2" fill="#2A1A40" opacity="0.5"/>
    <!-- Eldritch eye -->
    <ellipse cx="42" cy="42" rx="14" ry="10" fill="#0A0020" stroke="#6A40A0" stroke-width="1.5"/>
    <!-- Iris -->
    <circle cx="42" cy="42" r="6" fill="#8A20C0">
      <animate attributeName="r" values="6;4;6;7;6" dur="4s" repeatCount="indefinite"/>
    </circle>
    <!-- Pupil -->
    <ellipse cx="42" cy="42" rx="3" ry="5" fill="#200040">
      <animate attributeName="rx" values="3;2;3;4;3" dur="4s" repeatCount="indefinite"/>
    </ellipse>
    <!-- Eye glow -->
    <circle cx="42" cy="42" r="12" fill="none" stroke="#8A40D0" stroke-width="0.8" opacity="0.3">
      <animate attributeName="r" values="12;16;12" dur="3s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.3;0.1;0.3" dur="3s" repeatCount="indefinite"/>
    </circle>
    <!-- Eye highlight -->
    <circle cx="39" cy="39" r="2" fill="#D0A0FF" opacity="0.5"/>
    <!-- Tendrils -->
    <path d="M 28 35 Q 22 30 18 32" fill="none" stroke="#6A30A0" stroke-width="1.5" opacity="0.5">
      <animate attributeName="d" values="M 28 35 Q 22 30 18 32; M 28 35 Q 22 28 16 30; M 28 35 Q 22 30 18 32" dur="5s" repeatCount="indefinite"/>
    </path>
    <path d="M 56 35 Q 62 30 66 32" fill="none" stroke="#6A30A0" stroke-width="1.5" opacity="0.5">
      <animate attributeName="d" values="M 56 35 Q 62 30 66 32; M 56 35 Q 62 28 68 30; M 56 35 Q 62 30 66 32" dur="5s" repeatCount="indefinite" begin="0.5s"/>
    </path>
  </svg>`;
}

// 🛡️ PALADIN — Shield with holy crest
function buildPaladinIcon() {
  return `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <!-- Shield shape -->
    <path d="M 40 8 L 64 18 L 62 50 Q 52 65 40 72 Q 28 65 18 50 L 16 18 Z" fill="#2A4580" stroke="#4B70C8" stroke-width="1.5"/>
    <!-- Shield inner -->
    <path d="M 40 14 L 58 22 L 56 48 Q 48 60 40 66 Q 32 60 24 48 L 22 22 Z" fill="#1E3460" stroke="#3B5FB8" stroke-width="0.8"/>
    <!-- Holy cross emblem -->
    <rect x="37" y="22" width="6" height="30" rx="1" fill="#FFD700" stroke="#D4A800" stroke-width="0.8"/>
    <rect x="28" y="32" width="24" height="6" rx="1" fill="#FFD700" stroke="#D4A800" stroke-width="0.8"/>
    <!-- Shield glow -->
    <path d="M 40 8 L 64 18 L 62 50 Q 52 65 40 72 Q 28 65 18 50 L 16 18 Z" fill="none" stroke="#FFD700" stroke-width="1" opacity="0.3">
      <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite"/>
    </path>
    <!-- Sparkle at cross center -->
    <circle cx="40" cy="35" r="2" fill="#FFF8DC" opacity="0.6">
      <animate attributeName="r" values="2;4;2" dur="2.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2.5s" repeatCount="indefinite"/>
    </circle>
  </svg>`;
}

// 🎵 BARD — Conch shell horn
function buildBardIcon() {
  return `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <g>
      <!-- Conch shell body -->
      <path d="M 24 52 Q 18 40 22 28 Q 28 16 42 14 Q 56 12 62 24 Q 66 34 58 48 Q 50 58 38 58 Z" 
            fill="#E8A080" stroke="#C07858" stroke-width="1.5"/>
      <!-- Shell spiral -->
      <path d="M 42 20 Q 54 18 58 28 Q 60 36 52 44 Q 46 50 38 48 Q 32 44 34 36 Q 36 30 42 28" 
            fill="none" stroke="#C88868" stroke-width="1.2" opacity="0.6"/>
      <path d="M 44 26 Q 52 26 54 32 Q 54 38 48 42 Q 42 44 40 38" 
            fill="none" stroke="#D89878" stroke-width="1" opacity="0.5"/>
      <!-- Shell ridges -->
      <path d="M 26 46 Q 30 44 34 46" fill="none" stroke="#D09070" stroke-width="1" opacity="0.4"/>
      <path d="M 24 40 Q 28 38 32 40" fill="none" stroke="#D09070" stroke-width="1" opacity="0.4"/>
      <!-- Shell opening (bell) -->
      <ellipse cx="28" cy="52" rx="8" ry="6" fill="#F0C0A0" stroke="#C07858" stroke-width="1"/>
      <ellipse cx="28" cy="52" rx="5" ry="4" fill="#D0A080" opacity="0.5"/>
      <!-- Sound waves -->
      <path d="M 18 48 Q 12 44 8 46" fill="none" stroke="#4ECDC4" stroke-width="1.5" opacity="0.5" stroke-linecap="round">
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/>
      </path>
      <path d="M 16 52 Q 8 52 4 50" fill="none" stroke="#4ECDC4" stroke-width="1.5" opacity="0.4" stroke-linecap="round">
        <animate attributeName="opacity" values="0;0.5;0" dur="2s" repeatCount="indefinite"/>
      </path>
      <path d="M 18 56 Q 12 60 8 58" fill="none" stroke="#4ECDC4" stroke-width="1.5" opacity="0.3" stroke-linecap="round">
        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" begin="0.5s"/>
      </path>
      <!-- Musical notes -->
      <g>
        <circle cx="14" cy="36" r="2.5" fill="#FFD700" opacity="0.7"/>
        <line x1="16.5" y1="36" x2="16.5" y2="26" stroke="#FFD700" stroke-width="1.2" opacity="0.7"/>
        <animate attributeName="transform" type="translate" values="0,0; -4,-6; 0,0" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.7;0.3;0.7" dur="3s" repeatCount="indefinite"/>
      </g>
      <animateTransform attributeName="transform" type="rotate" values="0 40 40; -2 40 40; 0 40 40; 2 40 40; 0 40 40" dur="4s" repeatCount="indefinite"/>
    </g>
  </svg>`;
}

if (typeof window !== 'undefined') {
  window.createClassIcon = createClassIcon;
}
