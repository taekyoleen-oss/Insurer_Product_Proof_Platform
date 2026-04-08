import { createClient } from '@/lib/supabase/server'
import { AgenciesClient } from './AgenciesClient'
import type { Agency } from '@/types'

export default async function AgenciesPage() {
  const supabase = await createClient()

  const { data: agencies } = await supabase
    .from('ippp_agencies')
    .select('*')
    .order('name')

  return (
    <AgenciesClient agencies={(agencies ?? []) as Agency[]} />
  )
}
