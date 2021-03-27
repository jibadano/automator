const fs = require('fs')
const path = require('path')

module.exports = class Controller {
  constructor() {
    const servicesPath = process.env.DEFAULT_SERVICES_PATH || 'src/services'

    this.routes = []

    const controllerDir = process.env.PWD + '/' + servicesPath
    fs.readdirSync(controllerDir).forEach((serviceFile) => {
      if (serviceFile !== 'index.js') {
        const service = require(path.resolve(`${controllerDir}/${serviceFile}`))
        const serviceName = serviceFile.replace('.js', '')
        if (typeof service === 'function')
          this.routes.push({
            method: 'all',
            path: `/${serviceName}`,
            handler: service
          })
        else {
          const methods = Object.keys(service)
          methods.forEach((method) => {
            if (['get', 'post', 'put', 'delete', 'all'].includes(method))
              this.routes.push({
                method,
                path: `/${serviceName}`,
                handler: service[method]
              })
          })
        }
      }
    })

    console.info(
      `🕹 Controller READY  ${this.routes.map(
        (r) => `\n\t${r.path}  ${r.method}`
      )}`
    )
  }
}
