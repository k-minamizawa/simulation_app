import React from 'react'

interface CardProps {
  title: string
  cost: number
  deliveryRate: number
  highlight?: boolean
}

export default function Card({
  title,
  cost,
  deliveryRate,
  highlight = false
}: CardProps) {
  const cardStyles: React.CSSProperties = {
    backgroundColor: 'white',
    border: highlight
      ? `2px solid var(--color-accent)`
      : '1px solid var(--color-gray-border)',
    borderRadius: 'var(--border-radius)',
    padding: 'var(--spacing-xl)',
    boxShadow: highlight
      ? '0 4px 12px rgba(201, 163, 51, 0.3)'
      : '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'var(--transition)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-md)'
  }

  const titleStyles: React.CSSProperties = {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'bold',
    color: 'var(--color-main)',
    marginBottom: 'var(--spacing-sm)',
    borderBottom: '2px solid var(--color-gray-border)',
    paddingBottom: 'var(--spacing-sm)'
  }

  const metricContainerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-md)',
    flex: 1
  }

  const metricStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--spacing-sm)',
    backgroundColor: 'var(--color-gray-light)',
    borderRadius: 'calc(var(--border-radius) / 2)'
  }

  const labelStyles: React.CSSProperties = {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text)',
    opacity: 0.8
  }

  const valueStyles: React.CSSProperties = {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'bold',
    color: 'var(--color-text)'
  }

  const formatCost = (value: number): string => {
    return `¥${value.toLocaleString()}`
  }

  const formatDeliveryRate = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`
  }

  const getDeliveryRateColor = (rate: number): string => {
    if (rate >= 0.9) return '#22c55e'
    if (rate >= 0.7) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div
      style={cardStyles}
      onMouseEnter={(e) => {
        if (!highlight) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)'
        }
      }}
      onMouseLeave={(e) => {
        if (!highlight) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
        }
      }}
    >
      <h3 style={titleStyles}>{title}</h3>

      <div style={metricContainerStyles}>
        <div style={metricStyles}>
          <span style={labelStyles}>総人件費</span>
          <span style={valueStyles}>{formatCost(cost)}</span>
        </div>

        <div style={metricStyles}>
          <span style={labelStyles}>納期遵守率</span>
          <span style={{
            ...valueStyles,
            color: getDeliveryRateColor(deliveryRate)
          }}>
            {formatDeliveryRate(deliveryRate)}
          </span>
        </div>
      </div>

      {highlight && (
        <div style={{
          backgroundColor: 'var(--color-accent)',
          color: 'white',
          padding: 'var(--spacing-xs) var(--spacing-sm)',
          borderRadius: 'calc(var(--border-radius) / 2)',
          fontSize: 'var(--font-size-sm)',
          textAlign: 'center',
          fontWeight: 'bold',
          marginTop: 'var(--spacing-sm)'
        }}>
          推奨シナリオ
        </div>
      )}
    </div>
  )
}