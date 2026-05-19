const { withSettingsGradle, withProjectBuildGradle } = require("@expo/config-plugins");

const MERCADO_PAGO_MAVEN_URL = "https://artifacts.mercadolibre.com/repository/android-releases";

function ensureRepoInSettingsGradle(contents) {
  const repoGroovy = `maven { url '${MERCADO_PAGO_MAVEN_URL}' }`;
  const repoKts = `maven { url = uri("${MERCADO_PAGO_MAVEN_URL}") }`;

  if (contents.includes(MERCADO_PAGO_MAVEN_URL)) return contents;

  // Expo usually generates Groovy settings.gradle, but this also supports KTS.
  const looksLikeKts = contents.includes("uri(") || contents.includes("pluginManagement {") && contents.includes("val ");
  const repoLine = looksLikeKts ? repoKts : repoGroovy;

  const blocks = ["pluginManagement", "dependencyResolutionManagement"];
  let next = contents;

  for (const blockName of blocks) {
    const blockIndex = next.indexOf(`${blockName} {`);
    if (blockIndex === -1) continue;

    const reposIndex = next.indexOf("repositories {", blockIndex);
    if (reposIndex === -1) continue;

    const insertAt = reposIndex + "repositories {".length;
    next = `${next.slice(0, insertAt)}\n        ${repoLine}${next.slice(insertAt)}`;
  }

  return next;
}

function ensureRepoInProjectBuildGradle(contents) {
  const repoGroovy = `maven { url '${MERCADO_PAGO_MAVEN_URL}' }`;
  if (contents.includes(MERCADO_PAGO_MAVEN_URL)) return contents;

  // Try legacy `allprojects { repositories { ... } }` first.
  const allprojectsIndex = contents.indexOf("allprojects {");
  if (allprojectsIndex !== -1) {
    const reposIndex = contents.indexOf("repositories {", allprojectsIndex);
    if (reposIndex !== -1) {
      const insertAt = reposIndex + "repositories {".length;
      return `${contents.slice(0, insertAt)}\n        ${repoGroovy}${contents.slice(insertAt)}`;
    }
  }

  // Otherwise inject into first repositories block found.
  const reposIndex = contents.indexOf("repositories {");
  if (reposIndex !== -1) {
    const insertAt = reposIndex + "repositories {".length;
    return `${contents.slice(0, insertAt)}\n        ${repoGroovy}${contents.slice(insertAt)}`;
  }

  return contents;
}

module.exports = function withMercadoPagoMavenRepo(config) {
  config = withSettingsGradle(config, (cfg) => {
    cfg.modResults.contents = ensureRepoInSettingsGradle(cfg.modResults.contents);
    return cfg;
  });

  config = withProjectBuildGradle(config, (cfg) => {
    cfg.modResults.contents = ensureRepoInProjectBuildGradle(cfg.modResults.contents);
    return cfg;
  });

  return config;
};

