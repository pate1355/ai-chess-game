# GitHub Onboarding Plan

## Overview

Add this project to GitHub by initializing git locally, adding standard repository support files, creating the remote repository, pushing the first commit, and verifying the published repo.

## Steps

1. Check repo status and defaults
   - Run `git status` in the project root.
   - If the repo is not initialized, run:
     - `git init`
     - `git branch -M main`
2. Create a proper `.gitignore`
   - Ignore Node/Vite/React build files and local config:
     - `node_modules/`
     - `dist/`
     - `.vite/`
     - `.env`
     - `*.log`
     - `.DS_Store`
     - `/coverage`
     - `/npm-debug.log`
   - Optionally ignore editor files:
     - `.vscode/`
3. Improve project metadata and documentation
   - Update `README.md` with:
     - project description
     - key features
     - installation instructions
     - run commands
     - project status
   - Confirm `package.json` metadata is correct.
   - Optionally add a `LICENSE` file for open-source clarity.
4. Stage and commit the initial project state
   - Run `git add .`
   - Run `git status` to verify tracked files
   - Run `git commit -m "chore: initial project import"`
5. Create the GitHub repository
   - Use the GitHub website or GitHub CLI to create a new repository named `ai-chess-game`.
   - Choose public or private visibility.
   - Do not initialize the remote repository with a README or license if you want to push the local repository cleanly.
6. Connect local repo to GitHub
   - Add remote origin:
     - `git remote add origin <repo-url>`
   - Push `main`:
     - `git push -u origin main`
   - If the remote already has a branch, fetch and align branches first.
7. Verify the GitHub repository
   - Open the GitHub repo page.
   - Confirm repository content, README preview, branch, and commit history.
   - Confirm `.gitignore` is excluding unwanted files.
8. Add GitHub standard project files
   - Add `LICENSE` if needed.
   - Optionally add GitHub Actions workflow:
     - `.github/workflows/ci.yml`
     - run `npm install` and `npm run build`
   - Optionally add PR and issue templates:
     - `.github/pull_request_template.md`
     - `.github/ISSUE_TEMPLATE`
9. Establish a simple branching workflow
   - Use `main` for production.
   - Create feature branches for new work.
   - Merge via pull requests.

## Verification

1. Confirm `git status` is clean and initial commit exists.
2. Confirm `git remote -v` points to the GitHub repository.
3. Verify the repo page shows code, README, and branch.
4. If CI is added, confirm the first workflow run passes.

## Notes

- Keep `private: true` in `package.json` unless you want npm publishing.
- Use `main` as the default branch.
- For quick setup, use:
  - `gh repo create ai-chess-game --public --source=. --remote=origin --push`
