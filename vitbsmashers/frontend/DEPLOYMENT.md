# Scholars Stack - Deployment Guide

## 🚀 Vercel Deployment (Recommended)

### Prerequisites
- GitHub repository: https://github.com/Vraj26shah/vitbsmashers.git
- All changes pushed to main branch ✅

### Method 1: Vercel Dashboard (Easiest)
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your repository: `Vraj26shah/vitbsmashers`
5. **Important Settings:**
   - **Project Name**: `scholarstack`
   - **Framework Preset**: Other
   - **Root Directory**: `frontend`
   - **Build Command**: Leave empty
   - **Output Directory**: Leave empty
6. Click "Deploy"

### Method 2: Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend directory
cd frontend

# Deploy
vercel

# Follow prompts:
# - Project name: scholarstack
# - Directory: ./
# - Override: No
```

### Method 3: GitHub Actions (Automatic)
1. Go to your GitHub repository
2. Settings → Actions → General
3. Enable GitHub Actions
4. Create `.github/workflows/deploy.yml` with Vercel integration

## 🌐 Alternative Deployment Options

### Netlify
1. Go to [netlify.com](https://netlify.com)
2. Drag & drop the `frontend` folder
3. Site name: `scholarstack`
4. Deploy

### GitHub Pages
1. Repository Settings → Pages
2. Source: Deploy from a branch
3. Branch: main, folder: /frontend
4. Save

## 🔧 Current Configuration

**Project Name**: `scholarstack`
**Build Directory**: `frontend`
**Entry Point**: `frontend/index.html`

## 📁 File Structure
```
frontend/
├── index.html (Main entry point)
├── vercel.json (Vercel config)
├── features/
│   ├── attendance/ (Logo clickable ✅)
│   ├── gpa-calculator/ (Logo clickable ✅)
│   ├── mess-menu/ (Logo clickable ✅)
│   ├── ttmaker/ (Logo clickable ✅)
│   └── ... (other features)
└── ... (other files)
```

## ✅ Recent Updates
- **Logo clickable** on all feature pages
- **Get Started button** redirects to attendance calculator with sidebar active
- **Social media** updated (Instagram, Twitter, WhatsApp only)
- **Vercel config** optimized for scholarstack deployment

## 🚨 Troubleshooting

### Vercel Conflicts
- Clear Vercel cache
- Delete old project
- Create new project with name `scholarstack`
- Set root directory to `frontend`

### Build Issues
- Ensure all paths are relative
- Check for missing dependencies
- Verify file permissions

## 📞 Support
- GitHub Issues: [Repository Issues](https://github.com/Vraj26shah/vitbsmashers/issues)
- Vercel Support: [Vercel Help](https://vercel.com/help)

---
**Last Updated**: $(Get-Date)
**Status**: Ready for deployment ✅
