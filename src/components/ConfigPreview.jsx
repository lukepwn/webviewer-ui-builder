import React, { useState, useMemo } from 'react';
import { getRequiredFunctionMapInfo } from '../sdk/importConfig';

function highlightJson(jsonString) {
  const tokenRegex =
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}[\],])/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(jsonString)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: jsonString.slice(lastIndex, match.index),
        type: 'whitespace',
      });
    }

    const token = match[0];
    if (/^"/.test(token)) {
      if (/:$/.test(token)) {
        const colonIndex = token.lastIndexOf(':');
        const keyText = token.slice(0, colonIndex);
        const colonSpacing = token.slice(colonIndex);
        parts.push({ text: keyText, type: 'key' });
        parts.push({ text: colonSpacing, type: 'punctuation' });
      } else {
        parts.push({ text: token, type: 'string' });
      }
    } else if (/^(true|false)$/.test(token)) {
      parts.push({ text: token, type: 'boolean' });
    } else if (token === 'null') {
      parts.push({ text: token, type: 'null' });
    } else if (/^-?\d/.test(token)) {
      parts.push({ text: token, type: 'number' });
    } else {
      parts.push({ text: token, type: 'punctuation' });
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < jsonString.length) {
    parts.push({ text: jsonString.slice(lastIndex), type: 'whitespace' });
  }

  return parts;
}

export default function ConfigPreview({ config }) {
  const [copied, setCopied] = useState(false);
  const { entries, snippet } = getRequiredFunctionMapInfo(config);

  const formattedJson = useMemo(() => {
    try {
      return JSON.stringify(config, null, 2);
    } catch {
      return '';
    }
  }, [config]);

  const tokens = useMemo(() => highlightJson(formattedJson), [formattedJson]);

  const handleCopySnippet = () => {
    if (!snippet) return;
    navigator.clipboard?.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="studio-json-container">
      {entries.length > 0 && (
        <div className="studio-json-warning" role="note">
          <div className="studio-json-warning-header">
            <strong>
              ⚠ Requires <code>functionMap</code> ({entries.length}{' '}
              {entries.length === 1 ? 'action' : 'actions'})
            </strong>
            <button
              type="button"
              className="studio-btn studio-json-snippet-btn"
              onClick={handleCopySnippet}
            >
              {copied ? '✓ Copied!' : 'Copy JS Snippet'}
            </button>
          </div>
          <div className="studio-json-warning-desc">
            Pass this second argument to{' '}
            <code>UI.importModularComponents(config, functionMap)</code> when
            loading the exported JSON:
          </div>
          <pre className="studio-json-snippet-code">{snippet}</pre>
        </div>
      )}

      <pre className="studio-json-code">
        <code>
          {tokens.map((token, idx) => (
            <span key={idx} className={`json-${token.type}`}>
              {token.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
