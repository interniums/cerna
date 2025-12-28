import type { Metadata } from 'next'

import { Container } from '@/components/site/container'

export const metadata: Metadata = {
  title: 'Terms',
}

export default function TermsPage() {
  return (
    <main>
      <Container className="max-w-3xl py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: Dec 28, 2025</p>

        <div className="mt-8 grid gap-6 text-sm leading-6 text-foreground/90">
          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">1. Agreement</h2>
            <p>
              These Terms of Service (“Terms”) govern your access to and use of Cerna (the “Service”). By using the
              Service, you agree to these Terms.
            </p>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">2. Your account</h2>
            <p>
              You are responsible for your account, including maintaining the confidentiality of login credentials and
              all activity that occurs under your account.
            </p>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">3. Integrations (Notion, Slack, Asana, etc.)</h2>
            <p>
              The Service may allow you to connect third-party services (each, an “Integration”). If you connect an
              Integration, you authorize Cerna to access and process data from that provider as needed to provide the
              functionality you request.
            </p>
            <ul className="grid gap-2">
              <li>
                <span className="font-medium">No affiliation</span>: third-party providers (including Notion) are not
                affiliated with Cerna unless explicitly stated.
              </li>
              <li>
                <span className="font-medium">Provider terms</span>: your use of an Integration is also governed by that
                provider’s terms and policies.
              </li>
              <li>
                <span className="font-medium">Revocation</span>: you may disconnect an Integration in Cerna or revoke
                Cerna’s access at the provider. Some previously imported/linked data may remain in Cerna until you delete
                it.
              </li>
            </ul>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">4. Your content</h2>
            <p>
              You retain ownership of the content you create in Cerna and the content you connect via Integrations. You
              grant Cerna a limited license to host, process, and display this content solely to operate and improve the
              Service.
            </p>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">5. Acceptable use</h2>
            <p>You agree not to misuse the Service. For example, you will not:</p>
            <ul className="grid gap-2">
              <li>attempt to gain unauthorized access to accounts, systems, or networks;</li>
              <li>interfere with or disrupt the Service;</li>
              <li>use the Service to violate laws, regulations, or third-party rights.</li>
            </ul>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">6. Subscriptions (if applicable)</h2>
            <p>
              Some features may require a paid subscription. Subscription details, pricing, and renewal terms will be
              shown at purchase time.
            </p>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">7. Disclaimer</h2>
            <p>
              The Service is provided “as is” and “as available”. We disclaim all warranties to the fullest extent
              permitted by law.
            </p>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">8. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, Cerna will not be liable for indirect, incidental, special,
              consequential, or punitive damages, or any loss of data, profits, or revenues.
            </p>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">9. Termination</h2>
            <p>
              You may stop using the Service at any time. We may suspend or terminate access if you violate these Terms
              or if necessary to protect the Service and other users.
            </p>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">10. Changes</h2>
            <p>We may update these Terms. If we do, we will update the “Last updated” date above.</p>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">11. Contact</h2>
            <p>
              Questions about these Terms? Email <span className="font-medium">support@cerna.app</span>. (Replace with
              your real support address before production.)
            </p>
          </section>
        </div>
      </Container>
    </main>
  )
}
