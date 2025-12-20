'use client'

import React, { Component, ReactNode } from 'react'
import { debug } from '@/lib/debug'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    debug.error('ERROR_BOUNDARY', 'Caught error', { message: error.message, stack: error.stack })
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo)
    debug.error('ERROR_BOUNDARY', 'Component stack trace', {
      message: error.message,
      componentStack: errorInfo.componentStack,
    })
  }

  handleReset = () => {
    debug.log('ERROR_BOUNDARY', 'User reset error boundary')
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                The application encountered an error. Details have been logged to the debug console.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-3 rounded text-sm font-mono break-all">
                {this.state.error?.message || 'Unknown error'}
              </div>
              <Button onClick={this.handleReset} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Press F12 → Console to see full error details, or click the 🐛 debug console
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
