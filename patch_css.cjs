const fs = require('fs');

const css = `
@import "tailwindcss";

@theme {
  --color-background: var(--background);
  --color-surface: var(--surface);
  --color-surface-hover: var(--surface-hover);
  --color-foreground: var(--foreground);
  --color-foreground-muted: var(--foreground-muted);
  --color-border: var(--border);
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-foreground: var(--primary-foreground);
  --color-error: var(--error);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
}

:root {
  /* Defaulting to the deep dark theme from the image */
  --background: #111111; 
  --surface: #1E1E1E;
  --surface-hover: #2C2C2C;
  --foreground: #F5F5F5; 
  --foreground-muted: #A0A0A0; 
  --border: #333333; 
  --primary: #00E676; /* Bright teal/green accent */
  --primary-hover: #00C853; 
  --primary-foreground: #111111;
  --secondary: #FF9800; /* Orange accent */
  --secondary-foreground: #111111;
  --error: #FF5252; 
}

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* Custom scrollbar for deep dark theme */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: var(--background);
}
::-webkit-scrollbar-thumb {
  background: var(--surface-hover);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--foreground-muted);
}
`;

fs.writeFileSync('src/index.css', css);
