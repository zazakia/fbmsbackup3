# Structure Steering Guidelines

## Directory Organization
```
src/
├── components/     # React components by feature
├── store/         # Zustand state stores
├── utils/         # Utility functions
├── types/         # TypeScript definitions
├── api/           # API service functions
└── __tests__/     # Test files
```

## Key File Locations
- `src/App.tsx`: Main application component
- `src/main.tsx`: Entry point
- `src/utils/lazyComponents.ts`: Code splitting definitions
- `src/utils/supabase.ts`: Database configuration
- `src/utils/permissions.ts`: Access control system

## Component Organization
- Domain-based folders (auth/, pos/, inventory/)
- Each module has standard and enhanced versions
- Tests colocated in __tests__ directories
- Shared components in components/common/

## Naming Conventions
- Components: PascalCase.tsx
- Utilities: camelCase.ts
- Tests: *.test.ts(x)
- Stores: *Store.ts
- Types: *.types.ts

## Module Architecture
- 17 business modules with consistent structure
- Each module contains:
  - Components/
  - Types/
  - Utils/
  - Tests/
  - Store.ts