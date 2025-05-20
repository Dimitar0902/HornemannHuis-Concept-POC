import * as faceapi from 'face-api.js'

const video = document.getElementById('video')
const canvas = document.getElementById('overlay')
const infoBox = document.getElementById('info-box')
const demographicsText = document.getElementById('demographics')

let locked = false
let ctx = canvas.getContext('2d')

const displaySize = {} 


async function loadModels () {
  await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
  await faceapi.nets.ageGenderNet.loadFromUri('/models')
}

async function startVideo () {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true })
  video.srcObject = stream
}

function getDemographicMessage (age, gender) {
  const ageRounded = Math.round(age)
  const intro = `Detected: ${gender}, age ~${ageRounded}.`
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

let box = null;

async function onPlay () {
  displaySize.width = video.videoWidth;
  displaySize.height = video.videoHeight;
  canvas.width = displaySize.width;
  canvas.height = displaySize.height;


  setInterval(async () => {
    if (!video.paused && !video.ended) {
      const result = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withAgeAndGender()


      if (result) {
        const { age, gender, detection } = result
        box = detection.box

        if (!locked) {
          locked = true
          demographicsText.innerText = getDemographicMessage(age, gender)
          infoBox.classList.remove('hidden')
        }

    
   
      } else {
        locked = false
        infoBox.classList.add('hidden')
      }
    }
  }, 100)
}

function animate () {
  ctx.clearRect(0, 0, displaySize.width, displaySize.height)

  if (box) {

    console.log(box)


    ctx.drawImage(video, 0, 0, displaySize.width, displaySize.height)
    ctx.filter = 'blur(20px)'

    ctx.drawImage(
      video,
      box.x,
      box.y,
      box.width,
      box.height,
      box.x,
      box.y,
      box.width,
      box.height
    )
    ctx.filter = 'none'
  
  

  }
  
  requestAnimationFrame(animate)


}

animate();

async function init () {
  await loadModels()
  await startVideo()
  video.addEventListener('playing', onPlay)
}

init()
