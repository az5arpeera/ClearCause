import { useEffect } from 'react'

import CharityProfile from '@/pages/CharityProfile'
import Landing from '@/pages/Landing'
import Matching from '@/pages/Matching'
import Placeholder from '@/pages/Placeholder'

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'

  const routes = new Map([
    ['/', { title: 'Clear Cause · Give to the causes you\'d actually choose', page: <Landing /> }],
    ['/charity/northside', { title: 'Northside Community Pantry · Clear Cause', page: <CharityProfile /> }],
    ['/quiz', { title: 'Giving preferences · Clear Cause', page: <Matching mode="quiz" /> }],
    ['/matches', { title: 'Your matches · Clear Cause', page: <Matching mode="results" /> }],
    ['/partners', { title: 'Become a partner · Clear Cause', page: <Placeholder kind="partners" /> }],
  ])
  const route = routes.get(path) ?? { title: 'Not found · Clear Cause', page: <Placeholder kind="missing" /> }

  useEffect(() => {
    document.title = route.title
  }, [route.title])

  return route.page
}

export default App
