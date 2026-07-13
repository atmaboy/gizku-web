'use client'

import { createContext, useContext } from 'react'

export const CaptureContext = createContext<{ openCaptureMenu: () => void }>({
  openCaptureMenu: () => {},
})

export function useCapture() {
  return useContext(CaptureContext)
}

/** Dispatched on window whenever a meal is saved via the capture overlay, so pages
 *  showing meal lists (e.g. Riwayat) can silently refresh without a route change. */
export const MEAL_SAVED_EVENT = 'gizku:meal-saved'
