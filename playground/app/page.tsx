import Link from "next/link";

const providers = [
  {
    href: "/whatsapp",
    name: "WhatsApp Business",
    description:
      "Embedded Signup flow via Facebook SDK. Returns authorization code exchanged server-side for an access token.",
    badge: "Embedded Signup",
    color: "#25D366",
    bg: "#1a2e1a",
    border: "#2d5a2d",
  },
  {
    href: "/facebook",
    name: "Facebook Login",
    description:
      "OAuth 2.0 code flow via FB.login() with config_id. Popup redirects to server route for token exchange.",
    badge: "OAuth 2.0",
    color: "#1877F2",
    bg: "#1a1e2e",
    border: "#2d3a5a",
  },
];

export default function IndexPage() {
  return (
    <div className="page">
      <h1>SDK Playground</h1>
      <p className="subtitle">
        Test the ByPilot Business Signup SDK integrations below.
      </p>

      <div className="index-grid">
        {providers.map(({ href, name, description, badge, color, bg, border }) => (
          <Link key={href} href={href} className="index-card" style={{ background: bg, borderColor: border }}>
            <div className="index-card-header">
              <span className="index-card-name" style={{ color }}>{name}</span>
              <span className="index-card-badge" style={{ color, borderColor: border, background: "transparent" }}>
                {badge}
              </span>
            </div>
            <p className="index-card-desc">{description}</p>
            <span className="index-card-action" style={{ color }}>
              Open playground →
            </span>
          </Link>
        ))}
      </div>

      <div className="card info" style={{ marginTop: "2rem" }}>
        <h2>Environment Variables</h2>
        <table>
          <tbody>
            {[
              ["NEXT_PUBLIC_META_APP_ID", "Meta App ID (required)"],
              ["META_APP_SECRET", "Meta App Secret — server only (required)"],
              ["NEXT_PUBLIC_WA_CONFIG_ID", "WhatsApp Embedded Signup config_id"],
              ["NEXT_PUBLIC_META_CONFIG_ID", "Facebook Login config_id"],
              ["NEXT_PUBLIC_FB_SCOPE", "Facebook permission scopes"],
            ].map(([key, desc]) => (
              <tr key={key}>
                <td><code>{key}</code></td>
                <td style={{ color: "#888" }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
