# CI/CD Setup and Reliability Guardrails

This document outlines the automated checks and guardrails implemented to ensure code quality and prevent reliability regressions in the Cornven POS System frontend.

## 🛡️ Automated Guardrails

### GitHub Actions CI Pipeline

The CI pipeline (`.github/workflows/ci.yml`) runs on every push and pull request with the following checks:

#### **Build & Type Safety**
- TypeScript compilation check (`tsc --noEmit`)
- ESLint code quality check
- Production build verification
- Bundle size monitoring
- Multi-Node.js version testing (18.x, 20.x)

#### **Security Checks**
- npm security audit
- Secret detection (API keys, tokens)
- Dependency vulnerability scanning

#### **Code Quality**
- Console.log detection in production code
- TODO/FIXME comment tracking
- Package.json validation
- Development dependency audit

### Pre-commit Hooks

Local git hooks (`.githooks/pre-commit`) prevent problematic code from being committed:

- ✅ TypeScript type checking
- ✅ ESLint validation
- ✅ Secret detection
- ✅ Build verification
- ⚠️ Console.log warnings

## 🚀 Quick Setup

### For New Developers

```bash
# Clone the repository
git clone <repository-url>
cd frontend

# Run the setup script
npm run setup

# Start development
npm run dev
```

### Manual Setup

```bash
# Install dependencies
npm install

# Setup git hooks
cp .githooks/* .git/hooks/
chmod +x .git/hooks/*  # On Unix systems

# Verify setup
npm run ci-check
```

## 📋 Available Scripts

| Script | Purpose |
|--------|----------|
| `npm run setup` | Complete development environment setup |
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run type-check` | TypeScript type checking only |
| `npm run lint` | ESLint code quality check |
| `npm run ci-check` | Run all CI checks locally |

## 🔍 Quality Checks Explained

### TypeScript Type Safety
- Ensures all types are correct
- Prevents runtime type errors
- Catches missing imports/exports

### ESLint Rules
- Code style consistency
- Best practice enforcement
- Potential bug detection

### Build Verification
- Ensures production build succeeds
- Validates all dependencies resolve
- Checks for build-time errors

### Security Scanning
- Detects hardcoded secrets
- Identifies vulnerable dependencies
- Prevents credential leaks

## 🚨 Common Issues & Solutions

### Build Failures

**Issue**: TypeScript compilation errors
```bash
# Fix type errors
npm run type-check
# Review and fix reported issues
```

**Issue**: ESLint violations
```bash
# Auto-fix simple issues
npm run lint -- --fix
# Manually fix remaining issues
```

### Pre-commit Hook Failures

**Issue**: Hook prevents commit
```bash
# Run checks manually
npm run ci-check
# Fix issues and try committing again
```

**Issue**: Hook not running
```bash
# Reinstall hooks
npm run setup
# Or manually copy hooks
cp .githooks/pre-commit .git/hooks/
```

### Security Issues

**Issue**: Secret detected
- Remove hardcoded secrets
- Use environment variables
- Add secrets to `.env.local` (gitignored)

**Issue**: Vulnerable dependencies
```bash
# Update dependencies
npm audit fix
# Or update specific packages
npm update <package-name>
```

## 🔧 Customizing Checks

### Modifying CI Pipeline

Edit `.github/workflows/ci.yml` to:
- Add new checks
- Modify Node.js versions
- Adjust security thresholds
- Add deployment steps

### Updating Pre-commit Hooks

Edit `.githooks/pre-commit` to:
- Add custom validations
- Modify check severity
- Include additional file types

### ESLint Configuration

Modify `.eslintrc.json` or `next.config.js` to:
- Add custom rules
- Adjust rule severity
- Include/exclude file patterns

## 📊 Monitoring & Metrics

### Build Performance
- Monitor build times in CI
- Track bundle size changes
- Identify performance regressions

### Code Quality Trends
- ESLint violation counts
- TypeScript error frequency
- TODO/FIXME comment tracking

### Security Posture
- Dependency vulnerability counts
- Secret detection incidents
- Audit failure frequency

## 🎯 Best Practices

### Development Workflow
1. Run `npm run ci-check` before committing
2. Fix all TypeScript errors immediately
3. Address ESLint warnings promptly
4. Keep dependencies updated
5. Remove console.log statements before production

### Code Quality
- Write type-safe TypeScript
- Follow ESLint recommendations
- Use proper error handling
- Implement comprehensive logging
- Document complex logic

### Security
- Never commit secrets or API keys
- Use environment variables for configuration
- Regularly update dependencies
- Review security audit reports
- Implement proper authentication

## 🆘 Getting Help

If you encounter issues with the CI setup:

1. Check the GitHub Actions logs for detailed error messages
2. Run `npm run ci-check` locally to reproduce issues
3. Review this documentation for common solutions
4. Check the project's main README for additional context

## 🔄 Maintenance

### Regular Tasks
- Update Node.js versions in CI matrix
- Review and update ESLint rules
- Update security audit thresholds
- Monitor build performance metrics

### Quarterly Reviews
- Assess effectiveness of current checks
- Add new quality gates as needed
- Update documentation
- Train team on new processes