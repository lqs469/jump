import fetch from 'node-fetch'
import fs from 'fs'
import getPixels from 'get-pixels'
import savePixels from 'save-pixels'

const url = 'http://127.0.0.1:8100'
var sid = ''
var source = ''
var jumpBtnId = ''
var screenshot = ''

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
    }).then(data => resolve(data))
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

function getI () {
  return new Promise(resolve => {
    getPixels('screenshot.png', function(err, p) {
      if(err) {
        console.log('Bad image path')
        return
      }
      let iX = 0
      let iY = 0
      let iN = 0
      for (let i = 0; i < p.shape[0]; i++) {
        for (let j = 0; j < p.shape[1]; j++) {
          const r = p.get(i, j, 0)
          const g = p.get(i, j, 1)
          const b = p.get(i, j, 2)

          if (r < 65 && r > 55 && g < 60 && g > 50 && b < 95 && b > 85) {
            // console.log('got From pixels', `${r}, ${g} ,${b}`)
            iX += i
            iY += j
            iN++
          }
        }
      }
      // console.log(iX / iN, iY / iN)
      resolve({ x: iX / iN - 5, y: iY / iN + 20 })
    })
  })
}

function getT (fx, fy) {
  return new Promise(resolve => {
    getPixels('screenshot.png', function(err, p) {
      if(err) {
        console.log('Bad image path')
        return
      }

      const isBG = (r, g, b) => {
        return (
          (r < 150 && r > 40 && g < 151 && g > 40 && b < 162 && b > 59) ||
          (r > 192 && r < 230 && g > 195 && g < 221 && b > 200 && b < 234) ||
          (r > 240 && r < 256 && g > 200 && g < 230 && b > 200 && b < 225) ||
          (r > 240 && r < 256 && g > 200 && g < 225 && b > 130 && b < 170) ||
          (r > 240 && r < 256 && g > 240 && g < 250 && b > 155 && b < 190) ||
          (r > 200 && r < 220 && g > 235 && g < 245 && b > 220 && b < 250) ||
          (r > 190 && r < 220 && g > 215 && g < 235 && b > 235 && b < 255) ||
          (r > 170 && r < 210 && g > 185 && g < 215 && b > 235 && b < 255) ||
          (r > 170 && r < 210 && g > 185 && g < 215 && b > 235 && b < 255) ||
          (r > 205 && r < 215 && g > 175 && g < 190 && b > 115 && b < 145)
        )
      }

      function getFristCube () {
        for (let j = 250; j < fy - 100; j++) {
          for (let i = 10; i < p.shape[0] - 10; i++) {
            const r = p.get(i, j, 0)
            const g = p.get(i, j, 1)
            const b = p.get(i, j, 2)

            if (!isBG(r, g, b)) {
              console.log(r, g, b, i, j)
              return { i, j }
            }
          }
        }
      }

      try {
        const { i, j } = getFristCube()
        resolve({ x: i, y: j })
      } catch (e) {
        const { i, j } = getFristCube()
        resolve({ x: i, y: j })
      }
    })
  })
}

function hold (f, t) {
  return new Promise(resolve => {
    const x = Math.abs(t.x - f.x)
    const y = Math.abs(f.y - t.y) - 50
    const d = Math.sqrt(x * x + y * y)
    // const k = 0.0038381 // 1.47 / d
    const s = Math.sqrt((d + 55.229) / 202.884)
    console.log(f, t)
    console.log(`(${x}, ${y})`, `\n[distance]: ${d}`, ` [time]:${s}`)

    resolve(s)
  })
}

function drawPoint (from, target, screenshotIndex) {
  return new Promise(resolve => {
    getPixels('screenshot.png', function(err, p) {
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
      console.log(`lastScreen${screenshotIndex}.png saved`)
      resolve()
    })
  })
}

async function main () {
  sid = await getSId()
  source = await getSource()
  jumpBtnId = await getJumpBtn()

  let promise = Promise.resolve(true)

  let i = 0

  setInterval(function () {
    promise = promise.then(() =>
      new Promise(resolve => {
        rockIt(resolve, i++)
      })
    )
  }, 6000)

  async function rockIt (go, i) {
    screenshot = await getScreenshot()
    await saveImg(screenshot, 'screenshot.png')
    const from = await getI()
    const target = await getT(from.x, from.y)

    const s = await hold(from, target)

    if (s) {
      await drawPoint(from, target, i)
      await jump(s)
      go()
    }
  }
}

main()
