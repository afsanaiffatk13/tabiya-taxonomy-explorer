# Tabiya Taxonomy Explorer

A comprehensive web application for exploring the Inclusive Livelihoods Taxonomy, which maps both formal (seen) and informal (unseen) economic activities alongside their associated skills and competencies.

## Overview

The Tabiya Taxonomy Explorer provides an interactive interface for browsing occupation classifications and skills data based on ESCO (European Skills, Competences, Qualifications and Occupations) and ICATUS (International Classification of Activities for Time Use Statistics) frameworks. The application makes visible the human capital developed through all forms of work, including traditionally unrecognized activities.

## Features

### Multi-language Support
- English and Spanish language interfaces
- Localized content for specific regions (South African English)
- Dynamic language switching with proper CSV data loading

### Taxonomy Navigation
- **Occupations Explorer**: Browse seen economy (formal work) and unseen economy (informal/care work) classifications
- **Skills Explorer**: Navigate through hierarchical skills framework organized by categories
- Hierarchical tree structure with expandable groups and individual items
- Cross-taxonomy navigation between occupations and skills
- Full-box clickable tree nodes for improved usability

### Search Functionality
- Real-time search across all taxonomy items
- Alternative label matching in search results
- Context indication for alternative label matches
- Optimized search performance with chunked processing

### Interactive Features
- Detailed item panels with breadcrumb navigation
- Complete hierarchy path display for proper context
- Related items and skill-occupation relationship mapping
- Export functionality for filtered data sets
- Responsive design for desktop and mobile devices

### Technical Capabilities
- CSV-based data loading with Papa Parse integration
- Font corruption prevention with comprehensive CSS fixes
- Performance optimizations including virtual scrolling for large datasets
- Web worker support for background data processing
- Progressive loading with chunk-based rendering

## Data Structure

### Occupations
- Hierarchical organization from major groups to individual occupations
- Seen economy classifications based on ESCO framework
- Unseen economy classifications based on ICATUS framework
- Skill-occupation relationship mappings

### Skills
- Four main categories: Skills and competencies, Knowledge, Transversal skills, Language
- Hierarchical structure from skill groups to individual skills
- Cross-referenced with occupation requirements

### Localization
- Base global taxonomy in English and Spanish
- Regional adaptations with local terminology
- Localized additions clearly marked in the interface

## File Structure
tabiya-taxonomy-explorer/
├── index.html                 # Main application file
├── data/
│   ├── base/
│   │   ├── en/               # English CSV files
│   │   └── es/               # Spanish CSV files
│   └── localized/
│       └── za/
│           └── en/           # South African English CSV files
├── locales/
│   ├── en.json              # English UI translations
│   └── es.json              # Spanish UI translations
└── assets/
└── images/
└── tabiya_logo_icononly.png

## CSV Data Files

Required CSV files for each language/localization:
- `occupations.csv` - Individual occupation records
- `occupation_groups.csv` - Hierarchical grouping structure  
- `occupation_hierarchy.csv` - Parent-child relationships
- `skills.csv` - Individual skill records
- `skill_groups.csv` - Skill categorization
- `skill_hierarchy.csv` - Skill group relationships
- `occupation_to_skill_relations.csv` - Occupation-skill mappings

## Usage

Open `index.html` in a web browser. The application will automatically load the default English taxonomy data and present three main navigation tabs:

- **About**: Overview and statistics of the taxonomy
- **Occupations**: Browse occupation classifications with seen/unseen economy sub-tabs
- **Skills**: Explore the skills framework by category

Use the language switcher to toggle between English and Spanish. When English is selected, localization options become available for regional variants.

## Browser Compatibility

The application uses modern web standards including:
- ES6+ JavaScript features
- CSS Grid and Flexbox
- Web Workers (with fallback to main thread)
- Fetch API for data loading

Recommended browsers: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+

## Performance Considerations

- Large datasets are processed using chunked rendering to maintain responsive UI
- Virtual scrolling implemented for search results over 50 items  
- Progressive loading with visual progress indicators
- Memory-efficient data structures with cleanup on navigation