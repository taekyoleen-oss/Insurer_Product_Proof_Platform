import { cn } from '@/lib/utils'

interface AgencyAvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const PALETTE = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-teal-500',
]

function hashName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % PALETTE.length
  }
  return hash
}

const SIZE_MAP = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
}

export function AgencyAvatar({ name, size = 'md', className }: AgencyAvatarProps) {
  const initials = name.slice(0, 2)
  const colorClass = PALETTE[hashName(name)]

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold text-white select-none',
        colorClass,
        SIZE_MAP[size],
        className
      )}
      title={name}
      aria-label={name}
    >
      {initials}
    </span>
  )
}
