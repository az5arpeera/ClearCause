import { useEffect } from 'react'

import CharityProfile from '@/pages/CharityProfile'
import { NORTHSIDE_ID } from '@/data/sample-charity'
import Landing from '@/pages/Landing'
import About from '@/pages/About'
import AdminReview from '@/pages/AdminReview'
import Contact from '@/pages/Contact'
import Explore from '@/pages/Explore'
import ForYou from '@/pages/ForYou'
import Quiz, { LegacyMatches } from '@/pages/Matching'
import Placeholder from '@/pages/Placeholder'
import Profile from '@/pages/Profile'
import SignIn from '@/pages/SignIn'

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'

  const routes = new Map([
    ['/', { title: 'Clear Cause · Give to the causes you\'d actually choose', page: <Landing /> }],
    ['/explore', { title: 'Explore charities · Clear Cause', page: <Explore /> }],
    ['/for-you', { title: 'For you · Clear Cause', page: <ForYou /> }],
    ['/quiz', { title: 'Giving preferences · Clear Cause', page: <Quiz /> }],
    ['/matches', { title: 'For you · Clear Cause', page: <LegacyMatches /> }],
    ['/about', { title: 'About · Clear Cause', page: <About /> }],
    ['/contact', { title: 'Contact · Clear Cause', page: <Contact /> }],
    ['/profile', { title: 'Your profile · Clear Cause', page: <Profile /> }],
    ['/admin/review', { title: 'Review charities · Clear Cause', page: <AdminReview /> }],
    ['/signin', { title: 'Sign in · Clear Cause', page: <SignIn /> }],
    ['/partners', { title: 'Become a partner · Clear Cause', page: <Placeholder kind="partners" /> }],
  ])
  // /charity/<id> reads any vetted charity; /charity/northside keeps old links working.
  const charityMatch = path.match(/^\/charity\/([^/]+)$/)
  const charityId = charityMatch ? (charityMatch[1] === 'northside' ? NORTHSIDE_ID : decodeURIComponent(charityMatch[1])) : null
  const route = charityId
    ? { title: 'Charity · Clear Cause', page: <CharityProfile id={charityId} /> }
    : routes.get(path) ?? { title: 'Not found · Clear Cause', page: <Placeholder kind="missing" /> }

  useEffect(() => {
    document.title = route.title
  }, [route.title])

  return route.page
}

export default App
