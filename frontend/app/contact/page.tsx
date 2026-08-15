import { BookOpen, Building2, Info, Mail, MessageSquare } from "lucide-react";
import type { Metadata } from "next";

import { ContactForm } from "@/components/contact/ContactForm";
import { PublicShell } from "@/components/navigation/PublicShell";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the AtmosIQ team about pilot deployments, data interoperability, research collaboration or platform questions.",
};

const CHANNELS = [
  {
    icon: Building2,
    title: "Pilot deployments",
    text: "Municipal authorities and environmental agencies evaluating AtmosIQ for a ward, city or region.",
  },
  {
    icon: MessageSquare,
    title: "Research collaboration",
    text: "Universities and climate organisations working on air-quality modelling, exposure or citizen science.",
  },
  {
    icon: BookOpen,
    title: "Interoperability",
    text: "Partner nodes interested in the shared data schema and the federated BRICS architecture.",
  },
  {
    icon: Mail,
    title: "General enquiries",
    text: "Questions about the platform, the risk methodology, or the responsible-AI commitments.",
  },
];

export default function ContactPage() {
  return (
    <PublicShell>
      <section className="page-hero">
        <div className="container page-hero-inner">
          <p className="eyebrow">
            <Mail size={13} aria-hidden="true" />
            Contact
          </p>
          <h1>Contact</h1>
          <p className="page-hero-lead">
            Whether you are evaluating a deployment, reviewing the methodology or exploring a
            partnership, we would like to hear the specifics of your region.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="contact-grid">
            <div className="contact-intro">
              <h2>Let&rsquo;s talk about your airshed.</h2>
              <p>
                {APP_NAME} is designed to be deployed by the institutions closest to the
                problem. Tell us where you operate and what your current monitoring coverage
                looks like, and we will respond with something concrete rather than a
                brochure.
              </p>

              <div className="contact-channels">
                {CHANNELS.map((channel) => (
                  <article className="contact-channel" key={channel.title}>
                    <span className="contact-channel-icon" aria-hidden="true">
                      <channel.icon size={19} />
                    </span>
                    <div>
                      <h3 className="contact-channel-title">{channel.title}</h3>
                      <p className="contact-channel-text">{channel.text}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="contact-note">
                <p className="contact-note-title">
                  <Info size={15} aria-hidden="true" />
                  Prototype notice
                </p>
                <p className="contact-note-text">
                  This is a hackathon prototype. Messages submitted here are stored securely
                  by the AtmosIQ backend and logged for review, but automated email delivery
                  is not enabled in this build.
                </p>
              </div>
            </div>

            <ContactForm />
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
