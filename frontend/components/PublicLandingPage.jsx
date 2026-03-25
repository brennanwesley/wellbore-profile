import Link from "next/link";

export default function PublicLandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-shell">
        <div className="landing-copy">
          <p className="landing-eyebrow">Subsurface Visualization Platform</p>
          <h1 className="landing-title">View Your Wellbore</h1>
          <p className="landing-description">
            Review directional surveys with a professional, streamlined interface built for clear 3D wellbore
            visualization and future DSU-scale multi-well analysis.
          </p>
          <div className="landing-actions">
            <Link href="/single-well" className="landing-primary-link">
              <span>Enter Site</span>
              <span className="landing-primary-link-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
          <p className="landing-support">Enter the current viewer experience and begin working with a well survey.</p>
        </div>

        <div className="landing-visual-card">
          <div className="landing-visual-frame">
            <svg className="landing-visual-svg" viewBox="0 0 760 560" role="img" aria-label="Stylized rig and subsurface wellbore illustration">
              <defs>
                <linearGradient id="landingSky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#eaf6fb" />
                  <stop offset="100%" stopColor="#b7d6e3" />
                </linearGradient>
                <linearGradient id="landingEarth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e7d7bb" />
                  <stop offset="100%" stopColor="#d2b78d" />
                </linearGradient>
                <linearGradient id="landingDepth" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0f7284" />
                  <stop offset="100%" stopColor="#0a4f63" />
                </linearGradient>
              </defs>

              <rect x="0" y="0" width="760" height="230" fill="url(#landingSky)" rx="28" ry="28" />
              <rect x="0" y="210" width="760" height="350" fill="url(#landingEarth)" rx="0" ry="0" />

              <path d="M0 212 C92 198 148 195 236 210 C346 228 442 223 536 206 C624 190 688 194 760 205" fill="#d7e7ee" opacity="0.95" />
              <path d="M0 230 C120 214 206 210 296 226 C418 247 534 243 638 223 C690 213 730 214 760 220" fill="#bcd4dd" opacity="0.72" />

              <path d="M0 285 C108 271 201 264 312 279 C428 295 554 291 656 274 C707 266 741 267 760 270" fill="none" stroke="#c49667" strokeWidth="8" opacity="0.45" />
              <path d="M0 350 C112 336 230 330 348 344 C479 360 595 357 706 339 C726 336 742 335 760 336" fill="none" stroke="#b38258" strokeWidth="9" opacity="0.52" />
              <path d="M0 421 C128 406 236 400 352 418 C460 434 571 434 675 416 C708 410 734 408 760 410" fill="none" stroke="#9a6d48" strokeWidth="11" opacity="0.55" />

              <g transform="translate(112 82)">
                <path d="M74 0 L130 130 H18 Z" fill="#15384b" opacity="0.98" />
                <path d="M74 0 L74 146" stroke="#e6f3f9" strokeWidth="6" opacity="0.9" />
                <path d="M38 72 H112" stroke="#e6f3f9" strokeWidth="5" opacity="0.82" />
                <path d="M50 104 H98" stroke="#e6f3f9" strokeWidth="5" opacity="0.82" />
                <path d="M26 129 H122" stroke="#0d2c3e" strokeWidth="7" opacity="0.85" />
                <rect x="60" y="140" width="29" height="36" rx="6" fill="#0f7b8a" />
              </g>

              <g opacity="0.92">
                <path d="M204 210 C214 240 225 276 230 320 C239 386 263 437 300 492" fill="none" stroke="url(#landingDepth)" strokeWidth="11" strokeLinecap="round" />
                <path d="M230 210 C245 245 258 282 269 335 C280 387 311 440 365 495" fill="none" stroke="#f29b3f" strokeWidth="9" strokeLinecap="round" />
                <path d="M255 210 C273 246 289 286 308 342 C326 394 366 439 432 489" fill="none" stroke="#2b87b5" strokeWidth="9" strokeLinecap="round" />
              </g>

              <g opacity="0.95">
                <circle cx="204" cy="210" r="8" fill="#0a5366" />
                <circle cx="230" cy="210" r="8" fill="#ad5c1f" />
                <circle cx="255" cy="210" r="8" fill="#255f85" />
              </g>

              <g transform="translate(520 102)">
                <rect x="0" y="0" width="150" height="282" rx="18" fill="#0f2532" opacity="0.9" />
                <rect x="20" y="24" width="110" height="36" rx="10" fill="#12374a" opacity="0.95" />
                <rect x="20" y="80" width="110" height="42" rx="12" fill="#0d6072" opacity="0.95" />
                <rect x="20" y="140" width="110" height="56" rx="12" fill="#2d6e8f" opacity="0.95" />
                <rect x="20" y="214" width="110" height="42" rx="12" fill="#5d84a0" opacity="0.95" />
                <text x="28" y="48" fill="#d7edf6" fontSize="18" fontWeight="700">Surface</text>
                <text x="28" y="106" fill="#dff4fb" fontSize="20" fontWeight="700">Upper Zone</text>
                <text x="28" y="174" fill="#e8f5fb" fontSize="20" fontWeight="700">Target</text>
                <text x="28" y="240" fill="#f5fbff" fontSize="18" fontWeight="700">Deep Section</text>
              </g>
            </svg>
          </div>
          <div className="landing-visual-caption">
            <p className="landing-visual-caption-title">Single-Well Visualization Today</p>
            <p className="landing-visual-caption-text">Professional directional survey review with room to grow into multi-well DSU analysis.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
