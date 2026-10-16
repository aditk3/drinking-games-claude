import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { games } from '../data/index.ts'

export default function RandomGame() {
  const navigate = useNavigate()
  useEffect(() => {
    const pick = games[Math.floor(Math.random() * games.length)]
    navigate(`/game/${pick.id}`, { replace: true })
  }, [navigate])
  return <p className="text-muted">Picking one...</p>
}
