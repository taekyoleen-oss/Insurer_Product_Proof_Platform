'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createRequest, type CreateRequestData } from '@/lib/actions/requests'
import { HAZARD_TYPES, PRODUCT_TYPES } from '@/types'
import type { Agency, Request } from '@/types'

interface RequestFormProps {
  agencies: Pick<Agency, 'id' | 'name'>[]
  initialData?: Partial<Request>
  mode?: 'create' | 'edit'
}

export function RequestForm({ agencies, initialData, mode = 'create' }: RequestFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [type, setType] = useState<'hazard_rate' | 'product'>(
    initialData?.type ?? 'hazard_rate'
  )
  const [hazardSelected, setHazardSelected] = useState<string[]>(
    initialData?.hazard_type ?? []
  )
  const [customHazard, setCustomHazard] = useState('')
  const [agencyId, setAgencyId] = useState(initialData?.agency_id ?? '')
  const [productType, setProductType] = useState(initialData?.product_type ?? '')

  const toggleHazard = (value: string) => {
    setHazardSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const finalHazardTypes = customHazard.trim()
    ? [...hazardSelected, customHazard.trim()]
    : hazardSelected

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const title = (form.elements.namedItem('title') as HTMLInputElement).value
    const due_date = (form.elements.namedItem('due_date') as HTMLInputElement).value
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value

    const dueDate = new Date(due_date)
    const fiscal_year = dueDate.getFullYear()
    const fiscal_quarter = Math.floor(dueDate.getMonth() / 3) + 1

    const data: CreateRequestData = {
      type,
      title,
      description: description || undefined,
      agency_id: agencyId,
      due_date: due_date || undefined,
      fiscal_year,
      fiscal_quarter: fiscal_quarter as 1 | 2 | 3 | 4,
      ...(type === 'hazard_rate' && { hazard_type: finalHazardTypes }),
      ...(type === 'product' && productType && { product_type: productType }),
    }

    startTransition(async () => {
      try {
        await createRequest(data)
        router.push('/dashboard/requests')
      } catch (err) {
        setError(err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="title">검증 건 제목 *</Label>
          <Input
            id="title"
            name="title"
            defaultValue={initialData?.title}
            placeholder="검증 건 제목을 입력하세요"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>검증 유형 *</Label>
          <input type="hidden" name="type" value={type} />
          <div className="flex gap-3">
            <Button
              type="button"
              variant={type === 'hazard_rate' ? 'default' : 'outline'}
              onClick={() => setType('hazard_rate')}
              className="flex-1"
            >
              위험률 검증
            </Button>
            <Button
              type="button"
              variant={type === 'product' ? 'default' : 'outline'}
              onClick={() => setType('product')}
              className="flex-1"
            >
              상품 검증
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="agency_id">배정 기관 *</Label>
          <Select name="agency_id" value={agencyId} onValueChange={setAgencyId} required>
            <SelectTrigger>
              <SelectValue placeholder="기관을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {agencies.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {type === 'hazard_rate' && (
        <Card className="border-[#E5E7EB]">
          <CardContent className="p-4 space-y-3">
            <Label>위험률 종류 (복수 선택 가능)</Label>
            <div className="grid grid-cols-2 gap-2">
              {HAZARD_TYPES.map((h) => (
                <label key={h} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={hazardSelected.includes(h)}
                    onCheckedChange={() => toggleHazard(h)}
                  />
                  <span className="text-sm">{h}</span>
                </label>
              ))}
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label htmlFor="custom_hazard" className="text-xs text-[#6B7280]">
                기타 위험률 직접 입력
              </Label>
              <Input
                id="custom_hazard"
                value={customHazard}
                onChange={(e) => setCustomHazard(e.target.value)}
                placeholder="예: 기타위험률명 입력"
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {type === 'product' && (
        <div className="space-y-2">
          <Label htmlFor="product_type">상품 종류 *</Label>
          <Select
            name="product_type"
            value={productType}
            onValueChange={setProductType}
            required={type === 'product'}
          >
            <SelectTrigger>
              <SelectValue placeholder="상품 종류를 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_TYPES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="due_date">마감 기한 *</Label>
        <Input
          id="due_date"
          name="due_date"
          type="date"
          defaultValue={initialData?.due_date ?? ''}
          required
          min={new Date().toISOString().split('T')[0]}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">검증 설명 (선택)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initialData?.description ?? ''}
          placeholder="검증 건에 대한 상세 설명을 입력하세요 (선택사항)"
          rows={4}
        />
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          취소
        </Button>
        <Button
          type="submit"
          disabled={isPending || !agencyId}
          className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white"
        >
          {isPending ? '처리 중...' : mode === 'create' ? '검증 건 생성' : '수정 완료'}
        </Button>
      </div>
    </form>
  )
}
