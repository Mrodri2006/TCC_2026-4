const { withAppBuildGradle } = require("@expo/config-plugins");

const DEFAULT_BOM_VERSION = "+";

function looksLikeKts(contents, modResults) {
  const path = modResults?.path || "";
  if (path.endsWith(".kts")) return true;
  // Heuristic: Kotlin DSL uses implementation( ... ) with parentheses.
  return contents.includes("implementation(");
}

function ensureDependencies(contents, modResults, { bomVersion }) {
  const version = (bomVersion && String(bomVersion).trim()) || DEFAULT_BOM_VERSION;

  const bomGroovy = `implementation platform('com.mercadopago.android.sdk:sdk-android-bom:${version}')`;
  const coreGroovy = `implementation 'com.mercadopago.android.sdk:core-methods'`;
  const bomKts = `implementation(platform("com.mercadopago.android.sdk:sdk-android-bom:${version}"))`;
  const coreKts = `implementation("com.mercadopago.android.sdk:core-methods")`;

  const alreadyHasBom = contents.includes("sdk-android-bom");
  const alreadyHasCore = contents.includes("com.mercadopago.android.sdk:core-methods");
  if (alreadyHasBom && alreadyHasCore) return contents;

  const depStart = contents.indexOf("dependencies {");
  if (depStart === -1) return contents;

  const insertAt = depStart + "dependencies {".length;
  const isKts = looksLikeKts(contents, modResults);

  const linesToAdd = [];
  if (!alreadyHasBom) linesToAdd.push(isKts ? bomKts : bomGroovy);
  if (!alreadyHasCore) linesToAdd.push(isKts ? coreKts : coreGroovy);
  if (linesToAdd.length === 0) return contents;

  return `${contents.slice(0, insertAt)}\n    ${linesToAdd.join("\n    ")}${contents.slice(insertAt)}`;
}

module.exports = function withMercadoPagoSdkDependencies(config, props = {}) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = ensureDependencies(cfg.modResults.contents, cfg.modResults, {
      bomVersion: props.bomVersion,
    });
    return cfg;
  });
};

