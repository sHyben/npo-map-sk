"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-gray-500">Načítavam mapu...</div>
    </div>
  ),
});

export default function HomePage() {
  const router = useRouter();
  const [activities, setActivities] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    activity: "",
    search: "",
    city: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    fetch("/api/activities")
      .then((r) => r.json())
      .then(setActivities)
      .catch(console.error);
  }, []);

  const handleSearch = useCallback(() => {
    setFilters((prev) => ({ ...prev, search: searchInput }));
  }, [searchInput]);

  const handleSelectOrg = useCallback(
    (id: string) => {
      router.push(`/organization/${id}`);
    },
    [router]
  );

  return (
    <div className="relative flex h-[calc(100vh-56px)]">
      {/* Sidebar */}
      <div
        className={`${
          showFilters ? "w-80" : "w-0"
        } transition-all duration-300 overflow-hidden bg-white border-r border-gray-200 flex-shrink-0 absolute md:relative z-[1500] h-full`}
      >
        <div className="p-4 w-80 h-full overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Filtre a vyhľadávanie
          </h2>

          {/* Search */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Vyhľadávanie
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Názov, IČO, mesto..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSearch}
                className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm"
              >
                Hľadať
              </button>
            </div>
          </div>

          {/* Activity filter */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Tematická oblasť
            </label>
            <select
              value={filters.activity}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, activity: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Všetky oblasti</option>
              {activities.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* City filter */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Mesto / Región
            </label>
            <input
              type="text"
              placeholder="Napr. Bratislava"
              value={filters.city}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, city: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Reset */}
          <button
            onClick={() => {
              setFilters({ activity: "", search: "", city: "" });
              setSearchInput("");
            }}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 border border-gray-200 rounded-md hover:bg-gray-50"
          >
            Resetovať filtre
          </button>

          {/* Info */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
            <p className="font-semibold mb-1">O projekte NPO Map SK</p>
            <p>
              Interaktívna mapa neziskových organizácií na Slovensku. Nájdite
              organizácie vo vašom okolí, sledujte ich aktivity a pomáhajte tam,
              kde je to potrebné.
            </p>
          </div>
        </div>
      </div>

      {/* Toggle filters button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="absolute top-1/2 -translate-y-1/2 z-[1600] bg-white border border-gray-200 rounded-r-md px-1 py-3 shadow-md hover:bg-gray-50"
        style={{ left: showFilters ? "320px" : "0px", transition: "left 0.3s" }}
      >
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform ${
            showFilters ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Map */}
      <div className="flex-1">
        <MapComponent filters={filters} onSelectOrg={handleSelectOrg} />
      </div>
    </div>
  );
}
