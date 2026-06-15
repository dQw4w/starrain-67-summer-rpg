import type { TeamState } from './types'

const BASE = '/api'

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  getTeam: (id: number) => req<TeamState>(`/team/${id}`),

  setDifficulty: (teamId: number, difficulty: string) =>
    req(`/team/${teamId}/difficulty`, {
      method: 'PUT',
      body: JSON.stringify({ difficulty }),
    }),

  completeQuest: (teamId: number, questId: number, answerIndex?: number) =>
    req<{ ok: boolean; correct: boolean }>(`/team/${teamId}/quest/${questId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ answer_index: answerIndex ?? null }),
    }),

  defeatBoss: (teamId: number, bossId: number) =>
    req(`/team/${teamId}/boss/${bossId}/defeat`, { method: 'POST' }),

  // admin
  adminListTeams: () => req<{ id: number; name: string; difficulty: string }[]>('/admin/teams'),
  adminGetTeam: (id: number) => req<TeamState>(`/admin/teams/${id}`),
  adminUpdateTeam: (id: number, body: { difficulty?: string; name?: string }) =>
    req(`/admin/teams/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  adminSetQuest: (teamId: number, questId: number, completed: boolean) =>
    req(`/admin/teams/${teamId}/quest/${questId}`, { method: 'PUT', body: JSON.stringify({ completed }) }),
  adminSetBoss: (teamId: number, bossId: number, defeated: boolean) =>
    req(`/admin/teams/${teamId}/boss/${bossId}`, { method: 'PUT', body: JSON.stringify({ defeated }) }),
  adminResetTeam: (teamId: number) =>
    req(`/admin/teams/${teamId}/reset`, { method: 'POST' }),
  adminResetAll: () =>
    req('/admin/reset-all', { method: 'POST' }),
  adminListBosses: () =>
    req<{ id: number; name: string; emoji: string; location_name: string; location_hint: string }[]>('/admin/bosses'),
}
