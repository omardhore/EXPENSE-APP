import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  // The mobile app self-lints (mobile/eslint.config.js); build artifacts and
  // plain Node build scripts are not part of the web app's lint surface.
  {
    ignores: ["mobile/**", ".next/**", "public/**", "gen-icons.js"],
  },
  ...nextVitals,
  ...nextTs,
];

export default eslintConfig;
