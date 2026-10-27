import { createClient } from '@/lib/supabase/client'

export const authConfigurationMessage = 'Falta configurar Supabase para habilitar el acceso.'

class AuthConfigurationError extends Error {}

export function createAuthClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new AuthConfigurationError(authConfigurationMessage)
  }
  return createClient()
}

export function authFailureMessage(error: unknown, fallback: string) {
  return error instanceof AuthConfigurationError ? error.message : fallback
}
