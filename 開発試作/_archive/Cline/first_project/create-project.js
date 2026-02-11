#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

// Delete the current directory contents
fs.readdirSync('.').forEach(file => {
  if (file !== 'create-project.js') {
    if (fs.lstatSync(file).isDirectory()) {
      fs.rmSync(file, { recursive: true });
    } else {
      fs.unlinkSync(file);
    }
  }
});

// Create package.json
fs.writeFileSync('package.json', JSON.stringify({
  name: "goal-management-app",
  version: "0.1.0",
  private: true
}));

// Install dependencies
execSync('npm install next@latest react@latest react-dom@latest typescript@latest @types/react@latest @types/node@latest @types/react-dom@latest eslint@latest eslint-config-next@latest tailwindcss@latest postcss@latest autoprefixer@latest', { stdio: 'inherit' });

// Create basic Next.js app structure
const directories = [
  'src/app',
  'src/components',
  'src/lib',
  'public',
];

directories.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// Create necessary config files
fs.writeFileSync('next.config.js', `/** @type {import('next').NextConfig} */
const nextConfig = {}
module.exports = nextConfig
`);

fs.writeFileSync('tsconfig.json', JSON.stringify({
  compilerOptions: {
    target: "es5",
    lib: ["dom", "dom.iterable", "esnext"],
    allowJs: true,
    skipLibCheck: true,
    strict: true,
    forceConsistentCasingInFileNames: true,
    noEmit: true,
    esModuleInterop: true,
    module: "esnext",
    moduleResolution: "node",
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: "preserve",
    incremental: true,
    plugins: [{ name: "next" }],
    paths: {
      "@/*": ["./src/*"]
    }
  },
  include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  exclude: ["node_modules"]
}));

fs.writeFileSync('postcss.config.js', `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`);

fs.writeFileSync('tailwind.config.ts', `import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config
`);

fs.writeFileSync('src/app/layout.tsx', `import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Goal Management App',
  description: 'A goal management app with storytelling features',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`);

fs.writeFileSync('src/app/globals.css', `@tailwind base;
@tailwind components;
@tailwind utilities;
`);

fs.writeFileSync('src/app/page.tsx', `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">Goal Management App</h1>
    </main>
  )
}
`);

fs.writeFileSync('.gitignore', `# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
`);

console.log('Project setup completed successfully!');
