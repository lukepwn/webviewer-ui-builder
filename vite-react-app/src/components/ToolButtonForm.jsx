import React, { useState } from "react";

export default function ToolButtonForm({ onAdd, headerOptions = [], toolOptions = [] }) {
  const [dataElement, setDataElement] = useState("panButton");
  const [toolName, setToolName] = useState((toolOptions && toolOptions.length && toolOptions[0].value) || "");
  const [customToolName, setCustomToolName] = useState("");
  const [header, setHeader] = useState(headerOptions && headerOptions.length ? headerOptions[0] : "tools-header");
  const [customHeader, setCustomHeader] = useState("");
  const [label, setLabel] = useState("");

  const headerOptionsFinal = headerOptions && headerOptions.length ? headerOptions : ["tools-header", "default-top-header"];
  const effectiveToolName = toolName === "__other__" ? customToolName || "" : toolName;
  const effectiveHeader = header === "__other__" ? customHeader || "" : header;

  return (
    <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
      <input
        value={dataElement}
        onChange={(e) => setDataElement(e.target.value)}
        placeholder="dataElement"
      />

      <select value={header} onChange={(e) => setHeader(e.target.value)}>
        {headerOptionsFinal.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
        <option value="__other__">Other (enter custom below)</option>
      </select>

      {header === "__other__" && (
        <input
          value={customHeader}
          onChange={(e) => setCustomHeader(e.target.value)}
          placeholder="custom header name"
        />
      )}

      <label style={{ fontSize: 12, color: "#666" }}>Tool</label>
      <select value={toolName} onChange={(e) => setToolName(e.target.value)}>
        {toolOptions && toolOptions.length ? (
          toolOptions.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label || t.value}
            </option>
          ))
        ) : (
          <option value="">(no tools available)</option>
        )}
        <option value="__other__">Other (enter custom below)</option>
      </select>

      {toolName === "__other__" && (
        <input
          value={customToolName}
          onChange={(e) => setCustomToolName(e.target.value)}
          placeholder="custom toolName"
        />
      )}

      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="label (optional)" />
      <div>
        <button
          onClick={() => {
            if (!dataElement || !effectiveToolName || !effectiveHeader) {
              alert("dataElement, toolName and header are required");
              return;
            }
            onAdd({ dataElement, toolName: effectiveToolName, label, header: effectiveHeader });
            setDataElement("");
            setLabel("");
          }}
        >
          Add Tool Button
        </button>
      </div>
    </div>
  );
}