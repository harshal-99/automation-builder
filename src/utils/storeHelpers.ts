/**
 * Helper utilities for immutable state updates using Immer
 * These functions provide reusable patterns for common store mutations
 */

import { produce, Draft } from 'immer'
import type { Ref } from 'vue'

/**
 * Helper to update a ref value using Immer
 * This ensures all state changes are immutable
 */
export function updateRef<T>(ref: Ref<T>, updater: (draft: Draft<T>) => void): void {
  ref.value = produce(ref.value, updater) as T
}

/**
 * Helper to replace a ref value (for cases where we need to completely replace)
 * Still uses Immer for consistency
 */
export function replaceRef<T>(ref: Ref<T>, newValue: T): void {
  ref.value = produce(newValue, (draft) => draft) as T
}

/**
 * Helper to update an array ref by finding and updating an item
 */
export function updateArrayItem<T extends { id: string }>(
  ref: Ref<T[]>,
  itemId: string,
  updater: (draft: Draft<T>) => void
): boolean {
  let updated = false
  ref.value = produce(ref.value, (draft) => {
    const item = draft.find((item) => item.id === itemId)
    if (item) {
      updater(item)
      updated = true
    }
  })
  return updated
}

/**
 * Helper to update multiple array items
 */
export function updateArrayItems<T extends { id: string }>(
  ref: Ref<T[]>,
  itemIds: string[],
  updater: (draft: Draft<T>) => void
): number {
  let updatedCount = 0
  ref.value = produce(ref.value, (draft) => {
    draft.forEach((item) => {
      if (itemIds.includes(item.id)) {
        updater(item)
        updatedCount++
      }
    })
  })
  return updatedCount
}

/**
 * Helper to filter array items (immutable removal)
 */
export function filterArrayItems<T extends { id: string }>(
  ref: Ref<T[]>,
  predicate: (item: T) => boolean
): T[] {
  const removed: T[] = []
  ref.value = produce(ref.value, (draft) => {
    const originalLength = draft.length
    // Filter in place
    let writeIndex = 0
    for (let readIndex = 0; readIndex < originalLength; readIndex++) {
      if (predicate(draft[readIndex] as T)) {
        draft[writeIndex] = draft[readIndex]
        writeIndex++
      } else {
        removed.push(draft[readIndex] as T)
      }
    }
    draft.length = writeIndex
  })
  return removed
}

/**
 * Helper to add item to array
 */
export function addArrayItem<T>(ref: Ref<T[]>, item: T): void {
  ref.value = produce(ref.value, (draft) => {
    draft.push(item as Draft<T>)
  })
}

/**
 * Helper to update a record/object ref
 */
export function updateRecordItem<T>(
  ref: Ref<Record<string, T>>,
  key: string,
  updater: (draft: Draft<T> | undefined) => void
): void {
  ref.value = produce(ref.value, (draft) => {
    if (!draft[key]) {
      draft[key] = {} as Draft<T>
    }
    updater(draft[key])
  })
}

/**
 * Helper to update multiple record items
 */
export function updateRecordItems<T>(
  ref: Ref<Record<string, T>>,
  keys: string[],
  updater: (draft: Draft<T> | undefined) => void
): void {
  ref.value = produce(ref.value, (draft) => {
    keys.forEach((key) => {
      if (!draft[key]) {
        draft[key] = {} as Draft<T>
      }
      updater(draft[key])
    })
  })
}

/**
 * Helper to merge object properties into a ref
 */
export function mergeRef<T extends Record<string, unknown>>(
  ref: Ref<T>,
  updates: Partial<T>
): void {
  ref.value = produce(ref.value, (draft) => {
    Object.assign(draft, updates)
  })
}
