# Test Dependencies Installation

**Note**: TypeScript shows errors for `vitest.config.ts` because vitest isn't installed yet.

## Install Command

```bash
npm install --save-dev vitest @testing-library/react @testing-library/react-hooks @testing-library/jest-dom @vitejs/plugin-react jsdom
```

After installation, TypeScript errors in `vitest.config.ts` will resolve.

Then run: `npm test tests/journeys/`

---

This is normal - test dependencies are dev-only and not in package.json yet.

