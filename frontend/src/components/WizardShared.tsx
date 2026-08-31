/* eslint-disable react-refresh/only-export-components */
import React from 'react'

export const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#FAFAFA',
  border: '1px solid rgba(0,24,109,0.15)',
  borderRadius: '10px',
  color: '#0A0A09',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.875rem',
  padding: '0.625rem 0.75rem',
  outline: 'none',
}

export function WizardCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col gap-5 rounded-2xl p-6"
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(0,24,109,0.08)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
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
        style={{ color: '#33425C', fontFamily: 'var(--font-sans)' }}
      >
        {label}
        {required && <span style={{ color: '#D4B16A', marginLeft: '0.2rem' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

export function WizardInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} className="focus:outline-none" />
}

export function WizardSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      style={{ ...inputStyle, cursor: 'pointer', ...props.style }}
      className="focus:outline-none"
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
      className="focus:outline-none"
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
        background: enabled ? '#00186D' : 'rgba(0,24,109,0.15)',
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
    background: disabled ? '#33425C' : '#00186D',
    color: '#FFFFFF',
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    fontSize: '0.875rem',
    padding: '0.625rem 1.75rem',
    borderRadius: '0.75rem',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.7 : 1,
    boxShadow: disabled ? 'none' : '0 2px 10px rgba(0,24,109,0.18)',
    transition: 'all 0.15s',
  }
}

export function wizardNavBtn(): React.CSSProperties {
  return {
    background: 'transparent',
    color: '#6B7280',
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    fontSize: '0.8125rem',
    padding: '0.5rem 0',
    border: 'none',
    cursor: 'pointer',
  }
}

export function wizardSecondaryBtn(): React.CSSProperties {
  return {
    background: 'transparent',
    color: '#00186D',
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    fontSize: '0.875rem',
    padding: '0.625rem 1.5rem',
    borderRadius: '0.75rem',
    border: '1.5px solid rgba(0,24,109,0.25)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }
}
