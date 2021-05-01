const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

/* const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha')
puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: '2captcha',
      token: '82e2393087cd3e043f2bc758651595cd' // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
    },
    visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
  })
) */

const useCloudinary =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET

const cloudinary = require('cloudinary').v2

if (useCloudinary)
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  })

const uploadScreenshot = (buffer) =>
  new Promise((resolve, reject) =>
    cloudinary.uploader
      .upload_stream((err, file) =>
        err ? reject(err) : resolve(file.secure_url)
      )
      .end(buffer)
  )

const superSet = (page) => {
  page.__proto__.fill = (selector, value) =>
    page.$eval(
      selector,
      (el, value) => {
        el.value = value
        const event = new Event('change')
        el.dispatchEvent(event)
      },
      value
    )

  page.__proto__.getText = (selector) =>
    page.$eval(selector, (el) => el.textContent.replace(/\s+/g, ' ').trim())

  page.__proto__.getNumber = (selector) =>
    page.$eval(selector, (el) =>
      parseFloat(el.textContent.replace(/((?![\d\.]).)*/g, ''))
    )

  page.__proto__.isPresent = (selector) =>
    page
      .waitForSelector(selector, { timeout: 3000 })
      .then(() => true)
      .catch((e) => false)

  page.__proto__.waitForResult = async (selector, errorSelector) => {
    await page.waitForSelector(`${selector}, ${errorSelector}`)

    const found = await page.isPresent(selector)
    return found ? null : page.getText(errorSelector)
  }

  page.__proto__.fillIframe = async (iframe, selector, value) => {
    const elementHandle = await page.$(iframe)
    const frame = await elementHandle.contentFrame()

    return frame.$eval(
      selector,
      (el, value) => {
        el.value = value
        const event = new Event('change')
        el.dispatchEvent(event)
      },
      value
    )
  }

  page.__proto__.getIframe = async (iframe) => {
    const elementHandle = await page.$(iframe)
    const frame = await elementHandle.contentFrame()
    if (!frame.getIframe) superSet(frame)
    return frame
  }
}

const run = async (config, exec) => {
  const proxy = { ...config.proxy }
  delete config.proxy

  config.args = config.args || []

  if (proxy) {
    const { host, port, protocol } = proxy
    config.args.push(
      `--proxy-server=${protocol ? `${protocol}://` : ''}${host}${
        port ? `:${port}` : ''
      }`
    )
  }

  const browser = await puppeteer.launch(config)
  const pages = await browser.pages()
  const page = pages[0]

  superSet(page)

  if (proxy) {
    const { username, password } = proxy
    if (username)
      await page.authenticate({
        username,
        password
      })
  }

  try {
    const result = await exec({ browser, page })
    browser.close()
    return result
  } catch (e) {
    const newError = useCloudinary
      ? await page
          .screenshot()
          .then(uploadScreenshot)
          .then((screenshot) => {
            e.screenshot = screenshot
            return e
          })
      : e
    await browser.close()
    throw newError
  }
}

module.exports = { run }
