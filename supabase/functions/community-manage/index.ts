import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// In-Memory Rate Limiting (20 requests per minute per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 20

  const record = rateLimitMap.get(clientIp)
  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count += 1
  return true
}

// Image Header (Magic Bytes) Verification
function verifyImageHeader(bytes: Uint8Array, mimeType: string): boolean {
  if (bytes.length < 12) return false

  // JPEG: FF D8 FF
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
  }

  // PNG: 89 50 4E 47
  if (mimeType === 'image/png') {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47
  }

  // WebP: RIFF ... WEBP (bytes 0..3 'RIFF', bytes 8..11 'WEBP')
  if (mimeType === 'image/webp') {
    const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    return isRiff && isWebp
  }

  return false
}

// Helper: Convert Base64 string to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Extract Client IP
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   req.headers.get('x-real-ip') || 
                   'unknown-client'

  // Rate Limiting
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please try again in a minute.' }), 
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON request body' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, promptId, updates, data } = body

    if (!action || typeof action !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid action' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // ==========================================
    // ACTION: SUBMIT (OPEN COMMUNITY PUBLISH)
    // ==========================================
    if (action === 'SUBMIT') {
      if (!data || typeof data !== 'object') {
        return new Response(
          JSON.stringify({ error: 'Data payload is required for SUBMIT' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const title = typeof data.title === 'string' ? data.title.trim() : ''
      const prompt = typeof data.prompt === 'string' ? data.prompt.trim() : ''
      const categoryId = typeof data.categoryId === 'string' ? data.categoryId.trim().slice(0, 50) : (typeof data.category === 'string' ? data.category.trim().slice(0, 50) : 'fashion')
      const model = typeof data.model === 'string' ? data.model.trim().slice(0, 50) : 'Midjourney v6.1'
      const aspectRatio = typeof data.aspectRatio === 'string' ? data.aspectRatio.trim().slice(0, 10) : '16:9'
      const negativePrompt = typeof data.negativePrompt === 'string' ? data.negativePrompt.trim().slice(0, 1000) : ''
      const slug = typeof data.slug === 'string' ? data.slug.trim().slice(0, 150) : title.toLowerCase().replace(/[^\w]/g, '-')

      if (!title || title.length > 150) {
        return new Response(
          JSON.stringify({ error: 'Title must be between 1 and 150 characters' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!prompt || prompt.length > 5000) {
        return new Response(
          JSON.stringify({ error: 'Prompt must be between 1 and 5000 characters' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let tags: string[] = []
      if (Array.isArray(data.tags)) {
        tags = data.tags
          .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
          .slice(0, 8)
          .map((t: string) => t.trim().toLowerCase().slice(0, 30))
      }

      let serverImagePath: string | null = null
      let serverImageUrl: string = typeof data.imageUrl === 'string' ? data.imageUrl.trim() : ''

      // SERVER-SIDE IMAGE UPLOAD & CONTENT VALIDATION
      if (typeof data.imageBase64 === 'string' && data.imageBase64.length > 0) {
        const rawBase64 = data.imageBase64.includes(',') ? data.imageBase64.split(',')[1] : data.imageBase64
        let imageBytes: Uint8Array
        try {
          imageBytes = base64ToUint8Array(rawBase64)
        } catch {
          return new Response(
            JSON.stringify({ error: 'Failed to decode image data' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Validate File Size (Max 10 MB)
        if (imageBytes.length > 10 * 1024 * 1024) {
          return new Response(
            JSON.stringify({ error: 'Uploaded image exceeds maximum allowed size of 10 MB' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Validate MIME Type
        const mimeType = (typeof data.imageMimeType === 'string' ? data.imageMimeType.toLowerCase() : 'image/jpeg')
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (!allowedMimes.includes(mimeType)) {
          return new Response(
            JSON.stringify({ error: 'Unsupported image format. Allowed formats: JPEG, PNG, WebP' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Validate Header (Magic Bytes) Content
        if (!verifyImageHeader(imageBytes, mimeType)) {
          return new Response(
            JSON.stringify({ error: 'Image file content validation failed. Header bytes do not match declared image format.' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Generate Unique, Unpredictable Server-Side Storage Path
        const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
        serverImagePath = `prompts/${crypto.randomUUID()}.${ext}`

        // Upload to Storage via Service Role Key
        const { error: uploadError } = await supabaseAdmin.storage
          .from('prompt-images')
          .upload(serverImagePath, imageBytes, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Storage upload error:', uploadError)
          return new Response(
            JSON.stringify({ error: 'Failed to upload image to storage' }), 
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: publicUrlData } = supabaseAdmin.storage
          .from('prompt-images')
          .getPublicUrl(serverImagePath)

        serverImageUrl = publicUrlData.publicUrl
      } else if (typeof data.imagePath === 'string' && data.imagePath.trim().length > 0) {
        // If imagePath is sent directly, sanitize path
        const rawPath = data.imagePath.trim()
        if (rawPath.includes('..') || rawPath.startsWith('/')) {
          return new Response(
            JSON.stringify({ error: 'Invalid storage path' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        serverImagePath = rawPath
        if (!serverImageUrl) {
          const { data: publicUrlData } = supabaseAdmin.storage
            .from('prompt-images')
            .getPublicUrl(serverImagePath)
          serverImageUrl = publicUrlData.publicUrl
        }
      }

      // Perform DB Insertion
      const { data: insertedRow, error: insertError } = await supabaseAdmin
        .from('Prompts')
        .insert({
          title,
          prompt,
          description: prompt, // Ensure NOT NULL requirement is satisfied
          image_url: serverImageUrl,
          image_path: serverImagePath,
          category: categoryId,
          tags,
          model,
          aspect_ratio: aspectRatio,
          negative_prompt: negativePrompt,
          status: 'published',
          is_published: true,
          creator_name: 'Community Creator',
          creator_handle: '@community',
          slug,
          views_count: 0,
          copies_count: 0,
          likes_count: 0,
          featured: false,
          trending: false
        })
        .select()
        .single()

      if (insertError) {
        console.error('Database insert error:', insertError)
        // Clean up ONLY the newly uploaded image for this request if DB insert failed
        if (serverImagePath) {
          try {
            await supabaseAdmin.storage.from('prompt-images').remove([serverImagePath])
          } catch (cleanErr) {
            console.warn('Storage cleanup error:', cleanErr)
          }
        }

        return new Response(
          JSON.stringify({ error: 'Failed to publish prompt record to database' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data: insertedRow }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ==========================================
    // ACTION: UPDATE (OPEN COMMUNITY EDIT)
    // ==========================================
    if (action === 'UPDATE') {
      const numericId = parseInt(promptId, 10)
      if (isNaN(numericId) || numericId <= 0) {
        return new Response(
          JSON.stringify({ error: 'Valid positive numeric promptId is required for UPDATE' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!updates || typeof updates !== 'object') {
        return new Response(
          JSON.stringify({ error: 'Updates object is required' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if prompt exists
      const { data: existing, error: findErr } = await supabaseAdmin
        .from('Prompts')
        .select('id')
        .eq('id', numericId)
        .single()

      if (findErr || !existing) {
        return new Response(
          JSON.stringify({ error: 'Prompt not found' }), 
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Strictly Whitelisted Fields
      const sanitizedUpdates: Record<string, any> = {
        updated_at: new Date().toISOString()
      }

      let hasValidFields = false

      if (typeof updates.title === 'string' && updates.title.trim()) {
        const titleVal = updates.title.trim()
        if (titleVal.length > 150) {
          return new Response(
            JSON.stringify({ error: 'Title cannot exceed 150 characters' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        sanitizedUpdates.title = titleVal
        hasValidFields = true
      }

      if (typeof updates.prompt === 'string' && updates.prompt.trim()) {
        const promptVal = updates.prompt.trim()
        if (promptVal.length > 5000) {
          return new Response(
            JSON.stringify({ error: 'Prompt cannot exceed 5000 characters' }), 
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        sanitizedUpdates.prompt = promptVal
        sanitizedUpdates.description = promptVal // Sync description
        hasValidFields = true
      }

      if (typeof updates.categoryId === 'string' && updates.categoryId.trim()) {
        sanitizedUpdates.category = updates.categoryId.trim().slice(0, 50)
        hasValidFields = true
      } else if (typeof updates.category === 'string' && updates.category.trim()) {
        sanitizedUpdates.category = updates.category.trim().slice(0, 50)
        hasValidFields = true
      }

      if (typeof updates.model === 'string') {
        sanitizedUpdates.model = updates.model.trim().slice(0, 50)
        hasValidFields = true
      }

      if (typeof updates.aspectRatio === 'string') {
        sanitizedUpdates.aspect_ratio = updates.aspectRatio.trim().slice(0, 10)
        hasValidFields = true
      }

      if (typeof updates.negativePrompt === 'string') {
        sanitizedUpdates.negative_prompt = updates.negativePrompt.trim().slice(0, 1000)
        hasValidFields = true
      }

      if (Array.isArray(updates.tags)) {
        sanitizedUpdates.tags = updates.tags
          .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
          .slice(0, 8)
          .map((t: string) => t.trim().toLowerCase().slice(0, 30))
        hasValidFields = true
      }

      if (!hasValidFields) {
        return new Response(
          JSON.stringify({ error: 'No valid editable fields provided for update' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Explicitly reject/strip attempt to update protected fields
      delete sanitizedUpdates.image_path
      delete sanitizedUpdates.image_url
      delete sanitizedUpdates.views_count
      delete sanitizedUpdates.copies_count
      delete sanitizedUpdates.likes_count
      delete sanitizedUpdates.featured
      delete sanitizedUpdates.trending
      delete sanitizedUpdates.creator_name
      delete sanitizedUpdates.creator_handle
      delete sanitizedUpdates.is_published
      delete sanitizedUpdates.status

      const { data: updatedRow, error: updateError } = await supabaseAdmin
        .from('Prompts')
        .update(sanitizedUpdates)
        .eq('id', numericId)
        .select()
        .single()

      if (updateError) {
        console.error('Update error:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update prompt' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data: updatedRow }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ==========================================
    // ACTION: DELETE (OPEN COMMUNITY DELETE)
    // ==========================================
    if (action === 'DELETE') {
      const numericId = parseInt(promptId, 10)
      if (isNaN(numericId) || numericId <= 0) {
        return new Response(
          JSON.stringify({ error: 'Valid positive numeric promptId is required for DELETE' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Retrieve existing row to get image_path
      const { data: targetPrompt, error: fetchErr } = await supabaseAdmin
        .from('Prompts')
        .select('id, image_path')
        .eq('id', numericId)
        .single()

      if (fetchErr || !targetPrompt) {
        return new Response(
          JSON.stringify({ error: 'Prompt not found' }), 
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Storage-First Deletion: Delete Storage Object First if it exists
      if (targetPrompt.image_path) {
        const { error: storageErr } = await supabaseAdmin.storage
          .from('prompt-images')
          .remove([targetPrompt.image_path])

        if (storageErr) {
          console.error('Storage deletion failed:', storageErr)
          return new Response(
            JSON.stringify({ error: 'Failed to delete associated storage image. Database record preserved.' }), 
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // Delete Database Record ONLY after Storage deletion succeeds
      const { error: dbDeleteErr } = await supabaseAdmin
        .from('Prompts')
        .delete()
        .eq('id', numericId)

      if (dbDeleteErr) {
        console.error('Database deletion failed:', dbDeleteErr)
        return new Response(
          JSON.stringify({ error: 'Failed to delete database prompt record' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Prompt and associated artwork deleted successfully' }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: `Unsupported action: ${action}` }), 
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Unhandled Edge Function Error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
