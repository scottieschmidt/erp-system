import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/supabase')({
  server: {
    handlers: {
      GET: async ({ context }) => {
        const env = context.cloudflare.env

        return new Response(JSON.stringify({
          SUPABASE_URL: env.SUPABASE_URL,
          KEY_EXISTS: !!env.SUPABASE_KEY
        }), {
          headers: { "Content-Type": "application/json" }
        })
      }
    }
  }
})
