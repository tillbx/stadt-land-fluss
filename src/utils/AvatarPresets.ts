export interface AvatarPreset {
  id: string;
  emoji: string;
  gradient: string;
}

const EMOJIS = [
  // Animals & Creatures
  '🦊', '🤖', '🦄', '🐼', '🦁', '🐯', '🦖', '🐨', '🐻', '🐼',
  '🐱', '🐶', '🐭', '🐹', '🐰', '🐸', '🐵', '🐔', '🐧', '🐦',
  '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🐝', '🐛', '🦋',
  '🐌', '🐞', '🐙', '🐠', '🐬', '🐳', '🦈', '🐊', '🐆', '🦓',
  '🦍', '🐘', '🦛', '🦏', '🦒', '🦘', '🐑', '🐐', '🐪', '🦙',
  // Food & Drink
  '🍕', '🥑', '🍿', '🍦', '🍪', '🍩', '🍔', '🍟', '🌭', '🌮',
  '🍣', '🍙', '🍇', '🍉', '🍊', '🍋', '🍌', '🍍', '🍎', '🍐',
  '🍑', '🍒', '🍓', '🥝', '🍅', '🥥', '🥦', '🌽', '🌶️', '🍄',
  // Activity & Hobby
  '🚀', '💡', '⚽', '🎮', '🎨', '🎸', '🎈', '🥋', '🛹', '自行车',
  '🚲', '🛵', '🏍️', '🏎️', '✈️', '🛸', '🎯', '🎳', '🎤', '🎷',
  '🎺', '🎹', '🎬', '🧩', '🃏', '♟️',
  // Objects & Symbols
  '💎', '🔮', '🔑', '🎁', '🍀', '🍁', '🍄', '🌵', '🌲', '🌈',
  '⚡', '❄️', '🔥', '☀️', '🌙', '⭐', '🌊', '🌋', '⛺', '⚓',
  '🪐', '🧭', '⏰', '🔋', '🏆', '🎟️', '🔔', '🎭', '🎨', '🧩'
];

const GRADIENTS = [
  'linear-gradient(135deg, #FF5E62 0%, #FF9966 100%)',
  'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)',
  'linear-gradient(135deg, #ff007f 0%, #7f00ff 100%)',
  'linear-gradient(135deg, #232526 0%, #414345 100%)',
  'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
  'linear-gradient(135deg, #F9D423 0%, #FF4E50 100%)',
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'linear-gradient(135deg, #ED213A 0%, #93291E 100%)',
  'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
  'linear-gradient(135deg, #ffe000 0%, #799f0c 100%)',
  'linear-gradient(135deg, #3a7bd5 0%, #3a6073 100%)',
  'linear-gradient(135deg, #02aab0 0%, #00cdac 100%)',
  'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)',
  'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
  'linear-gradient(135deg, #dd2476 0%, #ff512f 100%)',
  'linear-gradient(135deg, #a8ff78 0%, #78ffd6 100%)',
  'linear-gradient(135deg, #e65c00 0%, #F9D423 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #9be15d 0%, #00e3ae 100%)',
  'linear-gradient(135deg, #e52d27 0%, #b31217 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
  'linear-gradient(135deg, #f107a3 0%, #7b2ff7 100%)',
  'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
  'linear-gradient(135deg, #182848 0%, #4b6cb7 100%)'
];

export const AVATAR_PRESETS: AvatarPreset[] = Array.from({ length: 150 }).map((_, idx) => {
  const emoji = EMOJIS[idx % EMOJIS.length];
  const gradient = GRADIENTS[idx % GRADIENTS.length];
  return {
    id: `preset_${idx + 1}`,
    emoji,
    gradient
  };
});

export const getAvatarPreset = (id: string): AvatarPreset | undefined => {
  return AVATAR_PRESETS.find(p => p.id === id);
};
