import { Link } from "react-router-dom";
import { LegalShell, CONTACT_EMAIL, CONTACT_PHONE } from "./MarketingChrome";
import { LegalDoc, Bullets, Sub, type LegalSection } from "./LegalDoc";

const UPDATED = "October 10, 2026";

const sections: LegalSection[] = [
  {
    id: "who-we-are", title: "Who we are and our role", body: <>
      <p>ShuleCloud provides school management software. This policy explains how personal data is handled when you use the ShuleCloud website, web application, the student, parent and staff portals, and the ShuleCloud 360 mobile app.</p>
      <p>We play two roles under Kenya's Data Protection Act, 2019:</p>
      <Bullets items={[
        <><b>For school records</b> (students, parents and guardians, staff, academics, attendance, fees), the <b>school is the data controller</b> and ShuleCloud is its <b>data processor</b>. We process that data only to provide the Service on the school's instructions.</>,
        <><b>For our own customer relationships</b> — school administrators' accounts, billing, support requests, website enquiries and demo requests — <b>ShuleCloud is the data controller</b>.</>,
      ]} />
      <p>If you are a student, parent or staff member, your school decides what information it keeps about you. Please contact your school first with questions about your records.</p>
    </>,
  },
  {
    id: "data-we-collect", title: "Information we collect", body: <>
      <Sub title="Information schools put into ShuleCloud">
        <Bullets items={[
          "School details: name, contacts, branches, settings and configuration.",
          "Student records: names, admission numbers, class and stream, date of birth, gender, photos, guardians, academic results, attendance, behaviour, health or clinic notes, transport, boarding and library records, and documents the school uploads.",
          "Parent and guardian details: names, phone numbers, email addresses and relationship to the student.",
          "Staff details: profiles, roles, contact details, and HR and salary records where the school uses those modules.",
          "Financial records: fee structures, invoices, payments, receipts and M-PESA transaction references.",
          "Communications the school sends through ShuleCloud, such as SMS, email, WhatsApp messages and notices.",
        ]} />
      </Sub>
      <Sub title="Information collected when you use the Service">
        <Bullets items={[
          "Account and sign-in data: name, email or phone number, and password (stored only as a secure hash). Also one-time codes for verification, and, if you choose Google sign-in, basic profile information from Google.",
          "Security and usage records: sign-in times, IP address, browser and device type, and audit logs of important actions, such as changes to marks, fees or settings.",
        ]} />
      </Sub>
      <Sub title="Information you give us directly">
        <Bullets items={["Contact form, demo and registration requests: your name, school, email, phone number and message.", "Support conversations and feedback."]} />
      </Sub>
    </>,
  },
  {
    id: "children", title: "Children's data", body: <>
      <p>Most students are under 18. Their data is entered by their school, which is responsible for having a lawful basis for it. Where the Data Protection Act, 2019 requires it, the school must obtain consent from a parent or guardian.</p>
      <p>We process children's data only to provide the Service to their school. We never use it for advertising or profiling, and we never sell it.</p>
    </>,
  },
  {
    id: "how-we-use", title: "How we use information", body: <>
      <Bullets items={[
        "To provide the Service: managing records, producing report cards, timetables, invoices and receipts, and running the portals and mobile app.",
        "To sign you in securely, including two-step verification and one-time codes, and to detect and prevent fraud, abuse and unauthorised access.",
        "To deliver messages and payment requests the school sends, such as SMS, email, WhatsApp and M-PESA prompts.",
        "To provide support and respond to enquiries.",
        "To maintain, fix and improve the Service.",
        "To bill schools for their subscription.",
        "To meet legal obligations, and to establish or defend legal claims.",
      ]} />
      <p>We do not sell personal data, we do not show advertising in the Service, and we do not use school records to market to students or parents.</p>
    </>,
  },
  {
    id: "legal-bases", title: "Legal bases for processing", body: <>
      <p>Where ShuleCloud is the controller, we rely on one of these bases:</p>
      <Bullets items={[
        <><b>Contract</b> — to provide the Service a school has subscribed to, and to manage its account and billing.</>,
        <><b>Legal obligation</b> — for example tax, accounting and lawful requests from authorities.</>,
        <><b>Legitimate interests</b> — keeping the Service secure, preventing fraud and improving the Service, in ways that do not override your rights.</>,
        <><b>Consent</b> — where we ask for it, for example to contact you about a demo. You can withdraw consent at any time.</>,
      ]} />
      <p>For school records, the school determines the legal basis, as the controller.</p>
    </>,
  },
  {
    id: "sharing", title: "How information is shared", body: <>
      <p>Within a school, information is visible to that school's users according to the roles and permissions the school sets. For example, a parent sees only their own children's information. Schools never see another school's data.</p>
      <p>We share data with service providers only as needed to run the Service:</p>
      <Bullets items={[
        "Hosting, database and content delivery providers that store and serve the Service.",
        "SMS gateways (such as Africa's Talking), WhatsApp and email providers, to deliver messages and one-time codes.",
        "Safaricom (M-PESA Daraja) and other payment services, to process fee payments.",
        "Google, when you choose Google sign-in.",
        "A video meeting provider, when a school runs live classes.",
        "An AI model provider (currently Groq), only when a school has the AI assistant switched on. Only the text needed to answer your request is sent.",
      ]} />
      <p>These providers may use the data only to provide their service. We may also disclose information:</p>
      <Bullets items={[
        "when required by law, court order or a lawful request from a public authority;",
        "to protect the rights, safety or security of users, schools or ShuleCloud;",
        "as part of a merger, acquisition or sale of assets, subject to equivalent protection.",
      ]} />
      <p>Some features create links that anyone with the link can open, such as QR codes for verifying certificates and report cards, and shared invoice or document links. These show only the information needed for that purpose. Share such links with care.</p>
    </>,
  },
  {
    id: "transfers", title: "International transfers", body: <p>Some of our service providers may store or process data outside Kenya. When that happens we take the steps the Data Protection Act, 2019 requires so that the data stays protected, for example by using providers with appropriate security safeguards and contractual commitments.</p>,
  },
  {
    id: "security", title: "How we protect data", body: <>
      <Bullets items={[
        "Data is encrypted in transit and at rest.",
        "Multi-tenant isolation: each school's data is kept separate, and every request is checked on the server against the school it belongs to.",
        "Passwords are stored as one-way hashes, never in readable form.",
        "Role-based permissions, optional two-step verification, and audit logs of important actions.",
        "Access by our own staff is limited to what is needed for support and operations.",
      ]} />
      <p>No system is completely secure. If a personal data breach affects a school's data, we will notify the school without undue delay so it can meet its own obligations, and we will notify the Office of the Data Protection Commissioner where the law requires us to.</p>
    </>,
  },
  {
    id: "retention", title: "Data retention", body: <>
      <p>School Data is kept for as long as the school's subscription is active, plus 90 days. Schools can export their data at any time while the subscription is active, and during that period. After it, the data is permanently deleted. Copies in backups are deleted as the backups expire.</p>
      <p>We may keep limited records for longer where the law requires it, such as our own invoices and payment records, or where they are needed to resolve disputes. Website enquiries are kept only as long as needed to respond to them and to follow up.</p>
    </>,
  },
  {
    id: "rights", title: "Your rights", body: <>
      <p>Under the Data Protection Act, 2019 you have the right to:</p>
      <Bullets items={[
        "be informed about how your personal data is used;",
        "access your personal data;",
        "ask for incorrect or misleading data to be corrected;",
        "ask for data to be deleted, where the law allows;",
        "object to processing, or restrict it, in certain cases;",
        "receive your data in a portable format, where it applies.",
      ]} />
      <p>For school records, please contact your school, which controls that data. We will help the school respond. For data we control, email us at <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      <p>You can also complain to the Office of the Data Protection Commissioner (ODPC), Kenya, at <a className="underline" href="https://www.odpc.go.ke" target="_blank" rel="noreferrer">www.odpc.go.ke</a>.</p>
    </>,
  },
  {
    id: "cookies", title: "Cookies and local storage", body: <>
      <p>ShuleCloud uses your browser's storage (local storage) to keep you signed in and to remember choices such as your active portal, school branch or selected child. Our hosting and security provider may also set strictly necessary cookies to protect the site from attacks.</p>
      <p>We do not use advertising cookies or third-party advertising trackers. Signing out clears your session on that device.</p>
    </>,
  },
  {
    id: "mobile", title: "Mobile apps", body: <p>The ShuleCloud 360 app stores your sign-in token in your device's secure storage, and shows the same information you would see in the web portals. It does not access your contacts or your location. Links you open may be handled by your device's browser or other apps.</p>,
  },
  {
    id: "changes", title: "Changes to this policy", body: <p>We may update this policy as the Service or the law changes. For significant changes we will give notice through the Service or by email. The date at the top shows the latest version. Please also read our <Link to="/terms" className="underline">Terms of Service</Link>.</p>,
  },
  {
    id: "contact", title: "Contact us", body: <p>Privacy questions or requests: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> · {CONTACT_PHONE} · Nairobi, Kenya.</p>,
  },
];

export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" badge="Legal Policy" subtitle="Your trust is our foundation. Learn how ShuleCloud collects, protects and manages your data." lastUpdated={UPDATED}>
      <LegalDoc
        lastUpdated={UPDATED}
        intro={<p>ShuleCloud is committed to protecting the privacy of students, parents, staff and school administrators. This policy explains what information we handle, why, who we share it with, and the choices and rights you have.</p>}
        sections={sections}
      />
    </LegalShell>
  );
}
