// Flat config per the Expo SDK 57 ESLint guide
// (https://docs.expo.dev/guides/using-eslint/). Extends eslint-config-expo
// and integrates Prettier so formatting drift is reported as lint errors.
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ["dist/*", ".expo/*", "expo-env.d.ts"],
  },
  {
    // Brownfield adoption: this project was previously unlinted. Pre-existing
    // patterns are surfaced as warnings (not hard failures) so `npm run lint`
    // flags new regressions rather than the entire legacy baseline. Run
    // `npm run format` to auto-apply Prettier. React Native uses require() for
    // static assets, so that rule stays off. Promoting these to errors (and a
    // hooks refactor for set-state-in-effect) is a tracked follow-up.
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "react-hooks/set-state-in-effect": "warn",
      "react/no-unescaped-entities": "warn",
      "prettier/prettier": "warn",
      "import/no-anonymous-default-export": "warn",
    },
  },
]);
