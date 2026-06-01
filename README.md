# AI Chess Game

A React + TypeScript + Vite chess game with AI opponent logic powered by `chess.js` and `react-chessboard`.

## Features

- Player vs AI gameplay
- Move history tracking
- Responsive chessboard UI
- Chess game state managed with hooks

## Getting Started

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open `http://localhost:5173` and start playing.

### Build for production

```bash
npm run build
```

## Project structure

- `src/` — application source code
- `src/components/` — UI components
- `src/hooks/` — game logic hooks
- `src/services/` — AI move generation and chess utilities

## GitHub onboarding

- `.gitignore` excludes local files, build artifacts, and editor settings.
- `.github/workflows/ci.yml` runs lint and build checks on push and pull requests.
- `GITHUB_ONBOARDING.md` documents the repository setup process.

## Notes

This project is configured for local development with Vite and React. Update package metadata or add a `LICENSE` file if you publish it publicly on GitHub.
