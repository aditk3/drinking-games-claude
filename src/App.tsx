import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import Library from './pages/Library.tsx'
import GameDetail from './pages/GameDetail.tsx'
import RandomGame from './pages/RandomGame.tsx'
import NotFound from './pages/NotFound.tsx'
import PlayHub from './pages/play/PlayHub.tsx'
import GameShell from './pages/play/GameShell.tsx'

const Roulette = lazy(() => import('./games/roulette/Roulette.tsx'))
const Board = lazy(() => import('./games/board/Board.tsx'))
const RoomEntry = lazy(() => import('./games/room/RoomEntry.tsx'))
const RoomPage = lazy(() => import('./games/room/RoomPage.tsx'))

const fallback = <p className="text-center text-muted">Loading...</p>

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Library />} />
        <Route path="game/:id" element={<GameDetail />} />
        <Route path="random" element={<RandomGame />} />
        <Route path="play" element={<PlayHub />} />
        <Route
          path="play/roulette"
          element={
            <GameShell title="Drink Roulette" libraryId="drink-roulette">
              <Suspense fallback={fallback}>
                <Roulette />
              </Suspense>
            </GameShell>
          }
        />
        <Route
          path="play/board"
          element={
            <GameShell title="Drinkopoly" libraryId="drinkopoly">
              <Suspense fallback={fallback}>
                <Board />
              </Suspense>
            </GameShell>
          }
        />
        <Route
          path="play/room"
          element={
            <GameShell title="Party Room" libraryId="party-room">
              <Suspense fallback={fallback}>
                <RoomEntry />
              </Suspense>
            </GameShell>
          }
        />
        <Route
          path="play/room/:code"
          element={
            <GameShell title="Party Room" libraryId="party-room">
              <Suspense fallback={fallback}>
                <RoomPage />
              </Suspense>
            </GameShell>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
