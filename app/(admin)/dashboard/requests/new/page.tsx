import { createClient } from '@/lib/supabase/server'
import { RequestForm } from '@/components/requests/RequestForm'
import { Card, CardContent } from '@/components/ui/card'

export default async function NewRequestPage() {
  const supabase = await createClient()
  const { data: agencies } = await supabase
    .from('ippp_agencies')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#1E3A5F]">새 검증 건 생성</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          위험률 또는 상품 검증 건을 등록합니다. 생성 후 초안 상태로 저장됩니다.
        </p>
      </div>

      <Card className="border-[#E5E7EB]">
        <CardContent className="p-6">
          <RequestForm agencies={agencies ?? []} mode="create" />
        </CardContent>
      </Card>
    </div>
  )
}
