const { withMainApplication } = require("@expo/config-plugins");

function ensureKotlinInit(source, { publicKey, countryCode }) {
  if (!publicKey) return source;
  if (source.includes("MercadoPagoSDK.initialize")) return source;

  const importLine = "import com.mercadopago.sdk.android.initializer.MercadoPagoSDK";
  if (!source.includes(importLine)) {
    // Add import after package declaration (first non-empty line typically).
    const pkgMatch = source.match(/^package .+\r?\n/);
    if (pkgMatch) {
      const idx = pkgMatch[0].length;
      source = source.slice(0, idx) + `\n${importLine}\n` + source.slice(idx);
    } else {
      source = `${importLine}\n${source}`;
    }
  }

  // Inject right after `super.onCreate()`
  const superOnCreate = /super\.onCreate\(\)\s*\r?\n/;
  if (!superOnCreate.test(source)) return source;

  const snippet =
    `    MercadoPagoSDK.initialize(\n` +
    `      context = this,\n` +
    `      publicKey = "${publicKey}",\n` +
    `      countryCode = "${countryCode || "BR"}"\n` +
    `    )\n`;

  source = source.replace(superOnCreate, (m) => `${m}${snippet}\n`);
  return source;
}

module.exports = function withMercadoPagoSdkInit(config, props = {}) {
  const publicKey =
    props.publicKey ||
    config?.extra?.mercadoPagoPublicKey ||
    config?.expo?.extra?.mercadoPagoPublicKey ||
    "";

  const countryCode =
    props.countryCode ||
    config?.extra?.mercadoPagoCountryCode ||
    config?.expo?.extra?.mercadoPagoCountryCode ||
    "BR";

  return withMainApplication(config, (cfg) => {
    const src = cfg.modResults.contents;
    cfg.modResults.contents = ensureKotlinInit(src, { publicKey, countryCode });
    return cfg;
  });
};

