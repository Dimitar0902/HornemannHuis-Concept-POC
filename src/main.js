import * as faceapi from 'face-api.js'

const video = document.getElementById('video')
const canvas = document.getElementById('overlay')
const infoBox = document.getElementById('info-box')
const demographicsText = document.getElementById('demographics')

let locked = false
let ctx
let box = null
let displaySize = { width: 0, height: 0 }

// ✅ Load models from public/models
const modelPath = import.meta.env.BASE_URL + 'models'

async function loadModels () {
  await faceapi.nets.tinyFaceDetector.loadFromUri(modelPath)
  await faceapi.nets.ageGenderNet.loadFromUri(modelPath)
}

async function startVideo () {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true })
  video.srcObject = stream
}

function getDemographicMessage (age, gender) {
  const ageRounded = Math.round(age)
  const intro = `Detected ${gender}, age ~${ageRounded}.`
  let context = ''

  if (ageRounded < 18)
    context = 'Over 1.5 million children were killed in the Holocaust.'
  else if (ageRounded > 60)
    context = 'Many elderly people were victims of early persecution.'
  else if (gender === 'female')
    context = 'Women and girls were targeted in ghettos and camps.'
  else if (gender === 'male')
    context = 'Millions of men were forced into labor and executed.'
  else context = 'People of all backgrounds suffered under the Nazi regime.'

  return `${intro} ${context}`
}

async function onPlay () {
  displaySize.width = video.videoWidth
  displaySize.height = video.videoHeight
  canvas.width = displaySize.width
  canvas.height = displaySize.height

  ctx = canvas.getContext('2d')

  setInterval(async () => {
    if (!video.paused && !video.ended) {
      const result = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 160 })
        )
        .withAgeAndGender()

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height) // Draw base video

      if (result) {
        const { age, gender, detection } = result
        box = detection.box

        if (!locked) {
          locked = true
          demographicsText.innerText = getDemographicMessage(age, gender)
          infoBox.classList.remove('hidden')
        }

        // ✅ Blur only the face region with circular mask
        const faceCanvas = document.createElement('canvas')
        faceCanvas.width = box.width
        faceCanvas.height = box.height
        const faceCtx = faceCanvas.getContext('2d')

        // Draw the face region into the offscreen canvas
        faceCtx.drawImage(
          video,
          box.x,
          box.y,
          box.width,
          box.height,
          0,
          0,
          box.width,
          box.height
        )

        // Apply blur
        faceCtx.filter = 'blur(20px)'
        faceCtx.drawImage(faceCanvas, 0, 0)

        // Clip circular mask and draw to main canvas
        ctx.save()
        ctx.beginPath()
        ctx.arc(
          box.x + box.width / 2, // centerX
          box.y + box.height / 2, // centerY
          Math.min(box.width, box.height) / 2, // radius
          0,
          Math.PI * 2
        )
        ctx.clip()

        ctx.drawImage(faceCanvas, box.x, box.y)
        ctx.restore()
      } else {
        locked = false
        infoBox.classList.add('hidden')
        box = null
      }
    }
  }, 300)
}

async function init () {
  await loadModels()
  await startVideo()
  video.addEventListener('playing', onPlay)
}

init()
