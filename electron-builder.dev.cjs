const packageJson = require('./package.json')

module.exports = {
  ...packageJson.build,
  appId: 'com.king.dsh.dev',
  productName: 'king-dsh',
  directories: {
    ...packageJson.build.directories,
    output: 'dist-dev'
  },
  extraMetadata: {
    name: 'king-dsh-dev',
    productName: 'king-dsh',
    dshDesktopChannel: 'development'
  },
  artifactName: 'king-dsh-dev-${os}-${arch}.${ext}',
  nsis: {
    ...packageJson.build.nsis,
    artifactName: 'king-dsh-dev-windows-${arch}-setup.${ext}'
  },
  publish: null
}
