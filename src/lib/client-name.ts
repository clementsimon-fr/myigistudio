export function makeDisplayName(firstName: string, lastName: string): string {
  const fn = (firstName || "").trim();
  const ln = (lastName || "").trim();
  if (!fn && !ln) return "";
  if (!ln) return fn;
  return `${fn}.${ln.charAt(0).toUpperCase()}`;
}

// Compte de test sans email réel : identifiant PRENOMNOM (ex: MARCDUPONT),
// converti en email synthétique pour satisfaire Supabase Auth (qui exige un
// email). Réservé au mode test — pas d'email réel derrière, donc pas de
// récupération de mot de passe possible pour ces comptes.
export function makeTestIdentifier(firstName: string, lastName: string): string {
  return `${(firstName || "").trim()}${(lastName || "").trim()}`
    .toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export function makeSyntheticEmail(firstName: string, lastName: string): string {
  const slug = makeTestIdentifier(firstName, lastName).toLowerCase();
  return `${slug || "invite"}@test.myigistudio.local`;
}

// Reconstruit l'email synthétique à partir de l'identifiant PRENOMNOM saisi au login.
export function identifierToSyntheticEmail(identifier: string): string {
  const slug = (identifier || "").trim()
    .toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .toLowerCase();
  return `${slug || "invite"}@test.myigistudio.local`;
}
