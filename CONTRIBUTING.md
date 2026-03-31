# Contributing to Project Truth

Thank you for considering contributing to Project Truth! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-os.git
   cd ai-os
   ```
3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/rasitaltunc/ai-os.git
   ```
4. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
5. **Install dependencies**
   ```bash
   pnpm install
   ```
6. **Make your changes** and test thoroughly
7. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
8. **Open a pull request** against the main repository

## Code Style

### TypeScript

- Use strict TypeScript (`strict: true` in tsconfig.json)
- Add explicit type annotations for function parameters and returns
- Avoid `any` type — use `unknown` when type is genuinely unknown
- Organize imports: React/Next.js, third-party, relative imports

### ESLint & Prettier

We use ESLint and Prettier for code formatting:

```bash
# Check linting
pnpm run lint

# Auto-fix formatting
pnpm run format
```

All commits must pass linting checks.

### React Components

- Use functional components with hooks
- Export components with clear names
- Add JSDoc comments for public components
- Keep components focused and testable
- Use Zustand for state management

Example:
```typescript
/**
 * NetworkVisualization - Main 3D visualization canvas
 * @param data - Network nodes and links
 * @param onNodeSelect - Callback when user selects a node
 */
export function NetworkVisualization({ data, onNodeSelect }: Props) {
  // implementation
}
```

## Commit Conventions

Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **Add** — New feature or component
- **Fix** — Bug fix
- **Docs** — Documentation changes
- **Refactor** — Code refactoring without feature changes
- **Test** — Test additions or fixes
- **Perf** — Performance improvements
- **Chore** — Build, dependencies, tooling

### Examples

```
Add: 3D node highlight animation for search results
Fix: Prevent memory leak in WebGL renderer cleanup
Docs: Update API route documentation
Refactor: Simplify evidence staking calculation
Test: Add unit tests for badge tier logic
```

## Pull Request Process

1. **Update your branch** with latest upstream main
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Write clear PR description** using the template
   - Link related issues
   - Describe changes clearly
   - List testing steps

3. **Ensure tests pass**
   ```bash
   pnpm run test
   pnpm run lint
   ```

4. **Request review** from maintainers

5. **Address feedback** — Maintainers may request changes

6. **Merge** — Maintainer will merge once approved

## Reporting Issues

### Bug Reports

Use the [bug report template](/.github/ISSUE_TEMPLATE/bug_report.md):
- Clear title describing the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (OS, browser, Node version)

### Feature Requests

Use the [feature request template](/.github/ISSUE_TEMPLATE/feature_request.md):
- Clear title and description
- Use cases and motivation
- Proposed implementation (if applicable)
- Related issues or discussions

## Community Guidelines

### Be Respectful

- Treat all contributors with respect
- Assume good intent in discussions
- Provide constructive feedback
- Avoid discrimination or harassment

### Ask Questions

- If unsure about implementation, ask before investing time
- Use GitHub discussions for broader questions
- Check existing issues first

### Review Others' Work

- Provide constructive feedback
- Acknowledge good work
- Suggest improvements kindly
- Help debug together

## Internationalization (i18n)

Project Truth supports multiple languages:

When adding user-facing strings:

1. **Add to English translations** — `public/locales/en.json`
   ```json
   {
     "chat.placeholder": "Ask about the network...",
     "chat.send": "Send"
   }
   ```

2. **Add to Turkish translations** — `public/locales/tr.json`
   ```json
   {
     "chat.placeholder": "Ağ hakkında soru sor...",
     "chat.send": "Gönder"
   }
   ```

3. **Use in components**
   ```typescript
   import { useTranslation } from 'next-i18next';
   
   export function ChatInput() {
     const { t } = useTranslation();
     return <input placeholder={t('chat.placeholder')} />;
   }
   ```

## Testing

- Write tests for new features and bug fixes
- Run existing tests before submitting PR
- Keep test coverage above 80%

```bash
pnpm run test
pnpm run test:coverage
```

## Database Changes

If modifying Supabase schema:

1. **Create migration file** — `docs/SPRINT_X_MIGRATION.sql`
2. **Document changes** in PR description
3. **Test migrations** locally
4. **Update schema docs** if needed

## Performance Considerations

- Monitor bundle size (target: < 200KB gzipped)
- Profile 3D rendering performance
- Use React.memo for expensive components
- Implement proper cleanup in useEffect hooks

## Legal

By contributing, you agree that:
- Your contributions are licensed under AGPL-3.0
- You have rights to the code you contribute
- You acknowledge the maintainers may modify your contributions

## Questions?

- Open a GitHub discussion
- Email: rasitaltunc@gmail.com
- Join our community forum

Thank you for making Project Truth better! 🦁

---

**Last Updated**: March 7, 2026
