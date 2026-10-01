import { useSyncExternalStore } from 'react'
import { getChainSnapshot, subscribeToChain } from './chainStore'

export function useChain() {
  return useSyncExternalStore(subscribeToChain, getChainSnapshot, getChainSnapshot)
}