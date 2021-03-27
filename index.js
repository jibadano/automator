const express = require('express')
const bodyParser = require('body-parser')

const Controller = require('./controller')
const puppeteer = require('./puppeteer')
const useProxy = require('puppeteer-page-proxy')

const path = require('path')
const package = require(path.resolve('package.json'))
const packageName = package && package.name
const packageVersion = package && package.version

module.exports = class Automator {
  constructor() {
    this.run = puppeteer.run
    this.useProxy = useProxy
  }

  async init() {
    const controller = new Controller()

    const host = process.env.HOST || '0.0.0.0'
    const port = process.env.PORT || 80
    const app = express()

    // Body parser
    app.use(bodyParser.json())

    // Custom services
    controller.routes.forEach(({ method, path, handler }) => {
      if (!['get', 'post', 'put', 'delete', 'all'].includes(method)) return
      if (path == graphqlPath) return
      app[method](path, handler)
    })

    app.listen(port, host, () => {
      console.log(
        `🤖 Automator ${packageName}@${packageVersion} READY at ${host}:${port}`
      )
    })
    return app
  }
}
