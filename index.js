import fs from 'fs'
import fetch from 'node-fetch'
import getPixels from 'get-pixels'
import savePixels from 'save-pixels'
import sharp from 'sharp'
import config from './config.js'

const url = 'http://127.0.0.1:8100'
var sid = ''
var source = ''
var jumpBtnId = ''
var screenshot = ''
var i = 0

const get = (u, o) => fetch(u, o).then(res => res.json())

function getSId () {
  return new Promise(resolve => {
    get(url + '/status').then(data => {
      resolve(data.sessionId)
    })
  })
}

function getSource () {
  return new Promise(resolve => {
    get(url + '/source').then(data => {
      resolve(data)
    })
  })
}

function getJumpBtn () {
  return new Promise(resolve => {
    get(`${url}/session/${sid}/elements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        using: 'class name',
        value: 'XCUIElementTypeStaticText'
      })
    }).then(data => resolve(data.value[0].ELEMENT))
  })
}

function getScreenshot () {
  return new Promise(resolve => {
    get(`${url}/screenshot`)
    .then(data => resolve(data.value))
  })
}

function jump (s) {
  return new Promise(resolve => {
    get(`${url}/session/${sid}/wda/element/${jumpBtnId}/touchAndHold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        duration: s
      })
    }).then(data => {
      resolve(data)
    })
  })
}

function saveImg (screenshot, filename) {
  return new Promise(resolve => {
    screenshot += screenshot.replace('+', ' ')
    screenshot = new Buffer(screenshot, 'base64').toString('binary')
    fs.writeFile(filename, screenshot, 'binary', function (err) {
      if (err) throw err
      console.log(filename, 'saved.')
      resolve()
    })
  })
}

function getI (filename) {
  return new Promise(resolve => {
    getPixels(filename, function(err, p) {
      if (err) {
        console.log('Bad image path')
        return
      }
      let iX = 0
      let iY = 0
      let iN = 0
      for (let i = 100; i < p.shape[0] - 100; i++) {
        for (let j = 300; j < p.shape[1] - 300; j++) {
          const r = p.get(i, j, 0)
          const g = p.get(i, j, 1)
          const b = p.get(i, j, 2)

          // if (r < 40 && r > 33 && g < 40 && g > 33 && b < 40 && b > 33) {
          // if (r < 65 && r > 55 && g < 60 && g > 50 && b < 95 && b > 85) {
          if (inGradient('#413778', '#322364', r, g, b)) {
            iX += i
            iY += j
            iN++
          }
        }
      }
      resolve({ x: iX / iN, y: iY / iN + 20 })
    })
  })
}

const inGradient = (startHex, endHex, r, g, b) => {
  function hex2RGB (hex) {
      var rgb = []
      for(var i = 1; i < 7; i += 2){
        rgb.push(parseInt('0x' + hex.slice(i, i + 2)))
      }
    return rgb
  }

  const sColor = hex2RGB(startHex)
  const eColor = hex2RGB(endHex)
  const inR = Math.min(eColor[0], sColor[0]) <= r && Math.max(eColor[0], sColor[0]) >= r
  const inG = Math.min(eColor[1], sColor[1]) <= g && Math.max(eColor[1], sColor[1]) >= g
  const inB = Math.min(eColor[2], sColor[2]) <= b && Math.max(eColor[2], sColor[2]) >= b
  return (inR && inG && inB)
}

function getT (filename, fx, fy) {
  return new Promise(resolve => {
    getPixels(filename, function(err, p) {
      if(err) {
        console.log('Bad image path')
        return
      }

      const isBG = (r, g, b) => {
        return (
          inGradient('#E0E0E0', '#C0C0C0', r, g, b) ||
          inGradient('#E0E0E0', '#FFC9E0', r, g, b) ||
          inGradient('#FFD4AB', '#D2946B', r, g, b) ||
          inGradient('#FFFFCA', '#E0EB7B', r, g, b) ||
          inGradient('#E0D5FF', '#BFB4F6', r, g, b) ||
          inGradient('#C0C0C0', '#A0A0A0', r, g, b)
        )
      }

      function getFristCube () {
        for (let j = config.top; j < fy - 50; j++) {
          for (let i = 10; i < p.shape[0] - 10; i++) {
            const lr = p.get(i, j, 0)
            const lg = p.get(i, j, 1)
            const lb = p.get(i, j, 2)

            if (!isBG(lr, lg, lb) && (Math.abs(i - fx) > 50)) {
              console.log('Frist point', i, j, lr, lg, lb)
              if (i < 11) {
                return { i: 0, j: 0 }
              }

              for (let k = p.shape[0] - 10; k > i; k--) {
                const rr = p.get(k, j, 0)
                const rg = p.get(k, j, 1)
                const rb = p.get(k, j, 2)

                if (!isBG(rr, rg, rb) && (Math.abs(k - fx) > 50)) {
                  const middle = Math.floor((i + k) / 2)

                  // find Y axis conter
                  const topD = j + 20
                  const tr = p.get(middle, topD, 0)
                  const tg = p.get(middle, topD, 1)
                  const tb = p.get(middle, topD, 2)
                  let center = topD

                  for (let l = j; l < fy - 50; l++) {
                    const br = p.get(middle, l, 0)
                    const bg = p.get(middle, l, 1)
                    const bb = p.get(middle, l, 2)

                    if (tr === br && tg === bg && tb === bb) {
                      center = l
                    }
                  }
                  center = Math.round((topD + center) / 2)
                  console.log('[ center ]', middle, center)
                  return { i: middle, j: center }
                }
              }
            }
          }
        }
        return
      }

      try {
        const { i, j } = getFristCube()
        resolve({ x: i, y: j })
      } catch (e) {
        resolve({ x: 0, y: 0 })
      }
    })
  })
}

function hold (f, t) {
  return new Promise(resolve => {
    const x = Math.abs(t.x - f.x)
    const y = Math.abs(f.y - t.y)
    const d = Math.sqrt(x * x + y * y)
    const s = Math.sqrt((d + config.b) / config.k)
    console.log(f, t)
    console.log(`(${x}, ${y})`, `\n[distance]: ${d}`, ` [time]:${s}`)

    resolve(s)
  })
}

function drawPoint (filename, from, target, screenshotIndex) {
  return new Promise(resolve => {
    getPixels(filename, function(err, p) {
      if(err) {
        console.log('Bad image path')
        return
      }

      from = {
        x: Math.round(from.x),
        y: Math.round(from.y)
      }

      const points = [
        { index: 0, rgb: 255 },
        { index: 1, rgb: 0 },
        { index: 1, rgb: 0 }
      ]

      const zoom = (x, y) => (rgb, value) => {
        for (let i = -1; i < 2; i++) {
          for (let j = -1; j < 2; j++) {
            p.set(x + i, y + j, rgb, value)
          }
        }
      }

      points.forEach((point) => {
        zoom(from.x, from.y)(point.index, point.rgb)
        zoom(target.x, target.y)(point.index, point.rgb)
      })

      const writableFile = fs.createWriteStream(`lastScreen${screenshotIndex}.png`)
      savePixels(p, 'png').pipe(writableFile)
      console.log(`[lastScreen${screenshotIndex}.png saved]`)
      resolve()
    })
  })
}

function restart () {
  return new Promise(resolve => {
    get(`${url}/session/${sid}/wda/touchAndHold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        duration: 0.00001,
        x: 400,
        y: 1050
      })
    }).then(() => resolve())
  })
}

function sharpHandle (screenshot) {
  return new Promise(resolve => {
    screenshot = new Buffer(screenshot, 'base64')

    sharp(screenshot)
    .jpeg({
      quality: 1
    })
    .toFile('screenshot.jpg', () => resolve())
  })
}

async function main () {
  sid = await getSId()
  source = await getSource()
  jumpBtnId = await getJumpBtn()

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

  async function rockIt (i) {
    screenshot = await getScreenshot()
    // await saveImg(screenshot, 'screenshot.png')
    await sharpHandle(screenshot)
    const from = await getI('screenshot.jpg')
    const target = await getT('screenshot.jpg', from.x, from.y)

    const s = await hold(from, target)

    if (s && target.x > 10) {
      await drawPoint('screenshot.jpg', from, target, i)
      await jump(s)
    } else {
      console.log('[restart !]')
      await restart()
    }

    const randomWait = 3000 // Math.random() * 1 + 5
    await sleep(randomWait)
    rockIt(++i)
  }

  rockIt(i)
}

main()
