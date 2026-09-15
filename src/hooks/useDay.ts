import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type {
  EnglishLog,
  ExerciseLog,
  FoodLog,
  MoodEntry,
  NewsReview,
  ReadingLog,
  Task,
} from '../db/types'

export interface DayData {
  tasks: Task[]
  exercise: ExerciseLog[]
  food: FoodLog[]
  reading: ReadingLog[]
  english: EnglishLog[]
  news: NewsReview[]
  mood: MoodEntry | undefined
}

const EMPTY: DayData = {
  tasks: [],
  exercise: [],
  food: [],
  reading: [],
  english: [],
  news: [],
  mood: undefined,
}

export function useDay(date: string): DayData {
  const data = useLiveQuery<DayData, DayData | undefined>(async (): Promise<DayData> => {
      const [tasks, exercise, food, reading, english, news, moods] = await Promise.all([
        db.tasks.where('date').equals(date).sortBy('order'),
        db.exerciseLogs.where('date').equals(date).toArray(),
        db.foodLogs.where('date').equals(date).toArray(),
        db.readingLogs.where('date').equals(date).toArray(),
        db.englishLogs.where('date').equals(date).toArray(),
        db.newsReviews.where('date').equals(date).toArray(),
        db.moods.where('date').equals(date).toArray(),
      ])
      return {
        tasks,
        exercise: exercise.sort((a, b) => b.createdAt - a.createdAt),
        food: food.sort((a, b) => b.createdAt - a.createdAt),
        reading: reading.sort((a, b) => b.createdAt - a.createdAt),
        english: english.sort((a, b) => b.createdAt - a.createdAt),
        news: news.sort((a, b) => b.createdAt - a.createdAt),
        mood: moods[0],
      }
  }, [date], undefined)
  return data ?? EMPTY
}
