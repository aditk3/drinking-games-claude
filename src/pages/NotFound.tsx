import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3 py-10">
      <h1 className="font-display text-2xl font-bold">That game is not on the list</h1>
      <p className="text-muted">Maybe the id changed when the markdown was re-parsed.</p>
      <Link to="/" className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink">
        Back to the library
      </Link>
    </div>
  )
}
