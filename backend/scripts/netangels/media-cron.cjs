/* eslint-disable @typescript-eslint/no-require-imports -- Stable NetAngels cron entrypoint. */
const { realpathSync } = require('node:fs')
const { join } = require('node:path')
const release = realpathSync(join(__dirname, 'current'))
process.chdir(release)
process.env.MEDIA_DIRECTORY ||= join(__dirname, 'shared/media')
require(join(release, 'dist/bootstrap/media/main.js'))
