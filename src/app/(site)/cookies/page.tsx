import Container from "@/components/ui/Container";

export const metadata = {
  title: "Cookie Policy | Starks Cricket Club",
};

export default function CookiePolicyPage() {
  return (
    <div className="py-10">
      <Container>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Cookie Policy</h1>
          <p className="mt-2 text-sm text-slate-600">Last updated: January 16, 2026</p>

          <div className="mt-8 space-y-6 text-slate-700 leading-relaxed">
            <p>
              This Cookie Policy explains how Starks Cricket Club (“Starks”, “we”, “us”) uses cookies and similar
              technologies on the Service.
            </p>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">What are cookies?</h2>
              <p>
                Cookies are small text files stored on your device. Similar technologies include local storage and
                session storage, which can store data needed for site functionality.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">How we use them</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <span className="font-semibold">Essential functionality</span>: keeping you signed in and enabling core
                  features (via Firebase Authentication and related session mechanisms).
                </li>
                <li>
                  <span className="font-semibold">Preferences</span>: remembering basic UI preferences (where applicable).
                </li>
                <li>
                  <span className="font-semibold">Embedded media</span>: embedded YouTube videos may set cookies or use
                  similar technologies.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Your controls</h2>
              <p>
                You can control cookies through your browser settings (block, delete, or restrict cookies). If you block
                certain cookies, parts of the Service may not function correctly.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Contact</h2>
              <p>
                Questions? Email{" "}
                <a className="underline font-semibold" href="mailto:starksgroup@starksgrp.org">
                  starksgroup@starksgrp.org
                </a>
                .
              </p>
            </section>

            <p className="text-xs text-slate-500">
              This page is provided for general informational purposes and is not legal advice.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}

