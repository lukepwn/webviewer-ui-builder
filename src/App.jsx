import { useRef, useEffect, useState } from 'react';
import WebViewer from '@pdftron/webviewer';
import './index.css';
import ModularUIBuilder from './ModularUIBuilder';

function App() {
  const viewer = useRef(null);
  const [viewerReady, setViewerReady] = useState(false);

  useEffect(() => {
    if (!viewer.current || viewer.current.dataset.webviewerMounted === 'true')
      return;

    WebViewer(
      {
        path: 'lib/webviewer',
        // fullAPI: true,
        // licenseKey: 'YOUR_LICENSE_KEY',

        initialDoc:
          'https://pdftron.s3.amazonaws.com/downloads/pl/demo-annotated.pdf',
      },
      viewer.current,
    ).then((instance) => {
      localStorage.removeItem('init_timestamp');
      viewer.current.dataset.webviewerMounted = 'true';

      // Expose instance for the builder and debugging
      window.viewerInstance = instance;

      instance.UI.enableFeatures([
        instance.UI.Feature.Redaction,
        instance.UI.Feature.MultiViewerMode,
        instance.UI.Feature.ComparePages,
        instance.UI.Feature.ContentEdit,
      ]);

      setViewerReady(true);
    });
  }, []);

  return <ModularUIBuilder viewerRef={viewer} viewerReady={viewerReady} />;
}

export default App;
