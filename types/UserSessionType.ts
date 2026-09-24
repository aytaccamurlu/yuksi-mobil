export type UserSessionType = {
  accessToken: string
  refreshToken: string
  userId?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  photo_url?: string
  local_photo_uri?: string
}