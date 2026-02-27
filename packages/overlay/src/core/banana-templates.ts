import type { Locale } from './i18n';

export interface BananaTemplate {
  id: string;
  name: Record<string, string>;
  emoji: string;
  prompt: string;
}

export function getTemplateName(tpl: BananaTemplate, locale: Locale): string {
  return tpl.name[locale] || tpl.name.en;
}

export const bananaTemplates: BananaTemplate[] = [
  {
    id: 'glassmorphism',
    name: { en: 'Frosted Glass', ja: 'すりガラス', zh: '磨砂玻璃', ko: '유리 효과', fr: 'Verre givré', de: 'Milchglas', es: 'Cristal esmerilado', pt: 'Vidro fosco', it: 'Vetro smerigliato', ru: 'Матовое стекло', ar: 'زجاج بلوري', hi: 'धुंधला कांच' },
    emoji: '🧊',
    prompt: 'Apply glassmorphism style: frosted glass backgrounds with backdrop-blur, semi-transparent white/light panels, subtle light borders, soft drop shadows. Everything should feel like frosted glass floating over the background.',
  },
  {
    id: 'neomorphism',
    name: { en: 'Soft Relief', ja: 'やわらか凹凸', zh: '柔和浮雕', ko: '부드러운 양각', fr: 'Relief doux', de: 'Sanftes Relief', es: 'Relieve suave', pt: 'Relevo suave', it: 'Rilievo morbido', ru: 'Мягкий рельеф', ar: 'نقش ناعم', hi: 'मुलायम उभार' },
    emoji: '🫧',
    prompt: 'Apply neomorphism (soft UI) style: single background color with elements that appear extruded from or pressed into the surface using subtle dual shadows (light highlight + dark shadow). No hard borders — depth comes only from shadows. Soft, tactile feel.',
  },
  {
    id: 'brutalism',
    name: { en: 'Raw & Bold', ja: '荒削り', zh: '粗犷风', ko: '거친 스타일', fr: 'Brut & fort', de: 'Roh & kühn', es: 'Crudo y audaz', pt: 'Cru e ousado', it: 'Grezzo e audace', ru: 'Грубый стиль', ar: 'خام وجريء', hi: 'कच्चा और बोल्ड' },
    emoji: '🏗️',
    prompt: 'Apply web brutalist design: thick black borders, raw monospace typography, high contrast, visible grid structure, no rounded corners, no gradients, no shadows. Bold, unapologetic, newspaper-meets-punk aesthetic. Use stark black/white with one or two accent colors.',
  },
  {
    id: 'claymorphism',
    name: { en: 'Clay 3D', ja: 'クレイ3D', zh: '黏土3D', ko: '클레이 3D', fr: 'Argile 3D', de: 'Ton 3D', es: 'Arcilla 3D', pt: 'Argila 3D', it: 'Argilla 3D', ru: 'Глина 3D', ar: 'طين ثلاثي الأبعاد', hi: 'क्ले 3D' },
    emoji: '🪆',
    prompt: 'Apply claymorphism style: 3D clay-like appearance with inflated, puffy rounded shapes, colorful pastel backgrounds, inner shadows that create a raised/pillow effect, playful and toy-like. Think of soft 3D rendered UI elements.',
  },
  {
    id: 'cyberpunk',
    name: { en: 'Neon Dark', ja: 'ネオン×闇', zh: '霓虹暗黑', ko: '네온 다크', fr: 'Néon sombre', de: 'Neon Dunkel', es: 'Neón oscuro', pt: 'Neon escuro', it: 'Neon scuro', ru: 'Неон и тьма', ar: 'نيون مظلم', hi: 'नियॉन डार्क' },
    emoji: '🌃',
    prompt: 'Apply cyberpunk aesthetic: dark background (#0a0a0f or similar), neon glow effects (cyan, magenta, electric blue), sharp angles, tech-looking borders, scanline or glitch accents, high contrast text. Futuristic, dystopian, Blade Runner-inspired.',
  },
  {
    id: 'synthwave',
    name: { en: '80s Retro', ja: '80年代レトロ', zh: '80年代复古', ko: '80년대 레트로', fr: 'Rétro 80s', de: '80er Retro', es: 'Retro 80s', pt: 'Retrô 80s', it: 'Retrò 80s', ru: 'Ретро 80-х', ar: 'ريترو الثمانينات', hi: '80 के दशक का रेट्रो' },
    emoji: '🌅',
    prompt: 'Apply synthwave / retrowave style: dark purple-blue backgrounds, hot pink and cyan neon gradients, retro 80s grid lines, chrome/metallic text effects, sunset gradient accents (orange→pink→purple). Outrun aesthetic.',
  },
  {
    id: 'retro-pixel',
    name: { en: 'Pixel Art', ja: 'ドット絵', zh: '像素风', ko: '픽셀 아트', fr: 'Pixel art', de: 'Pixel-Art', es: 'Pixel art', pt: 'Pixel art', it: 'Pixel art', ru: 'Пиксель-арт', ar: 'فن البكسل', hi: 'पिक्सेल आर्ट' },
    emoji: '👾',
    prompt: 'Apply retro pixel art / 8-bit style: pixelated borders, chunky bitmap-style elements, limited color palette (NES/Game Boy style), pixel font appearance, no anti-aliasing, no gradients. Classic retro game UI.',
  },
  {
    id: 'terminal',
    name: { en: 'Terminal', ja: 'ターミナル', zh: '终端', ko: '터미널', fr: 'Terminal', de: 'Terminal', es: 'Terminal', pt: 'Terminal', it: 'Terminale', ru: 'Терминал', ar: 'طرفية', hi: 'टर्मिनल' },
    emoji: '💻',
    prompt: 'Apply terminal/hacker aesthetic: pure black background, monospace green (or amber) text, blinking cursor effects, no rounded corners, minimal borders using ASCII-like characters, command-line interface feel. Matrix/DOS inspired.',
  },
  {
    id: 'skeuomorphism',
    name: { en: 'Real Texture', ja: '質感リアル', zh: '拟物质感', ko: '실제 질감', fr: 'Texture réelle', de: 'Echte Textur', es: 'Textura real', pt: 'Textura real', it: 'Texture reale', ru: 'Реальная текстура', ar: 'ملمس واقعي', hi: 'असली बनावट' },
    emoji: '📒',
    prompt: 'Apply classic skeuomorphic design: realistic textures (leather, paper, metal, wood grain), beveled edges, realistic shadows and highlights, embossed/debossed text, physical material simulation. iOS 6 / early macOS aesthetic.',
  },
  {
    id: 'material3',
    name: { en: 'Google Style', ja: 'Google風', zh: 'Google风格', ko: 'Google 스타일', fr: 'Style Google', de: 'Google-Stil', es: 'Estilo Google', pt: 'Estilo Google', it: 'Stile Google', ru: 'Стиль Google', ar: 'نمط جوجل', hi: 'Google शैली' },
    emoji: '🎨',
    prompt: 'Apply Google Material Design 3 (Material You) style: dynamic color with tonal surfaces, rounded corners (28px), prominent FABs, elevation with tonal color (not shadow), segmented buttons, filled/outlined text fields with label animation style.',
  },
  {
    id: 'ios-native',
    name: { en: 'Apple Style', ja: 'Apple風', zh: 'Apple风格', ko: 'Apple 스타일', fr: 'Style Apple', de: 'Apple-Stil', es: 'Estilo Apple', pt: 'Estilo Apple', it: 'Stile Apple', ru: 'Стиль Apple', ar: 'نمط أبل', hi: 'Apple शैली' },
    emoji: '🍎',
    prompt: 'Apply Apple iOS / Human Interface Guidelines style: grouped inset list style, SF Pro-like typography, system blue accents, translucent navigation bars, subtle separators, rounded rectangles (10-12px radius), light grey grouped backgrounds. Clean Apple feel.',
  },
  {
    id: 'newspaper',
    name: { en: 'Newspaper', ja: '新聞・活字', zh: '报纸排版', ko: '신문 스타일', fr: 'Journal', de: 'Zeitung', es: 'Periódico', pt: 'Jornal', it: 'Giornale', ru: 'Газета', ar: 'جريدة', hi: 'अखबार' },
    emoji: '📰',
    prompt: 'Apply editorial / newspaper layout style: serif typography (Times-like), multi-column layout feel, thin horizontal rules, drop caps, black and white with minimal accent color, justified text, masthead-style headers. Print journalism aesthetic.',
  },
  {
    id: 'art-deco',
    name: { en: 'Gold Ornament', ja: '金装飾', zh: '金色装饰', ko: '금 장식', fr: 'Or ornement', de: 'Gold-Ornament', es: 'Ornamento dorado', pt: 'Ornamento dourado', it: 'Ornamento dorato', ru: 'Золотой декор', ar: 'زخرفة ذهبية', hi: 'सोने का आभूषण' },
    emoji: '✨',
    prompt: 'Apply Art Deco style: geometric patterns, gold/brass metallic accents on dark backgrounds (navy, black, emerald), symmetrical ornamental borders, fan/sunburst motifs, elegant serif typography, luxury and glamour feel. 1920s Great Gatsby aesthetic.',
  },
  {
    id: 'bauhaus',
    name: { en: 'Primary Geo', ja: '原色×幾何学', zh: '原色几何', ko: '원색 기하학', fr: 'Géo primaire', de: 'Primärfarben-Geo', es: 'Geo primario', pt: 'Geo primário', it: 'Geo primario', ru: 'Первичная геометрия', ar: 'هندسة أولية', hi: 'प्राथमिक ज्यामिति' },
    emoji: '🔴',
    prompt: 'Apply Bauhaus design style: primary colors (red, blue, yellow) on white/black, strong geometric shapes (circles, squares, triangles), grid-based layout, sans-serif typography, functional minimalism, asymmetric but balanced composition.',
  },
  {
    id: 'organic',
    name: { en: 'Nature Earth', ja: '自然・アース', zh: '自然大地', ko: '자연 어스', fr: 'Nature terre', de: 'Natur Erde', es: 'Naturaleza', pt: 'Natureza', it: 'Natura terra', ru: 'Природа', ar: 'طبيعة', hi: 'प्रकृति' },
    emoji: '🌿',
    prompt: 'Apply organic / nature-inspired design: earth tones (sage green, warm brown, cream, terracotta), organic blob shapes instead of rectangles, leaf/nature-inspired accents, warm and calming feel, natural textures, rounded soft edges.',
  },
  {
    id: 'pastel-dream',
    name: { en: 'Pastel Dream', ja: 'ゆめかわ', zh: '梦幻柔彩', ko: '파스텔 드림', fr: 'Pastel rêveur', de: 'Pastelltraum', es: 'Sueño pastel', pt: 'Sonho pastel', it: 'Sogno pastello', ru: 'Пастельная мечта', ar: 'حلم الباستيل', hi: 'पेस्टल ड्रीम' },
    emoji: '🍬',
    prompt: 'Apply pastel / kawaii style: soft pastel color palette (lavender, baby pink, mint, peach), very rounded corners, bubbly/cute proportions, light and airy feel, subtle gradient backgrounds, friendly and whimsical. Dreamy and gentle aesthetic.',
  },
  {
    id: 'vaporwave',
    name: { en: 'Retro Future', ja: 'レトロ未来', zh: '蒸汽波', ko: '레트로 퓨처', fr: 'Rétro futur', de: 'Retro-Zukunft', es: 'Retro futuro', pt: 'Retro futuro', it: 'Retro futuro', ru: 'Ретрофутуризм', ar: 'مستقبل ريترو', hi: 'रेट्रो फ्यूचर' },
    emoji: '🏛️',
    prompt: 'Apply vaporwave aesthetic: pink-purple-teal color scheme, retro 90s Japanese/Greek motifs, glitchy/distorted elements, gradient meshes, chunky early-internet UI elements, roman busts and palm tree vibes. Nostalgic digital surrealism.',
  },
  {
    id: 'handwritten',
    name: { en: 'Hand-drawn', ja: '手描き風', zh: '手绘风', ko: '손그림', fr: 'Dessiné', de: 'Handgemalt', es: 'Dibujado', pt: 'Desenhado', it: 'Disegnato', ru: 'Рисованный', ar: 'مرسوم باليد', hi: 'हाथ से बनाया' },
    emoji: '✏️',
    prompt: 'Apply hand-drawn / sketch style: elements that look hand-drawn with rough/wobbly borders, pencil-sketch textures, notebook-paper backgrounds, handwriting-style fonts, doodle decorations. Informal, creative, whiteboard-like feel.',
  },
  {
    id: 'corporate',
    name: { en: 'Business', ja: 'ビジネス', zh: '商务风', ko: '비즈니스', fr: 'Professionnel', de: 'Business', es: 'Empresarial', pt: 'Corporativo', it: 'Aziendale', ru: 'Деловой', ar: 'أعمال', hi: 'बिज़नेस' },
    emoji: '🏢',
    prompt: 'Apply clean corporate / enterprise style: professional blue-grey palette, structured grid layout, clear hierarchy with defined sections, subtle shadows, system fonts, data-dense but organized. Think Salesforce or enterprise dashboard.',
  },
  {
    id: 'gradient-mesh',
    name: { en: 'Vivid Gradient', ja: 'グラデ鮮彩', zh: '鲜彩渐变', ko: '선명한 그라디언트', fr: 'Dégradé vif', de: 'Lebhafter Verlauf', es: 'Gradiente vívido', pt: 'Gradiente vívido', it: 'Gradiente vivido', ru: 'Яркий градиент', ar: 'تدرج نابض', hi: 'जीवंत ग्रेडिएंट' },
    emoji: '🌈',
    prompt: 'Apply modern gradient mesh style: vibrant multi-color gradient backgrounds (purple→blue→pink→orange mesh), floating card elements with glass effect, bold sans-serif type, contemporary and trendy. Vercel/Linear-inspired modern web aesthetic.',
  },
];
