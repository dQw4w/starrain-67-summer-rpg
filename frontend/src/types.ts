export interface QuestOption {
  text: string
  correct: boolean
}

export interface Quest {
  id: number
  boss_id: number
  name: string
  emoji: string
  type: 'multiple_choice' | 'task'
  description: string
  options: QuestOption[] | null
  completed: boolean
  completed_at: string | null
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

export interface TeamState {
  team_id: number
  name: string
  difficulty: string
  bosses: Boss[]
  puzzle_pieces: number
  total_bosses: number
  victory: boolean
}
