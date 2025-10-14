# 🎨 VS Code Developer Setup Guide

## 🚀 Quick Start

### 1. Open Project in VS Code
```bash
code .
```

### 2. Install Recommended Extensions
VS Code will prompt you to install recommended extensions. Click **"Install All"** or install individually:

- ✨ **Prettier** - Code formatter (auto-format on save)
- 🔍 **ESLint** - Code linting and error detection
- 🎨 **Tailwind CSS IntelliSense** - Tailwind class autocomplete
- 📘 **TypeScript** - Enhanced TypeScript support
- 🏷️ **Auto Rename Tag** - Auto-rename paired HTML/JSX tags
- 📁 **Path Intellisense** - Autocomplete file paths
- 🌈 **Color Highlight** - Highlight colors in code
- ❌ **Error Lens** - Inline error messages

### 3. Start Development
```bash
npm install
npm run dev
```

---

## ⚙️ Workspace Settings

The project includes pre-configured VS Code settings (`.vscode/settings.json`):

### ✅ Auto-formatting
- **Format on save** enabled
- **Prettier** as default formatter
- **Auto-fix ESLint** issues on save
- **Auto-organize imports** on save

### 🎯 TypeScript
- Uses workspace TypeScript version
- IntelliSense for Tailwind classes
- Path aliases support (`@/` for `client/src/`)

### 📂 File Exclusions
- `node_modules/` hidden from explorer
- `dist/` hidden from search
- `.git/` hidden from search

---

## 🛠️ Useful Commands

### Terminal Commands (Ctrl+`)
```bash
# Development
npm run dev          # Start dev server with HMR
npm run build        # Build for production
npm start            # Run production build

# Database
npm run db:push      # Push schema changes

# Type Checking
npm run check        # TypeScript type check
```

### VS Code Commands (Ctrl+Shift+P)
- `Format Document` - Format current file
- `Organize Imports` - Clean up imports
- `Reload Window` - Restart VS Code
- `Developer: Reload Window` - Full reload

---

## 🔥 Keyboard Shortcuts

### Essential Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl + P` | Quick file open |
| `Ctrl + Shift + P` | Command palette |
| `Ctrl + B` | Toggle sidebar |
| `Ctrl + ~` | Toggle terminal |
| `Ctrl + /` | Toggle comment |
| `Alt + Shift + F` | Format document |
| `F2` | Rename symbol |
| `Ctrl + .` | Quick fix |

### Multi-cursor
| Shortcut | Action |
|----------|--------|
| `Alt + Click` | Add cursor |
| `Ctrl + Alt + Up/Down` | Add cursor above/below |
| `Ctrl + D` | Select next occurrence |
| `Ctrl + Shift + L` | Select all occurrences |

---

## 📁 Project Structure

```
clirdec-presence/
├── 📂 client/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utilities
│   │   └── hooks/         # Custom hooks
│   └── public/            # Static assets
│
├── 📂 server/
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database layer
│   └── services/          # Business logic
│
├── 📂 shared/
│   └── schema.ts          # Shared types & DB schema
│
├── 📂 .vscode/
│   ├── settings.json      # Workspace settings
│   └── extensions.json    # Recommended extensions
│
└── 📄 Configuration Files
    ├── railway.json       # Railway deployment
    ├── .env.example       # Environment template
    ├── package.json       # Dependencies
    └── tsconfig.json      # TypeScript config
```

---

## 🎨 Tailwind IntelliSense

### Class Autocompletion
The project is configured for Tailwind autocompletion in:
- JSX/TSX files
- String literals
- Template literals
- `cn()` utility function
- `cva()` class variance authority

### How to Use
1. Start typing a Tailwind class
2. IntelliSense shows suggestions
3. Preview colors inline
4. Hover for documentation

Example:
```tsx
<div className="bg-|  ← Autocomplete here
```

---

## 🐛 Debugging

### Debug Configuration
Create `.vscode/launch.json` for debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Breakpoints
- Click gutter to add breakpoint
- Press `F5` to start debugging
- Use Debug Console for evaluation

---

## 🔧 Troubleshooting

### Extensions Not Working?
1. Reload VS Code: `Ctrl+Shift+P` → "Reload Window"
2. Check extension is enabled
3. Restart VS Code

### Tailwind Autocomplete Not Working?
1. Ensure Tailwind extension is installed
2. Check `.vscode/settings.json` exists
3. Reload window

### TypeScript Errors?
1. Use workspace TypeScript: `Ctrl+Shift+P` → "Select TypeScript Version" → "Use Workspace Version"
2. Restart TS server: `Ctrl+Shift+P` → "Restart TS Server"

### Format on Save Not Working?
1. Check Prettier is installed
2. Verify `editor.formatOnSave: true` in settings
3. Check file is not in `.prettierignore`

---

## 📚 Additional Resources

- **VS Code Docs**: https://code.visualstudio.com/docs
- **TypeScript Handbook**: https://www.typescriptlang.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React Docs**: https://react.dev

---

## 💡 Pro Tips

1. **Use Emmett** - Type `div.container>ul>li*3` and press Tab
2. **Multi-cursor editing** - Select text, press `Ctrl+D` repeatedly
3. **Quick fixes** - Hover over error, press `Ctrl+.`
4. **Go to definition** - Press `F12` on any symbol
5. **Peek definition** - Press `Alt+F12` for inline view
6. **Zen Mode** - Press `Ctrl+K Z` for distraction-free coding

---

🎉 **Happy Coding!** Your VS Code is now optimized for CLIRDEC Presence development!
