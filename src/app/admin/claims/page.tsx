"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Claim {
  id: string;
  organization: { id: string; name: string };
  user: { id: string; name: string; email: string };
  createdAt: string;
}

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/claims")
      .then((r) => r.json())
      .then((data) => {
        setClaims(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Chyba pri načítaní žiadostí.");
        setLoading(false);
      });
  }, []);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setActionLoading(id + action);
    let url = `/api/admin/claims/${id}/${action}`;
    let options: RequestInit = { method: "POST" };
    if (action === "reject") {
      const reason = prompt("Dôvod zamietnutia (voliteľné):") || "";
      options = { ...options, body: JSON.stringify({ reason }), headers: { "Content-Type": "application/json" } };
    }
    const res = await fetch(url, options);
    if (res.ok) {
      setClaims((prev) => prev.filter((c) => c.id !== id));
    } else {
      alert("Chyba pri spracovaní akcie.");
    }
    setActionLoading(null);
  };

  if (loading) return <div>Načítavam žiadosti...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Žiadosti o prevzatie organizácií</h1>
      {claims.length === 0 ? (
        <div>Žiadne otvorené žiadosti.</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Organizácia</th>
              <th className="p-2 text-left">Používateľ</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Dátum</th>
              <th className="p-2">Akcia</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2">
                  <Link href={`/organization/${c.organization.id}`} className="text-blue-600 hover:underline">{c.organization.name}</Link>
                </td>
                <td className="p-2">{c.user.name}</td>
                <td className="p-2">{c.user.email}</td>
                <td className="p-2">{new Date(c.createdAt).toLocaleString("sk-SK")}</td>
                <td className="p-2 flex gap-2">
                  <button
                    className="bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
                    disabled={!!actionLoading}
                    onClick={() => handleAction(c.id, "approve")}
                  >
                    {actionLoading === c.id + "approve" ? "Schvaľujem..." : "Schváliť"}
                  </button>
                  <button
                    className="bg-red-600 text-white px-3 py-1 rounded disabled:opacity-50"
                    disabled={!!actionLoading}
                    onClick={() => handleAction(c.id, "reject")}
                  >
                    {actionLoading === c.id + "reject" ? "Zamietam..." : "Zamietnuť"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

