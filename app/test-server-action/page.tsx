'use client'

import { pingServer } from '@/app/actions/ping'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function TestServerActionPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function handleTest() {
    setLoading(true)
    try {
      const res = await pingServer()
      setResult({ success: true, data: res })
    } catch (error: any) {
      setResult({ success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Server Action Test</h1>
      <Button onClick={handleTest} disabled={loading}>
        {loading ? 'Testing...' : 'Test Server Action'}
      </Button>
      {result && (
        <div className="mt-4 p-4 border rounded">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
