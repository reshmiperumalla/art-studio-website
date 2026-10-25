import { useState } from "react";
import { api, imageSrc, money } from "../api";
import useLoad from "../useLoad";
import { DataState, Message } from "../components/Status";

// Form used by the studio to add a painting or edit an available one
function PaintingForm({ initial, onSave, onCancel, saveLabel }) {
  const [f, setF] = useState({
    title: initial?.title || "",
    artist: initial?.artist || "",
    description: initial?.description || "",
    price: initial?.price ?? "",
    imageUrl: initial?.imageUrl || "",
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
      await onSave({ ...f, price: Number(f.price) });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit}>
      <label>Title<input name="title" value={f.title} onChange={change} /></label>
      <label>Artist<input name="artist" value={f.artist} onChange={change} /></label>
      <label>Description<textarea name="description" value={f.description} onChange={change} rows="3" /></label>
      <label>Price (₹)<input name="price" type="number" min="1" value={f.price} onChange={change} /></label>
      <label>Image path (optional, e.g. images/p-001.jpg)<input name="imageUrl" value={f.imageUrl} onChange={change} /></label>
      {error && <p className="msg error">{error}</p>}
      <div className="row">
        <button type="submit" disabled={busy}>{busy ? "Saving…" : saveLabel}</button>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function Paintings({ user }) {
  const { data, loading, error, reload } = useLoad("/paintings");
  const [msg, setMsg] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const isStudio = user.role === "studio";

  async function buy(p) {
    setMsg(null);
    try {
      await api("/orders", { method: "POST", body: { paintingId: p._id } });
      setMsg({ type: "ok", text: `You bought "${p.title}". You can see it under My orders.` });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
    reload(); // refresh so the card shows the real status
  }

  async function add(values) {
    await api("/paintings", { method: "POST", body: values });
    setAdding(false);
    setMsg({ type: "ok", text: "Painting added." });
    reload();
  }

  async function save(id, values) {
    await api(`/paintings/${id}`, { method: "PUT", body: values });
    setEditingId(null);
    setMsg({ type: "ok", text: "Painting updated." });
    reload();
  }

  return (
    <section>
      <div className="row between">
        <h2>Paintings</h2>
        {isStudio && !adding && <button onClick={() => setAdding(true)}>Add painting</button>}
      </div>
      <Message msg={msg} />
      {adding && <PaintingForm saveLabel="Add painting" onSave={add} onCancel={() => setAdding(false)} />}

      <DataState
        loading={loading}
        error={error}
        isEmpty={data && data.length === 0}
        emptyText="No paintings yet."
        onRetry={reload}
      >
        <div className="grid">
          {(data || []).map((p) => (
            <article key={p._id} className="card">
              {p.imageUrl ? (
                <img src={imageSrc(p.imageUrl)} alt={p.title} />
              ) : (
                <div className="noimg">No image</div>
              )}
              <div className="body">
                <h3>{p.title}</h3>
                <p className="muted">by {p.artist}</p>
                <p className="desc">{p.description}</p>
                <p className="price">{money(p.price)}</p>
                <span className={`badge ${p.status}`}>{p.status}</span>

                {!isStudio && p.status === "available" && (
                  <button onClick={() => buy(p)}>Buy</button>
                )}
                {isStudio && p.status === "available" && editingId !== p._id && (
                  <button className="secondary" onClick={() => setEditingId(p._id)}>Edit</button>
                )}
                {isStudio && editingId === p._id && (
                  <PaintingForm
                    initial={p}
                    saveLabel="Save changes"
                    onSave={(values) => save(p._id, values)}
                    onCancel={() => setEditingId(null)}
                  />
                )}
              </div>
            </article>
          ))}
        </div>
      </DataState>
    </section>
  );
}
