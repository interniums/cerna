import type { Metadata } from 'next'

import { Container } from '@/components/site/container'

export const metadata: Metadata = {
  title: 'Privacy',
}

export default function PrivacyPage() {
  return (
    <main>
      <Container className="max-w-3xl py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: Dec 28, 2025</p>

        <div className="mt-8 grid gap-6 text-sm leading-6 text-foreground/90">
          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Overview</h2>
            <p>
              This Privacy Policy explains how Cerna (“Cerna”, “we”, “us”) collects, uses, and shares information when
              you use our website and app (the “Service”), including when you connect third-party integrations such as
              Notion.
            </p>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Information we collect</h2>
            <ul className="grid gap-2">
              <li>
                <span className="font-medium">Account information</span>: your email address and basic profile
                information needed to authenticate you and provide the Service.
              </li>
              <li>
                <span className="font-medium">Content you create in Cerna</span>: tasks, notes, resources/links, and
                related metadata you add.
              </li>
              <li>
                <span className="font-medium">Connected integrations (e.g. Notion)</span>: information required to
                connect and operate the integration, such as workspace identifiers, and content/metadata you choose to
                import or link.
              </li>
              <li>
                <span className="font-medium">Usage and diagnostics</span>: basic logs and telemetry to keep the Service
                reliable (e.g., errors, performance metrics).
              </li>
              <li>
                <span className="font-medium">Billing information (if applicable)</span>: subscription status and
                associated identifiers from our billing provider. We do not store full payment card details on Cerna
                servers.
              </li>
            </ul>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Notion integration (OAuth)</h2>
            <p>
              When you connect Notion, you authorize Cerna via OAuth to access Notion content within the permissions you
              grant. Cerna uses this access to help you view and organize your work in Cerna.
            </p>
            <ul className="grid gap-2">
              <li>
                <span className="font-medium">What we access</span>: depending on your granted permissions, we may
                access Notion pages/databases you authorize Cerna to read.
              </li>
              <li>
                <span className="font-medium">What we store</span>: by default (link-only), we store references and
                metadata such as item IDs, URLs, titles (if available), timestamps, and limited cached metadata needed
                to display items in Cerna. We may also store minimal raw API payloads for reliability and debugging.
              </li>
              <li>
                <span className="font-medium">What we don’t do</span>: we do not sell Notion data and we do not use your
                Notion content to train public machine learning models.
              </li>
            </ul>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">How we use information</h2>
            <ul className="grid gap-2">
              <li>
                <span className="font-medium">Provide the Service</span>: create and sync your tasks/notes/resources and
                show linked items from integrations.
              </li>
              <li>
                <span className="font-medium">Security and abuse prevention</span>: detect and prevent fraud, abuse, and
                unauthorized access.
              </li>
              <li>
                <span className="font-medium">Support and troubleshooting</span>: diagnose issues and respond to support
                requests.
              </li>
              <li>
                <span className="font-medium">Improve the Service</span>: analyze aggregated usage to improve features
                and performance.
              </li>
            </ul>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">How we share information</h2>
            <p>We share information only as necessary to provide the Service, including:</p>
            <ul className="grid gap-2">
              <li>
                <span className="font-medium">Service providers</span>: hosting, databases, analytics, email delivery,
                and billing providers that process data on our behalf.
              </li>
              <li>
                <span className="font-medium">Third-party integrations</span>: when you connect Notion (or another
                integration), Cerna communicates with that provider’s API at your request.
              </li>
              <li>
                <span className="font-medium">Legal</span>: if required by law or to protect rights, safety, and
                security.
              </li>
            </ul>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Security</h2>
            <p>
              We use industry-standard security measures. Integration tokens are stored encrypted at rest. No method of
              transmission or storage is 100% secure; you are responsible for protecting your account credentials.
            </p>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Data retention</h2>
            <p>
              We retain data as long as your account is active or as needed to provide the Service. You may delete items
              within Cerna. If you delete your account, we will delete or anonymize your personal data, subject to legal
              requirements.
            </p>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Your choices (including revoking Notion access)</h2>
            <ul className="grid gap-2">
              <li>
                <span className="font-medium">Disconnect integrations</span>: you can disconnect Notion from Cerna in
                Settings, which removes Cerna’s stored connection and stops further syncing.
              </li>
              <li>
                <span className="font-medium">Revoke at the provider</span>: you can also revoke Cerna’s access in
                Notion’s connected apps settings.
              </li>
              <li>
                <span className="font-medium">Delete imported/linked data</span>: you can delete linked items stored in
                Cerna (and notes/tasks created in Cerna). Disconnecting does not automatically delete previously stored
                data unless you choose to delete it.
              </li>
            </ul>
          </section>

          <section className="grid gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Contact</h2>
            <p>
              For privacy questions or requests, contact us at <span className="font-medium">privacy@cerna.app</span>.
              (Replace with your real support address before production.)
            </p>
          </section>
        </div>
      </Container>
    </main>
  )
}
