import React, { useState, useRef, useEffect, useMemo } from 'react';

/**
 * ScrollableSelect - A compact, accessible dropdown replacement that limits
 * the visible height of long option lists (preventing screen-spanning popups)
 * and provides built-in quick filtering.
 */
export default function ScrollableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  searchable = true,
  maxHeight = 220,
  disabled = false,
  className = '',
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize options into a flat array with group metadata
  const normalizedOptions = useMemo(() => {
    const list = [];
    if (!Array.isArray(options)) return list;

    for (const opt of options) {
      if (!opt) continue;
      if (typeof opt === 'string' || typeof opt === 'number') {
        list.push({
          value: String(opt),
          label: String(opt),
          group: null,
        });
      } else if (Array.isArray(opt.options)) {
        // Handled as group: { label/groupLabel, options: [...] }
        const groupName = opt.label || opt.groupLabel || '';
        for (const child of opt.options) {
          if (!child) continue;
          if (typeof child === 'string' || typeof child === 'number') {
            list.push({
              value: String(child),
              label: String(child),
              group: groupName,
            });
          } else {
            list.push({
              value: String(
                child.value ??
                  child.id ??
                  child.toolName ??
                  child.buttonType ??
                  '',
              ),
              label:
                child.label ||
                child.name ||
                child.toolName ||
                String(child.value ?? ''),
              group: groupName || child.group || child.category || null,
              icon: child.icon || child.img,
              category: child.category,
              requirement: child.requirement,
              badge: child.badge,
            });
          }
        }
      } else {
        list.push({
          value: String(
            opt.value ?? opt.id ?? opt.toolName ?? opt.buttonType ?? '',
          ),
          label:
            opt.label || opt.name || opt.toolName || String(opt.value ?? ''),
          group: opt.group || opt.category || null,
          icon: opt.icon || opt.img,
          category: opt.category,
          requirement: opt.requirement,
          badge: opt.badge,
        });
      }
    }
    return list;
  }, [options]);

  // Find currently selected item
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => String(opt.value) === String(value));
  }, [normalizedOptions, value]);

  // Filter options based on search text
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return normalizedOptions;
    const q = search.toLowerCase();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.group && opt.group.toLowerCase().includes(q)),
    );
  }, [normalizedOptions, search]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleSelect = (val) => {
    setIsOpen(false);
    setSearch('');
    if (typeof onChange === 'function') {
      // Provide both raw value and standard event shape for drop-in compatibility
      onChange(val);
    }
  };

  const showSearch = searchable && normalizedOptions.length > 7;

  return (
    <div
      ref={containerRef}
      className={`scrollable-select-container ${isOpen ? 'is-open' : ''} ${className}`}
      id={id}
    >
      <button
        type="button"
        disabled={disabled}
        className="scrollable-select-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="scrollable-select-label">
          {selectedOption ? (
            <span className="scrollable-select-value-row">
              {selectedOption.icon && (
                <span
                  className={`select-icon-preview ${selectedOption.icon}`}
                />
              )}
              {selectedOption.group && (
                <span className="select-group-tag">
                  [{selectedOption.group}]
                </span>
              )}
              <span className="select-text-main">{selectedOption.label}</span>
            </span>
          ) : (
            <span className="select-placeholder">{placeholder}</span>
          )}
        </span>
        <span className="select-chevron">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="scrollable-select-dropdown">
          {showSearch && (
            <div className="select-search-box">
              <input
                ref={searchInputRef}
                type="text"
                className="select-search-input"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              {search && (
                <button
                  type="button"
                  className="select-search-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearch('');
                    searchInputRef.current?.focus();
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          )}

          <div
            ref={listRef}
            className="select-options-list"
            style={{ maxHeight: `${maxHeight}px` }}
            role="listbox"
          >
            {filteredOptions.length === 0 ? (
              <div className="select-no-results">
                No options match your search
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={`${opt.group || ''}-${opt.value}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`select-option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(opt.value)}
                  >
                    <div className="option-content">
                      <div className="option-title-row">
                        {opt.icon && (
                          <span className={`option-icon ${opt.icon}`} />
                        )}
                        <span className="option-label">{opt.label}</span>
                        {opt.group && (
                          <span className="option-group-badge">
                            {opt.group}
                          </span>
                        )}
                      </div>
                      {opt.value !== opt.label && (
                        <div className="option-subtext">{opt.value}</div>
                      )}
                      {opt.requirement && (
                        <div className="option-requirement-text">
                          ⚠ {opt.requirement}
                        </div>
                      )}
                    </div>
                    {isSelected && <span className="option-check">✓</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
