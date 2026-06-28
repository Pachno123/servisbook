import { supabase } from './supabase'

export async function uploadPdfToStorage(blob: Blob, path: string): Promise<string> {
  const { error } = await supabase.storage
    .from('protokoly')
    .upload(path, blob, { contentType: 'application/pdf', upsert: true })
  if (error) throw new Error('PDF upload failed: ' + error.message)
  const { data } = supabase.storage.from('protokoly').getPublicUrl(path)
  return data.publicUrl
}

export async function uploadPhotoToStorage(
  file: File,
  prefix: 'revizie' | 'opravy',
  id: string,
  index: number,
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${prefix}/${id}/${index}.${ext}`
  const { error } = await supabase.storage
    .from('fotky')
    .upload(path, file, { contentType: file.type, upsert: true })
  if (error) throw new Error('Photo upload failed: ' + error.message)
  const { data } = supabase.storage.from('fotky').getPublicUrl(path)
  return data.publicUrl
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
