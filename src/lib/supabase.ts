import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type for submissions
export type Submission = {
  id: string
  created_at: string
  name: string
  phone: string
  email: string
  interest: string | null
  message: string | null
  status: 'new' | 'contacted' | 'closed'
  notes: string | null
}
