# AMC Installment React

GitHub Pages-ready React/Vite version.

## GitHub Pages deployment

1. Upload/push the complete project to a GitHub repository.
2. Keep the default branch named `main`.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose **GitHub Actions**.
5. Push to `main` (or run the workflow manually from **Actions**).
6. GitHub will build the React app and publish the `dist` folder.

The workflow is located at:

`.github/workflows/deploy.yml`

The Vite configuration uses relative asset paths so the app also works when hosted at a GitHub Pages project URL.

## Local run

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Firebase configuration is in `src/firebase.js`.
