import CharityProfile from '@/pages/CharityProfile'
import Landing from '@/pages/Landing'
import Placeholder from '@/pages/Placeholder'

// A deliberately tiny router: three real routes and honest placeholders for
// flows that don't exist yet. Swap for a real router when the app grows.
function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'

  const route =
    path === '/'
      ? { title: 'Clear Cause · Give to the causes you\'d actually choose', page: <Landing /> }
      : path === '/charity/northside'
        ? { title: 'Northside Community Pantry · Clear Cause', page: <CharityProfile /> }
        : path === '/matches'
          ? { title: 'Your matches · Clear Cause', page: <Placeholder kind="matches" /> }
          : path === '/partners'
            ? { title: 'Become a partner · Clear Cause', page: <Placeholder kind="partners" /> }
            : { title: 'Not found · Clear Cause', page: <Placeholder kind="missing" /> }

  document.title = route.title
  return route.page
}

export default App
