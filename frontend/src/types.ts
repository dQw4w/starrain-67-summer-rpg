export interface QuestOption {
  text?: string
  correct?: boolean
  count?: number    // photo_task
  animal?: string   // drag_match
  level?: string    // drag_match
}

export interface Quest {
  id: number
  boss_id: number
  name: string
  emoji: string
  type: 'multiple_choice' | 'task' | 'fill_in' | 'photo_task' | 'drag_match'
  description: string
  options: QuestOption[] | null
  completed: boolean
  completed_at: string | null
  locked?: boolean   // hidden until the previous quest is done
  image?: string | null   // reference image for photo tasks (the thing to find)
}

export interface Boss {
  id: number
  name: string
  emoji: string
  location_name: string
  location_hint: string | null
  order_index: number
  quests: Quest[]
  all_quests_done: boolean
  defeated: boolean
  defeated_at: string | null
}

export interface GameSettings {
  qr_test_mode: boolean
  rain_mode: boolean
}

export interface TeamState {
  team_id: number
  name: string
  difficulty: string
  bosses: Boss[]
  puzzle_pieces: number
  total_bosses: number
  victory: boolean
}
