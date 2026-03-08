"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface HelpRequest {
  id: string;
  helpType: string;
  title: string;
  description: string;
  deadline: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    city: string | null;
    activity: string | null;
  };
}

const HELP_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  people: { label: "Ľudia", color: "bg-purple-100 text-purple-800" },
  technology: { label: "Technika", color: "bg-blue-100 text-blue-800" },
  services: { label: "Služby", color: "bg-green-100 text-green-800" },
  knowhow: { label: "Know-how", color: "bg-orange-100 text-orange-800" },
};

export default function HelpRequestsPage() {
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (filterType) params.set("helpType", filterType);

    fetch(`/api/help-requests?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRequests(data.requests);
        setTotal(data.total);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, filterType]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Požiadavky na pomoc</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Späť na mapu
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => { setFilterType(""); setPage(1); }}
          className={`px-3 py-1.5 rounded-full text-sm ${
            !filterType ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Všetky ({total})
        </button>
        {Object.entries(HELP_TYPE_LABELS).map(([key, { label, color }]) => (
          <button
            key={key}
            onClick={() => { setFilterType(key); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm ${
              filterType === key ? color + " font-medium" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Načítavam...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Žiadne aktívne požiadavky na pomoc
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((hr) => {
            const typeInfo = HELP_TYPE_LABELS[hr.helpType] || {
              label: hr.helpType,
              color: "bg-gray-100 text-gray-800",
            };
            return (
              <div key={hr.id} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <h3 className="font-semibold text-gray-900">{hr.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{hr.description}</p>
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                      <Link
                        href={`/organization/${hr.organization.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {hr.organization.name}
                      </Link>
                      {hr.organization.city && <span>{hr.organization.city}</span>}
                      {hr.organization.activity && <span>{hr.organization.activity}</span>}
                      {hr.deadline && (
                        <span>Deadline: {new Date(hr.deadline).toLocaleDateString("sk-SK")}</span>
                      )}
                      <span>{new Date(hr.createdAt).toLocaleDateString("sk-SK")}</span>
                    </div>
                  </div>
                </div>
                {(hr.contactEmail || hr.contactPhone) && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4 text-sm">
                    {hr.contactEmail && (
                      <a href={`mailto:${hr.contactEmail}`} className="text-blue-600 hover:underline">
                        {hr.contactEmail}
                      </a>
                    )}
                    {hr.contactPhone && (
                      <a href={`tel:${hr.contactPhone}`} className="text-blue-600 hover:underline">
                        {hr.contactPhone}
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-md text-sm border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
            >
              Predchádzajúca
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-600">
              Strana {page}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={requests.length < 20}
              className="px-3 py-1.5 rounded-md text-sm border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
            >
              Ďalšia
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
