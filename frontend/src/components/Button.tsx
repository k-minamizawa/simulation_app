'use client'

import React from 'react'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  fullWidth?: boolean
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  fullWidth = false
}: ButtonProps) {
  const baseStyles: React.CSSProperties = {
    padding: 'var(--spacing-md) var(--spacing-xl)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 'bold',
    borderRadius: 'var(--border-radius)',
    border: 'none',
    transition: 'var(--transition)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : 'auto',
    display: 'inline-block',
    textAlign: 'center'
  }

  const variantStyles: React.CSSProperties = variant === 'primary'
    ? {
        backgroundColor: 'var(--color-main)',
        color: 'white',
      }
    : {
        backgroundColor: 'transparent',
        color: 'var(--color-main)',
        border: '2px solid var(--color-main)',
      }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    const button = e.currentTarget
    if (variant === 'primary') {
      button.style.backgroundColor = 'var(--color-main-hover)'
    } else {
      button.style.backgroundColor = 'rgba(0, 77, 153, 0.1)'
    }
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    const button = e.currentTarget
    if (variant === 'primary') {
      button.style.backgroundColor = 'var(--color-main)'
    } else {
      button.style.backgroundColor = 'transparent'
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    const button = e.currentTarget
    if (variant === 'primary') {
      button.style.backgroundColor = 'var(--color-main-active)'
    } else {
      button.style.backgroundColor = 'rgba(0, 77, 153, 0.2)'
    }
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    const button = e.currentTarget
    if (variant === 'primary') {
      button.style.backgroundColor = 'var(--color-main-hover)'
    } else {
      button.style.backgroundColor = 'rgba(0, 77, 153, 0.1)'
    }
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{...baseStyles, ...variantStyles}}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {children}
    </button>
  )
}