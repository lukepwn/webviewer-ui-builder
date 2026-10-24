import React, { useState } from 'react';
import { getRequiredFunctionMapInfo } from '../sdk/importConfig';

export default function ConfigPreview({ config }) {
  const [copied, setCopied] = useState(false);
  const { entries, snippet } = getRequiredFunctionMapInfo(config);

  const handleCopySnippet = () => {
    if (!snippet) return;
    navigator.clipboard?.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      {entries.length > 0 && (
        <div className="import-warnings" style={{ marginBottom: 8 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <strong>
              ⚠ Requires <code>functionMap</code> ({entries.length}{' '}
              {entries.length === 1 ? 'action' : 'actions'})
            </strong>
            <button
              type="button"
              className="secondary-button"
              style={{ padding: '2px 8px', fontSize: 11 }}
              onClick={handleCopySnippet}
            >
              {copied ? 'Copied!' : 'Copy JS Snippet'}
            </button>
          </div>
          <div style={{ marginTop: 4 }}>
            Pass this second argument to{' '}
            <code>UI.importModularComponents(config, functionMap)</code> when
            loading the exported JSON:
          </div>
          <pre
            style={{
              marginTop: 6,
              marginBottom: 0,
              maxHeight: 140,
              overflow: 'auto',
              background: '#fff',
              border: '1px solid #fcd34d',
              borderRadius: 4,
              padding: 6,
              fontSize: 11,
            }}
          >
            {snippet}
          </pre>
        </div>
      )}
      <pre
        style={{
          maxHeight: 220,
          overflow: 'auto',
          background: '#fff',
          border: '1px solid #eee',
          padding: 8,
        }}
      >
        {JSON.stringify(config, null, 2)}
      </pre>
    </div>
  );
}
