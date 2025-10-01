'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/Button'

export default function StartPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null) // 文字列またはnullが入る型定義をした上でnullを代入

  const handleStartSimulation = async () => {
    console.log('シミュレーション開始ボタンがクリックされました')
    setIsLoading(true)
    setError(null)

    try {
      // バックエンドのシミュレーション開始APIを呼び出し
      const response = await fetch('http://localhost:8000/api/simulations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTPエラー: ${response.status}`)
      }

      const data = await response.json()
      console.log('シミュレーション開始成功:', data)

      // 成功したら結果閲覧画面へ遷移
      router.push('/results')
    } catch (error) {
      console.error('シミュレーション開始エラー:', error)
      setError('シミュレーションの開始に失敗しました。サーバーとの接続を確認してください。')
      setIsLoading(false)
    }
  }

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    padding: 'var(--spacing-xl)',
    textAlign: 'center'
  }

  const headingStyles: React.CSSProperties = {
    fontSize: 'var(--font-size-3xl)',
    fontWeight: 'bold',
    color: 'var(--color-main)',
    marginBottom: 'var(--spacing-lg)'
  }

  const descriptionStyles: React.CSSProperties = {
    fontSize: 'var(--font-size-lg)',
    color: 'var(--color-text)',
    maxWidth: '600px',
    lineHeight: 1.8,
    marginBottom: 'var(--spacing-2xl)'
  }

  const featureListStyles: React.CSSProperties = {
    backgroundColor: 'var(--color-gray-light)',
    borderRadius: 'var(--border-radius)',
    padding: 'var(--spacing-xl)',
    maxWidth: '500px',
    marginBottom: 'var(--spacing-2xl)',
    textAlign: 'left'
  }

  const featureItemStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 'var(--spacing-md)',
    fontSize: 'var(--font-size-base)'
  }

  const bulletStyles: React.CSSProperties = {
    color: 'var(--color-accent)',
    marginRight: 'var(--spacing-sm)',
    fontSize: 'var(--font-size-xl)'
  }

  return (
    <div style={containerStyles}>
      <h1 style={headingStyles}>
        シミュレーションを開始
      </h1>

      <p style={descriptionStyles}>
        FlexSimとWebアプリケーションが連携した
        リアルタイムシミュレーションデモをご体験いただけます。
        複数の生産シナリオを自動的に評価し、最適な戦略を提案します。
      </p>

      <div style={featureListStyles}>
        <h3 style={{
          color: 'var(--color-main)',
          marginBottom: 'var(--spacing-lg)',
          fontSize: 'var(--font-size-xl)'
        }}>
          デモの特徴
        </h3>
        <div style={featureItemStyles}>
          <span style={bulletStyles}>◆</span>
          <span>3つの異なる生産シナリオを自動評価</span>
        </div>
        <div style={featureItemStyles}>
          <span style={bulletStyles}>◆</span>
          <span>リアルタイムでの結果更新</span>
        </div>
        <div style={featureItemStyles}>
          <span style={bulletStyles}>◆</span>
          <span>総人件費と納期遵守率の可視化</span>
        </div>
        <div style={featureItemStyles}>
          <span style={bulletStyles}>◆</span>
          <span>最適シナリオの自動推奨</span>
        </div>
      </div>

      <Button
        onClick={handleStartSimulation}
        variant="primary"
        disabled={isLoading}   // isLoadingがtrueの時、ボタンがクリックできなくなる
      > 
        {isLoading ? '処理中...' : 'シミュレーションを開始'} 
      </Button> 

      {error && (   // error && (...) は、errorが存在する場合のみ表示する条件付きレンダリング
        <p style={{
          marginTop: 'var(--spacing-md)',
          color:  '#ef4444',
          fontSize: 'var(--font-size-sm)'
        }}>
          {error}
        </p>
      )}
      
      <p style={{
        marginTop: 'var(--spacing-xl)',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text)',
        opacity: 0.6
      }}>
        ※ シミュレーション実行には約30秒かかります
      </p>
    </div>
  )
}