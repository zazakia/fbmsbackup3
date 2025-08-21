# Peddlr Theme

A professional business-themed color scheme inspired by the Peddlr POS application, designed specifically for business and point-of-sale interfaces.

## Theme Overview

The Peddlr theme is designed with the following principles:
- **Professional Business Aesthetic**: Clean, trustworthy colors suitable for financial and retail applications
- **Filipino Business Culture**: Warm accent colors that reflect Filipino hospitality and business culture
- **POS System Optimized**: High contrast and readable colors perfect for transaction interfaces
- **Dual Mode Support**: Both light and dark variants for different usage scenarios

## Color Palette

### Primary Colors (Teal-based)
Representing growth, money, and business success:
- **Light Mode**: Deep teal (#0d9488) - Professional and trustworthy
- **Dark Mode**: Bright teal (#2dd4bf) - Modern and vibrant

### Accent Colors (Amber-based)
Representing Filipino warmth and energy:
- **Light Mode**: Rich amber (#f59e0b) - Warm and inviting
- **Dark Mode**: Bright yellow (#facc15) - Eye-catching and friendly

### Supporting Colors
- **Success**: Green tones for positive transactions
- **Warning**: Yellow tones for alerts and notifications
- **Error**: Red tones for errors and critical actions
- **Info**: Blue tones for informational messages

## Usage

### Theme Selection
Users can switch to the Peddlr theme using the theme toggle component:
- `peddlr-light`: Light variant of the Peddlr theme
- `peddlr-dark`: Dark variant of the Peddlr theme

### CSS Classes
The theme automatically applies to all existing components through CSS variables:
```css
/* Light mode */
.peddlr-light {
  --color-primary: 20 158 132;
  --color-accent: 245 158 11;
  /* ... other variables */
}

/* Dark mode */
.peddlr-dark {
  --color-primary: 45 212 191;
  --color-accent: 251 191 36;
  /* ... other variables */
}
```

### Tailwind Classes
New Tailwind color classes are available:
```html
<!-- Primary colors -->
<div class="bg-peddlr-primary-600 text-white">Business Action</div>

<!-- Accent colors -->
<div class="bg-peddlr-accent-500 text-white">Highlight</div>

<!-- Success/Warning/Error -->
<div class="bg-peddlr-success-500">Success Message</div>
<div class="bg-peddlr-warning-500">Warning Message</div>
<div class="bg-peddlr-error-500">Error Message</div>
```

## Design Philosophy

The Peddlr theme reflects:
1. **Trust and Reliability**: Teal primary colors convey stability and trustworthiness
2. **Warmth and Approachability**: Amber accents add Filipino warmth to business interactions
3. **Professional Standards**: Clean, high-contrast design suitable for business environments
4. **Cultural Sensitivity**: Colors that resonate with Filipino business culture while maintaining international appeal

## Perfect For

- Point-of-sale systems
- Inventory management interfaces
- Business dashboards
- Financial transaction interfaces
- E-commerce platforms
- Retail management systems

## Implementation Notes

The theme integrates seamlessly with the existing theme system:
- All existing components automatically support the new theme
- Theme switching is handled through the existing theme store
- CSS variables ensure consistent theming across all components
- Dark/light mode toggle works within the Peddlr theme variants
