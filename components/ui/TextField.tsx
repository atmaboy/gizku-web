'use client'

import { useState, InputHTMLAttributes } from 'react'
import { IconEye, IconEyeOff } from './icons'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  isPassword?: boolean
  errorText?: string
  leadingIcon?: React.ReactNode
  readOnly?: boolean
}

export default function TextField({
  label,
  isPassword,
  errorText,
  leadingIcon,
  readOnly,
  className = '',
  ...props
}: TextFieldProps) {
  const [show, setShow] = useState(false)
  const hasError = !!errorText

  return (
    <div className="mb-3.5">
      {label ? (
        <div className="text-2xs font-semibold text-secondary uppercase tracking-[0.5px] mb-1.5">{label}</div>
      ) : null}
      <div
        className={`flex items-center gap-2.5 h-11 rounded-lg px-3.5 box-border ${readOnly ? 'bg-muted' : 'bg-sunken'}`}
        style={{ boxShadow: hasError ? 'inset 0 0 0 1.5px var(--color-danger)' : 'var(--shadow-hairline)' }}
      >
        {leadingIcon}
        <input
          readOnly={readOnly}
          type={isPassword ? (show ? 'text' : 'password') : props.type}
          className={`flex-1 bg-transparent border-none outline-none text-base text-primary placeholder:text-tertiary ${className}`}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            className="flex items-center text-secondary shrink-0 cursor-pointer"
            tabIndex={-1}
          >
            {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
          </button>
        ) : null}
      </div>
      {errorText ? <div className="text-xs text-danger mt-1">{errorText}</div> : null}
    </div>
  )
}
