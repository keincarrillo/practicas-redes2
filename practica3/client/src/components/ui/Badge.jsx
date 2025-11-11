import React from 'react'

const variants = {
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
  default: 'bg-slate-700/50 text-slate-300 border-slate-600',
}

export default function Badge({
  children,
  variant = 'default',
  className = '',
}) {
  return (
    <span
      className={`
      inline-flex items-center gap-1
      px-2 py-1 rounded-full
      border text-xs font-medium
      ${variants[variant]}
      ${className}
    `}
    >
      {children}
    </span>
  )
}
