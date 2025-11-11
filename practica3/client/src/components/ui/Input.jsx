import React from 'react'

export default function Input({ className = '', icon, ...props }) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </div>
      )}
      <input
        className={`
          w-full px-4 py-3 rounded-xl
          bg-slate-800/50 backdrop-blur-sm
          border-2 border-slate-700/50
          text-slate-100 placeholder-slate-500
          focus:outline-none focus:border-emerald-500 focus:bg-slate-800
          transition-all duration-200
          ${icon ? 'pl-10' : ''}
          ${className}
        `}
        {...props}
      />
    </div>
  )
}
