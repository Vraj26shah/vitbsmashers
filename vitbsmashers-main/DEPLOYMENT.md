# 🚀 Deployment Guide - Scholars Stack

This guide will help you deploy your Scholars Stack website to various platforms.

## ✅ Pre-Deployment Checklist

Your website has been prepared for deployment with the following fixes:

- ✅ Fixed all file paths (removed `../frontend/` references)
- ✅ Corrected attendance file name (`attedance.html` → `attendance.html`)
- ✅ Updated all internal links to use relative paths
- ✅ Configured Vercel deployment settings
- ✅ Created proper package.json scripts
- ✅ Verified all required files exist

## 🎯 Quick Deploy Options

### Option 1: Vercel (Recommended - Easiest)

1. **Install Vercel CLI** (if not already installed)
   ```bash
   npm install -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel
   ```

3. **Follow the prompts:**
   - Set up and deploy: `Y`
   - Which scope: Select your account
   - Link to existing project: `N`
   - Project name: `scholars-stack` (or your preferred name)
   - Directory: `./` (current directory)
   - Override settings: `N`

4. **Your site will be deployed to:** `https://your-project-name.vercel.app`

### Option 2: Netlify (Drag & Drop)

1. Go to [netlify.com](https://netlify.com)
2. Sign up/Login
3. Drag and drop the `frontend` folder to the deployment area
4. Your site will be live in seconds!

### Option 3: GitHub Pages

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Settings → Pages
   - Source: Deploy from a branch
   - Branch: main
   - Folder: `/frontend`
   - Save

3. **Your site will be available at:** `https://yourusername.github.io/your-repo-name`

## 🔧 Advanced Deployment

### Vercel Production Deployment

```bash
vercel --prod
```

### Custom Domain Setup

1. **Vercel:**
   - Go to your project dashboard
   - Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Netlify:**
   - Site settings → Domain management
   - Add custom domain
   - Configure DNS records

### Environment Variables (if needed)

Create a `.env` file in the root directory:
```env
# Add any environment variables here
NODE_ENV=production
```

## 🧪 Testing Your Deployment

### Before Deploying

1. **Test locally:**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`

2. **Check all features:**
   - ✅ Homepage loads
   - ✅ Navigation works
   - ✅ All feature pages accessible
   - ✅ Images load properly
   - ✅ Forms work correctly

### After Deploying

1. **Test all pages:**
   - Homepage: `/`
   - Attendance Calculator: `/features/attendance/attendance.html`
   - CGPA Calculator: `/features/gpa-calculator/cgpa.html`
   - Campus Map: `/features/maps/maps.html`
   - Timetable Maker: `/features/ttmaker/ttmaker1.html`
   - Mess Menus: `/features/mess-menu/mess.html`

2. **Check for issues:**
   - Broken links
   - Missing images
   - JavaScript errors
   - Mobile responsiveness

## 🐛 Troubleshooting

### Common Issues

**1. 404 Errors**
- Check file paths are correct
- Ensure all files are in the right directories
- Verify case sensitivity (Linux servers are case-sensitive)

**2. Images Not Loading**
- Check image paths in HTML files
- Ensure images are in `frontend/features/images/`
- Verify file extensions are correct

**3. CSS Not Loading**
- Check CSS file paths
- Ensure `style.css` is in the correct location
- Verify CDN links are accessible

**4. JavaScript Errors**
- Check browser console for errors
- Verify all script tags are properly closed
- Test on different browsers

### Debug Commands

```bash
# Check for broken links
grep -r "href=" frontend/ --include="*.html"

# Check for missing files
find frontend/ -name "*.html" -exec grep -l "href=" {} \;

# Test local server
npm run dev
```

## 📱 Performance Optimization

### Before Deployment

1. **Optimize images:**
   - Compress large images
   - Use appropriate formats (WebP, JPEG, PNG)
   - Consider lazy loading for images

2. **Minimize CSS/JS:**
   - Remove unused CSS
   - Minify JavaScript
   - Use CDN for external libraries

3. **Enable compression:**
   - Gzip compression
   - Brotli compression (if supported)

## 🔒 Security Considerations

1. **HTTPS:**
   - All modern hosting platforms provide HTTPS by default
   - Ensure your site uses HTTPS in production

2. **Content Security Policy:**
   - Consider adding CSP headers
   - Restrict external resource loading if needed

3. **Regular updates:**
   - Keep dependencies updated
   - Monitor for security vulnerabilities

## 📊 Analytics & Monitoring

### Google Analytics

Add to your HTML files:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Vercel Analytics

If using Vercel, enable analytics in your project dashboard.

## 🎉 Success!

Once deployed, your Scholars Stack website will be live and accessible to VIT Bhopal students worldwide!

### Next Steps

1. **Share your website:**
   - Share the URL with students
   - Add to social media
   - Include in student groups

2. **Monitor performance:**
   - Check analytics
   - Monitor user feedback
   - Track feature usage

3. **Regular maintenance:**
   - Update content regularly
   - Fix any reported issues
   - Add new features as needed

---

**Need help?** Contact: vitbsmashers@gmail.com

