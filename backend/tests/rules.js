// Run with: node tests/rules.js   (the server must be running and the database seeded)
// Checks the wall-booking and pottery rules plus ownership and role checks.
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

function dayFromToday(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

let passed = 0;
let failed = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  ok ? passed++ : failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  -> got ${actual}, expected ${expected}`);
}

(async () => {
  const c1 = await getToken("Test Customer", "customer@test.com", "Customer@123");
  const c2 = await getToken("Second Customer", "customer2@test.com", "Customer@123");
  const studio = (await api("POST", "/auth/login", null, { email: "studio@artstudio.in", password: "Studio@123" })).data.token;

  console.log("\n--- Access control ---");
  check("No token on /bookings", (await api("GET", "/bookings")).status, 401);
  check("Studio cannot create a booking", (await api("POST", "/bookings", studio, { date: dayFromToday(30), wallSize: 100, address: "12 Test Road" })).status, 403);
  check("Customer cannot confirm a booking", (await api("PATCH", "/bookings/000000000000000000000000/confirm", c1)).status, 403);

  console.log("\n--- Wall booking rules ---");
  const addr = "12 Test Road, Hyderabad";
  check("Date too soon (3 days)", (await api("POST", "/bookings", c1, { date: dayFromToday(3), wallSize: 100, address: addr })).status, 400);
  check("Date too far (120 days)", (await api("POST", "/bookings", c1, { date: dayFromToday(120), wallSize: 100, address: addr })).status, 400);
  check("Wall too small (5)", (await api("POST", "/bookings", c1, { date: dayFromToday(30), wallSize: 5, address: addr })).status, 400);
  check("Wall too big (600)", (await api("POST", "/bookings", c1, { date: dayFromToday(30), wallSize: 600, address: addr })).status, 400);
  check("Missing address", (await api("POST", "/bookings", c1, { date: dayFromToday(30), wallSize: 100 })).status, 400);

  const rate = (await api("GET", "/bookings/rate", c1)).data.ratePerSqFt;
  const offset = 20 + Math.floor(Math.random() * 60); // a random day, so re-runs rarely collide
  const date = dayFromToday(offset);
  const first = await api("POST", "/bookings", c1, { date, wallSize: 100, address: addr });
  check("Valid booking", first.status, 201);
  check("Price = size x rate", first.data.price, 100 * rate);
  check("Same date by another customer", (await api("POST", "/bookings", c2, { date, wallSize: 50, address: addr })).status, 409);

  const bid = first.data._id;
  check("Other customer views my booking", (await api("GET", `/bookings/${bid}`, c2)).status, 404);
  check("Other customer cancels my booking", (await api("PATCH", `/bookings/${bid}/cancel`, c2)).status, 404);
  check("Studio confirms", (await api("PATCH", `/bookings/${bid}/confirm`, studio)).status, 200);
  check("Studio confirms again", (await api("PATCH", `/bookings/${bid}/confirm`, studio)).status, 409);
  check("Owner cancels (more than 3 days away)", (await api("PATCH", `/bookings/${bid}/cancel`, c1)).status, 200);

  const second = await api("POST", "/bookings", c2, { date, wallSize: 50, address: addr });
  check("Date free again after cancel", second.status, 201);
  check("Studio declines", (await api("PATCH", `/bookings/${second.data._id}/decline`, studio)).status, 200);

  console.log("\n--- Pottery rules ---");
  const opts = (await api("GET", "/pottery/options", c1)).data;
  const itemId = opts.items[0]._id;
  const glazeId = opts.glazes[0]._id;
  const good = { itemId, glazeId, quantity: 4, neededBy: dayFromToday(20) };

  check("Quantity 0", (await api("POST", "/pottery", c1, { ...good, quantity: 0 })).status, 400);
  check("Quantity 13", (await api("POST", "/pottery", c1, { ...good, quantity: 13 })).status, 400);
  check("Needed-by in 5 days", (await api("POST", "/pottery", c1, { ...good, neededBy: dayFromToday(5) })).status, 400);
  check("Bad glaze id", (await api("POST", "/pottery", c1, { ...good, glazeId: "abc" })).status, 400);
  check("Studio cannot request pottery", (await api("POST", "/pottery", studio, good)).status, 403);

  const req1 = await api("POST", "/pottery", c1, good);
  check("Valid pottery request", req1.status, 201);
  const pid = req1.data._id;
  check("Other customer views my request", (await api("GET", `/pottery/${pid}`, c2)).status, 404);
  check("Customer edits while requested", (await api("PUT", `/pottery/${pid}`, c1, { ...good, quantity: 3 })).status, 200);
  check("Studio accepts", (await api("PATCH", `/pottery/${pid}/accept`, studio)).status, 200);
  check("Customer edits after accepted", (await api("PUT", `/pottery/${pid}`, c1, good)).status, 409);
  check("Customer cancels after accepted", (await api("PATCH", `/pottery/${pid}/cancel`, c1)).status, 409);

  const req2 = await api("POST", "/pottery", c1, good);
  check("Customer cancels while requested", (await api("PATCH", `/pottery/${req2.data._id}/cancel`, c1)).status, 200);

  console.log(`\nDone: ${passed} passed, ${failed} failed`);
})();
