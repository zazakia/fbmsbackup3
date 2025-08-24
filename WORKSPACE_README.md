# 🏪 Tindahan FBMS - Development Workspace

## VS Code Workspace Setup

This project includes a complete VS Code workspace configuration optimized for Filipino Business Management System development.

## Quick Start

### 1. Open Workspace in VS Code

```bash
# Option 1: Open workspace file directly
code tindahan.code-workspace

# Option 2: Open folder and load workspace
code .
# Then: File > Open Workspace from File > Select tindahan.code-workspace
```

### 2. Install Recommended Extensions

When you open the workspace, VS Code will prompt you to install recommended extensions. Click "Install All" to get:

#### Essential Extensions
- 🔍 **ESLint** - Code quality and error checking
- 💅 **Prettier** - Code formatting
- 🎨 **Tailwind CSS IntelliSense** - Tailwind autocomplete
- 📘 **TypeScript** - Enhanced TypeScript support

#### Productivity Boosters
- 🚀 **GitLens** - Advanced Git features
- 📝 **Todo Tree** - Track TODOs across project
- ⚡ **Error Lens** - Inline error display
- 🔤 **Code Spell Checker** - Catch typos

### 3. Workspace Features

#### 🎨 Custom Theme Colors
The workspace applies Tindahan brand colors to VS Code:
- Teal activity bar and title bar
- Amber accent colors for badges
- Matches the app's Tindahan theme

#### 📁 Organized Folder Structure
The workspace organizes your project into logical sections:
- 🏪 **Tindahan FBMS** - Root project
- 📦 **Source Code** - All source files
- 🧪 **Tests** - Test files
- 📚 **Documentation** - Docs and guides
- ⚙️ **Configuration** - Config files

#### ⌨️ Code Snippets
Type these prefixes and press Tab:

| Prefix | Creates |
|--------|---------|
| `trc` | React Component with TypeScript |
| `tsh` | Zustand Store Hook |
| `tapi` | Supabase API Function |
| `tpr` | Protected Route |
| `ttoast` | Toast Notification |
| `teh` | Error Handler |
| `ttable` | Table Component |
| `tfield` | Form Field |
| `tmodal` | Modal Component |

#### 🐛 Debugging Configuration
Press F5 to start debugging with:
- Chrome/Edge/Firefox launch configs
- Test debugging with Vitest
- Full stack debugging support

#### 📋 Task Runner
Access common tasks via Terminal > Run Task:
- `npm: dev` - Start development server
- `npm: build` - Build for production
- `npm: test` - Run tests
- `npm: lint` - Check code quality
- `git: sync` - Pull and push changes

## Development Workflow

### Starting Development
1. Open terminal: `` Ctrl+` ``
2. Start dev server: `npm run dev`
3. Open browser: http://localhost:3000

### Code Quality
- **Auto-format on save**: Enabled by default
- **Auto-organize imports**: Removes unused imports
- **ESLint auto-fix**: Fixes issues on save

### Git Integration
- **Auto-fetch**: Keeps you updated with remote
- **GitLens**: See blame annotations inline
- **Git Graph**: Visualize branch history

## Filipino Business Terms Dictionary

The workspace includes a custom dictionary for Filipino business terms:
- **tindahan** - store
- **tindero/tindera** - shopkeeper
- **puhunan** - capital
- **benta** - sales
- **kita** - profit
- **gastos** - expenses
- **resibo** - receipt
- And many more...

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save & Format |
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+P` | Quick File Open |
| `Ctrl+Shift+F` | Search in Files |
| `F5` | Start Debugging |
| `Ctrl+Shift+D` | Debug Panel |
| `Ctrl+Shift+G` | Git Panel |
| `` Ctrl+` `` | Terminal |
| `Ctrl+B` | Toggle Sidebar |

## Environment Setup

### Required Software
- Node.js 18+ 
- npm 9+
- Git
- VS Code

### Environment Variables
Create `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Database Setup
1. Create Supabase project
2. Run migrations from `supabase/migrations`
3. Update `.env` with credentials

## Troubleshooting

### Extensions Not Loading
1. Open Command Palette: `Ctrl+Shift+P`
2. Type: "Developer: Reload Window"
3. Reinstall extensions if needed

### IntelliSense Not Working
1. Restart TypeScript server: `Ctrl+Shift+P` > "TypeScript: Restart TS Server"
2. Check `tsconfig.json` is valid
3. Ensure node_modules are installed

### Git Issues
1. Check Git is installed: `git --version`
2. Configure Git user:
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your@email.com"
   ```

## Support

For issues or questions:
1. Check existing issues on GitHub
2. Create new issue with details
3. Include error messages and screenshots

---

Happy coding! 🚀 Build something amazing for Filipino businesses! 🏪
