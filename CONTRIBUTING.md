# Contributing to GigRadar

Thank you for your interest in improving GigRadar! We welcome contributions from freelancers, developers, and open-source enthusiasts.

## Local Development Workflow

### 1. Prerequisites
- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Google Chrome, Brave, or Microsoft Edge

### 2. Getting Started
```bash
# Clone the repository
git clone https://github.com/comerade2134/GigRadar.git
cd GigRadar

# Install dependencies
pnpm install

# Start Vite in development mode (with HMR)
pnpm dev
```

### 3. Loading in Chrome for Testing
1. Open `chrome://extensions`
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `dist/` directory inside this repository.
4. Navigate to `https://www.upwork.com/nx/search/jobs/` to test badge injections and the intel drawer.

---

## Architectural Guidelines

### Zero Background DOM Requests
GigRadar operates exclusively by reading the DOM of pages you currently have open in your active browser tabs. **Never introduce background DOM fetching or automated scraping loops.**

### Style Isolation via Shadow DOM
All UI injected into Upwork pages lives inside closed Shadow DOM roots (`src/content/badge.ts` and `src/content/modal.ts`). This guarantees that Upwork's CSS cannot distort GigRadar components, and GigRadar styles never leak into Upwork.

### Selector Fallback Chains
Upwork frequently updates its React DOM tree and class names. All CSS selectors are centralized in `src/config/selectors.ts`. When a selector breaks:
1. Open Chrome DevTools and inspect the new markup.
2. Add the new selector as the first item in the fallback array.
3. Keep previous selectors intact for backwards compatibility across different Upwork A/B test cohorts.

---

## Code Quality Standards

Before submitting a Pull Request:
```bash
# 1. Verify strict TypeScript types
pnpm typecheck

# 2. Test production build
pnpm build
```

---

## License
By contributing to GigRadar, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
