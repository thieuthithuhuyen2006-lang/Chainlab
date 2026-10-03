import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    console.error('MerkleTree ErrorBoundary caught:', error)
  }

  handleReset() {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="rounded-xl border border-rose-400/30 bg-slate-900/75 p-5" aria-label="Merkle Tree Explorer">
          <header className="mb-3 flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg border border-rose-400/20 bg-rose-400/[0.07] text-rose-200">⚠</span>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Merkle Tree</h3>
              <p className="text-xs text-slate-400">Component encountered an error</p>
            </div>
          </header>
          <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-[#0b0f19]/80 p-3 font-mono text-[10px] leading-5 text-rose-200">
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <button type="button" onClick={() => this.handleReset()} className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-md border border-sky-300/25 px-2.5 text-[11px] font-semibold text-sky-100 hover:border-sky-300/45 hover:bg-sky-300/[0.08]">
            Try again
          </button>
        </section>
      )
    }
    return this.props.children
  }
}
