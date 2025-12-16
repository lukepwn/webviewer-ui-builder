# webviewer-ui-builder

A minimal Vite + React proof-of-concept demonstrating integration with Apryse WebViewer (WebViewer 11.9).

## Features

- Integrates `@pdftron/webviewer` and copies static assets to `public/lib/webviewer` via a `postinstall` script.
- Small demo app that mounts WebViewer in `src/App.jsx`.

## Quick start

1. Install dependencies:

   ```bash
   npm install
   ```

   The `postinstall` script will copy WebViewer static assets into `public/lib/webviewer`.

2. Add your Apryse license key:

   - Edit `src/App.jsx` and replace `YOUR_LICENSE_KEY` with your license key, or wire it to an environment variable / secure store.

3. Run the dev server:

   ```bash
   npm run dev
   ```

4. Open the local URL printed in the terminal and you should see the WebViewer UI open the demo PDF.

## Notes

- The project currently includes the static WebViewer assets under `public/lib/webviewer`. If you prefer these to be downloaded dynamically or stored elsewhere, update `scripts/copy-webviewer-assets.js` accordingly.
- For production builds, make sure to review license handling and remove or secure any hard-coded keys.

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.
