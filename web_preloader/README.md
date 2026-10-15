# ZIPHYRUS — Glyph Wall

An interactive WebGL glyph wall experience with entry-triggered text illumination and a responsive reactive glyph canvas.

## Features

- **Interactive Glyph Wall**: Procedural and SVG-based glyph rendering via WebGL shaders.
- **Entry-Triggered Text Illumination**: Dynamic canvas text mask that illuminates glyphs directly inside the shader.
- **Smooth Interaction**: Cursor trail tracking and ripple illumination physics.
- **Modern Stack**: Built with TanStack Start, React 19, TypeScript, and Tailwind CSS v4.

## Development

Make sure you have Node.js 20+ installed.

```sh
npm install
npm run dev
```

The application will start on `http://localhost:3000` (or `http://localhost:8080`).

## Scripts

- `npm run dev`: Start the local development server
- `npm run build`: Build client and server bundles for production
- `npm run test`: Run the Vitest test suite
- `npm run lint`: Run ESLint checks

## Built with

- TanStack Start & React Router
- React 19
- Tailwind CSS v4
- WebGL & GLSL Shaders
- Vitest
