import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_SETTINGS, type AppSettings } from '../db/db'

export function useSettings(): AppSettings {
  const row = useLiveQuery(() => db.settings.get('app'), [], undefined)
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<AppSettings> | undefined) ?? {}) }
}
