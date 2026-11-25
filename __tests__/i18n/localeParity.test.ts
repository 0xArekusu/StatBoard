import fr from "../../src/i18n/locales/fr.json";
import en from "../../src/i18n/locales/en.json";
import es from "../../src/i18n/locales/es.json";
import de from "../../src/i18n/locales/de.json";

type AnyObject = { [key: string]: unknown };

/** Aplatit un objet de traduction en clés pointées : `a.b.c`. */
function flatten(obj: AnyObject, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return flatten(value as AnyObject, path);
    }
    return [path];
  });
}

const locales = { fr, en, es, de } as Record<string, AnyObject>;

/**
 * Sections qui doivent être strictement identiques dans les quatre langues.
 *
 * L'ensemble du fichier ne l'est pas : certaines langues portent des clés
 * propres (pluriels slaves de `matchConstants`, par exemple). Ce test ne couvre
 * donc que les sections récentes, ajoutées d'un bloc, où une clé oubliée
 * s'afficherait telle quelle dans l'app.
 */
const STRICT_SECTIONS = ["authErrors", "filterModal"];

describe("parité des sections critiques de traduction", () => {
  it.each(STRICT_SECTIONS)("%s existe dans les quatre langues", (section) => {
    for (const [lang, dictionary] of Object.entries(locales)) {
      expect({ lang, hasSection: section in dictionary }).toEqual({
        lang,
        hasSection: true,
      });
    }
  });

  it.each(STRICT_SECTIONS)("%s a exactement les mêmes clés partout", (section) => {
    const keysByLocale = Object.entries(locales).map(([lang, dictionary]) => {
      const block = (dictionary[section] ?? {}) as AnyObject;
      return { lang, keys: flatten(block).sort() };
    });

    const reference = keysByLocale[0].keys;
    for (const { lang, keys } of keysByLocale) {
      expect({ lang, keys }).toEqual({ lang, keys: reference });
    }
  });

  it.each(STRICT_SECTIONS)("%s n'a aucune traduction vide", (section) => {
    const empties: string[] = [];
    for (const [lang, dictionary] of Object.entries(locales)) {
      const block = (dictionary[section] ?? {}) as AnyObject;
      for (const [key, value] of Object.entries(block)) {
        if (typeof value !== "string" || value.trim() === "") {
          empties.push(`${lang}.${section}.${key}`);
        }
      }
    }
    expect(empties).toEqual([]);
  });
});
