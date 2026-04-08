import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  delta?: number
  description?: string
}

export function KPICard({ title, value, icon, delta, description }: KPICardProps) {
  const renderDelta = () => {
    if (delta === undefined) return null
    if (delta > 0)
      return (
        <span className="flex items-center gap-0.5 text-xs text-emerald-600">
          <TrendingUp className="h-3 w-3" />
          +{delta}
        </span>
      )
    if (delta < 0)
      return (
        <span className="flex items-center gap-0.5 text-xs text-red-500">
          <TrendingDown className="h-3 w-3" />
          {delta}
        </span>
      )
    return (
      <span className="flex items-center gap-0.5 text-xs text-gray-400">
        <Minus className="h-3 w-3" />0
      </span>
    )
  }

  return (
    <Card className="border-[#E5E7EB] bg-white shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-[#6B7280]">{title}</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-2xl font-bold text-[#1E3A5F]">{value}</span>
              {renderDelta()}
            </div>
            {description && (
              <p className="mt-1 text-xs text-[#6B7280]">{description}</p>
            )}
          </div>
          <div className="ml-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#1E3A5F]/10 text-[#1E3A5F]">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
