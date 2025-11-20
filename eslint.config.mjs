import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Allow img tags for dynamic/external content (AI-generated images, user uploads, social previews)
      '@next/next/no-img-element': 'off',
      
      // Keep strict TypeScript rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      
      // React hooks - enforce but allow flexibility for complex cases
      'react-hooks/exhaustive-deps': 'warn',
      
      // Enforce proper entity escaping
      'react/no-unescaped-entities': 'error',
      
      // Enforce type-safe API wrapper for v1 endpoints
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="fetch"][arguments.0.value=/\\/api\\/v1\\//]',
          message: 'Use type-safe apiV1() wrapper from lib/types/api-v1-contracts.ts instead of raw fetch() for v1 API calls. This prevents HTTP method mismatches.'
        },
        {
          selector: 'CallExpression[callee.name="fetch"][arguments.0.type="TemplateLiteral"][arguments.0.quasis.0.value.raw=/\\/api\\/v1\\//]',
          message: 'Use type-safe apiV1() wrapper from lib/types/api-v1-contracts.ts instead of raw fetch() for v1 API calls. This prevents HTTP method mismatches.'
        }
      ],
    }
  }
];

export default eslintConfig;
