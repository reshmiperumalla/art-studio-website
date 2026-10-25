import { useState, useEffect } from "react";
import Auth from "./components/Auth";
import Paintings from "./pages/Paintings";
import Orders from "./pages/Orders";
import Bookings from "./pages/Bookings";
import Pottery from "./pages/Pottery";

function savedUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(savedUser);
  const [page, setPage] = useState("paintings");

  function login(data) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    setPage("paintings");
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }

  // The api helper fires this event when the server says the token is no longer valid
  useEffect(() => {
    window.addEventListener("auth-expired", logout);
    return () => window.removeEventListener("auth-expired", logout);
  }, []);

  if (!user) return <Auth onLogin={login} />;

  const isStudio = user.role === "studio";
  const tabs = [
    ["paintings", "Paintings"],
    ["orders", isStudio ? "All orders" : "My orders"],
    ["bookings", isStudio ? "All wall bookings" : "Wall painting"],
    ["pottery", isStudio ? "All pottery requests" : "Pottery"],
  ];

  return (
    <div className="app">
      <header>
        <strong className="brand">Art Studio</strong>
        <nav>
          {tabs.map(([key, label]) => (
            <button key={key} className={page === key ? "tab active" : "tab"} onClick={() => setPage(key)}>
              {label}
            </button>
          ))}
        </nav>
        <span className="who">
          {user.name} ({user.role})
          <button className="link" onClick={logout}>Log out</button>
        </span>
      </header>
      <main>
        {page === "paintings" && <Paintings user={user} />}
        {page === "orders" && <Orders user={user} />}
        {page === "bookings" && <Bookings user={user} />}
        {page === "pottery" && <Pottery user={user} />}
      </main>
    </div>
  );
}
