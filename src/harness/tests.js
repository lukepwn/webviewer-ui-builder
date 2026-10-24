// Test definitions for the Modular UI harness. Each test imports a config built
// on top of the default UI, then reports what the SDK did.
import { prepareConfigForImport } from '../sdk/importConfig.js';

const HEADER = 'default-top-header';

// Adds components/flyouts/panels to the default config and attaches `itemKeys` to the top header.
function build(
  base,
  { components = {}, flyouts = {}, panels = {}, headerItems = [] },
) {
  const cfg = base;
  cfg.modularComponents = { ...cfg.modularComponents, ...components };
  cfg.flyouts = { ...(cfg.flyouts || {}), ...flyouts };
  cfg.panels = { ...(cfg.panels || {}), ...panels };
  const hdrKey = cfg.modularHeaders[HEADER]
    ? HEADER
    : Object.keys(cfg.modularHeaders)[0];
  const hdr = cfg.modularHeaders[hdrKey];
  hdr.items = [...(hdr.items || []), ...headerItems];
  return { cfg, hdrKey };
}

const toggle = (id, target, extra = {}) => ({
  type: 'toggleButton',
  dataElement: id,
  toggleElement: target,
  element: target,
  title: id,
  label: id,
  img: 'icon-header-sidebar-line',
  ...extra,
});

const flyout = (id, items) => ({ dataElement: id, items });

// Try an import; return {ok, error}
function tryImport(ctx, cfg, functionMap) {
  try {
    ctx.importConfig(cfg, functionMap);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export const TESTS = [
  {
    id: 1,
    title: 'Nested flyouts (item objects)',
    question:
      'toggle -> flyout A -> toggle item -> flyout B. Does it import, open, and can both be open?',
    look: 'Click T1 in the header, then the item inside flyout A. Does B appear? Does A stay open?',
    async run(ctx, report) {
      const { cfg } = build(ctx.base(), {
        components: { t1: toggle('t1', 'flyoutA') },
        flyouts: {
          flyoutA: flyout('flyoutA', [
            { ...toggle('toBflyout', 'flyoutB'), type: 'toggleButton' },
            {
              dataElement: 'aPlain',
              label: 'plain A item',
              icon: 'icon-header-zoom-in-line',
            },
          ]),
          flyoutB: flyout('flyoutB', [
            {
              dataElement: 'bPlain',
              label: 'plain B item',
              icon: 'icon-header-zoom-out-line',
            },
          ]),
        },
        headerItems: ['t1'],
      });
      const imp = tryImport(ctx, cfg);
      report('import', imp.ok ? 'ok' : imp.error, imp.ok);
      if (!imp.ok) return;
      const a = await ctx.open('flyoutA');
      report('open flyoutA', a, a.reportedOpen);
      const b = await ctx.open('flyoutB');
      report('open flyoutB while A open', b, b.reportedOpen);
      report(
        'A still open after B opened (programmatic)',
        ctx.isOpen('flyoutA'),
        ctx.isOpen('flyoutA') ? true : 'warn',
      );
      const exp = ctx.exportConfig();
      const rtItems = exp.flyouts?.flyoutA?.items;
      report(
        'export keeps flyoutA items',
        rtItems ? JSON.stringify(rtItems).slice(0, 200) : 'MISSING',
        !!rtItems,
      );
    },
  },
  {
    id: 2,
    title: 'Flyout items as component-key strings',
    question:
      'Can flyout.items reference modularComponents by key (like headers do) instead of inline objects?',
    look: 'Open flyout via the header button. Are both items rendered?',
    async run(ctx, report) {
      const { cfg } = build(ctx.base(), {
        components: {
          t2: toggle('t2', 'flyoutKeys'),
          zoomInKeyed: {
            type: 'presetButton',
            buttonType: 'zoomInButton',
            dataElement: 'zoomInKeyed',
          },
          zoomOutKeyed: {
            type: 'presetButton',
            buttonType: 'zoomOutButton',
            dataElement: 'zoomOutKeyed',
          },
        },
        flyouts: {
          flyoutKeys: flyout('flyoutKeys', ['zoomInKeyed', 'zoomOutKeyed']),
        },
        headerItems: ['t2'],
      });
      const imp = tryImport(ctx, cfg);
      report('import', imp.ok ? 'ok' : imp.error, imp.ok);
      if (!imp.ok) return;
      const o = await ctx.open('flyoutKeys');
      report('open', o, o.reportedOpen);
      const exp = ctx.exportConfig();
      report(
        'export flyoutKeys.items',
        JSON.stringify(exp.flyouts?.flyoutKeys?.items || null).slice(0, 300),
        !!exp.flyouts?.flyoutKeys,
      );
    },
  },
  {
    id: 3,
    title: 'Empty tab panel opened by toggle',
    question:
      'Can a tabPanel exist with zero tabs and be opened from a header toggle button?',
    look: 'Click the button in the header. Does an empty side panel show?',
    async run(ctx, report) {
      const { cfg } = build(ctx.base(), {
        components: {
          t3: toggle('t3', 'emptyTabPanel'),
          t3b: toggle('t3b', 'oneTabPanel'),
        },
        panels: {
          // Per docs, tabPanel needs `panelsList`. Missing it crashed in the first run.
          emptyTabPanel: {
            dataElement: 'emptyTabPanel',
            render: 'tabPanel',
            location: 'left',
            panelsList: [],
          },
          oneTabPanel: {
            dataElement: 'oneTabPanel',
            render: 'tabPanel',
            location: 'right',
            panelsList: [{ render: 'thumbnailsPanel' }],
          },
        },
        headerItems: ['t3', 't3b'],
      });
      const imp = tryImport(ctx, cfg);
      report('import', imp.ok ? 'ok' : imp.error, imp.ok);
      if (!imp.ok) return;
      const o = await ctx.open('emptyTabPanel');
      report('open emptyTabPanel (panelsList: [])', o, o.reportedOpen);
      await ctx.close('emptyTabPanel');
      const o2 = await ctx.open('oneTabPanel');
      report('open oneTabPanel (1 tab, control)', o2, o2.reportedOpen);
      const exp = ctx.exportConfig();
      report(
        'export keeps panel',
        JSON.stringify(exp.panels?.emptyTabPanel || null),
        !!exp.panels?.emptyTabPanel,
      );
    },
  },
  {
    id: 4,
    title: 'Toggle button inside a panel / panel opens a flyout',
    question:
      'Panels are render-only. Can a toggle button be placed somewhere a panel hosts it? (expected: no) Also: toggle in header that opens flyout while a panel is open.',
    look: 'Open the panel, then click the header button. Does the flyout anchor to the button and show over the panel?',
    async run(ctx, report) {
      const { cfg } = build(ctx.base(), {
        components: {
          t4Panel: toggle('t4Panel', 'panelForT4'),
          t4Fly: toggle('t4Fly', 'flyoutT4'),
        },
        panels: {
          panelForT4: {
            dataElement: 'panelForT4',
            render: 'tabPanel',
            location: 'right',
            panelsList: [{ render: 'thumbnailsPanel' }],
          },
        },
        flyouts: {
          flyoutT4: flyout('flyoutT4', [
            {
              dataElement: 't4Item',
              label: 'item',
              icon: 'icon-header-zoom-in-line',
            },
          ]),
        },
        headerItems: ['t4Panel', 't4Fly'],
      });
      const imp = tryImport(ctx, cfg);
      report('import', imp.ok ? 'ok' : imp.error, imp.ok);
      if (!imp.ok) return;
      await ctx.open('panelForT4');
      const f = await ctx.open('flyoutT4');
      report('flyout state while panel open', f, f.reportedOpen);
      report(
        'panel still open',
        ctx.isOpen('panelForT4'),
        ctx.isOpen('panelForT4') ? true : 'warn',
      );
    },
  },
  {
    id: 5,
    title: 'Flyout containing ribbon / header / panel items',
    question:
      'Does the SDK reject, ignore, or crash when flyout items are structural components?',
    look: 'Open the flyout. Which items rendered?',
    async run(ctx, report) {
      const { cfg } = build(ctx.base(), {
        components: {
          t5: toggle('t5', 'flyoutBad'),
          badRibbonGroup: {
            type: 'ribbonGroup',
            dataElement: 'badRibbonGroup',
            items: [],
          },
          badGrouped: {
            type: 'groupedItems',
            dataElement: 'badGrouped',
            items: [],
          },
        },
        flyouts: {
          flyoutBad: flyout('flyoutBad', [
            'badRibbonGroup',
            'badGrouped',
            'default-top-header',
            'thumbnailsPanel',
          ]),
        },
        headerItems: ['t5'],
      });
      const imp = tryImport(ctx, cfg);
      report('import', imp.ok ? 'ok' : imp.error, imp.ok ? 'warn' : true);
      if (!imp.ok) return;
      const o = await ctx.open('flyoutBad');
      report('open', o, o.reportedOpen ? 'warn' : true);
    },
  },
  {
    id: 6,
    title: 'Toggle button to nonexistent element',
    question: 'Silent no-op, error on import, or error on click?',
    look: 'Click the button. Anything happen?',
    async run(ctx, report) {
      const { cfg } = build(ctx.base(), {
        components: { t6: toggle('t6', 'doesNotExist') },
        headerItems: ['t6'],
      });
      const imp = tryImport(ctx, cfg);
      report('import', imp.ok ? 'ok' : imp.error, imp.ok);
      if (!imp.ok) return;
      try {
        ctx.UI.openElements(['doesNotExist']);
        await ctx.wait(300);
        report(
          'openElements on missing id',
          'no throw; isOpen=' + ctx.isOpen('doesNotExist'),
          'warn',
        );
      } catch (e) {
        report('openElements on missing id', 'threw: ' + e.message, 'warn');
      }
    },
  },
  {
    id: 7,
    title: 'Duplicate dataElement collisions',
    question:
      'Two flyouts with the same dataElement, and two header buttons sharing one dataElement.',
    look: 'Does the header show one or two buttons? Which flyout content shows?',
    async run(ctx, report) {
      // Object KEYS differ but inner dataElement values collide.
      const zoomBtn = (key, de, buttonType) => ({
        type: 'presetButton',
        buttonType,
        dataElement: de,
      });
      const { cfg } = build(ctx.base(), {
        components: {
          dupKeyA: toggle('sharedBtnId', 'sharedFlyId'),
          dupKeyB: toggle('sharedBtnId', 'sharedFlyId', { label: 'second' }),
          zA: zoomBtn('zA', 'zA', 'zoomInButton'),
          zB: zoomBtn('zB', 'zB', 'zoomOutButton'),
        },
        flyouts: {
          flyX: flyout('sharedFlyId', ['zA']),
          flyY: flyout('sharedFlyId', ['zB']),
        },
        headerItems: ['dupKeyA', 'dupKeyB'],
      });
      const imp = tryImport(ctx, cfg);
      report('import', imp.ok ? 'ok' : imp.error, imp.ok ? 'warn' : true);
      if (!imp.ok) return;
      await ctx.wait(300);
      const exp = ctx.exportConfig();
      report(
        'flyout keys after export',
        Object.keys(exp.flyouts || {}).join(', '),
        'warn',
      );
      report(
        'flyX / flyY dataElement + items',
        JSON.stringify({
          flyX: exp.flyouts?.flyX,
          flyY: exp.flyouts?.flyY,
        }).slice(0, 300),
        'warn',
      );
      report(
        'component keys present',
        ['dupKeyA', 'dupKeyB']
          .map((k) => `${k}=${!!exp.modularComponents?.[k]}`)
          .join(' '),
        'warn',
      );
      const hdr = Object.values(exp.modularHeaders || {}).find((h) =>
        (h.items || []).includes('dupKeyA'),
      );
      report(
        'header items containing dup keys',
        JSON.stringify(
          (hdr?.items || []).filter((i) => String(i).startsWith('dupKey')),
        ),
        'warn',
      );
    },
  },
  {
    id: 8,
    title: 'Flyout cycle (A opens B opens A)',
    question: 'Does it hang, flicker, or behave normally?',
    look: 'Click through A -> B -> A. UI responsive?',
    async run(ctx, report) {
      const { cfg } = build(ctx.base(), {
        components: { t8: toggle('t8', 'cycA') },
        flyouts: {
          cycA: flyout('cycA', [toggle('toCycB', 'cycB')]),
          cycB: flyout('cycB', [toggle('toCycA', 'cycA')]),
        },
        headerItems: ['t8'],
      });
      const imp = tryImport(ctx, cfg);
      report('import', imp.ok ? 'ok' : imp.error, imp.ok);
      if (!imp.ok) return;
      await ctx.open('cycA');
      await ctx.open('cycB');
      await ctx.open('cycA');
      report(
        'survived open A,B,A',
        `A=${ctx.isOpen('cycA')} B=${ctx.isOpen('cycB')}`,
        true,
      );
    },
  },
  {
    id: 9,
    title: 'Toggle button opening a built-in panel',
    question: 'Control test: header toggle -> thumbnailsPanel. Should work.',
    look: 'Click the button. Thumbnails panel opens?',
    async run(ctx, report) {
      const { cfg } = build(ctx.base(), {
        components: { t9: toggle('t9', 'thumbnailsPanel') },
        headerItems: ['t9'],
      });
      const imp = tryImport(ctx, cfg);
      report('import', imp.ok ? 'ok' : imp.error, imp.ok);
      if (!imp.ok) return;
      const o = await ctx.open('thumbnailsPanel');
      report('open', o, o.reportedOpen);
    },
  },
  {
    id: '1b',
    title: 'Nested flyouts with VALID items in both',
    question:
      'Re-run of test 1 where flyout B has a valid preset item. Does the Flyout.js "filter" crash go away?',
    look: 'Click the header button, then the toggle inside A. Does B show without a console crash? Does A stay open?',
    async run(ctx, report) {
      const { cfg } = build(ctx.base(), {
        components: {
          t1b: toggle('t1b', 'flyA1b'),
          toB1b: toggle('toB1b', 'flyB1b'),
          zin1b: {
            type: 'presetButton',
            buttonType: 'zoomInButton',
            dataElement: 'zin1b',
          },
          zout1b: {
            type: 'presetButton',
            buttonType: 'zoomOutButton',
            dataElement: 'zout1b',
          },
        },
        flyouts: {
          flyA1b: flyout('flyA1b', ['toB1b', 'zin1b']),
          flyB1b: flyout('flyB1b', ['zout1b']),
        },
        headerItems: ['t1b'],
      });
      const imp = tryImport(ctx, cfg);
      report('import', imp.ok ? 'ok' : imp.error, imp.ok);
      if (!imp.ok) return;
      await ctx.open('flyA1b');
      await ctx.open('flyB1b');
      const exp = ctx.exportConfig();
      report(
        'export flyA1b / flyB1b items',
        JSON.stringify({
          A: exp.flyouts?.flyA1b?.items,
          B: exp.flyouts?.flyB1b?.items,
        }),
        !!exp.flyouts?.flyB1b?.items,
      );
      report(
        'A open after B opened (programmatic)',
        ctx.isOpen('flyA1b'),
        ctx.isOpen('flyA1b') ? true : 'warn',
      );
    },
  },
  {
    id: '1c',
    title: 'Flyout submenu items (children / items inside an item)',
    question:
      'Docs mention submenu items. Which key does import accept for submenus, and does it round-trip?',
    look: 'Open each flyout from the header buttons. Does the parent item show a submenu arrow / expand?',
    async run(ctx, report) {
      const parent = (key, subKey, childKey) => ({
        type: 'customButton',
        dataElement: key,
        label: key,
        title: key,
        img: 'icon-header-zoom-in-line',
        [subKey]: [childKey],
      });
      const { cfg } = build(ctx.base(), {
        components: {
          t1cChildren: toggle('t1cChildren', 'flyChildren'),
          t1cItems: toggle('t1cItems', 'flyItems'),
          childLeaf: {
            type: 'presetButton',
            buttonType: 'zoomOutButton',
            dataElement: 'childLeaf',
          },
          parentChildren: parent('parentChildren', 'children', 'childLeaf'),
          parentItems: parent('parentItems', 'items', 'childLeaf'),
        },
        flyouts: {
          flyChildren: flyout('flyChildren', ['parentChildren']),
          flyItems: flyout('flyItems', ['parentItems']),
        },
        headerItems: ['t1cChildren', 't1cItems'],
      });
      const imp = tryImport(ctx, cfg);
      report('import', imp.ok ? 'ok' : imp.error, imp.ok);
      if (!imp.ok) return;
      await ctx.wait(300);
      const exp = ctx.exportConfig();
      report(
        'parentChildren exported',
        JSON.stringify(exp.modularComponents?.parentChildren || null),
        'warn',
      );
      report(
        'parentItems exported',
        JSON.stringify(exp.modularComponents?.parentItems || null),
        'warn',
      );
      report(
        'flyouts exported',
        JSON.stringify({
          flyChildren: exp.flyouts?.flyChildren,
          flyItems: exp.flyouts?.flyItems,
        }),
        'warn',
      );
    },
  },
  {
    id: 10,
    title: 'Which item types are accepted in a flyout?',
    question:
      'Each candidate type goes in its own flyout, alongside one valid zoom item so an empty flyout does not confound. Errors name the flyout (e.g. "Invalid flyout found: fly_toolButton").',
    look: 'Check the captured errors below for which fly_<type> names were rejected. Optionally open each from the console: UI.openElements(["fly_toolButton"]).',
    async run(ctx, report) {
      const candidates = {
        toolButton: {
          type: 'toolButton',
          toolName: 'AnnotationCreateRectangle',
          img: 'icon-tool-shape-rectangle',
          title: 'Rectangle',
        },
        divider: { type: 'divider' },
        label: { type: 'label', label: 'A label' },
        groupedItems: { type: 'groupedItems', items: [] },
        spacer: { type: 'spacer' },
        statefulButton: {
          type: 'statefulButton',
          initialState: 'a',
          states: {
            a: {
              img: 'icon-header-zoom-in-line',
              title: 'A',
              getContent: () => 'b',
            },
          },
        },
      };
      for (const [name, def] of Object.entries(candidates)) {
        const candKey = `cand_${name}`;
        const zKey = `z_${name}`;
        const { cfg } = build(ctx.base(), {
          components: {
            [candKey]: { ...def, dataElement: candKey },
            [zKey]: {
              type: 'presetButton',
              buttonType: 'zoomInButton',
              dataElement: zKey,
            },
          },
          flyouts: { [`fly_${name}`]: flyout(`fly_${name}`, [candKey, zKey]) },
        });
        const imp = tryImport(ctx, cfg);
        await ctx.wait(400);
        if (!imp.ok) {
          report(`${name}: import`, `threw: ${imp.error}`, 'warn');
          continue;
        }
        const exp = ctx.exportConfig();
        const items = exp.flyouts?.[`fly_${name}`]?.items;
        report(
          `${name}: flyout exported items`,
          JSON.stringify(items ?? null),
          items?.includes(candKey) ? true : 'warn',
        );
      }
    },
  },
  {
    id: 11,
    title: 'Left-placement header as a "side tabs" strip',
    question:
      'Can a left header hold toggle buttons that open flyouts and panels? This would substitute for a tab strip that holds buttons.',
    look: 'A vertical strip should appear on the left with 2 buttons. Click the first (flyout) and the second (thumbnails panel).',
    async run(ctx, report) {
      const { cfg } = build(ctx.base(), {
        components: {
          sideT1: toggle('sideT1', 'flySide'),
          sideT2: toggle('sideT2', 'thumbnailsPanel', {
            img: 'icon-header-page-manipulation-line',
          }),
          zSide: {
            type: 'presetButton',
            buttonType: 'zoomInButton',
            dataElement: 'zSide',
          },
        },
        flyouts: { flySide: flyout('flySide', ['zSide']) },
      });
      cfg.modularHeaders.sideTabsHeader = {
        dataElement: 'sideTabsHeader',
        placement: 'left',
        items: ['sideT1', 'sideT2'],
      };
      const imp = tryImport(ctx, cfg);
      report('import', imp.ok ? 'ok' : imp.error, imp.ok);
      if (!imp.ok) return;
      await ctx.wait(400);
      const exp = ctx.exportConfig();
      report(
        'header exported',
        JSON.stringify(exp.modularHeaders?.sideTabsHeader || null),
        !!exp.modularHeaders?.sideTabsHeader,
      );
      const o = await ctx.open('flySide');
      report('open flySide', o, o.reportedOpen);
    },
  },
  {
    id: 12,
    title: 'customButton in a flyout with onClick from the function map',
    question:
      'Does importModularComponents(config, functionMap) wire a string onClick to a function? If so, tool activation inside a flyout is possible without tool buttons.',
    look: 'Click the header button, then "Activate Rectangle" in the flyout. Does the tool mode change (check the console log)? Does the click log appear?',
    async run(ctx, report) {
      window.__harnessClicks = [];
      const functionMap = {
        activateRect: () => {
          window.__harnessClicks.push('activateRect');
          console.log('[harness] activateRect clicked');
          try {
            const { Core } = window.viewerInstance;
            Core.documentViewer.setToolMode(
              Core.documentViewer.getTool('AnnotationCreateRectangle'),
            );
          } catch (e) {
            console.log('[harness] setToolMode failed', e.message);
          }
        },
      };
      const { cfg } = build(ctx.base(), {
        components: {
          t12: toggle('t12', 'fly12'),
          activateRectBtn: {
            type: 'customButton',
            dataElement: 'activateRectBtn',
            label: 'Activate Rectangle',
            title: 'Activate Rectangle',
            img: 'icon-tool-shape-rectangle',
            onClick: 'activateRect',
          },
        },
        flyouts: { fly12: flyout('fly12', ['activateRectBtn']) },
        headerItems: ['t12'],
      });
      const imp = tryImport(ctx, cfg, functionMap);
      report('import with functionMap', imp.ok ? 'ok' : imp.error, imp.ok);
      if (!imp.ok) return;
      await ctx.wait(300);
      const exp = ctx.exportConfig();
      report(
        'exported activateRectBtn',
        JSON.stringify(exp.modularComponents?.activateRectBtn || null),
        'warn',
      );
      const o = await ctx.open('fly12');
      report(
        'open fly12 (now click the item, then check window.__harnessClicks)',
        o,
        o.reportedOpen,
      );
    },
  },
  {
    id: 13,
    title: 'Flyout submenu: children with inline item objects',
    question:
      'Does a customButton item with `children: [inline items]` give a drill-down submenu with a Back button?',
    look: 'Open the flyout, click the parent item. Expect the list to swap to the children with a Back button. Any crash?',
    async run(ctx, report) {
      const { cfg } = build(ctx.base(), {
        components: {
          t13: toggle('t13', 'fly13'),
          parent13: {
            type: 'customButton',
            dataElement: 'parent13',
            label: 'Submenu parent',
            title: 'Submenu parent',
            img: 'icon-header-zoom-in-line',
            children: [
              {
                type: 'presetButton',
                buttonType: 'zoomInButton',
                dataElement: 'child13a',
              },
              {
                type: 'presetButton',
                buttonType: 'zoomOutButton',
                dataElement: 'child13b',
              },
            ],
          },
          sib13: {
            type: 'presetButton',
            buttonType: 'zoomInButton',
            dataElement: 'sib13',
          },
        },
        flyouts: { fly13: flyout('fly13', ['parent13', 'sib13']) },
        headerItems: ['t13'],
      });
      const imp = tryImport(ctx, cfg);
      report('import', imp.ok ? 'ok' : imp.error, imp.ok);
      if (!imp.ok) return;
      await ctx.wait(400);
      const exp = ctx.exportConfig();
      report(
        'exported parent13',
        JSON.stringify(exp.modularComponents?.parent13 || null).slice(0, 400),
        'warn',
      );
      const o = await ctx.open('fly13');
      report('open fly13', o, o.reportedOpen);
    },
  },
  {
    id: 14,
    title: 'Toggle item in a flyout targeting a PANEL',
    question:
      'Does the Flyout.js "filter" crash also occur when a flyout toggle item targets a panel instead of a flyout?',
    look: 'Open the flyout, click the toggle item. Does the thumbnails panel open without a crash? Does the flyout close?',
    async run(ctx, report) {
      const { cfg } = build(ctx.base(), {
        components: {
          t14: toggle('t14', 'fly14'),
          toPanel14: toggle('toPanel14', 'thumbnailsPanel', {
            img: 'icon-header-page-manipulation-line',
          }),
          sib14: {
            type: 'presetButton',
            buttonType: 'zoomInButton',
            dataElement: 'sib14',
          },
        },
        flyouts: { fly14: flyout('fly14', ['toPanel14', 'sib14']) },
        headerItems: ['t14'],
      });
      const imp = tryImport(ctx, cfg);
      report('import', imp.ok ? 'ok' : imp.error, imp.ok);
      if (!imp.ok) return;
      await ctx.wait(300);
      const exp = ctx.exportConfig();
      report(
        'exported toPanel14',
        JSON.stringify(exp.modularComponents?.toPanel14 || null),
        'warn',
      );
      const o = await ctx.open('fly14');
      report('open fly14', o, o.reportedOpen);
    },
  },
  {
    id: 15,
    title: 'Submenu children round trip (export -> re-import)',
    question:
      'Does re-importing the raw exported config wipe `children`? Does prepareConfigForImport (expand keys to inline objects) fix it?',
    look: 'After the run, open fly15 from the header button and click the parent. Children should still appear with a Back button (state is from the fixed re-import).',
    async run(ctx, report) {
      const childrenOf = (exp) => exp.modularComponents?.parent15?.children;
      const { cfg } = build(ctx.base(), {
        components: {
          t15: toggle('t15', 'fly15'),
          parent15: {
            type: 'customButton',
            dataElement: 'parent15',
            label: 'Submenu parent',
            title: 'Submenu parent',
            img: 'icon-header-zoom-in-line',
            children: [
              {
                type: 'presetButton',
                buttonType: 'zoomInButton',
                dataElement: 'child15a',
              },
              {
                type: 'presetButton',
                buttonType: 'zoomOutButton',
                dataElement: 'child15b',
              },
            ],
          },
        },
        flyouts: { fly15: flyout('fly15', ['parent15']) },
        headerItems: ['t15'],
      });
      const imp = tryImport(ctx, cfg);
      report(
        'initial import (inline children)',
        imp.ok ? 'ok' : imp.error,
        imp.ok,
      );
      if (!imp.ok) return;
      await ctx.wait(400);
      const e1 = JSON.parse(JSON.stringify(ctx.exportConfig()));
      report(
        'export #1 children',
        JSON.stringify(childrenOf(e1)),
        !!childrenOf(e1)?.length,
      );

      // Raw re-import of the exported form (what the builder did before the guardrail)
      const raw = tryImport(ctx, JSON.parse(JSON.stringify(e1)));
      await ctx.wait(400);
      const e2 = JSON.parse(JSON.stringify(ctx.exportConfig()));
      report(
        'raw re-import: children after export #2',
        JSON.stringify(childrenOf(e2)),
        childrenOf(e2)?.length ? true : 'warn',
      );

      // Re-import through the builder's rules (expands keys to inline objects)
      const fixedCfg = prepareConfigForImport(
        JSON.parse(JSON.stringify(e1)),
      ).config;
      const fixed = tryImport(ctx, fixedCfg);
      report('rules re-import', fixed.ok ? 'ok' : fixed.error, fixed.ok);
      await ctx.wait(400);
      const e3 = JSON.parse(JSON.stringify(ctx.exportConfig()));
      report(
        'rules re-import: children after export #3',
        JSON.stringify(childrenOf(e3)),
        childrenOf(e3)?.length ? true : false,
      );

      // Second pass of the rules to prove it is stable (idempotent)
      const fixed2 = tryImport(
        ctx,
        prepareConfigForImport(JSON.parse(JSON.stringify(e3))).config,
      );
      await ctx.wait(400);
      const e4 = JSON.parse(JSON.stringify(ctx.exportConfig()));
      report(
        'rules re-import x2: children after export #4',
        JSON.stringify(childrenOf(e4)),
        childrenOf(e4)?.length ? true : false,
      );
      report('second import ok', fixed2.ok ? 'ok' : fixed2.error, fixed2.ok);
    },
  },
];
