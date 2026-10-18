# Contributing to DDT Custom Discord Client

Thank you for your interest in contributing to DDT! This guide will help you get started.

---

## 🤝 Ways to Contribute

### **1. Bug Reports**
Found a bug? Help us fix it:
- Check [existing issues](https://github.com/asrarkhann116-ops/DDT-Custom-Client/issues) first
- Use the bug report template
- Include reproduction steps
- Provide console logs/screenshots

### **2. Feature Requests**
Have an idea? Share it:
- Use the feature request template
- Explain the use case
- Describe expected behavior

### **3. Code Contributions**
Want to code? Follow our workflow:
- Fork the repository
- Create a feature branch
- Make your changes
- Submit a pull request

### **4. Documentation**
Help others understand DDT:
- Fix typos or unclear sections
- Add examples or guides
- Translate documentation

---

## 🔧 Development Setup

### **Prerequisites**
- Node.js 18+
- pnpm
- Git
- Discord Desktop App
- Code editor (VS Code recommended)

### **Initial Setup**
```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/DDT-Custom-Client.git
cd DDT-Custom-Client

# 2. Install dependencies
pnpm install

# 3. Build
pnpm run build

# 4. Run in development mode
pnpm run dev
```

### **Development Workflow**
1. **Make changes** in `src/` directory
2. **Auto-rebuild** happens via `pnpm run dev`
3. **Test in Discord** by restarting Discord after build
4. **Verify** in DevTools console

---

## 📁 Project Structure

```
DDT-Custom-Client/
├── src/
│   ├── plugins/              # Base Vencord plugins (100+) - Foundation
│   │   └── ...               # Original Vencord built-in features
│   │
│   ├── userplugins/          # ⭐ DDT Custom Plugins (Main work area)
│   │   ├── apiInspector/
│   │   ├── eventLogger/
│   │   ├── networkInspector/
│   │   ├── tokenManager/
│   │   ├── developerTheme/
│   │   ├── devToolsPanel/
│   │   └── more plugins over 290+..
│   ├── utils/
│   │   └── Logger.ts         # DDT branding ([DDT] prefix)
│   ├── api/
│   │   └── PluginManager.ts  # Plugin loader
│   └── ...                   # Other Vencord core files
├── dist/                      # Build output
├── scripts/                   # Build scripts
└── packages/                  # Type definitions
└── more files..
```

**Key Folders:**
- **`plugins/`** - Original Vencord plugins (don't modify)
- **`userplugins/`** - DDT custom plugins (YOUR work goes here)

---

## 🎨 Coding Standards

### **General Guidelines**
- **Language:** TypeScript for all code
- **Style:** Follow existing code style
- **Comments:** Document complex logic
- **Naming:** Use descriptive variable names

### **Plugin Development**
When creating a new plugin in `src/userplugins/`:

```typescript
/*
 * DDT Custom Discord Client
 * Copyright (c) 2025 Asrar Khan (DDT Development Team)
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

export default definePlugin({
    name: "YourPluginName",
    description: "What your plugin does",
    authors: [{
        name: "Your Name",
        id: 0n
    }],
    
    start() {
        // Plugin initialization
        console.log("[DDT] YourPlugin started");
    },
    
    stop() {
        // Cleanup
        console.log("[DDT] YourPlugin stopped");
    }
});
```

### **DDT Branding Requirements**
- Use `[DDT]` prefix for all console logs
- Plugin names should reflect DDT theme
- Settings should use DDT naming

---

## 🧪 Testing

### **Manual Testing**
1. Build your changes: `pnpm run build`
2. Inject: `pnpm run inject`
3. Restart Discord
4. Test your feature
5. Check DevTools console for errors

### **Console Verification**
```javascript
// Check your plugin loaded
window.YOUR_PLUGIN_NAME

// Verify DDT tools
window.APIInspector
window.EventLogger
```

### **Before Submitting PR**
- [ ] Build completes without errors
- [ ] Plugin loads without console errors
- [ ] Feature works as expected
- [ ] No conflicts with existing plugins
- [ ] Code follows style guidelines

---

## 📝 Pull Request Process

### **1. Create Feature Branch**
```bash
git checkout -b feature/your-feature-name
```

Branch naming:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring

### **2. Make Your Changes**
- Write clean, documented code
- Follow existing patterns
- Test thoroughly

### **3. Commit Changes**
```bash
git add .
git commit -m "feat: add X feature"
```

Commit message format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code restructuring
- `test:` - Testing
- `chore:` - Maintenance

### **4. Push and Create PR**
```bash
git push origin feature/your-feature-name
```

Then:
- Go to GitHub
- Create Pull Request
- Fill out PR template
- Link related issues
- Request review

### **5. Code Review**
- Address reviewer feedback
- Make requested changes
- Update PR accordingly

---

## 🔍 Code Review Criteria

Reviewers will check:
- ✅ Code quality and style
- ✅ Functionality works as intended
- ✅ No breaking changes
- ✅ Documentation updated
- ✅ Tests pass (if applicable)
- ✅ DDT branding maintained

---

## 🐛 Bug Fix Guidelines

### **Finding Bugs**
Check these first:
1. Console errors (DevTools)
2. Plugin loading issues
3. Conflicts with Discord updates
4. Memory leaks

### **Fixing Process**
1. **Reproduce** the bug
2. **Identify** root cause
3. **Fix** with minimal changes
4. **Test** fix thoroughly
5. **Document** what was fixed

### **Bug Fix PR Template**
```
## Bug Description
Brief description of the bug

## Root Cause
What caused the bug

## Solution
How you fixed it

## Testing
How you verified the fix

## Related Issue
Closes #ISSUE_NUMBER
```

---

## 📚 Documentation Guidelines

### **README Updates**
- Keep installation steps current
- Update feature list for new plugins
- Add screenshots for visual changes

### **Code Comments**
```typescript
/**
 * Brief description of function
 * @param paramName - What this parameter does
 * @returns What the function returns
 */
function yourFunction(paramName: string): ReturnType {
    // Implementation
}
```

### **Plugin Documentation**
Each plugin should have:
- Clear description
- Usage instructions
- Settings explanation
- Known limitations

---

## 🎯 Feature Request Guidelines

### **Before Requesting**
1. Check existing issues/PRs
2. Consider scope (does it fit DDT?)
3. Think about implementation

### **Feature Request Template**
```markdown
## Feature Description
Clear description of the feature

## Use Case
Why is this needed?

## Proposed Implementation
How could this work?

## Alternatives Considered
Other ways to solve this

## Additional Context
Screenshots, examples, etc.
```

---

## 🔐 Security Guidelines

### **Handling Sensitive Data**
- Never commit tokens, passwords, or API keys
- Use environment variables for secrets
- Encrypt stored credentials
- Follow Discord's security best practices

### **Reporting Security Issues**
**DO NOT** open public issues for security vulnerabilities.

Instead:
- Email: asrarkhann116@gmail.com
- Subject: "[SECURITY] Brief description"
- Include detailed reproduction steps
- Allow time for fix before disclosure

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the GPL-3.0-or-later license.

### **Original Work Credit**
DDT is built upon Vencord (GPL-3.0). When contributing:
- Maintain license headers
- Credit original Vencord authors where applicable
- Follow GPL-3.0 requirements

---

## 💬 Communication

### **GitHub Discussions**
Use for:
- General questions
- Feature discussions
- Community help

### **GitHub Issues**
Use for:
- Bug reports
- Specific feature requests
- Technical problems

### **Email**
Use for:
- Security issues
- Private concerns
- Collaboration inquiries

---

## 🙏 Recognition

Contributors will be:
- Listed in project credits
- Mentioned in release notes
- Recognized in README (for major contributions)

---

## ❓ Need Help?

- Read & Check [README.md](./README.md)
- Browse [GitHub Discussions](https://github.com/asrarkhann116-ops/DDT-Custom-Client/discussions)
- Ask in [Issues](https://github.com/asrarkhann116-ops/DDT-Custom-Client/issues)

---

<div align="center">

**Thank you for contributing to DDT! 🔥**

Made with ❤️ by the DDT Community

</div>