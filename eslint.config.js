import senoESLintConfig from '@senojs/eslint-config'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    extends: [senoESLintConfig],
  },
])
