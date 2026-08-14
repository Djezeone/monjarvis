/**
 * P6 brick 4 — offline fallback, served by the service worker when the
 * device has no network at all (distinct from "Core offline", which the
 * cockpit banner handles while the façade is reachable).
 */
export const metadata = { title: "JARVIS X2 — hors ligne" };

export default function OfflinePage() {
  return (
    <section className="panel" style={{ maxWidth: 480, margin: "10vh auto" }}>
      <h1>Hors ligne</h1>
      <p className="muted">
        Cet appareil n&apos;a pas de réseau : la façade JARVIS n&apos;est pas
        joignable. Vos instructions en attente restent enregistrées sur cet
        appareil et seront rejouées au retour de la connexion.
      </p>
      <p>
        <a href="/app">Réessayer</a>
      </p>
    </section>
  );
}
