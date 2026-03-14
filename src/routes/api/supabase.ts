import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

const createRoute = createFileRoute as unknown as (path: string) => (options: any) => any

export const Route = createRoute('/api/supabase')({
  server: {
    handlers: {
      GET: async ({ context }: { context: any }) => {
        const env = context.cloudflare.env

        if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
          return new Response('Supabase env variables missing', { status: 500 })
        }

        createClient(env.SUPABASE_URL, env.SUPABASE_KEY)

        return new Response(
          JSON.stringify({
            status: 'connected',
            url: env.SUPABASE_URL,
          }),
          { headers: { 'Content-Type': 'application/json' } },
        )
      },
    },
  },
})
