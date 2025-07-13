# Tabiya Inclusive Livelihoods Taxonomy Explorer

## 🚀 Quick Start

This repository contains the web-based explorer for the Tabiya Inclusive Livelihoods Taxonomy - an inclusive reference map of occupations and skills that recognizes capabilities from both formal and informal work.

**Live Demo:** [https://tabiya-tech.github.io/taxonomy-explorer](https://tabiya-tech.github.io/taxonomy-explorer)

## 📁 Repository Structure

```
taxonomy-explorer/
├── index.html                 # Main taxonomy explorer application
├── data/                      # Taxonomy data files
│   ├── occupations.csv
│   ├── occupation_groups.csv
│   ├── occupation_hierarchy.csv
│   ├── skills.csv
│   ├── skill_groups.csv
│   └── skill_hierarchy.csv
├── assets/                    # Static assets
│   ├── css/
│   │   └── styles.css        # Additional styles (if needed)
│   ├── js/
│   │   └── taxonomy-data.js  # Processed taxonomy data
│   └── images/
│       └── favicon.ico
├── docs/                     # Documentation
│   ├── methodology.md
│   ├── api-reference.md
│   └── embedding-guide.md
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions deployment
├── README.md                 # This file
├── LICENSE                   # CC BY 4.0 License
└── CHANGELOG.md              # Version history
```

## 🌟 Features

- **📊 Comprehensive Taxonomy**: 3,067 occupations and 635 groups
- **🏠 Unseen Economy**: 75 items covering unpaid domestic and care work
- **👔 Seen Economy**: 3,627 traditional ESCO-based occupations
- **🔍 Advanced Search**: Real-time search across all taxonomy fields
- **📱 Responsive Design**: Works on desktop, tablet, and mobile
- **📤 Export Functionality**: Download filtered data as CSV
- **♿ Accessibility**: WCAG 2.1 AA compliant
- **🌐 Embeddable**: Components can be embedded in other applications

## 🛠️ Technology Stack

- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Custom CSS with CSS Grid and Flexbox
- **Data Processing**: Papa Parse for CSV handling
- **Icons**: Font Awesome 6
- **Fonts**: Inter and DM Mono from Google Fonts
- **Deployment**: GitHub Pages with GitHub Actions

## 📈 Data Statistics

| Category | Count |
|----------|-------|
| Total Occupations | 3,067 |
| Total Groups | 635 |
| Unseen Economy Items | 75 |
| Seen Economy Items | 3,627 |
| Total Taxonomy Items | 3,702 |

## 🚀 Deployment Instructions

### Option 1: GitHub Pages (Recommended)

1. **Fork this repository** to your GitHub account
2. **Enable GitHub Pages**:
   - Go to Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` / `docs` (root)
   - Click Save
3. **Access your site** at `https://[username].github.io/taxonomy-explorer`

### Option 2: Manual Deployment

1. **Clone the repository**:
   ```bash
   git clone https://github.com/tabiya-tech/taxonomy-explorer.git
   cd taxonomy-explorer
   ```

2. **Deploy to any static hosting**:
   - Upload all files to your web server
   - Ensure `index.html` is in the root directory
   - No build process required!

### Option 3: Local Development

1. **Clone and serve locally**:
   ```bash
   git clone https://github.com/tabiya-tech/taxonomy-explorer.git
   cd taxonomy-explorer
   python -m http.server 8000  # or use any local server
   ```

2. **Access at**: `http://localhost:8000`

## 🔧 Configuration

### Environment Variables

No environment variables required - the application runs entirely client-side.

### Data Updates

To update the taxonomy data:

1. Replace CSV files in the `data/` directory
2. Run the data processing script (if available) or update `taxonomy-data.js`
3. Commit and push changes
4. GitHub Actions will automatically redeploy

### Customization

#### Colors and Branding

Update CSS variables in `index.html`:

```css
:root {
    --tabiya-green: #00FF91;
    --tabiya-green-2: #26B87D;
    --tabiya-green-3: #4A9B7E;
    --oxford-blue: #1A2B3D;
    /* ... */
}
```

#### Content and Labels

Modify the JavaScript data structures in the `loadTaxonomyData()` function.

## 🔗 API Reference

### URL Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `tab` | Initial tab to display | `?tab=occupations` |
| `filter` | Economy filter | `?filter=unseen` |
| `search` | Initial search query | `?search=childcare` |
| `code` | Direct link to item | `?code=I41_0_1` |

### JavaScript API

```javascript
// Access taxonomy data
const taxonomy = window.taxonomyData;

// Navigate to specific item
selectItem('I41_0_1', 'occupation');

// Perform search
performSearch('childcare');

// Export data
exportData(); // Downloads CSV
```

## 🧩 Embedding Guide

### Basic Embedding

```html
<iframe 
    src="https://tabiya-tech.github.io/taxonomy-explorer" 
    width="100%" 
    height="600px"
    frameborder="0">
</iframe>
```

### Advanced Embedding

```html
<!-- Embed specific view -->
<iframe 
    src="https://tabiya-tech.github.io/taxonomy-explorer?filter=unseen&tab=occupations" 
    width="100%" 
    height="800px"
    frameborder="0">
</iframe>
```

### React Component (Future)

```jsx
import { TaxonomyExplorer } from '@tabiya/taxonomy-explorer';

function MyApp() {
    return (
        <TaxonomyExplorer 
            filter="unseen"
            onItemSelect={(item) => console.log(item)}
        />
    );
}
```

## 📄 License

This project is licensed under the [Creative Commons Attribution 4.0 International License](LICENSE).

You are free to:
- **Share** — copy and redistribute the material
- **Adapt** — remix, transform, and build upon the material
- **Commercial use** — use for any purpose, even commercially

Under the following terms:
- **Attribution** — You must give appropriate credit to Tabiya

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md).

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test locally
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Reporting Issues

Please use the [GitHub Issues](https://github.com/tabiya-tech/taxonomy-explorer/issues) to report bugs or request features.

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/tabiya-tech/taxonomy-explorer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tabiya-tech/taxonomy-explorer/discussions)
- **Website**: [tabiya.org](https://tabiya.org)
- **Email**: info@tabiya.org

## 🏗️ Architecture

### Data Flow

```
CSV Files → JavaScript Processing → In-Memory Objects → UI Rendering
```

### Component Structure

```
App
├── Header (Branding + Navigation)
├── TabNavigation (Occupations | About)
├── ExplorerLayout
│   ├── Sidebar
│   │   ├── SearchBox
│   │   ├── FilterControls
│   │   └── TaxonomyTree
│   └── MainPanel
│       └── DetailView
└── Footer (if added)
```

## 🔮 Roadmap

### Version 1.1 (Next Release)
- [ ] Skills taxonomy integration
- [ ] Advanced filtering options
- [ ] Occupation-skill relationship mapping
- [ ] Improved mobile experience

### Version 1.2 (Future)
- [ ] API endpoints for external integrations
- [ ] Real-time data updates
- [ ] Multi-language support
- [ ] Advanced analytics dashboard

### Version 2.0 (Long-term)
- [ ] React component library
- [ ] Plugin architecture
- [ ] Collaborative editing features
- [ ] AI-powered taxonomy suggestions

## 📊 Analytics & Performance

### Performance Metrics
- **Load Time**: < 2 seconds
- **First Contentful Paint**: < 1 second
- **Largest Contentful Paint**: < 2.5 seconds
- **Cumulative Layout Shift**: < 0.1

### Browser Support
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers

## 🔐 Security

- **No server-side processing**: Eliminates many security vectors
- **CSP headers**: Content Security Policy implemented
- **No user data collection**: Privacy-focused design
- **HTTPS only**: Secure transmission

---

**Built with ❤️ by [Tabiya](https://tabiya.org)**

*Making visible and usable the human capital of everyone in an economy*