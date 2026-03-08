"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Chyba pri registrácii");
        setLoading(false);
        return;
      }

      // Auto-login after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Registrácia úspešná, ale prihlásenie zlyhalo");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Chyba pri registrácii");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Registrácia
        </h1>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meno
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Vaše meno"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="vas@email.sk"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Heslo
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Minimálne 6 znakov"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? "Registrujem..." : "Zaregistrovať sa"}
          </button>
        </form>

        <p className="mt-4 text-sm text-center text-gray-600">
          Už máte účet?{" "}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Prihláste sa
          </Link>
        </p>
      </div>
    </div>
  );
}
