import Link from "next/link";
import AppRouteNav from "@/components/AppRouteNav";

export default function WorkspaceSelectionPage() {
  return (
    <main className="workspace-page">
      <section className="workspace-shell">
        <AppRouteNav currentPath="/workspace" />

        <header className="workspace-header">
          <p className="workspace-eyebrow">Viewer Selection</p>
          <h1 className="workspace-title">Choose Your Workspace</h1>
          <p className="workspace-description">
            Select the workflow that matches the task in front of you. The single-well viewer is fully active, and the
            DSU route now supports a simple multi-well setup flow with surface coordinates and a shared 3D view.
          </p>
          <p className="helper-note">Use the DSU route when you need multiple surveys in one 3D scene. Use the single-well route when you want the 2D lateral view as well.</p>
        </header>

        <div className="workspace-grid">
          <article className="workspace-card">
            <div className="workspace-card-visual workspace-card-visual-single" aria-hidden="true">
              <svg viewBox="0 0 420 260" className="workspace-card-svg">
                <rect x="0" y="0" width="420" height="110" rx="20" fill="#e7f2f7" />
                <rect x="0" y="98" width="420" height="162" rx="0" fill="#e3d2b2" />
                <path d="M0 104 C92 95 172 94 252 104 C314 112 366 111 420 102" fill="#d2e5ee" />
                <path d="M0 154 C87 144 170 140 251 149 C329 158 382 156 420 150" fill="none" stroke="#c29261" strokeWidth="7" opacity="0.58" />
                <path d="M92 99 C107 129 118 161 127 194 C133 214 145 230 164 246" fill="none" stroke="#0d7282" strokeWidth="9" strokeLinecap="round" />
                <path d="M120 99 C137 129 150 164 165 202 C173 222 190 237 216 247" fill="none" stroke="#f09a3a" strokeWidth="8" strokeLinecap="round" />
                <circle cx="92" cy="99" r="7" fill="#0d6273" />
                <circle cx="120" cy="99" r="7" fill="#b06328" />
                <g transform="translate(294 42)">
                  <rect x="0" y="0" width="88" height="132" rx="16" fill="#153246" opacity="0.92" />
                  <rect x="14" y="18" width="60" height="24" rx="8" fill="#0d5d6f" />
                  <rect x="14" y="52" width="60" height="34" rx="10" fill="#2f7297" />
                  <rect x="14" y="96" width="60" height="20" rx="8" fill="#6488a3" />
                </g>
              </svg>
            </div>
            <div className="workspace-card-body">
              <p className="workspace-card-kicker">Current Workflow</p>
              <h2>Single Wellbore</h2>
              <p>
                Upload one directional survey, validate the mapping, and inspect the trajectory in both the 3D and
                lateral viewers.
              </p>
              <Link href="/single-well" className="workspace-card-link">
                <span>Open Viewer</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </article>

          <article className="workspace-card">
            <div className="workspace-card-visual workspace-card-visual-dsu" aria-hidden="true">
              <svg viewBox="0 0 420 260" className="workspace-card-svg">
                <rect x="0" y="0" width="420" height="110" rx="20" fill="#e9f4f8" />
                <rect x="0" y="102" width="420" height="158" rx="0" fill="#dcc39d" />
                <path d="M0 108 C96 96 170 95 252 104 C336 113 387 112 420 104" fill="#d8e8ee" />
                <path d="M0 154 C94 145 183 141 277 150 C345 157 392 156 420 151" fill="none" stroke="#bc8b5d" strokeWidth="7" opacity="0.56" />
                <path d="M78 103 C94 128 106 157 116 188 C124 213 142 231 170 247" fill="none" stroke="#0f7284" strokeWidth="8" strokeLinecap="round" />
                <path d="M131 103 C149 129 161 160 176 195 C187 220 210 235 245 248" fill="none" stroke="#f29b3f" strokeWidth="8" strokeLinecap="round" />
                <path d="M188 103 C206 130 220 165 238 205 C252 228 281 241 318 247" fill="none" stroke="#2f85b0" strokeWidth="8" strokeLinecap="round" />
                <circle cx="78" cy="103" r="7" fill="#0c6274" />
                <circle cx="131" cy="103" r="7" fill="#b76728" />
                <circle cx="188" cy="103" r="7" fill="#266c93" />
                <rect x="282" y="28" width="94" height="62" rx="16" fill="#133142" opacity="0.92" />
                <path d="M298 58 H362" stroke="#d7eef7" strokeWidth="4" strokeLinecap="round" />
                <path d="M298 74 H348" stroke="#b1d4e3" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
            <div className="workspace-card-body">
              <p className="workspace-card-kicker">Multi-Well Workflow</p>
              <h2>Multiple Wells in DSU</h2>
              <p>
                Place multiple wells in one 3D subsurface view using surface coordinates, separate survey uploads, and
                lightweight spacing guidance.
              </p>
              <Link href="/dsu-view" className="workspace-card-link workspace-card-link-secondary">
                <span>Open DSU View</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
