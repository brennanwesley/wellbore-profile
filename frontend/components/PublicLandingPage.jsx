"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

function SingleWellIcon() {
  return (
    <svg viewBox="0 0 48 48" className="landing-feature-icon" aria-hidden="true">
      <path d="M12 7 H22 V41 H12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 25 C30 25 34 29 36 38" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="7" r="3" fill="currentColor" />
      <circle cx="36" cy="38" r="3" fill="currentColor" />
    </svg>
  );
}

function MultiWellIcon() {
  return (
    <svg viewBox="0 0 48 48" className="landing-feature-icon" aria-hidden="true">
      <path d="M9 10 V38" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M24 10 V38" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M39 10 V38" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M9 30 C15 30 17 27 24 27 C31 27 33 24 39 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="10" r="3" fill="currentColor" />
      <circle cx="24" cy="10" r="3" fill="currentColor" />
      <circle cx="39" cy="10" r="3" fill="currentColor" />
    </svg>
  );
}

function LiftIcon() {
  return (
    <svg viewBox="0 0 48 48" className="landing-feature-icon" aria-hidden="true">
      <path d="M9 33 H39" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M13 21 H35 L31 12 H17 Z" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M24 21 V33" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M15 33 C15 28 18 25 24 25 C30 25 33 28 33 33" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

function LandingFeature({ icon, title }) {
  return (
    <article className="landing-feature-item">
      <span className="landing-feature-icon-wrap">{icon}</span>
      <p className="landing-feature-title">{title}</p>
    </article>
  );
}

export default function PublicLandingPage() {
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  return (
    <>
      <main className="landing-page">
        <section className="landing-shell">
          <section className="landing-hero-grid">
            <div className="landing-copy">
              <p className="landing-eyebrow">Subsurface Visualization Platform</p>
              <h1 className="landing-title">View Your Wellbore</h1>
              <p className="landing-description">
                Review directional surveys with a professional, streamlined interface built for clear 3D wellbore
                visualization and future DSU-scale multi-well analysis.
              </p>
              <div className="landing-actions">
                <Link href="/workspace" className="landing-primary-link">
                  <span>Enter Site</span>
                  <span className="landing-primary-link-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </div>
              <p className="landing-support">Choose the single-well or DSU workflow from a clean workspace selector.</p>
            </div>

            <div className="landing-visual-card">
              <div className="landing-image-stack">
                <article className="landing-image-card landing-image-card-primary">
                  <div className="landing-image-media">
                    <Image
                      src="/landing/Well%20cartoon%201.png"
                      alt="Illustration of a horizontal well with hydraulic fracturing"
                      fill
                      priority
                      sizes="(max-width: 980px) 100vw, 42vw"
                      className="landing-image"
                    />
                  </div>
                  <div className="landing-image-caption">
                    <p className="landing-image-kicker">Clear trajectory context</p>
                    <p className="landing-visual-caption-title">Professional wellbore visuals without the clutter</p>
                    <p className="landing-visual-caption-text">
                      Keep the landing experience grounded in the kind of directional and subsurface views the platform is built to support.
                    </p>
                  </div>
                </article>

                <article className="landing-image-card landing-image-card-secondary">
                  <div className="landing-image-media">
                    <Image
                      src="/landing/Well%20cartoon%204.png"
                      alt="Illustration comparing horizontal and vertical well concepts"
                      fill
                      sizes="(max-width: 980px) 88vw, 26vw"
                      className="landing-image"
                    />
                  </div>
                  <div className="landing-image-caption">
                    <p className="landing-image-kicker">Expandable workflows</p>
                    <p className="landing-visual-caption-title">Built for single-well review and multi-well growth</p>
                  </div>
                </article>
              </div>
            </div>
          </section>

          <section className="landing-feature-band" aria-label="Primary platform features">
            <div className="landing-feature-grid">
              <LandingFeature icon={<SingleWellIcon />} title="Single Wellbore 3D & 2D Profiles" />
              <LandingFeature icon={<MultiWellIcon />} title="Multi Well in DSU 3D View" />
              <LandingFeature icon={<LiftIcon />} title="Artificial Lift Design Support" />
            </div>
          </section>

          <div className="landing-footer-row">
            <button type="button" className="landing-support-trigger" onClick={() => setIsSupportOpen(true)}>
              Request a Feature Here!
            </button>
          </div>
        </section>
      </main>

      {isSupportOpen ? (
        <div className="landing-modal-backdrop" role="presentation" onClick={() => setIsSupportOpen(false)}>
          <div className="landing-modal-card" role="dialog" aria-modal="true" aria-labelledby="landing-support-title" onClick={(event) => event.stopPropagation()}>
            <p className="landing-modal-eyebrow">Feature Requests</p>
            <h2 id="landing-support-title" className="landing-modal-title">
              Request a new feature or contact support.
            </h2>
            <p className="landing-modal-text">
              To request a new feature or contact support, please email:
              <span className="landing-support-email"> support@terascaleai.com.</span>
            </p>
            <div className="landing-modal-actions">
              <button type="button" className="landing-primary-link landing-modal-button" onClick={() => setIsSupportOpen(false)}>
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
