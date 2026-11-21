export default function Loading() {
  return <div className="loading-page" role="status" aria-label="Loading library"><div className="loading-brand">stash.</div><div className="skeleton-line" /><div className="loading-grid">{[0, 1, 2, 3, 4, 5].map((i) => <div className="skeleton-card" key={i} />)}</div><span className="sr-only">Loading your links…</span></div>;
}
