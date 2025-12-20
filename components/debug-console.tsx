// Debug Console Component - shows real-time logs
'use client'

import React, { useState, useEffect } from 'react'
import { debug } from '@/lib/debug'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, ChevronDown, ChevronUp, Download, Trash2 } from 'lucide-react'

export function DebugConsole() {
  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  // Poll for new logs every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      const currentLogs = debug.getLogs()
      setLogs(currentLogs)
    }, 500)

    return () => clearInterval(interval)
  }, [])

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 rounded-full w-12 h-12 p-0"
        variant="outline"
        title="Open Debug Console"
        data-debug-ignore="true"
      >
        🐛
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-96 z-50 flex flex-col shadow-lg" data-debug-ignore="true">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2 rounded-t">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">🐛 Debug Console</span>
          <span className="text-xs bg-slate-700 px-2 py-1 rounded">{logs.length} logs</span>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-slate-700"
            onClick={() => debug.downloadLogs()}
            title="Download logs"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-slate-700"
            onClick={() => debug.clearLogs()}
            title="Clear logs"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-slate-700"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-slate-700"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Logs */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto bg-slate-950 text-xs font-mono p-2 space-y-1">
          {logs.length === 0 ? (
            <div className="text-slate-500 text-center py-4">No logs yet...</div>
          ) : (
            logs.map((log, idx) => (
              <div
                key={idx}
                className={`text-xs leading-tight ${
                  log.level === 'error'
                    ? 'text-red-400'
                    : log.level === 'warn'
                      ? 'text-yellow-400'
                      : log.level === 'success'
                        ? 'text-green-400'
                        : 'text-blue-400'
                }`}
              >
                <span className="text-slate-600">[{log.timestamp}]</span>{' '}
                <span className="text-slate-400">{log.context}:</span> {log.message}
                {log.data && (
                  <div className="text-slate-500 ml-4 text-[10px]">
                    {JSON.stringify(log.data, null, 2)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  )
}
