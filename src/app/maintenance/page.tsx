export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        <div className="text-3xl font-extrabold tracking-tight text-slate-950">We’ll be right back</div>
        <div className="mt-3 text-slate-600">
          Starks Cricket is temporarily down for maintenance. Please try again in a few minutes.
        </div>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          If you need urgent help, email <b>starksgroup@starksgrp.org</b>.
        </div>
      </div>
    </div>
  );
}

