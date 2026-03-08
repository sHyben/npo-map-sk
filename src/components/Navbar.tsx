"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession();
  const [notifCount, setNotifCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<
    { id: string; title: string; message: string; link: string | null; read: boolean; createdAt: string }[]
  >([]);

  useEffect(() => {
    if (!session?.user) return;

    const fetchNotifs = async () => {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifCount(data.unreadCount);
        setNotifications(data.notifications);
      }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [session]);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-[2000]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-blue-700">NPO Map</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">SK</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
            <Link
              href="/help-requests"
              className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap"
            >
              Požiadavky
            </Link>

            {session?.user ? (
              <>
                <div className="relative">
                  <button
                    onClick={() => setShowNotifs(!showNotifs)}
                    className="relative text-gray-600 hover:text-gray-900 p-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {notifCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {notifCount > 9 ? "9+" : notifCount}
                      </span>
                    )}
                  </button>

                  {showNotifs && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto">
                      <div className="flex justify-between items-center p-3 border-b">
                        <h3 className="font-semibold text-sm">Upozornenia</h3>
                        {notifCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Označiť všetky
                          </button>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500 text-center">
                          Žiadne upozornenia
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <Link
                            key={n.id}
                            href={n.link || "#"}
                            onClick={() => setShowNotifs(false)}
                            className={`block p-3 border-b border-gray-100 hover:bg-gray-50 ${
                              !n.read ? "bg-blue-50" : ""
                            }`}
                          >
                            <p className="text-sm font-medium">{n.title}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(n.createdAt).toLocaleDateString("sk-SK")}
                            </p>
                          </Link>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="text-sm text-gray-600">
                  {session.user.name || session.user.email}
                </div>
                {(session.user as { orgId: string | null }).orgId && (
                  <Link
                    href={`/organization/${(session.user as { orgId: string }).orgId}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Moja org.
                  </Link>
                )}
                <button
                  onClick={() => signOut()}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Odhlásiť
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/login"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Prihlásiť
                </Link>
                <Link
                  href="/auth/register"
                  className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700"
                >
                  Registrovať
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
