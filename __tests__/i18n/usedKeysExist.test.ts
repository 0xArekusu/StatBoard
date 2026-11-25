import fs from "fs";
import path from "path";
import fr from "../../src/i18n/locales/fr.json";

type AnyObject = { [key: string]: unknown };

function flatten(obj: AnyObject, prefix = ""): Set<string> {
  const keys = new Set<string>();
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const nested of flatten(value as AnyObject, fullPath)) keys.add(nested);
    } else {
      keys.add(fullPath);
    }
  }
  return keys;
}

const ROOT = path.resolve(__dirname, "../..");
const SCAN_DIRS = [
  "screens",
  "components",
  "src",
  "hooks",
  "services",
  "repositories",
  "utils",
  "constants",
  "navigation",
];
const SKIP = ["node_modules", "__tests__", "locales", ".git", "dist", "ios", "android"];

function collectFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

/** Toutes les clés réellement présentes dans le catalogue français. */
const CATALOG = flatten(fr as AnyObject);

/**
 * Suffixes ajoutés par i18next pour les pluriels, les ordinaux et les contextes
 * (genre). Une clé du code peut donc exister sous plusieurs variantes.
 */
const SUFFIXES = [
  "_one", "_two", "_few", "_many", "_other", "_zero",
  "_ordinal_one", "_ordinal_two", "_ordinal_few", "_ordinal_many", "_ordinal_other",
  "_masculine", "_feminine", "_male", "_female",
  "_masculine_ordinal_one", "_masculine_ordinal_other",
  "_feminine_ordinal_one", "_feminine_ordinal_other",
];

function resolvesInCatalog(key: string): boolean {
  if (CATALOG.has(key)) return true;
  return SUFFIXES.some((suffix) => CATALOG.has(key + suffix));
}

/** Extrait les clés statiques passées à `t(...)` ou `i18n.t(...)`. */
function extractKeys(source: string): string[] {
  const found: string[] = [];
  // t("a.b.c") / t('a.b.c') — on ignore les clés construites (gabarits).
  const regex = /\bt\(\s*["'`]([^"'`$]+)["'`]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    const key = match[1];
    // Une clé de traduction contient au moins un point et pas d'espace.
    if (key.includes(".") && !key.includes(" ")) found.push(key);
  }
  return found;
}

/**
 * Garde-fou contre les clés réellement absentes.
 *
 * Toutes les langues n'ont pas le même jeu de clés : l'anglais d'ordinaux
 * (`_one`/`_two`/`_few`/`_other`) ne correspond à rien en français, qui utilise
 * `_masculine_ordinal_one` / `_feminine_ordinal_one`. Comparer les catalogues
 * entre eux produit donc des faux positifs (erreur commise en novembre 2026 :
 * quatre « clés manquantes » annoncées, toutes dues aux ordinaux).
 *
 * Le contrôle utile est celui-ci : toute clé appelée par le code doit se
 * résoudre dans le catalogue de référence, variantes comprises.
 */
describe("clés de traduction utilisées dans le code", () => {
  it("toutes les clés appelées existent dans le catalogue français", () => {
    const files = [
      ...SCAN_DIRS.flatMap((dir) => collectFiles(path.join(ROOT, dir))),
      path.join(ROOT, "App.tsx"),
    ].filter((file) => fs.existsSync(file));

    expect(files.length).toBeGreaterThan(50);

    const missing = new Map<string, string>();
    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      for (const key of extractKeys(source)) {
        if (!resolvesInCatalog(key)) {
          missing.set(key, path.relative(ROOT, file));
        }
      }
    }

    // Un objet vide est plus lisible qu'une liste quand tout va bien.
    expect(Object.fromEntries(missing)).toEqual({});
  });
});
