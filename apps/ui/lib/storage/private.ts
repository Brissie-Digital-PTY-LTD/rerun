import type { Database } from '@/app/api/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

// The public counterpart of this helper is lib/images/upload.ts. Here the bucket is created
// private and no public URL is ever handed back: reaching an object takes the service-role
// client or a signed URL, so the stored path is not itself a capability.
export async function uploadPrivateFile(
    supabase: SupabaseClient<Database>,
    bucket: string,
    path: string,
    body: Blob | ArrayBuffer | Uint8Array,
    contentType: string,
): Promise<string> {
    await supabase.storage.createBucket(bucket, { public: false }).catch(() => {})

    const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType, upsert: true })
    if (error) throw new Error(error.message)

    return path
}

export async function downloadPrivateFile(supabase: SupabaseClient<Database>, bucket: string, path: string): Promise<Blob> {
    const { data, error } = await supabase.storage.from(bucket).download(path)
    if (error) throw new Error(error.message)
    return data
}

export async function removePrivateFiles(supabase: SupabaseClient<Database>, bucket: string, paths: string[]): Promise<void> {
    if (paths.length === 0) return
    const { error } = await supabase.storage.from(bucket).remove(paths)
    if (error) throw new Error(error.message)
}
