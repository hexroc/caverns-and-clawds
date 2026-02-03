// CSS Avatar Generator for Caverns & Clawds
// Generates unique avatars using CSS only - no external images

const AVATAR_SHAPES = ['circle', 'hexagon', 'diamond', 'shield', 'square'];
const AVATAR_PATTERNS = ['solid', 'gradient', 'split', 'radial', 'stripe'];
const AVATAR_COLORS = [
  { name: 'fire', colors: ['#dc2626', '#f97316', '#fbbf24'] },
  { name: 'ice', colors: ['#0ea5e9', '#06b6d4', '#22d3ee'] },
  { name: 'nature', colors: ['#16a34a', '#22c55e', '#4ade80'] },
  { name: 'void', colors: ['#7c3aed', '#8b5cf6', '#a78bfa'] },
  { name: 'gold', colors: ['#b45309', '#d97706', '#f59e0b'] },
  { name: 'shadow', colors: ['#374151', '#4b5563', '#6b7280'] },
  { name: 'blood', colors: ['#991b1b', '#dc2626', '#ef4444'] },
  { name: 'ocean', colors: ['#0369a1', '#0284c7', '#0ea5e9'] },
  { name: 'forest', colors: ['#166534', '#15803d', '#22c55e'] },
  { name: 'royal', colors: ['#5b21b6', '#7c3aed', '#8b5cf6'] },
  { name: 'rust', colors: ['#78350f', '#92400e', '#b45309'] },
  { name: 'cyber', colors: ['#06b6d4', '#22d3ee', '#67e8f9'] }
];

const AVATAR_ICONS = [
  '⚔️', '🛡️', '🗡️', '🪓', '🏹', '🔮', '📖', '💀', '👁️', '🐉',
  '🦊', '🐺', '🦅', '🐍', '🕷️', '🦇', '🔥', '❄️', '⚡', '🌙',
  '☀️', '⭐', '💎', '🗝️', '⚙️', '🎭', '👻', '🧙', '🧝', '🧟'
];

// Generate a deterministic avatar based on a seed (name)
function generateAvatarCSS(seed, options = {}) {
  const hash = hashString(seed);
  
  const shape = options.shape || AVATAR_SHAPES[hash % AVATAR_SHAPES.length];
  const pattern = options.pattern || AVATAR_PATTERNS[(hash >> 4) % AVATAR_PATTERNS.length];
  const colorScheme = options.colorScheme || AVATAR_COLORS[(hash >> 8) % AVATAR_COLORS.length];
  const icon = options.icon || AVATAR_ICONS[(hash >> 12) % AVATAR_ICONS.length];
  const rotation = (hash >> 16) % 360;
  
  let css = generateShapeCSS(shape);
  css += generatePatternCSS(pattern, colorScheme.colors, rotation);
  
  return {
    css,
    icon,
    shape,
    pattern,
    colorScheme: colorScheme.name
  };
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generateShapeCSS(shape) {
  switch (shape) {
    case 'hexagon':
      return 'clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);';
    case 'diamond':
      return 'clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);';
    case 'shield':
      return 'clip-path: polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%);';
    case 'square':
      return 'border-radius: 8px;';
    case 'circle':
    default:
      return 'border-radius: 50%;';
  }
}

function generatePatternCSS(pattern, colors, rotation) {
  const [c1, c2, c3] = colors;
  
  switch (pattern) {
    case 'gradient':
      return `background: linear-gradient(${rotation}deg, ${c1} 0%, ${c2} 50%, ${c3} 100%);`;
    case 'split':
      return `background: linear-gradient(${rotation}deg, ${c1} 0%, ${c1} 50%, ${c2} 50%, ${c2} 100%);`;
    case 'radial':
      return `background: radial-gradient(circle at 30% 30%, ${c3} 0%, ${c2} 40%, ${c1} 100%);`;
    case 'stripe':
      return `background: repeating-linear-gradient(${rotation}deg, ${c1} 0px, ${c1} 4px, ${c2} 4px, ${c2} 8px);`;
    case 'solid':
    default:
      return `background: ${c2}; box-shadow: inset 0 0 20px ${c1}, inset 0 -10px 20px ${c3};`;
  }
}

// Generate full avatar HTML
function generateAvatarHTML(seed, size = 60, options = {}) {
  const avatar = generateAvatarCSS(seed, options);
  
  return `
    <div class="css-avatar" style="
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size * 0.5}px;
      ${avatar.css}
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    ">
      <span style="filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));">${avatar.icon}</span>
    </div>
  `;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateAvatarCSS, generateAvatarHTML, AVATAR_SHAPES, AVATAR_PATTERNS, AVATAR_COLORS, AVATAR_ICONS };
}
