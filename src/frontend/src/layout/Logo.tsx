import { PackageSearch } from 'lucide-react'

export function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <div className="flex size-8 items-center justify-center rounded-lg bg-marca-600 text-white">
        <PackageSearch className="size-4.5" />
      </div>
      <span className="text-base font-semibold tracking-tight text-slate-900">CompraTrack</span>
    </div>
  )
}
