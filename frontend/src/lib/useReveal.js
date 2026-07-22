import { useEffect, useRef, useState } from 'react'

/**
 * IntersectionObserver-powered scroll reveal. Returns a ref to attach to the
 * element and a boolean that flips to true (once) when the element enters the
 * viewport. Pair with the `.reveal` / `.reveal-visible` utilities.
 */
export function useReveal(threshold = 0.15) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || visible) return undefined

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        })
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [threshold, visible])

  return [ref, visible]
}
