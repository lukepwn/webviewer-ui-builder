import { useRef, useEffect } from "react";
import WebViewer from "@pdftron/webviewer";
import "./index.css";

function App() {
  const viewer = useRef(null);

  useEffect(() => {
    if (!viewer.current || viewer.current.dataset.webviewerMounted === "true")
      return;

    WebViewer(
      {
        path: "lib/webviewer",
        licenseKey: "YOUR_LICENSE_KEY",
        initialDoc:
          "https://pdftron.s3.amazonaws.com/downloads/pl/demo-annotated.pdf",
      },
      viewer.current
    ).then((instance) => {
      // Mark as mounted so we don't mount twice in dev environments
      viewer.current.dataset.webviewerMounted = "true";
      // You can access the WebViewer instance here if needed
      // const { docViewer, annotManager } = instance
    });
  }, []);

  return <div className="webviewer" ref={viewer}></div>;
}

export default App;
