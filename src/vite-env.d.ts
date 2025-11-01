/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ELEVENLABS_API_KEY: string
  readonly VITE_ELEVENLABS_AGENT_ID: string
  readonly VITE_ELEVENLABS_AGENT_ID_BRAINTSTORMING: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_OUTSPEED_ONBOARDING: string
  readonly VITE_LOGROCKET_ID?: string
  readonly VITE_LOGROCKET_APP_ID?: string
  readonly VITE_LOGROCKET_ENABLE_IN_DEV?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
