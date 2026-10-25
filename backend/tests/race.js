// Run with: node tests/race.js   (the server must be running)
const BASE = "http://localhost:5000/api";

async function api(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function getToken(name, email, password) {
  let r = await api("POST", "/auth/register", null, { name, email, password });
  if (r.status === 409) r = await api("POST", "/auth/login", null, { email, password });
  return r.data.token;
}

(async () => {
  const t1 = await getToken("Test Customer", "customer@test.com", "Customer@123");
  const t2 = await getToken("Second Customer", "customer2@test.com", "Customer@123");

  const list = await api("GET", "/paintings", t1);
  const target = list.data.find((p) => p.status === "available");
  console.log("Painting:", target.title);

  // Both requests start at the same time
  const [a, b] = await Promise.all([
    api("POST", "/orders", t1, { paintingId: target._id }),
    api("POST", "/orders", t2, { paintingId: target._id }),
  ]);
  console.log("Customer 1 ->", a.status, a.data.message || "order created");
  console.log("Customer 2 ->", b.status, b.data.message || "order created");

  const winnerToken = a.status === 201 ? t1 : t2;
  const loserToken = a.status === 201 ? t2 : t1;
  const orderId = (a.status === 201 ? a : b).data._id;

  const peek = await api("GET", `/orders/${orderId}`, loserToken);
  console.log("Other customer views my order ->", peek.status, "(expect 404)");

  const sneak = await api("PATCH", `/orders/${orderId}/cancel`, loserToken);
  console.log("Other customer cancels my order ->", sneak.status, "(expect 404)");

  const cancel = await api("PATCH", `/orders/${orderId}/cancel`, winnerToken);
  console.log("Owner cancels ->", cancel.status, "(expect 200)");

  const again = await api("PATCH", `/orders/${orderId}/cancel`, winnerToken);
  console.log("Cancel twice ->", again.status, "(expect 409)");

  const after = await api("GET", `/paintings/${target._id}`, winnerToken);
  console.log("Painting status after cancel ->", after.data.status, "(expect available)");
})();
