import { useState } from "react";
import { api, dateFromToday } from "../api";
import useLoad from "../useLoad";
import { DataState, Message } from "../components/Status";

// Form for a new pottery request, or for editing one that is still "requested"
function PotteryForm({ initial, onSave, onCancel }) {
  const options = useLoad("/pottery/options");
  const [f, setF] = useState({
    itemId: initial?.item?._id || "",
    glazeId: initial?.glaze?._id || "",
    quantity: initial?.quantity ?? 1,
    neededBy: initial?.neededBy || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function change(e) {
    setF({ ...f, [e.target.name]: e.target.value });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onSave({ ...f, quantity: Number(f.quantity) });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (options.loading) return <p className="state">Loading options…</p>;
  if (options.error) return <p className="msg error">{options.error}</p>;

  return (
    <form className="panel" onSubmit={submit}>
      <h3>{initial ? "Edit request" : "Request custom pottery"}</h3>
      <label>
        Item
        <select name="itemId" value={f.itemId} onChange={change} required>
          <option value="">Choose an item</option>
          {options.data.items.map((i) => <option key={i._id} value={i._id}>{i.name}</option>)}
        </select>
      </label>
      <label>
        Glaze
        <select name="glazeId" value={f.glazeId} onChange={change} required>
          <option value="">Choose a glaze</option>
          {options.data.glazes.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
        </select>
      </label>
      <label>
        Quantity (1 to 12)
        <input type="number" name="quantity" value={f.quantity} onChange={change} min="1" max="12" required />
      </label>
      <label>
        Needed by (at least 14 days from today)
        <input type="date" name="neededBy" value={f.neededBy} onChange={change} min={dateFromToday(14)} required />
      </label>
      {error && <p className="msg error">{error}</p>}
      <div className="row">
        <button type="submit" disabled={busy}>{busy ? "Saving…" : initial ? "Save changes" : "Send request"}</button>
        {onCancel && <button type="button" className="secondary" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

export default function Pottery({ user }) {
  const { data, loading, error, reload } = useLoad("/pottery");
  const [msg, setMsg] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formKey, setFormKey] = useState(0); // changing this resets the new-request form
  const isStudio = user.role === "studio";

  async function create(values) {
    await api("/pottery", { method: "POST", body: values });
    setMsg({ type: "ok", text: "Request sent. The studio will accept or decline it." });
    setFormKey(formKey + 1);
    reload();
  }

  async function update(id, values) {
    await api(`/pottery/${id}`, { method: "PUT", body: values });
    setEditingId(null);
    setMsg({ type: "ok", text: "Request updated." });
    reload();
  }

  async function act(id, action, doneText) {
    setMsg(null);
    try {
      await api(`/pottery/${id}/${action}`, { method: "PATCH" });
      setMsg({ type: "ok", text: doneText });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
    reload();
  }

  return (
    <section>
      <h2>{isStudio ? "All pottery requests" : "Pottery"}</h2>
      {!isStudio && <PotteryForm key={formKey} onSave={create} />}
      <Message msg={msg} />

      <h3>{isStudio ? "Requests" : "My requests"}</h3>
      <DataState
        loading={loading}
        error={error}
        isEmpty={data && data.length === 0}
        emptyText={isStudio ? "No pottery requests yet." : "You have not requested any pottery yet."}
        onRetry={reload}
      >
        <div className="list">
          {(data || []).map((r) => (
            <div key={r._id} className="item column">
              <div className="row between">
                <div>
                  <strong>{r.quantity} × {r.item ? r.item.name : "Item"}</strong> · {r.glaze ? r.glaze.name : "Glaze"}
                  <p className="muted">
                    Needed by {r.neededBy}
                    {isStudio && r.customer ? ` · ${r.customer.name} (${r.customer.email})` : ""}
                  </p>
                </div>
                <div className="actions">
                  <span className={`badge ${r.status}`}>{r.status}</span>
                  {isStudio && r.status === "requested" && (
                    <>
                      <button onClick={() => act(r._id, "accept", "Request accepted.")}>Accept</button>
                      <button className="secondary" onClick={() => act(r._id, "decline", "Request declined.")}>Decline</button>
                    </>
                  )}
                  {!isStudio && r.status === "requested" && (
                    <>
                      <button className="secondary" onClick={() => setEditingId(r._id)}>Edit</button>
                      <button className="secondary" onClick={() => act(r._id, "cancel", "Request cancelled.")}>Cancel</button>
                    </>
                  )}
                </div>
              </div>
              {editingId === r._id && (
                <PotteryForm initial={r} onSave={(values) => update(r._id, values)} onCancel={() => setEditingId(null)} />
              )}
            </div>
          ))}
        </div>
      </DataState>
    </section>
  );
}
