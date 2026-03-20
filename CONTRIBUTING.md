# Contributing to LumbungData

We love your help! LumbungData is a community project aimed at empowering smallholder farmers in Indonesia.

## Prerequisites

- **Node.js**: version 20 or higher.
- **pnpm**: version 9 or higher.
- **Docker**: For running database and blockchain nodes locally.

## Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/vaskoyudha/LumbungData.git
   cd LumbungData
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Start the development server**:
   ```bash
   pnpm dev
   ```

## Workflow

### Branch Naming Conventions
- `feat/description` for new features.
- `fix/description` for bug fixes.
- `docs/description` for documentation.
- `chore/description` for maintenance.

### Commit Message Format
We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: add soil health recording`
- `fix: resolve P2P sync timeout`
- `docs: update README with architecture`
- `ci: configure GitHub Actions`
- `chore: update dependencies`

### Pull Request Process
1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure the test suite passes (`pnpm test`).
4. Format your code (`pnpm format`).
5. Open a Pull Request with a clear description of the changes.

## Code Style

- **TypeScript**: We use strict TypeScript. Avoid using `as any` or `@ts-ignore`.
- **Clean Code**: No `console.log` in production code. Use a proper logger if needed.
- **Documentation**: JSDoc comments are required for all public APIs and components.
- **Performance**: Keep the bundle budget in mind. All routes must be < 200KB gzipped.
- **Offline-First**: Always consider the offline experience when adding new features.

## Need Help?

Join our community or reach out to maintainers@lumbungdata.org.
