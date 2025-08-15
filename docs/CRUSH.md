# CRUSH Development Guidelines

This file provides development guidelines for the Filipino Business Management System (FBMS) repository.

## Commands

- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Test**: `npm run test`
- **Run a single test file**: `npm run test <filename>`
- **Start development server**: `npm run dev`

## Code Style

- **Formatting**: Adhere to the existing code style. Use `npm run lint` to check for and fix issues.
- **Imports**: Organize imports with external libraries first, followed by internal modules.
- **Types**: Use TypeScript with strict mode. Avoid `any` where possible.
- **Naming**: 
  - Components: `PascalCase`
  - Functions/Variables: `camelCase`
  - Props: `camelCase`
- **Error Handling**: Use `try...catch` blocks for asynchronous operations and error boundaries for React components.
- **State Management**: Utilize Zustand for global state management.
- **Styling**: Use Tailwind CSS for all styling.

## Project Structure

- **Components**: `src/components/` (organized by feature)
- **State**: `src/store/` (Zustand stores)
- **Utilities**: `src/utils/`
- **Types**: `src/types/`
- **API**: `src/api/`
