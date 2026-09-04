import api from '../api/axios'

export const APP_VERSION = '0.1.0'

export interface CheckinEvent {
  id: string
  title: string
  startDate: string
  endDate: string | null
  status: 'ongoing' | 'ended'
  organization: string | null
  total: number
  credentialed: number
}

export interface CheckinParticipant {
  id: string
  name: string
  email: string
  cpf: string | null
  code: string | null
  category: string | null
  status: string
  paymentStatus: string | null
  paymentProvider: string | null
  checkedIn: boolean
  checkedInAt: string | null
  checkedInBy: string | null
}

export interface CheckinStats {
  eventId: string
  title: string
  total: number
  done: number
  pending: number
}

export type CheckinFilter = 'all' | 'done' | 'pending'

export interface CheckinResult {
  status: 'checked_in' | 'already' | 'undone'
  registration: CheckinParticipant
  checkedInByName?: string | null
}

export async function fetchMyEvents(): Promise<CheckinEvent[]> {
  const { data } = await api.get('/me/checkin/events')
  return data
}

export async function fetchCheckinList(
  eventId: string,
  filter: CheckinFilter = 'all',
  search?: string,
): Promise<CheckinParticipant[]> {
  const { data } = await api.get(`/events/${eventId}/checkin/list`, {
    params: { filter, ...(search ? { search } : {}) },
  })
  return data
}

export async function fetchCheckinStats(eventId: string): Promise<CheckinStats> {
  const { data } = await api.get(`/events/${eventId}/checkin/stats`)
  return data
}

export async function doCheckIn(
  eventId: string,
  registrationId: string,
): Promise<CheckinResult> {
  const { data } = await api.post(
    `/events/${eventId}/checkin/${registrationId}`,
  )
  return data
}

export async function undoCheckIn(
  eventId: string,
  registrationId: string,
): Promise<CheckinResult> {
  const { data } = await api.delete(
    `/events/${eventId}/checkin/${registrationId}`,
  )
  return data
}

export async function findByCode(eventId: string, code: string) {
  const { data } = await api.get(
    `/events/${eventId}/checkin/by-code/${encodeURIComponent(code)}`,
  )
  return data as CheckinParticipant
}
