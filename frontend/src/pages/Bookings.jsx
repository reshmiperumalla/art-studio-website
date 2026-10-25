import { useState } from "react";
import { api, money, dateFromToday } from "../api";
import useLoad from "../useLoad";
import { DataState, Message } from "../components/Status";

// Customer form for a new wall painting booking
function BookingForm({ onDone }) {
  const rate = useLoad("/bookings/rate");
  const [f, setF] = useState({ date: "", wallSize: "", address: "" });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  function change(e) {
    setF({ ...f, [e.target.name]: e.target.value });
  }

  const size = Number(f.wallSize);
  const price = rate.data && size > 0 ? size * rate.data.ratePerSqFt : null;

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      await api("/bookings", {
        method: "POST",
        body: { date: f.date, wallSize: size, address: f.address },
      });
      setF({ date: "", wallSize: "", address: "" });
      setMsg({ type: "ok", text: "Booking requested. The studio will confirm or decline it." });
      onDone();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h3>Book a wall painting</h3>
      {rate.loading && <p className="state">Loading rate…</p>}
      {rate.error && <p className="msg error">{rate.error}</p>}
      {rate.data && <p className="muted">Rate: {money(rate.data.ratePerSqFt)} per sq ft</p>}
      <label>
        Date (7 to 90 days from today)
        <input type="date" name="date" value={f.date} onChange={change} min={dateFromToday(7)} max={dateFromToday(90)} required />
      </label>
      <label>
        Wall size in sq ft (10 to 500)
        <input type="number" name="wallSize" value={f.wallSize} onChange={change} min="10" max="500" required />
      </label>
      <label>
        Service address
        <textarea name="address" value={f.address} onChange={change} rows="2" required />
      </label>
      {price !== null && <p><strong>Price: {money(price)}</strong></p>}
      <Message msg={msg} />
      <button type="submit" disabled={busy}>{busy ? "Booking…" : "Request booking"}</button>
    </form>
  );
}

export default function Bookings({ user }) {
  const { data, loading, error, reload } = useLoad("/bookings");
  const [msg, setMsg] = useState(null);
  const isStudio = user.role === "studio";

  async function act(id, action, doneText) {
    setMsg(null);
    try {
      await api(`/bookings/${id}/${action}`, { method: "PATCH" });
      setMsg({ type: "ok", text: doneText });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
    reload();
  }

  return (
    <section>
      <h2>{isStudio ? "All wall bookings" : "Wall painting"}</h2>
      {!isStudio && <BookingForm onDone={reload} />}
      <Message msg={msg} />

      <h3>{isStudio ? "Bookings" : "My bookings"}</h3>
      <DataState
        loading={loading}
        error={error}
        isEmpty={data && data.length === 0}
        emptyText={isStudio ? "No bookings yet." : "You have no bookings yet."}
        onRetry={reload}
      >
        <div className="list">
          {(data || []).map((b) => (
            <div key={b._id} className="item">
              <div>
                <strong>{b.date}</strong> · {b.wallSize} sq ft · {money(b.price)}
                <p className="muted">{b.address}</p>
                {isStudio && b.customer && <p className="muted">{b.customer.name} ({b.customer.email})</p>}
              </div>
              <div className="actions">
                <span className={`badge ${b.status}`}>{b.status}</span>
                {isStudio && b.status === "requested" && (
                  <>
                    <button onClick={() => act(b._id, "confirm", "Booking confirmed.")}>Confirm</button>
                    <button className="secondary" onClick={() => act(b._id, "decline", "Booking declined.")}>Decline</button>
                  </>
                )}
                {!isStudio && (b.status === "requested" || b.status === "confirmed") && (
                  <button className="secondary" onClick={() => act(b._id, "cancel", "Booking cancelled.")}>Cancel booking</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </DataState>
    </section>
  );
}
