import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/instrument-serif/400.css'
import './index.css'
import { Layout } from './components/Layout'
import { Home } from './routes/Home'
import { AirportPage } from './routes/AirportPage'
import { FlightPage } from './routes/FlightPage'
import { FlightsSearch } from './routes/FlightsSearch'
import { Compare } from './routes/Compare'
import { Login, NotFound } from './routes/Login'
import { ApiError } from './lib/api'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      // 4xx answers are final; only retry network and server errors
      retry: (n, e) => n < 2 && !(e instanceof ApiError && e.status >= 400 && e.status < 500),
    },
  },
})

const router = createBrowserRouter([
  {
    element: <Layout />,
    HydrateFallback: () => null,
    children: [
      { index: true, element: <Home /> },
      { path: 'airports/:iata', element: <AirportPage /> },
      { path: 'flight/:flightKey', element: <FlightPage /> },
      { path: 'flights', element: <FlightsSearch /> },
      { path: 'live-map', lazy: async () => ({ Component: (await import('./routes/LiveMap')).LiveMap }) },
      { path: 'compare', element: <Compare /> },
      { path: 'login', element: <Login /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
