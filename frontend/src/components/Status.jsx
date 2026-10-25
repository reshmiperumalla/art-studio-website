// Shows the loading, error and empty states for any screen that loads data.
export function DataState({ loading, error, isEmpty, emptyText, onRetry, children }) {
  if (loading) return <p className="state">Loading…</p>;
  if (error) {
    return (
      <div className="state error">
        <p>{error}</p>
        {onRetry && <button onClick={onRetry}>Try again</button>}
      </div>
    );
  }
  if (isEmpty) return <p className="state">{emptyText}</p>;
  return children;
}

// A success or error message after the user does something
export function Message({ msg }) {
  if (!msg) return null;
  return <p className={`msg ${msg.type}`}>{msg.text}</p>;
}
