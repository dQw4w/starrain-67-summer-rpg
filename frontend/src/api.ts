import type { TeamState, GameSettings } from './types'

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
  getTeamByToken: (token: string) => req<TeamState>(`/team/t/${token}`),

  setDifficulty: (teamId: number, difficulty: string) =>
    req(`/team/${teamId}/difficulty`, {
      method: 'PUT',
      body: JSON.stringify({ difficulty }),
    }),

  completeQuest: (teamId: number, questId: number, answerIndex?: number, answerText?: string) =>
    req<{ ok: boolean; correct: boolean }>(`/team/${teamId}/quest/${questId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ answer_index: answerIndex ?? null, answer_text: answerText ?? null }),
    }),

  uploadQuestPhotos: async (teamId: number, questId: number, files: File[]) => {
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
    const res = await fetch(`${BASE}/team/${teamId}/quest/${questId}/photos`, {
      method: 'POST',
      body: fd, // let the browser set multipart boundary; do NOT set Content-Type
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json() as Promise<{ ok: boolean; correct: boolean }>
  },

  defeatBoss: (teamId: number, bossId: number) =>
    req(`/team/${teamId}/boss/${bossId}/defeat`, { method: 'POST' }),

  resetTeamByToken: (token: string) =>
    req(`/team/t/${token}/reset`, { method: 'POST' }),

  // admin
  adminListTeams: () => req<{ id: number; name: string; difficulty: string; token: string }[]>('/admin/teams'),
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

  adminTeamPhotos: (teamId: number) =>
    req<{ name: string; quest_id: number | null; quest_name: string | null; url: string }[]>(
      `/admin/teams/${teamId}/photos`,
    ),
  adminTeamPhotosZipUrl: (teamId: number) => `${BASE}/admin/teams/${teamId}/photos.zip`,
  adminAllPhotosZipUrl: () => `${BASE}/admin/photos.zip`,

  adminDeleteTeamPhotos: (teamId: number) =>
    req<{ ok: boolean; deleted: number }>(`/admin/teams/${teamId}/photos`, { method: 'DELETE' }),
  adminDeleteSelectedPhotos: (teamId: number, names: string[]) =>
    req<{ ok: boolean; deleted: number }>(`/admin/teams/${teamId}/photos/delete`, {
      method: 'POST',
      body: JSON.stringify({ names }),
    }),
  adminDeleteAllPhotos: () =>
    req<{ ok: boolean; deleted: number }>('/admin/photos', { method: 'DELETE' }),

  getSettings: () => req<GameSettings>('/settings'),
  adminUpdateSettings: (body: Partial<GameSettings>) =>
    req<GameSettings>('/settings', { method: 'PUT', body: JSON.stringify(body) }),
}
