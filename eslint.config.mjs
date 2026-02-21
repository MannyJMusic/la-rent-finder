import coreWebVitals from "eslint-config-next/core-web-vitals";
import reactHooksPlugin from "eslint-plugin-react-hooks";

const eslintConfig = [
  ...coreWebVitals,
  {
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      // Downgrade new react-hooks v7 rules to warnings for existing code
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
];

export default eslintConfig;
