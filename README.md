# Scholars Stack - VIT Bhopal Student Portal

A comprehensive student portal for VIT Bhopal students, providing academic resources, calculators, and campus information.

## 🚀 Features

- **Attendance Calculator** - Track and predict your attendance percentage
- **CGPA Calculator** - Calculate and monitor your GPA
- **Campus Map** - Interactive map of VIT Bhopal campus
- **Timetable Maker** - Create custom study schedules
- **Mess Menus** - View official mess and canteen menus
- **Faculty Information** - Access faculty details (Coming Soon)
- **Events & Clubs** - Stay updated with campus events (Coming Soon)
- **Handwritten Notes** - Curated notes from top students (Coming Soon)

## 📁 Project Structure

```
frontend/
├── index.html              # Main landing page
├── style.css               # Main stylesheet
├── features/
│   ├── attendance/         # Attendance calculator
│   ├── gpa-calculator/     # CGPA calculator
│   ├── maps/              # Campus map
│   ├── ttmaker/           # Timetable maker
│   ├── mess-menu/         # Mess menus
│   ├── images/            # Images and assets
│   └── ...                # Other features
├── vercel.json            # Vercel deployment config
└── package.json           # Project dependencies
```

## 🛠️ Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd vitbsmashers
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:4000
   ```

## 🚀 Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Follow the prompts** and your site will be deployed to `https://your-project.vercel.app`

### Option 2: Netlify

1. Go to [netlify.com](https://netlify.com)
2. Drag and drop the `frontend` folder
3. Your site will be deployed automatically

### Option 3: GitHub Pages

1. Push your code to GitHub
2. Go to repository Settings > Pages
3. Select source branch and deploy

### Option 4: Firebase Hosting

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Initialize Firebase**
   ```bash
   firebase init hosting
   ```

3. **Deploy**
   ```bash
   firebase deploy
   ```

## 🔧 Configuration

### Vercel Configuration
The `vercel.json` file is configured for optimal deployment:
- Static file serving
- Proper routing for SPA
- Output directory set to `frontend`

### File Paths
All internal links have been updated to use relative paths for proper deployment:
- ✅ `features/attendance/attendance.html`
- ✅ `features/gpa-calculator/cgpa.html`
- ✅ `features/images/logo.png`

## 🐛 Troubleshooting

### Common Issues

1. **Broken Links**
   - Ensure all file paths are relative (not starting with `../frontend/`)
   - Check that all referenced files exist

2. **Images Not Loading**
   - Verify image paths are correct
   - Ensure images are in the `frontend/features/images/` directory

3. **Deployment Fails**
   - Run `./deploy-vercel.sh` to check for issues
   - Ensure all required files exist
   - Check for any remaining `../frontend/` references

### Testing Locally

1. **Test all features**
   ```bash
   npm run dev
   ```
   Then navigate to each feature page to ensure they work

2. **Check for broken links**
   ```bash
   grep -r "href=" frontend/ --include="*.html"
   ```

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support or questions:
- Email: vitbsmashers@gmail.com
- Phone: +91 7984182948

---

**Built with ❤️ for VIT Bhopal students**
