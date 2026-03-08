"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Organization {
  id: string;
  ico: string;
  name: string;
  activity: string | null;
  skNace: string | null;
  address: string | null;
  city: string | null;
  zipCode: string | null;
  legalFormName: string | null;
  ownershipName: string | null;
  sizeName: string | null;
  taxGift: number | null;
  creationDate: string | null;
  cancellationDate: string | null;
  description: string | null;
  claimedById: string | null;
  latitude: number | null;
  longitude: number | null;
  branches: {
    id: string;
    street: string | null;
    buildingNumber: string | null;
    city: string | null;
    zipCode: string | null;
  }[];
  helpRequests: {
    id: string;
    helpType: string;
    title: string;
    description: string;
    deadline: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    status: string;
    createdAt: string;
  }[];
  _count: { subscriptions: number; helpRequests: number };
}

const HELP_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  people: { label: "Ľudia", color: "bg-purple-100 text-purple-800" },
  technology: { label: "Technika", color: "bg-blue-100 text-blue-800" },
  services: { label: "Služby", color: "bg-green-100 text-green-800" },
  knowhow: { label: "Know-how", color: "bg-orange-100 text-orange-800" },
};

export default function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [showHelpForm, setShowHelpForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState("");

  const isOwner = session?.user && (
    (session.user as { orgId: string | null }).orgId === id ||
    (session.user as { role: string }).role === "admin"
  );

  useEffect(() => {
    fetch(`/api/organizations/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setOrg(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    if (session?.user) {
      fetch(`/api/organizations/${id}/subscribe`)
        .then((r) => r.json())
        .then((data) => setSubscribed(data.subscribed));
    }
  }, [id, session]);

  const handleSubscribe = async () => {
    const res = await fetch(`/api/organizations/${id}/subscribe`, {
      method: "POST",
    });
    const data = await res.json();
    setSubscribed(data.subscribed);
  };

  const handleClaim = async () => {
    setClaimLoading(true);
    setClaimError("");
    const res = await fetch(`/api/organizations/${id}/claim`, {
      method: "POST",
    });
    const data = await res.json();
    setClaimLoading(false);
    if (data.success) {
      window.location.reload();
    } else {
      setClaimError(data.error || "Chyba pri preberaní profilu");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <div className="text-gray-500">Načítavam...</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2">Organizácia nenájdená</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            Späť na mapu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link href="/" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        ← Späť na mapu
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {org.activity && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {org.activity}
                </span>
              )}
              {org.legalFormName && (
                <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                  {org.legalFormName}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {session?.user && (
              <button
                onClick={handleSubscribe}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  subscribed
                    ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {subscribed ? "Sledované" : "Sledovať"}
              </button>
            )}
            {session?.user && !org.claimedById && (
              <button
                onClick={handleClaim}
                className="px-4 py-2 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                disabled={claimLoading}
              >
                {claimLoading ? "Preberám..." : "Prevziať profil"}
              </button>
            )}
          </div>
        </div>
        {claimError && (
          <div className="mt-2 text-red-600 text-sm">{claimError}</div>
        )}

        {org.description && (
          <p className="mt-4 text-gray-600">{org.description}</p>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <Detail label="IČO" value={org.ico} />
          <Detail label="Adresa" value={[org.address, org.city, org.zipCode].filter(Boolean).join(", ")} />
          <Detail label="SK NACE" value={org.skNace} />
          <Detail label="Veľkosť" value={org.sizeName} />
          <Detail label="Vlastníctvo" value={org.ownershipName} />
          <Detail
            label="Založená"
            value={org.creationDate ? new Date(org.creationDate).toLocaleDateString("sk-SK") : null}
          />
          {org.taxGift && (
            <Detail
              label="Daňový dar (2%)"
              value={`${org.taxGift.toLocaleString("sk-SK", { minimumFractionDigits: 2 })} EUR`}
            />
          )}
          <Detail label="Sledujúcich" value={`${org._count.subscriptions}`} />
        </div>

        {/* Edit description for owner */}
        {isOwner && (
          <div className="mt-4">
            <button
              onClick={() => setShowEditForm(!showEditForm)}
              className="text-sm text-blue-600 hover:underline"
            >
              Upraviť popis
            </button>
            {showEditForm && (
              <EditDescriptionForm orgId={org.id} currentDescription={org.description || ""} />
            )}
          </div>
        )}
      </div>

      {/* Branches */}
      {org.branches.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Pobočky ({org.branches.length})
          </h2>
          <div className="space-y-2">
            {org.branches.map((b) => (
              <div key={b.id} className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                {[b.street, b.buildingNumber, b.city, b.zipCode].filter(Boolean).join(", ")}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Requests */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Požiadavky na pomoc ({org.helpRequests.length})
          </h2>
          {isOwner && (
            <button
              onClick={() => setShowHelpForm(!showHelpForm)}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
            >
              + Pridať požiadavku
            </button>
          )}
        </div>

        {showHelpForm && isOwner && (
          <HelpRequestForm
            orgId={org.id}
            onCreated={() => {
              setShowHelpForm(false);
              // Refresh org data
              fetch(`/api/organizations/${id}`)
                .then((r) => r.json())
                .then(setOrg);
            }}
          />
        )}

        {org.helpRequests.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            Zatiaľ žiadne aktívne požiadavky na pomoc
          </p>
        ) : (
          <div className="space-y-4">
            {org.helpRequests.map((hr) => {
              const typeInfo = HELP_TYPE_LABELS[hr.helpType] || {
                label: hr.helpType,
                color: "bg-gray-100 text-gray-800",
              };
              return (
                <div key={hr.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        <h3 className="font-medium text-gray-900">{hr.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{hr.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                    {hr.deadline && (
                      <span>Deadline: {new Date(hr.deadline).toLocaleDateString("sk-SK")}</span>
                    )}
                    {hr.contactEmail && <span>Email: {hr.contactEmail}</span>}
                    {hr.contactPhone && <span>Tel: {hr.contactPhone}</span>}
                    <span>Pridané: {new Date(hr.createdAt).toLocaleDateString("sk-SK")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase">{label}</dt>
      <dd className="text-sm text-gray-800 mt-0.5">{value}</dd>
    </div>
  );
}

function HelpRequestForm({ orgId, onCreated }: { orgId: string; onCreated: () => void }) {
  const [form, setForm] = useState({
    helpType: "people",
    title: "",
    description: "",
    deadline: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch(`/api/organizations/${orgId}/help-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
    } else {
      onCreated();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Typ pomoci</label>
        <select
          value={form.helpType}
          onChange={(e) => setForm({ ...form, helpType: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="people">Ľudia (dobrovoľníci)</option>
          <option value="technology">Technika (vybavenie)</option>
          <option value="services">Služby</option>
          <option value="knowhow">Know-how (odborná pomoc)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Názov</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Stručný názov požiadavky"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Popis</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Podrobnejší popis toho, čo potrebujete"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefón</label>
          <input
            type="tel"
            value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? "Pridávam..." : "Pridať požiadavku"}
      </button>
    </form>
  );
}

function EditDescriptionForm({ orgId, currentDescription }: { orgId: string; currentDescription: string }) {
  const [description, setDescription] = useState(currentDescription);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/organizations/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
    setLoading(false);
    window.location.reload();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        placeholder="Popíšte svoju organizáciu..."
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Ukladám..." : "Uložiť"}
      </button>
    </form>
  );
}
