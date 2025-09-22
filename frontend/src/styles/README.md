# CogniFlight Cloud Frontend - Modular CSS Structure

This directory contains the complete modular CSS architecture for the CogniFlight Cloud frontend application. The styles have been migrated from a single `index.css` file into a well-organized, maintainable structure.

## Directory Structure

```
src/styles/
├── core/
│   ├── variables.css      # CSS custom properties and design tokens
│   └── reset.css          # CSS reset and base styles
├── utilities/
│   ├── animations.css     # Reusable animation classes and keyframes
│   ├── buttons.css        # Button utility classes and variants
│   ├── glass.css          # Glassmorphism effect utilities
│   └── layout.css         # Layout utility classes (flexbox, grid, spacing)
├── components/
│   ├── context-menu.css   # Context menu component styles
│   ├── desktop.css        # Desktop environment and icon styles
│   ├── dialogs.css        # Dialog and modal component styles
│   ├── fatcon.css         # FATCON widget component styles
│   ├── login.css          # Login screen component styles
│   ├── notifications.css  # Notification panel and toast styles
│   ├── start-menu.css     # Start menu component styles
│   ├── taskbar.css        # Taskbar component styles
│   └── window.css         # Window component styles
├── apps/
│   └── app-base.css       # Base styles for applications
└── index.css              # Main entry point that imports all modules
```

## Key Features

### Design System
- **CSS Custom Properties**: Consistent design tokens for colors, spacing, typography
- **Component-based Architecture**: Each UI component has its own CSS file
- **Utility Classes**: Reusable classes for common patterns
- **Glassmorphism Effects**: Modern glass-like visual effects throughout the UI

### Accessibility
- **Reduced Motion Support**: Respects user's motion preferences
- **High Contrast Mode**: Enhanced visibility for accessibility
- **Focus Management**: Proper focus indicators and keyboard navigation
- **Screen Reader Support**: Semantic markup and ARIA compliance

### Responsive Design
- **Mobile-First Approach**: Responsive breakpoints for all components
- **Touch-Friendly**: Appropriate sizing for touch interfaces
- **Adaptive Layouts**: Components adapt to different screen sizes

### Performance
- **Modular Loading**: Import only the styles you need
- **CSS Optimization**: Efficient selectors and minimal specificity conflicts
- **Print Styles**: Optimized styles for printing

## Import Order

The main `index.css` file imports modules in the following order to ensure proper cascade and specificity:

1. **Core**: Variables and reset styles
2. **Utilities**: Layout, glass effects, animations, buttons
3. **Components**: All UI component styles
4. **Apps**: Application-specific styles

## Migration Summary

All styles from the original `index.css` (1626 lines) have been successfully migrated and enhanced in the modular structure (3445+ lines total), including:

- ✅ Reset and base styles
- ✅ Desktop environment styles
- ✅ Taskbar and start menu
- ✅ Window management system
- ✅ Login screen styles
- ✅ Notification system
- ✅ Context menus
- ✅ Dialog components
- ✅ FATCON widget
- ✅ All animations and transitions
- ✅ Responsive design rules
- ✅ Accessibility improvements

## Usage

Simply import the main index file in your application:

```css
@import './styles/index.css';
```

Or import individual modules as needed:

```css
@import './styles/core/variables.css';
@import './styles/components/taskbar.css';
```

## Maintenance

- Each component style is isolated in its own file
- Variables are centralized in `core/variables.css`
- Utility classes are grouped by function
- All styles use the design system tokens for consistency

The modular structure makes it easy to:
- Add new components
- Modify existing styles without affecting others
- Maintain consistent design patterns
- Debug style issues
- Optimize bundle size