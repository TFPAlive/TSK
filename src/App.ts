import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import modelIndex from '../public/assets/model-index.json'

type ModelOption = {
  id: string
  path: string
  label: string
}

type SpineAnimation = {
  name: string
}

export default {
  setup() {
    const formattedModels = computed<ModelOption[]>(() => {
  return modelIndex
    .filter((entry): entry is string => typeof entry === 'string' && entry.endsWith('.skel.bytes'))
    .map((entry) => {
      const cleaned = entry.replace(/^\/+|\.skel\.bytes$/g, '')
      const segments = cleaned.split('/')
      const fileName = segments.at(-1) ?? 'unknown'
      const family = segments.at(-2) ?? 'Unknown'
      return {
        id: entry,
        path: entry,
        label: `${family} / ${fileName}`,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }))
  })

const status = ref('Loading model list…')
const selectedPath = ref('')
const animations = ref<string[]>([])
const skins = ref<string[]>([])
const selectedAnimation = ref('')
const selectedSkin = ref('')
const playerRoot = ref<HTMLElement | null>(null)
const playerInstance = ref<any>(null)
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const isDragging = ref(false)

function getPlayerCanvas() {
  return playerRoot.value?.querySelector('canvas') ?? null
}

function applyCanvasTransform() {
  const canvas = getPlayerCanvas()
  if (!canvas) return

  canvas.style.transform = `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`
  canvas.style.transformOrigin = 'center center'
}

function resetView() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
  applyCanvasTransform()
}

function handlePointerDown(event: PointerEvent) {
  if (event.button !== 0) return

  isDragging.value = true
  playerRoot.value?.setPointerCapture(event.pointerId)
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging.value) return

  panX.value += event.movementX
  panY.value += event.movementY
  applyCanvasTransform()
}

function handlePointerUp(event: PointerEvent) {
  isDragging.value = false
  if (playerRoot.value?.hasPointerCapture(event.pointerId)) {
    playerRoot.value.releasePointerCapture(event.pointerId)
  }
}

function handleWheel(event: WheelEvent) {
  event.preventDefault()

  const root = playerRoot.value
  if (!root) return

  const oldZoom = zoom.value
  const nextZoom = Math.min(3, Math.max(0.5, oldZoom * (event.deltaY < 0 ? 1.1 : 0.9)))
  const bounds = root.getBoundingClientRect()
  const cursorX = event.clientX - (bounds.left + bounds.width / 2)
  const cursorY = event.clientY - (bounds.top + bounds.height / 2)

  panX.value += cursorX * (1 / nextZoom - 1 / oldZoom)
  panY.value += cursorY * (1 / nextZoom - 1 / oldZoom)
  zoom.value = nextZoom
  applyCanvasTransform()
}

function handleFullscreen(event : KeyboardEvent) {
  if (event.key === "f") {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void playerRoot.value?.requestFullscreen();
  }
}

const selectedModel = computed(
  () => formattedModels.value.find((model) => model.path === selectedPath.value) ?? formattedModels.value[0],
)

function cleanPlayer() {
  if (!playerRoot.value) return

  if (playerInstance.value && typeof playerInstance.value.dispose === 'function') {
    try {
      playerInstance.value.dispose()
    } catch (error) {
      console.warn('Failed to dispose previous Spine player', error)
    }
  }

  playerRoot.value.innerHTML = ''
  playerInstance.value = null
  animations.value = []
  skins.value = []
  selectedAnimation.value = ''
  selectedSkin.value = ''
}

function resolveAtlasUrl(binaryUrl: string) {
  return binaryUrl.replace(/\.skel\.bytes$/, '.atlas.txt')
}

async function ensureAssetAvailable(url: string) {
  const response = await fetch(url, { method: 'HEAD' })
  if (!response.ok) {
    throw new Error(`Missing asset: ${url} (${response.status})`)
  }
}

async function loadModel(path: string, requestedAnimation = '', requestedSkin = '') {
  if (!path || !playerRoot.value) return

  const spine = (window as any).spine
  if (!spine || !spine.SpinePlayer) {
    status.value = 'Spine library is not loaded'
    return
  }

  const binaryUrl = path.startsWith('/') ? path : `/${path}`
  const atlasUrl = resolveAtlasUrl(binaryUrl)

  try {
    status.value = 'Checking assets…'
    await ensureAssetAvailable(binaryUrl)
    await ensureAssetAvailable(atlasUrl)

    cleanPlayer()

    const player = new spine.SpinePlayer(playerRoot.value, {
      binaryUrl,
      atlasUrl,
      premultipliedAlpha: false,
      showControls: false,
      scale: 1,
      skin: requestedSkin ,
      animation: requestedAnimation,
      success: (loadedPlayer: any) => {
        const loadedAnimations = (loadedPlayer.skeleton?.data?.animations ?? []) as SpineAnimation[]
        animations.value = loadedAnimations.map((animation) => animation.name)

        const initialAnimation = animations.value.includes(requestedAnimation)
          ? requestedAnimation
          : animations.value[0] ?? ''
        selectedAnimation.value = initialAnimation

        if (initialAnimation && loadedPlayer.animationState?.setAnimation) {
          loadedPlayer.animationState.setAnimation(0, initialAnimation, true)
        }

        requestAnimationFrame(applyCanvasTransform)
        status.value = `${selectedModel.value?.label ?? 'Model'} ready`


        const loadedSkins = (loadedPlayer.skeleton?.data?.skins ?? []) as SpineAnimation[]
        skins.value = loadedSkins.map((skin) => skin.name)

        const modelName = binaryUrl.split('/').at(-1)?.replace(/\.skel\.bytes$/, '') ?? ''
        const usesFaceSkin = /^ch_\d+_m[01]$/.test(modelName)
        const initialSkin = requestedSkin || (usesFaceSkin ? 'face1' : skins.value[0] ?? '')
        const skeleton = loadedPlayer.skeleton

        if (initialSkin && skeleton && skins.value.includes(initialSkin)) {
          skeleton.setSkinByName?.(initialSkin)
          skeleton.setSlotsToSetupPose?.()
          selectedSkin.value = initialSkin
        }
      },
    })

    playerInstance.value = player
  } catch (error) {
    console.error(error)
    cleanPlayer()
    status.value = error instanceof Error ? error.message : 'Asset failed to load'
  }
}

watch(
  formattedModels,
  (models) => {
    if (!selectedPath.value && models[0]) {
      selectedPath.value = models[0].path
    }
  },
  { immediate: true },
)

watch(selectedPath, (path) => {
  if (path) {
    loadModel(`assets${path}`)
  }
})

function changeAnimation(animation: string) {
  if (animation && selectedPath.value) {
    loadModel(`assets${selectedPath.value}`, animation)
  }
}



onMounted(() => {
  window.addEventListener('keydown', handleFullscreen)

  if (!selectedPath.value && formattedModels.value[0]) {
    selectedPath.value = formattedModels.value[0].path
  }
})

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', handleFullscreen)
      cleanPlayer()
    })

    return {
      animations,
      changeAnimation,
      formattedModels,
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      handleWheel,
      isDragging,
      playerRoot,
      resetView,
      selectedAnimation,
      selectedPath,
      status,
      zoom,
    }
  },
}
