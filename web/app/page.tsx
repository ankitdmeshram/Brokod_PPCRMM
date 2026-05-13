"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelopeOpenText,
  faPhoneVolume,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import styles from "./page.module.css";

const featureCards = [
  {
    badge: "PM",
    title: "Project Management",
    description:
      "Plan work, track delivery, and keep every stakeholder aligned in one clear workflow.",
  },
  {
    badge: "CRM",
    title: "Customer Management",
    description:
      "Organize leads, nurture relationships, and move deals forward with better visibility.",
  },
  {
    badge: "MK",
    title: "Marketing Execution",
    description:
      "Launch campaigns faster with structured tasks, accountability, and measurable outcomes.",
  },
  {
    badge: "OP",
    title: "Operations Control",
    description:
      "Standardize recurring processes so your team can scale without losing clarity.",
    accent: true,
  },
];

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const scrollToContact = () => {
    document
      .getElementById("questions")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (!isModalOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  return (
    <main className={styles.page}>
      <section className={styles.heroShell}>
        <header className={styles.navbar}>
          <a className={styles.brand} href="#home">
            <span className={styles.brandMark}>B</span>
            <span className={styles.brandText}>Brokod</span>
          </a>

          <nav className={styles.navLinks} aria-label="Primary">
            <a className={styles.navLinkActive} href="#home">
              Home
            </a>
            <div className={styles.navDropdown}>
              <a
                className={styles.navLink}
                href="#solutions"
                aria-haspopup="true"
              >
                Solutions
              </a>
              <div className={styles.dropdownMenu}>
                <a className={styles.dropdownItem} href="/workspace">
                  Project Management
                </a>
                <a
                  className={styles.dropdownItem}
                  href="https://pcrm.brokod.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  PCRM
                </a>
              </div>
            </div>
            <a className={styles.navLink} href="#questions">
              Contact Us
            </a>
          </nav>

          <button
            className={styles.navCta}
            type="button"
            onClick={scrollToContact}
          >
            Get a Demo
          </button>
        </header>

        <section className={styles.hero} id="home">
          <div className={styles.pill}>
            <span className={styles.pillTag}>Growth Partner</span>
            <span className={styles.pillText}>
              Technology + Marketing for Real Business Results
            </span>
          </div>

          <h1 className={styles.title}>
            We Build Systems That Drive Real Business Growth
          </h1>

          <p className={styles.description}>
            From building your product to generating leads, we help you grow faster with the right technology and marketing strategy.
          </p>

          <div className={styles.ctaRow}>
            <button
              className={styles.primaryHeroCta}
              type="button"
              onClick={scrollToContact}
            >
              Book Free Consultation
            </button>
            {/* <a className={styles.secondaryHeroCta} href="#solutions">
              View SaaS Demo
            </a> */}
          </div>

          <Image
            className={styles.floatingLeft}
            src="https://cdn-icons-png.flaticon.com/128/3281/3281323.png"
            alt=""
            width={64}
            height={64}
            aria-hidden="true"
          />

          <Image
            className={styles.floatingRight}
            src="https://cdn-icons-png.flaticon.com/128/5723/5723208.png"
            alt=""
            width={64}
            height={64}
            aria-hidden="true"
          />
        </section>

        <section className={styles.featureShowcase} id="solutions">
          <div className={styles.featureGrid} aria-label="Key solutions">
            {featureCards.map((card) => (
              <article
                key={card.title}
                className={
                  card.accent
                    ? `${styles.featureCard} ${styles.featureCardAccent}`
                    : styles.featureCard
                }
              >
                <span
                  className={
                    card.accent
                      ? `${styles.featureBadge} ${styles.featureBadgeAccent}`
                      : styles.featureBadge
                  }
                >
                  {card.badge}
                </span>
                <h3 className={styles.featureTitle}>{card.title}</h3>
                <p className={styles.featureDescription}>{card.description}</p>
              </article>
            ))}
          </div>

          <div className={styles.featureContent}>
            <p className={styles.featureEyebrow}>Our Solutions</p>
            <h2 className={styles.featureHeading}>
              We focus on the growth of your business.
            </h2>
            <p className={styles.featureCopy}>
              Brokod brings project management, customer workflows, and
              execution systems together so your team can grow with more speed,
              structure, and confidence.
            </p>
            <button
              className={styles.featureCta}
              type="button"
              onClick={scrollToContact}
            >
              Talk With Us
            </button>
          </div>
        </section>

        <section className={styles.contactSection} id="questions">
          <div className={styles.contactLayout}>
            <aside className={styles.contactInfoCard}>
              <div className={styles.contactInfoBlock}>
                <span className={styles.contactInfoIcon} aria-hidden="true">
                  <FontAwesomeIcon icon={faEnvelopeOpenText} />
                </span>
                <h3 className={styles.contactInfoTitle}>Email Address</h3>
                <p className={styles.contactInfoText}>
                  <a href="mailto:contact@brokod.com">contact@brokod.com</a>
                </p>
              </div>

              <div className={styles.contactInfoBlock}>
                <span className={styles.contactInfoIcon} aria-hidden="true">
                  <FontAwesomeIcon icon={faPhoneVolume} />
                </span>
                <h3 className={styles.contactInfoTitle}>Contact Us</h3>
                <p className={styles.contactInfoText}>
                  <a href="tel:+919372096952">
                    +91 93720 96952
                  </a>
                  <br />
                  <a href="tel:+918451886937">
                    +91 845 188 6937
                  </a>
                </p>
              </div>

              <div className={styles.contactInfoBlock}>
                <span className={styles.contactInfoIcon} aria-hidden="true">
                  <FontAwesomeIcon icon={faWhatsapp} />
                </span>
                <h3 className={styles.contactInfoTitle}>WhatsApp</h3>
                <p className={styles.contactInfoText}>
                  <a href="https://wa.me/919372096952" target="_blank" rel="noreferrer">
                    +91 93720 96952
                  </a>
                  <br />
                  <a href="https://wa.me/918451886937" target="_blank" rel="noreferrer">
                    +91 845 188 6937
                  </a>
                </p>
              </div>
            </aside>

            <div className={styles.contactCard}>
              <h2 className={styles.contactHeading}>
                Let&apos;s connect &amp; help
                <br />
                you succeed
              </h2>

              <form className={styles.contactForm}>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Full name</span>
                  <input
                    className={styles.fieldInput}
                    type="text"
                    placeholder="Benjamin Carter"
                  />
                </label>

                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Email Address</span>
                  <input
                    className={styles.fieldInput}
                    type="email"
                    placeholder="info@example.com"
                  />
                </label>

                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Phone</span>
                  <input
                    className={styles.fieldInput}
                    type="tel"
                    placeholder="+1 (234) 56 88 99"
                  />
                </label>

                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Subjects</span>
                  <input
                    className={styles.fieldInput}
                    type="text"
                    placeholder="I would like to discussed"
                  />
                </label>

                <label className={styles.messageGroup}>
                  <span className={styles.fieldLabel}>Message</span>
                  <textarea
                    className={styles.messageInput}
                    rows={7}
                    placeholder="Write message"
                  />
                </label>

                <button className={styles.submitButton} type="submit">
                  Send Message
                </button>

                <p className={styles.contactWhatsappNote}>
                  Prefer WhatsApp?
                  <a
                    className={styles.contactWhatsappLink}
                    href="https://wa.me/919372096952"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Chat with us on +91 93720 96952
                  </a>
                </p>
              </form>
            </div>
          </div>
        </section>
      </section>

      {isModalOpen ? (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsModalOpen(false)}
          role="presentation"
        >
          <div
            className={styles.modalCard}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="consultation-modal-title"
          >
            <button
              className={styles.modalClose}
              type="button"
              aria-label="Close modal"
              onClick={() => setIsModalOpen(false)}
            >
              ×
            </button>

            <h2 className={styles.modalTitle} id="consultation-modal-title">
              Let&apos;s connect &amp; help
              <br />
              you succeed
            </h2>

            <form className={styles.modalForm}>
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Full name</span>
                <input
                  className={styles.fieldInput}
                  type="text"
                  placeholder="Benjamin Carter"
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Email Address</span>
                <input
                  className={styles.fieldInput}
                  type="email"
                  placeholder="info@example.com"
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Phone</span>
                <input
                  className={styles.fieldInput}
                  type="tel"
                  placeholder="+1 (234) 56 88 99"
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Subjects</span>
                <input
                  className={styles.fieldInput}
                  type="text"
                  placeholder="I would like to discussed"
                />
              </label>

              <label className={styles.messageGroup}>
                <span className={styles.fieldLabel}>Message</span>
                <textarea
                  className={styles.messageInput}
                  rows={6}
                  placeholder="Write message"
                />
              </label>

              <button className={styles.submitButton} type="submit">
                Send Message
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
