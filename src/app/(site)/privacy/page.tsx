import Container from "@/components/ui/Container";

export const metadata = {
  title: "Privacy Policy | Starks Cricket Club",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="py-10">
      <Container>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-600">Last updated: January 16, 2026</p>

          <div className="mt-8 space-y-6 text-slate-700 leading-relaxed">
            <p>
              This Privacy Policy explains how Starks Cricket Club (“Starks”, “we”, “us”) collects, uses, and shares
              information when you use our website and member community features (the “Service”).
            </p>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Information we collect</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <span className="font-semibold">Account information</span>: name, email, password (handled by Firebase
                  Authentication), and profile details you provide (e.g., bio, location).
                </li>
                <li>
                  <span className="font-semibold">Profile images</span>: photos you upload for your avatar or posts
                  (stored in Firebase Storage).
                </li>
                <li>
                  <span className="font-semibold">Community content</span>: posts, comments, likes, and related metadata
                  (stored in Firestore).
                </li>
                <li>
                  <span className="font-semibold">Events</span>: RSVPs/registrations and event participation data.
                </li>
                <li>
                  <span className="font-semibold">Technical data</span>: limited device/browser and log data (e.g., IP
                  address, timestamps) that may be collected by our hosting and infrastructure providers.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">How we use information</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Provide and maintain the Service (login, profiles, posts, comments, events, admin tools).</li>
                <li>Communicate with you (e.g., account-related messages and support).</li>
                <li>Moderate content and enforce community standards (including suspensions for policy violations).</li>
                <li>Improve reliability, security, and user experience.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Sharing and disclosure</h2>
              <p>We do not sell your personal information.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <span className="font-semibold">Service providers</span>: We use Firebase/Google Cloud to provide
                  authentication, database, and file storage.
                </li>
                <li>
                  <span className="font-semibold">Embedded media</span>: We may embed YouTube videos. YouTube may collect
                  information per its own policies when you view embedded content.
                </li>
                <li>
                  <span className="font-semibold">Legal and safety</span>: We may disclose information if required by law
                  or to protect the rights, safety, and security of Starks and our members.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Your choices</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Update your profile information and avatar in your account settings.</li>
                <li>Request account deletion by contacting us (see “Contact”).</li>
                <li>
                  If you choose to post publicly, your content may be visible to others depending on your settings and
                  the Service configuration.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Data retention</h2>
              <p>
                We retain information for as long as needed to provide the Service, comply with legal obligations, and
                enforce our policies. If you request deletion, we will take reasonable steps to remove or anonymize your
                account data, subject to legitimate retention needs.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Children’s privacy</h2>
              <p>
                The Service is not intended for children under 13. If you believe a child has provided personal
                information, please contact us so we can take appropriate action.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Contact</h2>
              <p>
                For privacy questions or requests, email{" "}
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

