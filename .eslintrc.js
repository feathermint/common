module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:node/recommended",
    "prettier",
  ],
  env: {
    node: true,
    mocha: true,
    es2022: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json"],
  },
  plugins: ["@typescript-eslint", "node"],
  rules: {
    "prefer-arrow-callback": ["error", { allowNamedFunctions: true }],
    "node/no-unsupported-features/es-syntax": [
      "error",
      { version: ">=18.0.0", ignores: ["modules"] },
    ],
    "node/no-missing-import": [
      "error",
      {
        tryExtensions: [".js", ".json", ".ts"],
      },
    ],
    "node/no-unpublished-import": [
      "error",
      {
        allowModules: ["chai", "chai-as-promised", "ethers"],
      },
    ],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "warn",
  },
};
