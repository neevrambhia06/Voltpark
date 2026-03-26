import { supabase } from '../lib/supabaseClient'

const BUCKET = 'avatars'

export const uploadAvatar = async (file, userId) => {
  const { data: { session } } =
    await supabase.auth.getSession()
  if (!session) throw new Error(
    'You must be logged in to upload.'
  )

  const allowed = [
    'image/jpeg', 'image/jpg',
    'image/png', 'image/webp'
  ]
  if (!allowed.includes(file.type))
    throw new Error(
      'Invalid file type. Use JPG, PNG or WebP.'
    )
  if (file.size > 2 * 1024 * 1024)
    throw new Error(
      'File too large. Maximum size is 2MB.'
    )

  const ext      = file.name.split('.').pop()
  const filePath = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error) throw new Error(
    'Avatar upload failed: ' + error.message
  )

  const { data: { publicUrl } } =
    supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath)

  return publicUrl
}

export const deleteAvatar = async (avatarUrl) => {
  if (!avatarUrl) return
  const path = avatarUrl.split('avatars/')[1]
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}
