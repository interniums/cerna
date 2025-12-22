import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Prevent Turbopack from inferring the workspace root from lockfiles outside this repo.
    // Using the config file's directory is stable even if the process cwd changes.
    root: __dirname,
  },
}

export default nextConfig
