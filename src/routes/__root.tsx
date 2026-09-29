import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Bitácora" },
      {
        name: "description",
        content: "Bitácora digital de diseño industrial. Un cuaderno de proceso para abrir, hojear y compartir.",
      },
      { name: "theme-color", content: "#c8bfb2" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Abril+Fatface&family=Bebas+Neue&family=Caveat:wght@500;600&family=Cormorant+Garamond:wght@500;600&family=Courier+Prime&family=DM+Sans:wght@500&family=EB+Garamond:wght@500&family=Fraunces:opsz,wght@9..144,500;9..144,650&family=Gochi+Hand&family=Homemade+Apple&family=IBM+Plex+Mono:wght@400&family=Instrument+Serif&family=JetBrains+Mono:wght@400&family=Kalam:wght@400&family=Karla:wght@500&family=Libre+Baskerville:wght@400&family=Outfit:wght@500&family=Patrick+Hand&family=Permanent+Marker&family=Rock+Salt&family=Sacramento&family=Shadows+Into+Light&family=Source+Serif+4:opsz,wght@8..60,500&family=Space+Mono&family=Unbounded:wght@500&family=Work+Sans:wght@500&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="es" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Toaster theme="light" position="bottom-center" />
        <Scripts />
      </body>
    </html>
  ),
});
