import React from "react";
import { PANELS_CATALOG } from "../constants/webviewerCatalog";

export default function PanelManager({
  panels = {},
  onTogglePanel,
  onChangePanelLocation,
  onAddToggleToHeader,
}) {
  return (
    <div className="panel-manager-box">
      <div className="section-header-row">
        <span className="section-title">Side Panels</span>
        <span className="field-hint">Enable sidebars & dock location</span>
      </div>

      <div className="panels-list">
        {PANELS_CATALOG.map((panelDef) => {
          const activeConfig = panels[panelDef.id];
          const isEnabled = Boolean(activeConfig);
          const currentLocation =
            activeConfig?.location || panelDef.defaultLocation;

          return (
            <div
              key={panelDef.id}
              className={`panel-item-row ${isEnabled ? "enabled" : ""}`}
            >
              <div className="panel-info-col">
                <div className="panel-name-row">
                  <label className="checkbox-toggle">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) =>
                        onTogglePanel(
                          panelDef.id,
                          panelDef.render,
                          currentLocation,
                          e.target.checked,
                        )
                      }
                    />
                    <span className="panel-name">{panelDef.name}</span>
                  </label>
                </div>
                <span className="panel-subtext">{panelDef.id}</span>
              </div>

              {isEnabled && (
                <div className="panel-controls-col">
                  {/* Location switch: left vs right */}
                  <div className="location-pill-toggle">
                    <button
                      type="button"
                      className={`pill-btn ${currentLocation === "left" ? "active" : ""}`}
                      onClick={() => onChangePanelLocation(panelDef.id, "left")}
                      title="Dock to left side"
                    >
                      Left
                    </button>
                    <button
                      type="button"
                      className={`pill-btn ${currentLocation === "right" ? "active" : ""}`}
                      onClick={() =>
                        onChangePanelLocation(panelDef.id, "right")
                      }
                      title="Dock to right side"
                    >
                      Right
                    </button>
                  </div>

                  {onAddToggleToHeader && (
                    <button
                      type="button"
                      className="add-toggle-btn"
                      onClick={() =>
                        onAddToggleToHeader({
                          panelId: panelDef.id,
                          label: panelDef.toggleLabel,
                          title: panelDef.toggleTitle,
                          icon: panelDef.toggleIcon,
                        })
                      }
                      title="Add toggle button to current header"
                    >
                      + Toggle
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
