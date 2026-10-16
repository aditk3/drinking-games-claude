import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import Library from './pages/Library.tsx'
import GameDetail from './pages/GameDetail.tsx'
import RandomGame from './pages/RandomGame.tsx'
import NotFound from './pages/NotFound.tsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Library />} />
        <Route path="game/:id" element={<GameDetail />} />
        <Route path="random" element={<RandomGame />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
