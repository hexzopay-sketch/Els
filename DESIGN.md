# Design System

## Colors
- Background: `#0d1117`
- Panel/Card: `#161b22`
- Subtle: `#161b22`
- Border: `#30363d`
- Text Primary: `#e6edf3`
- Text Muted: `#8b949e`
- Accent (Primary): `#58a6ff`
- Success: `#3fb950`
- Warning: `#d29922`
- Danger: `#f85149`

## Typography
- Font: Nunito (Google Fonts)
- Scale: 10px–24px across UI
- Monospace: system monospace for code/IDs

## Spacing
- Page: `p-4 md:p-6`, max-w-7xl
- Cards: `p-4` to `p-6`
- Grid gaps: `gap-3` to `gap-5`

## Components
- **Buttons**: rounded-md, text-sm, font-medium, px-3 py-1.5 (small) or px-4 py-2 (default)
- **Inputs**: bg-background, border-border, rounded-md, px-3 py-2, focus:border-primary/50
- **Tables**: border-border rounded-lg overflow-x-auto, thead with bg-muted/50, th text-text-muted
- **Modals**: fixed inset-0 flex items-center justify-center bg-black/60

## Animations (motion/react)
- **FadeUp**: opacity 0→1, y 10→0, 0.25s
- **SlideUp**: opacity 0→1, y 16→0, 0.3s
- **ScaleIn**: opacity 0→1, scale 0.97→1, 0.25s
- **Stagger**: children delay 0.04s each
- **Loaders**: CSS-only (loader--1 through loader--9), box-loader

## Breakpoints
- Mobile: default (single column)
- Tablet: `sm:` (640px)
- Desktop: `md:` (768px) sidebar shift
- Wide: `lg:` (1024px) multi-column
