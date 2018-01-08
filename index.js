import fs from 'fs'
import fetch from 'node-fetch'
import getPixels from 'get-pixels'
import savePixels from 'save-pixels'
import sharp from 'sharp'

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

          // if (r < 40 && r > 33 && g < 40 && g > 33 && b < 40 && b > 33) {
          if (r < 65 && r > 55 && g < 60 && g > 50 && b < 95 && b > 85) {
            iX += i
            iY += j
            iN++
          }
        }
      }
      resolve({ x: iX / iN - 7, y: iY / iN + 20 })
    })
  })
}

function getT (filename, fx, fy) {
  return new Promise(resolve => {
    getPixels(filename, function(err, p) {
      if(err) {
        console.log('Bad image path')
        return
      }

      const isBG = (r, g, b) => {
        function hex2RGB (hex) {
            var rgb = []
            for(var i = 1; i < 7; i += 2){
              rgb.push(parseInt('0x' + hex.slice(i, i + 2)))
            }
          return rgb
        }

        const inGradient = (startHex, endHex) => {
          const sColor = hex2RGB(startHex)
          const eColor = hex2RGB(endHex)
          const inR = Math.min(eColor[0], sColor[0]) <= r && Math.max(eColor[0], sColor[0]) >= r
          const inG = Math.min(eColor[1], sColor[1]) <= g && Math.max(eColor[1], sColor[1]) >= g
          const inB = Math.min(eColor[2], sColor[2]) <= b && Math.max(eColor[2], sColor[2]) >= b
          return (inR && inG && inB)
        }

        return (
          // inGradient('#E1E1E1', '#D1D1D1')
          inGradient('#28283B', '#9697A2') ||
          inGradient('#FDDA9D', '#FEC983') ||
          inGradient('#B7B2B6', '#A79AA1') ||
          inGradient('#CBB7A7', '#CC9E98') ||
          inGradient('#D9F3FD', '#D1E9D4') ||
          inGradient('#DBEBFF', '#BAD5EA') ||
          inGradient('#D7DAFE', '#A6B1E6') ||
          inGradient('#D6DAE5', '#BBBEC7') ||
          inGradient('#FFDEA6', '#FEC983') ||
          inGradient('#FFE6DB', '#FEC4CC') ||
          inGradient('#FFF8BA', '#FDF490')
          // (r < 176 && r > 40 && g < 151 && g > 40 && b < 162 && b > 58) ||
          // (r > 192 && r < 240 && g > 195 && g < 221 && b > 200 && b < 234) ||
          // (r > 240 && r < 256 && g > 200 && g < 230 && b > 200 && b < 225) ||
          // (r > 240 && r < 256 && g > 200 && g < 225 && b > 130 && b < 170) ||
          // (r > 240 && r < 256 && g > 240 && g < 250 && b > 155 && b < 190) ||
          // (r > 190 && r < 220 && g > 210 && g < 245 && b > 220 && b < 256) ||
          // (r > 170 && r < 210 && g > 185 && g < 215 && b > 235 && b < 256) ||
          // (r > 205 && r < 215 && g > 175 && g < 190 && b > 115 && b < 145) ||
          // (r > 230 && r < 240 && g > 235 && g < 245 && b > 180 && b < 220) ||
          // (r > 150 && r < 175 && g > 155 && g < 175 && b > 170 && b < 190)
        )
      }

      const findXCenter = (i, j, r, g, b, tot = 0) => {
        if (i < 11) {
          return 0
        }
        while (r === p.get(i++, j, 0) && g === p.get(i++, j, 1) && b === p.get(i++, j, 2)) {
          tot++
        }
        console.log('tot', tot)
        return Math.round(tot / 2)
      }

      function getFristCube () {
        for (let j = 400; j < fy - 50; j++) {
          for (let i = 10; i < p.shape[0] - 10; i++) {
            const r = p.get(i, j, 0)
            const g = p.get(i, j, 1)
            const b = p.get(i, j, 2)

            if (!isBG(r, g, b) && (Math.abs(i - fx) > 50)) {
              const centerX = findXCenter(i, j, r, g, b)
              console.log(i, '====>', i + centerX)
              console.log(r, g, b, i + centerX, j)
              return { i: i + centerX, j }
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
    const s = Math.sqrt((d + 55.229) / 202.884)
    // const s = Math.sqrt((d + 100) / 321.6) // iphoneX
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

        let i = target.x
        let j = target.y
        const r = p.get(i, j, 0)
        const g = p.get(i, j, 1)
        const b = p.get(i, j, 2)
        while (r === p.get(i, j, 0) && g === p.get(i, j, 1) && b === p.get(i, j, 2)) {
          i++
          zoom(i, j)(point.index, point.rgb)
        }
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
        duration: 0.0001,
        x: 400,
        y: 1050
      })
    }).then(data => {
      i = 0

      resolve()
    })
  })
}

function sharpHandle (screenshot) {
  return new Promise(resolve => {
    screenshot = new Buffer(screenshot, 'base64')

    sharp(screenshot)
    // .sharpen(1, 10000, 10000)
    // .greyscale()
    .toFile('screenshot.png', () => resolve())
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
    const from = await getI('screenshot.png')
    const target = await getT('screenshot.png', from.x, from.y)

    const s = await hold(from, target)

    if (s && target.x > 10) {
      await drawPoint('screenshot.png', from, target, i)
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
