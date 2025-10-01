'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Button from '@/components/Button'
import Card from '@/components/Card'
import type { ScenarioResult } from '@/types'

export default function ResultsPage() {
  const router = useRouter()
  const [results, setResults] = useState<ScenarioResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 初回データ取得
    const fetchInitialResults = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/results')
        if (!response.ok) {
          throw new Error(`HTTPエラー: ${response.status}`)
        }
        const data: ScenarioResult[] = await response.json()
        console.log('初回データ取得成功:', data)
        setResults(data)
      } catch (error) {
        console.error('初回データ取得エラー:', error)
        // エラー時は空配列を設定
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    fetchInitialResults()

    // WebSocket接続の確立
    const ws = new WebSocket('ws://localhost:8000/ws/results')

    ws.onopen = () => {
      console.log('WebSocket接続が確立されました')
    }

    ws.onmessage = (event) => {
      console.log('WebSocketメッセージ受信:', event.data)
      try {
        const data: ScenarioResult[] = JSON.parse(event.data)
        console.log('結果データを更新:', data)
        setResults(data)
      } catch (error) {
        console.error('WebSocketメッセージの解析エラー:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocketエラー:', error)
    }

    ws.onclose = () => {
      console.log('WebSocket接続が切断されました')
    }

    // クリーンアップ関数：コンポーネントがアンマウントされる時にWebSocketを閉じる
    return () => {
      console.log('WebSocket接続をクリーンアップします')
      ws.close()
    }
  }, [])

  const handleBackToStart = () => {
    router.push('/start')
  }

  const getBestScenario = (): number => {
    if (results.length === 0) return -1

    // 納期遵守率80%以上のシナリオの中で、最もコストが低いものを選択
    const validScenarios = results.filter(r => r.average_delivery_rate >= 0.8)
    if (validScenarios.length === 0) {
      // 80%以上がない場合は、納期遵守率が最も高いものを選択
      return results.reduce((best, current) =>
        current.average_delivery_rate > results[best].average_delivery_rate ? results.indexOf(current) : best, 0
      )
    }

    // コストが最も低いものを選択
    const bestScenario = validScenarios.reduce((best, current) =>
      current.average_total_costs < best.average_total_costs ? current : best
    )

    return results.indexOf(bestScenario)
  }

  const containerStyles: React.CSSProperties = {
    padding: 'var(--spacing-xl)',
  }

  const headingStyles: React.CSSProperties = {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'bold',
    color: 'var(--color-main)',
    marginBottom: 'var(--spacing-sm)',
    textAlign: 'center'
  }

  const subtitleStyles: React.CSSProperties = {
    fontSize: 'var(--font-size-base)',
    color: 'var(--color-text)',
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 'var(--spacing-2xl)'
  }

  const gridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 'var(--spacing-xl)',
    marginBottom: 'var(--spacing-2xl)'
  }

  const loadingStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    fontSize: 'var(--font-size-lg)',
    color: 'var(--color-main)'
  }

  const spinnerStyles: React.CSSProperties = {
    border: '4px solid var(--color-gray-border)',
    borderTop: '4px solid var(--color-main)',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    marginBottom: 'var(--spacing-lg)'
  }

  const buttonContainerStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 'var(--spacing-2xl)'
  }

  if (loading) {
    return (
      <div style={containerStyles}>
        <div style={loadingStyles}>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <div style={spinnerStyles}></div>
          <p>シミュレーション結果を読み込んでいます...</p>
        </div>
      </div>
    )
  }

  const bestScenarioIndex = getBestScenario()

  return (
    <div style={containerStyles}>
      <h1 style={headingStyles}>
        シミュレーション結果
      </h1>
      <p style={subtitleStyles}>
        各シナリオの評価結果を以下に表示します
      </p>

      <div style={gridStyles}>
        {results.map((result, index) => (
          <Card
            key={result.scenario_id}
            title={result.scenario_name}
            cost={result.average_total_costs}
            deliveryRate={result.average_delivery_rate}
            highlight={index === bestScenarioIndex}
          />
        ))}
      </div>

      {bestScenarioIndex !== -1 && (
        <div style={{
          backgroundColor: 'var(--color-gray-light)',
          borderLeft: '4px solid var(--color-accent)',
          padding: 'var(--spacing-lg)',
          borderRadius: 'var(--border-radius)',
          marginBottom: 'var(--spacing-xl)'
        }}>
          <h3 style={{
            color: 'var(--color-main)',
            marginBottom: 'var(--spacing-sm)'
          }}>
            推奨シナリオ
          </h3>
          <p style={{ color: 'var(--color-text)' }}>
            「{results[bestScenarioIndex].scenario_name}」が最適なバランスを実現しています。
            納期遵守率{(results[bestScenarioIndex].average_delivery_rate * 100).toFixed(1)}%を維持しながら、
            コストを¥{results[bestScenarioIndex].average_total_costs.toLocaleString()}に抑えることができます。
          </p>
        </div>
      )}

      <div style={buttonContainerStyles}>
        <Button onClick={handleBackToStart} variant="secondary">
          再度シミュレーションを行う
        </Button>
      </div>
    </div>
  )
}