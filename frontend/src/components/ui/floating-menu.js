import { useLayoutEffect, useRef, useState } from 'react'

const VIEWPORT_GUTTER = 8
const MENU_GAP = 8
const MIN_MENU_HEIGHT = 80
const MAX_MENU_HEIGHT = 320

export function useFloatingMenu(open, minimumWidth = 0) {
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const [style, setStyle] = useState({})

  useLayoutEffect(() => {
    if (!open) return undefined

    function updatePosition() {
      const trigger = triggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const width = Math.min(
        Math.max(rect.width, minimumWidth),
        viewportWidth - VIEWPORT_GUTTER * 2,
      )
      const left = Math.min(
        Math.max(VIEWPORT_GUTTER, rect.left),
        viewportWidth - width - VIEWPORT_GUTTER,
      )
      const spaceBelow = viewportHeight - rect.bottom - MENU_GAP - VIEWPORT_GUTTER
      const spaceAbove = rect.top - MENU_GAP - VIEWPORT_GUTTER
      const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow
      const availableHeight = Math.max(
        MIN_MENU_HEIGHT,
        Math.min(MAX_MENU_HEIGHT, openAbove ? spaceAbove : spaceBelow),
      )

      setStyle({
        position: 'fixed',
        zIndex: 100,
        left,
        width,
        maxHeight: availableHeight,
        ...(openAbove
          ? { bottom: viewportHeight - rect.top + MENU_GAP }
          : { top: rect.bottom + MENU_GAP }),
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [minimumWidth, open])

  return { triggerRef, menuRef, floatingStyle: style }
}
