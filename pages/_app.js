import 'styles/admin-global.css'

/* The public site is static HTML in /public; Next.js pages here are only the admin. */
export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}
