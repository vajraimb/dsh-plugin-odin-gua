// Static tables of the I Ching, ported verbatim from odin-gua (src/gua/gua.odin
// and src/gua/names_en.odin, MIT, © 2026 vajraimb).
//
// A hexagram is a 6-bit integer: bit 0 = 初爻 (bottom line), bit 5 = 上爻 (top).
// bit = 1 means 阳 (undivided), 0 means 阴 (divided).
// 下卦 = low three bits, 上卦 = high three bits.

/** KW[下卦][上卦] = 文王序号 (King Wen sequence number). */
export const KW = [
  /* 下坤 */ [2, 16, 8, 45, 23, 35, 20, 12],
  /* 下震 */ [24, 51, 3, 17, 27, 21, 42, 25],
  /* 下坎 */ [7, 40, 29, 47, 4, 64, 59, 6],
  /* 下兑 */ [19, 54, 60, 58, 41, 38, 61, 10],
  /* 下艮 */ [15, 62, 39, 31, 52, 56, 53, 33],
  /* 下离 */ [36, 55, 63, 49, 22, 30, 37, 13],
  /* 下巽 */ [46, 32, 48, 28, 18, 50, 57, 44],
  /* 下乾 */ [11, 34, 5, 43, 26, 14, 9, 1],
]

export const NAME_ZH = [
  '',
  '乾', '坤', '屯', '蒙', '需', '讼', '师', '比', '小畜', '履', '泰', '否', '同人', '大有', '谦', '豫',
  '随', '蛊', '临', '观', '噬嗑', '贲', '剥', '复', '无妄', '大畜', '颐', '大过', '坎', '离', '咸', '恒',
  '遯', '大壮', '晋', '明夷', '家人', '睽', '蹇', '解', '损', '益', '夬', '姤', '萃', '升', '困', '井',
  '革', '鼎', '震', '艮', '渐', '归妹', '丰', '旅', '巽', '兑', '涣', '节', '中孚', '小过', '既济', '未济',
]

export const PINYIN = [
  '',
  'Qian', 'Kun', 'Zhun', 'Meng', 'Xu', 'Song', 'Shi', 'Bi', 'Xiao Chu', 'Lü', 'Tai', 'Pi', 'Tong Ren', 'Da You', 'Qian', 'Yu',
  'Sui', 'Gu', 'Lin', 'Guan', 'Shi He', 'Bi', 'Bo', 'Fu', 'Wu Wang', 'Da Chu', 'Yi', 'Da Guo', 'Kan', 'Li', 'Xian', 'Heng',
  'Dun', 'Da Zhuang', 'Jin', 'Ming Yi', 'Jia Ren', 'Kui', 'Jian', 'Xie', 'Sun', 'Yi', 'Guai', 'Gou', 'Cui', 'Sheng', 'Kun', 'Jing',
  'Ge', 'Ding', 'Zhen', 'Gen', 'Jian', 'Gui Mei', 'Feng', 'Lü', 'Xun', 'Dui', 'Huan', 'Jie', 'Zhong Fu', 'Xiao Guo', 'Ji Ji', 'Wei Ji',
]

/** English names generated from the Unicode character names (U+4DC0…U+4DFF). */
export const NAME_EN = [
  '',
  'The Creative Heaven', 'The Receptive Earth', 'Difficulty at the Beginning', 'Youthful Folly',
  'Waiting', 'Conflict', 'The Army', 'Holding Together', 'Small Taming', 'Treading',
  'Peace', 'Standstill', 'Fellowship', 'Great Possession', 'Modesty', 'Enthusiasm',
  'Following', 'Work on the Decayed', 'Approach', 'Contemplation', 'Biting Through', 'Grace',
  'Splitting Apart', 'Return', 'Innocence', 'Great Taming', 'Mouth Corners', 'Great Preponderance',
  'The Abysmal Water', 'The Clinging Fire', 'Influence', 'Duration', 'Retreat', 'Great Power',
  'Progress', 'Darkening of the Light', 'The Family', 'Opposition', 'Obstruction', 'Deliverance',
  'Decrease', 'Increase', 'Breakthrough', 'Coming to Meet', 'Gathering Together', 'Pushing Upward',
  'Oppression', 'The Well', 'Revolution', 'The Cauldron', 'The Arousing Thunder',
  'The Keeping Still Mountain', 'Development', 'The Marrying Maiden', 'Abundance', 'The Wanderer',
  'The Gentle Wind', 'The Joyous Lake', 'Dispersion', 'Limitation', 'Inner Truth',
  'Small Preponderance', 'After Completion', 'Before Completion',
]

/** Trigram by 3-bit code, bottom-up: 坤000 震001 坎010 兑011 艮100 离101 巽110 乾111 */
export const TRIGRAMS = [
  { zh: '坤', symbol: '☷', en: 'Earth', nature: '地', pinyin: 'Kun' },
  { zh: '震', symbol: '☳', en: 'Thunder', nature: '雷', pinyin: 'Zhen' },
  { zh: '坎', symbol: '☵', en: 'Water', nature: '水', pinyin: 'Kan' },
  { zh: '兑', symbol: '☱', en: 'Lake', nature: '泽', pinyin: 'Dui' },
  { zh: '艮', symbol: '☶', en: 'Mountain', nature: '山', pinyin: 'Gen' },
  { zh: '离', symbol: '☲', en: 'Fire', nature: '火', pinyin: 'Li' },
  { zh: '巽', symbol: '☴', en: 'Wind', nature: '风', pinyin: 'Xun' },
  { zh: '乾', symbol: '☰', en: 'Heaven', nature: '天', pinyin: 'Qian' },
]

export const POS_ZH = ['初', '二', '三', '四', '五', '上']
