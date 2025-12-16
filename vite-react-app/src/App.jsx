import { useRef, useEffect, useState } from "react";
import WebViewer from "@pdftron/webviewer";
import "./index.css";
import ModularUIBuilder from "./ModularUIBuilder";

function App() {
  const viewer = useRef(null);
  const [showBuilder, setShowBuilder] = useState(false);

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
      viewer.current.dataset.webviewerMounted = "true";

      // Expose instance for the builder and debugging
      window.viewerInstance = instance;
    });
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ flex: 1 }}>
        <div style={{ padding: 8 }}>
          <button onClick={() => setShowBuilder((s) => !s)}>
            {showBuilder ? "Hide UI Builder" : "Show UI Builder"}
          </button>
        </div>
        <div className="webviewer" ref={viewer}></div>
      </div>
      {showBuilder && (
        // The aside tag is good for semantic HTML5, indicating a sidebar
        <aside
          style={{
            width: 420,
            borderLeft: "1px solid #eee",
            padding: 12,
            overflow: "auto",
          }}
        >
          <ModularUIBuilder />
        </aside>
      )}
    </div>
  );
}

export default App;
