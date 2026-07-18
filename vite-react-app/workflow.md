# App Workflow

3. When showBuilder is true, [src/App.jsx](src/App.jsx#L40-L50) mounts the ModularUIBuilder component inside the sidebar so the builder can interact with the running viewer.
4. The builder component in [src/ModularUIBuilder.jsx](src/ModularUIBuilder.jsx#L28-L63) loads the current modular UI configuration from the initialized viewer through exportModularComponents.
5. The runtime discovery logic in [src/ModularUIBuilder.jsx](src/ModularUIBuilder.jsx#L67-L166) inspects the viewer UI API to find toolbar groups, headers, and available tools.
6. The addToolButton flow in [src/ModularUIBuilder.jsx](src/ModularUIBuilder.jsx#L169-L218) creates or updates modular components so new tools can be placed into the correct header or group.
7. The deleteToolButton logic in [src/ModularUIBuilder.jsx](src/ModularUIBuilder.jsx#L220-L245) removes tools from the config and cleans up any references in headers or grouped components.
8. The builder UI is rendered in [src/ModularUIBuilder.jsx](src/ModularUIBuilder.jsx#L450-L458), connecting the add and delete actions to the interface so the workflow ends with a configurable modular UI.
