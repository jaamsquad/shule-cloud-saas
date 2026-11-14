import { Link } from "react-router-dom";
import { LegalShell, CONTACT_EMAIL, CONTACT_PHONE } from "./MarketingChrome";
import { LegalDoc, Bullets, type LegalSection } from "./LegalDoc";

const UPDATED = "October 10, 2026";

const sections: LegalSection[] = [
  {
    id: "acceptance", title: "Acceptance of these terms", body: <>
      <p>These Terms of Service ("Terms") govern access to and use of ShuleCloud, including the website at shulecloud.com, the school web application, the student, parent and staff portals, the ShuleCloud 360 mobile app and any related services (together, the "Service").</p>
      <p>By creating an account, signing in or using the Service you agree to these Terms. If you accept them on behalf of a school or other institution, you confirm that you are authorised to bind that institution. If you do not agree, do not use the Service.</p>
    </>,
  },
  {
    id: "definitions", title: "Definitions", body: <Bullets items={[
      <><b>"School"</b> or <b>"Customer"</b> — the school or institution that subscribes to ShuleCloud.</>,
      <><b>"User"</b> — anyone who uses the Service under a School's account, such as administrators, teachers and other staff, students, parents and guardians.</>,
      <><b>"School Data"</b> — the information a School and its Users put into the Service, such as student, parent, staff, academic, attendance and financial records, and uploaded files.</>,
      <><b>"we", "us", "ShuleCloud"</b> — the provider of the Service.</>,
    ]} />,
  },
  {
    id: "service", title: "The Service", body: <>
      <p>ShuleCloud is cloud-based school management software for Kenyan schools following the CBC and 8-4-4 curricula. It covers student management, academics and examinations, report cards, attendance, timetabling, fees and finance, communication, and other school administration tools.</p>
      <p>We continually improve the Service and may add, change or remove features. If we remove a feature that is central to your School's use of the Service, we will give reasonable notice where practical. Features marked as beta or preview are provided for evaluation and may be changed or withdrawn.</p>
    </>,
  },
  {
    id: "accounts", title: "Accounts and security", body: <Bullets items={[
      "Give accurate information when you register and keep it up to date.",
      "Keep your password and one-time codes confidential. Do not share accounts; each person should have their own login.",
      "Use the security features available to you, such as two-step verification.",
      <>Tell your School administrator, or us at <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, straight away if you suspect someone has accessed your account without permission.</>,
      "You are responsible for activity carried out through your account. A School is responsible for the Users it creates and the access rights it gives them.",
    ]} />,
  },
  {
    id: "school-responsibilities", title: "School responsibilities", body: <>
      <p>Each School is the controller of its School Data and is responsible for:</p>
      <Bullets items={[
        "having a lawful basis for collecting and using the personal data it puts into ShuleCloud, including consent from parents or guardians where the Data Protection Act, 2019 requires it for children's data;",
        "the accuracy of its records, including marks, grades, report cards, fee balances and receipts — the School should check them before relying on or publishing them;",
        "managing its Users: creating, updating and removing accounts and assigning the right roles and permissions;",
        "the content of messages it sends to parents, students and staff through the Service (SMS, email, WhatsApp and notices);",
        "complying with Ministry of Education guidelines and any other laws that apply to it.",
      ]} />
    </>,
  },
  {
    id: "acceptable-use", title: "Acceptable use", body: <>
      <p>You must not, and must not help anyone else to:</p>
      <Bullets items={[
        "use the Service for anything unlawful, fraudulent, harmful, abusive or harassing;",
        "access, or try to access, another school's data, another user's account, or any part of the Service you are not authorised to use;",
        "probe, scan or test the Service's security, or bypass authentication, rate limits or other protections, without our written permission;",
        "upload viruses or malicious code, or interfere with or overload the Service or its infrastructure;",
        "copy, scrape, reverse engineer, decompile or create derivative works of the Service, except where the law expressly allows it;",
        "send spam or unsolicited bulk messages, or messages to people who have not agreed to receive them;",
        "upload content that infringes someone else's rights or that is obscene, defamatory or hateful;",
        "resell, sublicense or provide the Service to third parties without our written agreement;",
        "impersonate any person or misrepresent your connection with a school.",
      ]} />
      <p>We may investigate suspected misuse and take reasonable action, including removing content or suspending access.</p>
    </>,
  },
  {
    id: "school-data", title: "School Data and privacy", body: <>
      <p>The School owns its School Data. The School gives us permission to host, process, transmit and display School Data only as needed to provide, secure, support and improve the Service, and as the School instructs through its use of the Service.</p>
      <p>We do not sell School Data, and we do not use it for advertising. Each school's data is kept separate from other schools' data. How we handle personal data is explained in our <Link to="/privacy" className="underline">Privacy Policy</Link>, which forms part of these Terms.</p>
      <p>Schools can export their data while their subscription is active, and during the read-only period described under Suspension and termination.</p>
    </>,
  },
  {
    id: "third-party", title: "Third-party services and integrations", body: <>
      <p>Some features rely on services provided by other companies, for example:</p>
      <Bullets items={[
        "M-PESA (Safaricom Daraja) and other payment services, for fee payments;",
        "SMS gateways, WhatsApp and email providers, for messages and one-time codes;",
        "Google sign-in, for signing in with a Google account;",
        "video meeting providers, for live classes;",
        "an AI model provider, for the AI assistant.",
      ]} />
      <p>Where a School connects its own accounts (for example its own M-PESA paybill, SMS sender or email), the School is responsible for those accounts, their charges and their terms. Third-party services are governed by their providers' own terms and privacy policies. We are not responsible for their availability or their acts and omissions. Charges for SMS, WhatsApp and other usage-based services may apply as shown in your plan or account.</p>
    </>,
  },
  {
    id: "ai", title: "AI features", body: <>
      <p>The AI assistant generates answers automatically and can be wrong or incomplete. Check AI output before you rely on it, especially for academic, financial, medical, disciplinary or other important decisions. Do not enter more personal data into the assistant than the task needs.</p>
      <p>A School can switch the AI assistant off for its account.</p>
    </>,
  },
  {
    id: "billing", title: "Subscriptions, billing and payments", body: <Bullets items={[
      "Plans are priced in Kenya Shillings (KES) per billing cycle — per month, per term or per year — as shown when you subscribe, or as agreed in writing for your School, including any discount.",
      "Fees are payable in advance for each billing cycle unless agreed otherwise. Prices include or exclude taxes as stated on your invoice.",
      "A trial, where offered, lets a School evaluate the Service for the stated period. At the end of the trial a paid plan is needed to continue.",
      "If payment is overdue, we may suspend the account after notice. A suspended account keeps read-only access so the School can export its data.",
      "We may change plan prices for future billing cycles. We will give at least 30 days' notice before a change takes effect for an existing subscription.",
      "Fees already paid are not refundable, except where the law requires it or we agree otherwise in writing.",
    ]} />,
  },
  {
    id: "ip", title: "Intellectual property", body: <>
      <p>ShuleCloud, including its software, design, logos and documentation, belongs to us or our licensors and is protected by law. During your subscription we give the School a limited, non-exclusive, non-transferable right for its Users to use the Service for the School's own purposes, under these Terms.</p>
      <p>If you send us feedback or suggestions, we may use them to improve the Service without any obligation to you.</p>
    </>,
  },
  {
    id: "availability", title: "Availability and support", body: <>
      <p>We work to keep the Service available and secure. We do not guarantee that it will be uninterrupted or error-free. We may carry out maintenance and, where practical, will schedule planned maintenance at times that minimise disruption to schools.</p>
      <p>Support is available by email at <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, by phone or WhatsApp on {CONTACT_PHONE}, and through the <Link to="/contact" className="underline">contact page</Link>.</p>
    </>,
  },
  {
    id: "termination", title: "Suspension and termination", body: <Bullets items={[
      "A School may stop using the Service at any time by cancelling its subscription. The subscription runs until the end of the billing cycle already paid for.",
      "We may suspend or end access immediately if these Terms are seriously breached, if this is needed to protect the Service, other schools or Users, or if the law requires it. In other cases, such as non-payment, we will give notice first.",
      "After an account ends, School Data is kept for the retention period described in the Privacy Policy so the School can export it, and is then permanently deleted. Some records may be kept longer where the law requires it.",
      "Sections that by their nature should continue after termination continue to apply, including School Data, intellectual property, disclaimers, limitation of liability and governing law.",
    ]} />,
  },
  {
    id: "confidentiality", title: "Confidentiality", body: <p>Each party will keep the other's confidential information private and use it only for the purposes of these Terms, except where disclosure is required by law. We treat School Data as confidential.</p>,
  },
  {
    id: "disclaimers", title: "Disclaimers", body: <p>Apart from the commitments stated in these Terms, the Service is provided "as is" and "as available". To the extent the law allows, we disclaim implied warranties, such as merchantability, fitness for a particular purpose and non-infringement. Calculations and documents the Service produces — such as grades, rankings, report cards, timetables, fee statements and receipts — are based on the data and settings the School enters, and the School is responsible for checking them.</p>,
  },
  {
    id: "liability", title: "Limitation of liability", body: <>
      <p>To the extent the law allows:</p>
      <Bullets items={[
        "neither party is liable for indirect or consequential losses, or for loss of profits, revenue, goodwill or data, arising from these Terms or the Service;",
        "our total liability for all claims relating to the Service in any 12-month period is limited to the subscription fees the School paid us for the Service in that period.",
      ]} />
      <p>Nothing in these Terms limits liability that cannot be limited by law, such as liability for fraud.</p>
    </>,
  },
  {
    id: "indemnity", title: "Indemnity", body: <p>The School will compensate us for reasonable losses and costs arising from third-party claims about School Data the School had no right to use, or about use of the Service by the School or its Users that breaks these Terms or the law.</p>,
  },
  {
    id: "changes", title: "Changes to these terms", body: <p>We may update these Terms from time to time. For material changes we will give notice through the Service or by email before they take effect. The date at the top of this page shows the latest version. If you continue using the Service after changes take effect, you accept the updated Terms.</p>,
  },
  {
    id: "law", title: "Governing law and disputes", body: <p>These Terms are governed by the laws of Kenya. If a dispute arises, both parties will first try to resolve it in good faith by contacting each other. If that fails, the courts of Kenya have jurisdiction.</p>,
  },
  {
    id: "contact", title: "Contact us", body: <p>Questions about these Terms: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> · {CONTACT_PHONE} · Nairobi, Kenya.</p>,
  },
];

export default function Terms() {
  return (
    <LegalShell title="Terms of Service" badge="Legal Policy" subtitle="The terms that govern your use of ShuleCloud." lastUpdated={UPDATED}>
      <LegalDoc
        lastUpdated={UPDATED}
        intro={<p>Please read these terms carefully. They explain what you can expect from ShuleCloud, and what we expect from schools and everyone who uses ShuleCloud through them.</p>}
        sections={sections}
      />
    </LegalShell>
  );
}
