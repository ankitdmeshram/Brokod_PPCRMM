"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
            <a className={styles.navLink} href="#solutions">
              Solutions
            </a>
            <a className={styles.navLink} href="#benefits">
              Benefits
            </a>
            <a className={styles.navLink} href="#pricing">
              Pricing
            </a>
            <a className={styles.navLink} href="#questions">
              Questions
            </a>
          </nav>

          <a className={styles.navCta} href="mailto:hello@brokod.com">
            Get a Demo
          </a>
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
              onClick={() => setIsModalOpen(true)}
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
