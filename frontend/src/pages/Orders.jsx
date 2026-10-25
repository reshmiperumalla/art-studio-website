import { useState } from "react";
import { api, money } from "../api";
import useLoad from "../useLoad";
import { DataState, Message } from "../components/Status";

export default function Orders({ user }) {
  const { data, loading, error, reload } = useLoad("/orders");
  const [msg, setMsg] = useState(null);
  const isStudio = user.role === "studio";

  async function cancel(id) {
    setMsg(null);
    try {
      await api(`/orders/${id}/cancel`, { method: "PATCH" });
      setMsg({ type: "ok", text: "Order cancelled. The painting is available again." });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
    reload();
  }

  return (
    <section>
      <h2>{isStudio ? "All orders" : "My orders"}</h2>
      <Message msg={msg} />
      <DataState
        loading={loading}
        error={error}
        isEmpty={data && data.length === 0}
        emptyText={isStudio ? "No orders yet." : "You have not bought any paintings yet."}
        onRetry={reload}
      >
        <div className="list">
          {(data || []).map((o) => (
            <div key={o._id} className="item">
              <div>
                <strong>{o.painting ? o.painting.title : "Painting removed"}</strong>
                <p className="muted">
                  {money(o.price)} · {new Date(o.createdAt).toLocaleDateString()}
                  {isStudio && o.customer ? ` · ${o.customer.name} (${o.customer.email})` : ""}
                </p>
              </div>
              <div className="actions">
                <span className={`badge ${o.status}`}>{o.status}</span>
                {!isStudio && o.status === "placed" && (
                  <button className="secondary" onClick={() => cancel(o._id)}>Cancel order</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </DataState>
    </section>
  );
}
