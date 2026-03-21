import { supabase } from '../lib/supabaseClient'

const BUCKET = 'location-images'

export const uploadLocationImage = async (
  file,
  locationId
) => {

  // Validate session first
  const { data: { session } } =
    await supabase.auth.getSession()

  if (!session) {
    throw new Error(
      'You must be logged in to upload images.'
    )
  }

  // Validate file type
  const allowed = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]
  if (!allowed.includes(file.type)) {
    throw new Error(
      'Invalid file type. Use JPG, PNG or WebP.'
    )
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error(
      'File too large. Maximum size is 5MB.'
    )
  }

  const fileExt  = file.name.split('.').pop()
  const fileName = `${locationId}-${Date.now()}.${fileExt}`
  const filePath = `locations/${fileName}`

  const { error: uploadError } =
    await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

  if (uploadError) {
    if (uploadError.message?.includes('row-level security') || uploadError.statusCode === '403') {
      throw new Error('Storage permission denied. The storage bucket RLS policies need to be configured in Supabase.')
    }
    if (uploadError.message?.includes('Bucket not found')) {
      throw new Error('Storage bucket not configured. Please contact support.')
    }
    throw new Error('Upload failed: ' + uploadError.message)
  }

  const { data: { publicUrl } } =
    supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath)

  return publicUrl
}

export const deleteLocationImage = async (imageUrl) => {
  if (!imageUrl) return

  const path = imageUrl.split('location-images/')[1]
  if (!path) return

  await supabase.storage
    .from(BUCKET)
    .remove([path])
}
