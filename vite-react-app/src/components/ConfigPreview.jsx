import React from "react";

export default function ConfigPreview({ config }) {
  return (
    <pre
      style={{
        maxHeight: 220,
        overflow: "auto",
        background: "#fff",
        border: "1px solid #eee",
        padding: 8,
      }}
    >
      {JSON.stringify(config, null, 2)}
    </pre>
  );
}
