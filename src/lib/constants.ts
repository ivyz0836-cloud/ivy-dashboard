import type { ExerciseType, MealType, EnglishActivity, TaskCategory } from '../db/types'

export const EXERCISES: {
  type: ExerciseType
  label: string
  emoji: string
  /** 每分钟消耗卡路里（体重约 55kg 估算） */
  kcalPerMin: number
  hint: string
}[] = [
  { type: 'pilates', label: '普拉提', emoji: '🧘‍♀️', kcalPerMin: 4.5, hint: '核心 + 体态，适合久坐后' },
  { type: 'badminton', label: '羽毛球', emoji: '🏸', kcalPerMin: 7.5, hint: '全身协调，找人一起更有趣' },
  { type: 'running', label: '跑步', emoji: '🏃‍♀️', kcalPerMin: 9.5, hint: '心肺提升，注意热身' },
  { type: 'walking', label: '步行', emoji: '🚶‍♀️', kcalPerMin: 3.5, hint: '最易坚持，饭后 30 分钟' },
]

export function exerciseMeta(type: ExerciseType) {
  return EXERCISES.find((e) => e.type === type) ?? EXERCISES[0]
}

export const MEALS: { meal: MealType; label: string; emoji: string }[] = [
  { meal: 'breakfast', label: '早餐', emoji: '🌅' },
  { meal: 'lunch', label: '午餐', emoji: '🍱' },
  { meal: 'dinner', label: '晚餐', emoji: '🍲' },
  { meal: 'snack', label: '加餐', emoji: '🍎' },
]

export function mealMeta(meal: MealType) {
  return MEALS.find((m) => m.meal === meal) ?? MEALS[0]
}

export const ENGLISH_ACTIVITIES: {
  activity: EnglishActivity
  label: string
  emoji: string
  unit: string
  hint: string
}[] = [
  { activity: 'vocab', label: '背单词', emoji: '🔤', unit: '个', hint: '新词 + 复习都算' },
  { activity: 'reading', label: '外刊阅读', emoji: '📰', unit: '分钟', hint: 'The Economist / 卫报等' },
  { activity: 'listening', label: '听力', emoji: '🎧', unit: '分钟', hint: '播客 / 新闻精听' },
  { activity: 'speaking', label: '口语', emoji: '🗣️', unit: '分钟', hint: '跟读 / 自言自语复述' },
]

export function englishMeta(activity: EnglishActivity) {
  return ENGLISH_ACTIVITIES.find((a) => a.activity === activity) ?? ENGLISH_ACTIVITIES[0]
}

export const TASK_CATEGORIES: { value: TaskCategory; label: string; emoji: string }[] = [
  { value: 'study', label: '学习', emoji: '📚' },
  { value: 'english', label: '英语', emoji: '🔤' },
  { value: 'body', label: '身体', emoji: '💪' },
  { value: 'life', label: '生活', emoji: '🌿' },
  { value: 'other', label: '其他', emoji: '✨' },
]

export function taskCategoryMeta(value: TaskCategory) {
  return TASK_CATEGORIES.find((c) => c.value === value) ?? TASK_CATEGORIES[4]
}

export const MOODS: { score: number; emoji: string; label: string }[] = [
  { score: 1, emoji: '😞', label: '很低落' },
  { score: 2, emoji: '🙁', label: '有点down' },
  { score: 3, emoji: '😐', label: '还行' },
  { score: 4, emoji: '🙂', label: '不错' },
  { score: 5, emoji: '😄', label: '超棒' },
]

export const MOOD_TAGS = [
  '专注',
  '充实',
  '焦虑',
  '疲惫',
  '开心',
  '平静',
  '内耗',
  '有成就感',
  '拖延',
  '被理解',
]

export const READING_SUGGESTIONS = [
  '《被讨厌的勇气》',
  '《原子习惯》',
  '《认知觉醒》',
  '《小狗钱钱》',
  '《蛤蟆先生去看心理医生》',
  'The Economist',
  '《社会学的想象力》',
  '《深度工作》',
]

export function moodMeta(score: number) {
  return MOODS.find((m) => m.score === score) ?? MOODS[2]
}

/** 依据日期算出的伪随机但稳定的下标 */
export function stableIndex(seed: string, len: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) % 1_000_003
  }
  return h % len
}
