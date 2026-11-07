import { Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MaintenanceBanner from "@/components/MaintenanceBanner";
import NotifPopup from "@/components/NotifPopup";
import { ToastProvider } from "@/components/Toast";
import { SITE, THEME_STORAGE } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

const TITLE = "Arashi Api's - REST API from Developer";

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: TITLE, template: "%s · Arashi Api's" },
  description: SITE.description,
  keywords: ["REST API", "API publik", "API gratis", "downloader API", "QRIS API", "Arashi API", "Kaelyn API", "Kadokun", "developer API Indonesia"],
  authors: [{ name: SITE.creator }],
  alternates: { canonical: "/" },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon2.png", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }]
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: TITLE,
    description: "REST API publik dan premium berkecepatan tinggi dengan respons konsisten untuk developer.",
    url: SITE.url,
    images: [{ url: "/og-image.jpg", width: 1600, height: 899, alt: TITLE }]
  },
  twitter: { 
    card: "summary_large_image", 
    title: TITLE, 
    description: "REST API publik dan premium berkecepatan tinggi dengan respons konsisten untuk developer.", 
    images: ["/og-image.jpg"] 
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark"
};

// Terapkan tema sebelum render pertama supaya tidak berkedip.
const themeScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE)});var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var r=document.documentElement;if(d)r.classList.add('dark');r.style.colorScheme=d?'dark':'light';var m=document.createElement('meta');m.name='theme-color';m.content=d?'#0c0c0d':'#faf8f5';document.head.appendChild(m);}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ToastProvider>
          <Header />
          <MaintenanceBanner />
          <main>{children}</main>
          <Footer />
          <NotifPopup />
        </ToastProvider>
      </body>
    </html>
  );
}
