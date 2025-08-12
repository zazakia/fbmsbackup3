# GEMINI.md: AI-Powered Project Context

## Project Overview

This project is a comprehensive **Filipino Business Management System (FBMS)**, a web-based ERP solution tailored for small businesses in the Philippines. It is built with a modern tech stack and designed to be a complete solution for managing sales, inventory, customers, finances, and more.

The application features a unique **Enhanced Version System**, allowing users to toggle between standard and advanced versions of key modules, providing flexibility for businesses with varying needs.

**Key Technologies:**

*   **Frontend:** React 18.3, TypeScript, Vite
*   **Styling:** Tailwind CSS with a custom theme, including Philippine-specific colors
*   **State Management:** Zustand
*   **Backend:** Supabase (Authentication, Database, Storage)
*   **Testing:** Vitest, React Testing Library
*   **Routing:** React Router

**Architecture:**

The application follows a modular architecture, with features divided into distinct modules that are lazily loaded to optimize performance. It uses a centralized state management system with Zustand and interacts with the Supabase backend for data persistence and authentication. The application is designed to be responsive and works well on mobile devices.

## Building and Running

### Prerequisites

*   Node.js 18+
*   pnpm (recommended) or npm

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/zazakia/filipino-business-management-system.git
    cd filipino-business-management-system
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root directory and add your Supabase project URL and anon key:
    ```
    VITE_SUPABASE_URL=your-supabase-url
    VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
    ```

4.  **Start the development server:**
    ```bash
    pnpm dev
    ```
    The application will be available at `http://localhost:5180`.

### Available Scripts

*   `pnpm dev`: Start the development server.
*   `pnpm build`: Build the application for production.
*   `pnpm preview`: Preview the production build locally.
*   `pnpm test`: Run tests in the console.
*   `pnpm test:ui`: Run tests with the Vitest UI.
*   `pnpm test:coverage`: Generate a test coverage report.
*   `pnpm lint`: Run ESLint to check for code quality issues.

## Development Conventions

*   **Code Style:** The project uses ESLint to enforce a consistent code style. Run `pnpm lint` to check for any issues.
*   **Testing:** The project uses Vitest for unit and integration testing. All new features should be accompanied by tests. Test files are located in the `src/__tests__` directory.
*   **State Management:** Zustand is used for global state management. Create new stores in the `src/store` directory as needed.
*   **Component-Based Architecture:** The UI is built with React components, located in the `src/components` directory.
*   **Styling:** Tailwind CSS is used for styling. Custom styles and theme extensions are defined in `tailwind.config.js`.
*   **Modularity:** Features are organized into modules, with each module containing its own components, services, and types.
*   **Lazy Loading:** To improve performance, modules and components are lazily loaded using `React.lazy()` and `Suspense`.
*   **Permissions:** The application has a role-based access control system. Use the `PermissionGuard` component to restrict access to certain modules or features based on user roles.
*   **Error Handling:** The application has a robust error handling and reporting system. Use the `ErrorBoundary` component to catch and handle errors gracefully.
