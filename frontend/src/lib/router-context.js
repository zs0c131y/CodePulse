import { createContext, useContext } from 'react'

export const RouterContext = createContext(null)

export function browserLocation() {
  const pathname = window.location.pathname.length > 1
    ? window.location.pathname.replace(/\/+$/, '')
    : window.location.pathname

  return {
    pathname,
    search: window.location.search,
    hash: window.location.hash,
  }
}

function useRouter() {
  const router = useContext(RouterContext)
  if (!router) throw new Error('Router components must be rendered inside BrowserRouter.')
  return router
}

export function useLocation() {
  return useRouter().location
}

export function useNavigate() {
  return useRouter().navigate
}
