import sharp from 'sharp'
import http from 'http'

sharp('screenshot.png')
.sharpen(1, 10000, 10000)
.greyscale()
.toBuffer()
.then(data => {
  http.createServer(function(req, res) {
    res.writeHead(200)
    res.end(data)
  }).listen(6700)
  console.log('listening 6700')
})
