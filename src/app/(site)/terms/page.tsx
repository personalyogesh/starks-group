import Container from "@/components/ui/Container";

export const metadata = {
  title: "Terms of Service | Starks Cricket Club",
};

export default function TermsOfServicePage() {
  return (
    <div className="py-10">
      <Container>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Terms of Service</h1>
          <p className="mt-2 text-sm text-slate-600">Last updated: January 16, 2026</p>

          <div className="mt-8 space-y-6 text-slate-700 leading-relaxed">
            <p>
              These Terms of Service (“Terms”) govern your use of the Starks Cricket Club website and community
              features (the “Service”). By using the Service, you agree to these Terms.
            </p>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Accounts</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>You are responsible for your account credentials and activity.</li>
                <li>You agree to provide accurate information and keep it up to date.</li>
                <li>
                  We may require admin approval for certain member features. Suspended users may be restricted from
                  accessing the Service.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Community standards</h2>
              <p>You agree not to post or share content that:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Is unlawful, harmful, threatening, abusive, harassing, hateful, or discriminatory.</li>
                <li>Violates someone else’s rights (including privacy and intellectual property).</li>
                <li>Is spam, misleading, or disruptive to the community.</li>
              </ul>
              <p>
                We may remove content, restrict features, or suspend/terminate accounts to protect the community and
                enforce these Terms.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Your content</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>You retain ownership of content you submit (posts, comments, images).</li>
                <li>
                  You grant Starks a non-exclusive, worldwide license to host, store, reproduce, and display your
                  content solely to operate and improve the Service.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Events and RSVPs</h2>
              <p>
                Event details may change. RSVPs are informational and do not guarantee attendance, entry, or
                availability. Participation in club events may involve inherent risks; you are responsible for your
                own conduct and safety.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Third-party services</h2>
              <p>
                The Service may integrate or embed third-party content (e.g., YouTube videos). Your use of those
                services is governed by their terms and policies.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Disclaimers</h2>
              <p>
                The Service is provided “as is” and “as available.” We do not guarantee the Service will be
                uninterrupted, error-free, or secure.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Limitation of liability</h2>
              <p>
                To the maximum extent permitted by law, Starks will not be liable for indirect, incidental, special,
                consequential, or punitive damages, or any loss of data, profits, or goodwill.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Termination</h2>
              <p>
                You may stop using the Service at any time. We may suspend or terminate access if we reasonably believe
                you violated these Terms or to protect the community and the Service.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Governing law</h2>
              <p>These Terms are governed by the laws of North Carolina, United States, without regard to conflict-of-law rules.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Contact</h2>
              <p>
                Questions about these Terms? Email{" "}
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

