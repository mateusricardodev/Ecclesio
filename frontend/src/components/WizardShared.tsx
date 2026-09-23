/* eslint-disable react-refresh/only-export-components */
import React from 'react'

export const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#FFFFFF',
  border: '1px solid #E9E9E9',
  borderRadius: '12px',
  color: '#0A0A09',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.9375rem',
  padding: '0.75rem 0.875rem',
  outline: 'none',
}

export function WizardCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col gap-5 rounded-[20px] p-6 sm:p-7"
      style={{ background: '#FFFFFF', border: '1px solid #E9E9E9' }}
    >
      {children}
    </div>
  )
}

export function WizardField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-sm font-medium"
        style={{ color: '#0A0A09', fontFamily: 'var(--font-sans)' }}
      >
        {label}
        {required && <span style={{ color: '#6F6F6F', marginLeft: '0.2rem' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

export function WizardInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} className="focus:outline-none focus:border-ecc-navy" />
}

export function WizardSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      style={{ ...inputStyle, cursor: 'pointer', ...props.style }}
      className="focus:outline-none focus:border-ecc-navy"
    >
      {children}
    </select>
  )
}

export function WizardTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...inputStyle, resize: 'none', ...props.style }}
      className="focus:outline-none focus:border-ecc-navy"
    />
  )
}

export function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative shrink-0 transition-colors"
      style={{
        width: '2.25rem',
        height: '1.25rem',
        borderRadius: '9999px',
        background: enabled ? '#00186D' : '#E4E4E4',
      }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
        style={{ transform: enabled ? 'translateX(1rem)' : 'translateX(0)' }}
      />
    </button>
  )
}

export function wizardPrimaryBtn(disabled?: boolean): React.CSSProperties {
  return {
    background: '#00186D',
    color: '#FFFFFF',
    fontFamily: 'var(--font-sans)',
    fontWeight: 700,
    fontSize: '14px',
    letterSpacing: '-0.025em',
    padding: '14px 22px',
    borderRadius: '1000px',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition: 'all 0.15s',
  }
}

export function wizardNavBtn(): React.CSSProperties {
  return {
    background: 'transparent',
    color: '#6F6F6F',
    fontFamily: 'var(--font-sans)',
    fontWeight: 700,
    fontSize: '14px',
    letterSpacing: '-0.025em',
    padding: '0.5rem 0',
    border: 'none',
    cursor: 'pointer',
  }
}

export function wizardSecondaryBtn(): React.CSSProperties {
  return {
    background: '#E6E9F3',
    color: '#00186D',
    fontFamily: 'var(--font-sans)',
    fontWeight: 700,
    fontSize: '14px',
    letterSpacing: '-0.025em',
    padding: '14px 22px',
    borderRadius: '1000px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }
}
