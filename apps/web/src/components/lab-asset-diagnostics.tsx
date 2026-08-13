import { ASSET_REGISTRY, type AssetId } from "@/lib/assets";
import { isAssetBinaryAvailable } from "@/lib/asset-availability";
import { getScreenMapping } from "@/lib/screen-mapping";

/**
 * Lab diagnostics (FR-014): for a given route, verify each mapped asset ID
 * against the canonical registry and the actual presence of its binary.
 * Reports reality — a missing binary is shown as missing, never papered over.
 */
export function LabAssetDiagnostics({ route }: { route: string }) {
  const mapping = getScreenMapping(route);
  if (!mapping) {
    return (
      <section className="panel">
        <p>
          Aucun mapping d&apos;assets déclaré pour <code>{route}</code> dans{" "}
          <code>assets/manifests/screen-asset-mapping.json</code>.
        </p>
      </section>
    );
  }

  const rows = mapping.primary_assets.map((id) => {
    const entry = ASSET_REGISTRY[id as AssetId];
    const inRegistry = Boolean(entry);
    const binary = inRegistry && isAssetBinaryAvailable(id as AssetId);
    return { id, entry, inRegistry, binary };
  });

  const missing = rows.filter((r) => !r.binary).length;

  return (
    <section className="panel">
      <h2>Diagnostic assets — {route}</h2>
      <p className="muted">
        Objectif de l&apos;écran : {mapping.purpose}.{" "}
        {missing > 0
          ? `${missing}/${rows.length} binaires absents de public/assets — importer le pack d'assets pour lever ce statut.`
          : "Tous les binaires sont présents."}
      </p>
      <table>
        <thead>
          <tr>
            <th>ID canonique</th>
            <th>Registre</th>
            <th>Grade</th>
            <th>Binaire</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <code>{r.id}</code>
              </td>
              <td>
                <span className={`badge ${r.inRegistry ? "ok" : "missing"}`}>
                  {r.inRegistry ? "référencé" : "inconnu"}
                </span>
              </td>
              <td>{r.entry ? `${r.entry.grade} (${r.entry.status})` : "—"}</td>
              <td>
                <span className={`badge ${r.binary ? "ok" : "missing"}`}>
                  {r.binary ? "présent" : "manquant"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
