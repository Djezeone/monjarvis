/**
 * Explicit organ availability (NFR-004): every backend organ can be down
 * without preventing /app from loading, and its absence is stated — never
 * faked (MASTER_BUILD_PROMPT "Do not fake").
 *
 * Each organ flips to "connected" only when its real adapter is wired in.
 */

interface Organ {
  name: string;
  role: string;
  connected: boolean;
}

const ORGANS: Organ[] = [
  { name: "Hermes Core", role: "Orchestration des runs, stop, approbations", connected: false },
  { name: "Ollama / LocalAI", role: "Inférence locale", connected: false },
  { name: "Graphiti + Neo4j", role: "Mémoire temporelle", connected: false },
  { name: "whisper.cpp", role: "STT local", connected: false },
  { name: "Piper", role: "TTS local", connected: false },
  { name: "n8n", role: "Workflows allowlistés", connected: false },
  { name: "Home Assistant", role: "Monde physique (lecture seule)", connected: false },
  { name: "Browser worker", role: "Browser use sandboxé (désactivé)", connected: false },
];

export function OrganStatus() {
  return (
    <section className="panel">
      <h2>Organes</h2>
      <table>
        <thead>
          <tr>
            <th>Organe</th>
            <th>Rôle</th>
            <th>État</th>
          </tr>
        </thead>
        <tbody>
          {ORGANS.map((o) => (
            <tr key={o.name}>
              <td>{o.name}</td>
              <td className="muted">{o.role}</td>
              <td>
                <span className={`badge ${o.connected ? "ok" : "off"}`}>
                  {o.connected ? "connecté" : "non connecté"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">
        Aucun organe n&apos;est simulé : chaque ligne passera à
        «&nbsp;connecté&nbsp;» quand l&apos;adapter réel sera branché
        (ordre d&apos;exécution : docs/build/MASTER_BUILD_PROMPT.md).
      </p>
    </section>
  );
}
