/* eslint-disable @typescript-eslint/no-require-imports -- NetAngels starts a stable CommonJS entrypoint. */
const { realpathSync } = require('node:fs')
const { join } = require('node:path')

const release = realpathSync(join(__dirname, 'current'))
process.chdir(release)
process.env.SERVICE_REVISION = require(join(release, 'release.json')).revision
process.env.ADMIN_STATIC_DIR = join(release, 'admin-ui')
require(join(release, 'dist/bootstrap/api/main.js'))
