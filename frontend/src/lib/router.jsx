import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { browserLocation, RouterContext, useLocation, useNavigate } from './router-context'

export function BrowserRouter({ children }) {
  const [location, setLocation] = useState(browserLocation)

  useEffect(() => {
    const syncLocation = () => setLocation(browserLocation())
    window.addEventListener('popstate', syncLocation)
    return () => window.removeEventListener('popstate', syncLocation)
  }, [])

  const navigate = useCallback((to, { replace = false } = {}) => {
    const destination = String(to)
    if (replace) window.history.replaceState(null, '', destination)
    else window.history.pushState(null, '', destination)
    setLocation(browserLocation())
  }, [])

  const value = useMemo(() => ({
    location,
    navigate,
  }), [location, navigate])

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function Link({ to, onClick, target, children, ...props }) {
  const navigate = useNavigate()

  function handleClick(event) {
    onClick?.(event)
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      (target && target !== '_self')
    ) {
      return
    }

    event.preventDefault()
    navigate(to)
  }

  return (
    <a {...props} href={to} target={target} onClick={handleClick}>
      {children}
    </a>
  )
}

export function Navigate({ to, replace = false }) {
  const navigate = useNavigate()

  useEffect(() => {
    navigate(to, { replace })
  }, [navigate, replace, to])

  return null
}

export function Route() {
  return null
}

export function Routes({ children }) {
  const { pathname } = useLocation()
  const routes = Children.toArray(children).filter(isValidElement)
  const match = routes.find(route => route.props.path === pathname)
    || routes.find(route => route.props.path === '*')

  return match?.props.element || null
}
