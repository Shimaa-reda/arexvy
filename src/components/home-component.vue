<template>
  <div>
    <div v-if="loading" class="skeleton-container">
      <div class="skeleton-card" v-for="n in 6" :key="n">
        <div class="skeleton-video"></div>
        <div class="skeleton-info">
          <div class="skeleton-likes"></div>
          <div class="skeleton-views">
            <div class="skeleton-text"></div>
            <div class="skeleton-text"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="error">{{ error }}</div>

    <div v-else>
      <swiper
        direction="vertical"
        :mousewheel="{ forceToAxis: true, releaseOnEdges: true, sensitivity: 0.5 }"
        :slides-per-view="1"
        :resistance-ratio="0"
        :speed="400"
        :modules="modules"
        class="mySwiper"
        @slideChange="onSlideChange"
      >
        <swiper-slide v-for="(post, index) in posts" :key="post.id">
          <div class="post-card">
            <div class="video-wrapper">
              <video
                :src="`https://be.24h24s.com/${post.video_url}`"
                :data-video-id="post.id"
                autoplay
                loop
                playsinline
                :muted="isMuted"
                class="post-video"
                @timeupdate="handleTimeUpdate($event, index)"
              ></video>

              <div v-if="promptVisibleIndex === index" class="swipe-prompt">
                Swipe down for more videos
              </div>

              <button class="mute-button" @click="toggleMute">
                <i :class="isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up'"></i>
              </button>
            </div>

            <div class="post-info" style="margin-top: 10px">
              <div class="likes-views">
                <button @click="toggleLike(post.id)">
                  <i :class="post.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
                  {{ post.likes }} Likes
                </button>
                <div class="right-info">
                  <span><i class="fas fa-clock"></i> {{ calculateDaysAgo(post.created_at) }} Days ago</span>
                  <span><i class="fas fa-play"></i> {{ post.views }} Views</span>
                </div>
              </div>
            </div>
          </div>
        </swiper-slide>
      </swiper>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Mousewheel } from 'swiper/modules'
import 'swiper/css'

const modules = [Mousewheel]
const posts = ref([])
const loading = ref(true)
const error = ref(null)
const isMuted = ref(true)
const promptVisibleIndex = ref(null)
const viewedVideos = ref([])
const processingVideos = ref(new Set())
const route = useRoute()

const getLikedVideos = (title) => {
  const key = title ? `likedVideos_${title}` : "likedVideos_default"
  const data = localStorage.getItem(key)
  return data ? JSON.parse(data) : []
}

const saveLikedVideo = (id, title) => {
  const key = title ? `likedVideos_${title}` : "likedVideos_default"
  const liked = getLikedVideos(title)
  if (!liked.includes(id)) {
    liked.push(id)
    localStorage.setItem(key, JSON.stringify(liked))
  }
}

const removeLikedVideo = (id, title) => {
  const key = title ? `likedVideos_${title}` : "likedVideos_default"
  const liked = getLikedVideos(title)
  const updated = liked.filter((x) => x !== id)
  localStorage.setItem(key, JSON.stringify(updated))
}

const toggleLike = async (id) => {
  const post = posts.value.find((p) => p.id === id)
  if (!post) return

  const key = route.params.title

  if (post.liked) {
    post.liked = false
    post.likes--
    removeLikedVideo(id, key)
    try {
      await fetch(`https://be.24h24s.com/api/video/${id}/unlike`)
    } catch {
      post.liked = true
      post.likes++
      saveLikedVideo(id, key)
    }
  } else {
    post.liked = true
    post.likes++
    saveLikedVideo(id, key)
    try {
      await fetch(`https://be.24h24s.com/api/video/${id}/like`)
    } catch {
      post.liked = false
      post.likes--
      removeLikedVideo(id, key)
    }
  }
}

const incrementView = async (id) => {
  const videoIdInt = parseInt(id)
  if (viewedVideos.value.includes(videoIdInt) || processingVideos.value.has(videoIdInt)) return
  processingVideos.value.add(videoIdInt)

  try {
    const res = await fetch(`https://be.24h24s.com/api/video/${id}/view`)
    if (res.ok) {
      const result = await res.json()
      viewedVideos.value.push(videoIdInt)
      const post = posts.value.find((p) => p.id === id)
      if (post) post.views = result.data?.views ?? post.views + 1
    }
  } catch (err) {
    console.error("View error", err)
  } finally {
    processingVideos.value.delete(videoIdInt)
  }
}

const toggleMute = () => {
  isMuted.value = !isMuted.value
  const videos = document.querySelectorAll('video')
  videos.forEach((video) => {
    video.muted = isMuted.value
  })
}

const calculateDaysAgo = (createdAt) => {
  const created = new Date(createdAt)
  const now = new Date()
  return Math.floor((now - created) / (1000 * 3600 * 24))
}

const onSlideChange = (swiper) => {
  const currentIndex = swiper.activeIndex
  const slides = document.querySelectorAll(".swiper-slide")
  const currentSlide = slides[currentIndex]
  const currentVideo = currentSlide?.querySelector("video")

  if (currentVideo) {
    slides.forEach(slide => {
      const video = slide.querySelector("video")
      if (video && video !== currentVideo) video.pause()
    })

    currentVideo.muted = isMuted.value
    currentVideo.play().catch(() => {})

    const post = posts.value[currentIndex]
    if (post) incrementView(post.id)
  }
}

// ✅ تراكب الوقت لإظهار الرسالة في آخر 3 ثواني
const handleTimeUpdate = (event, index) => {
  const video = event.target
  const currentTime = video.currentTime
  const duration = video.duration

  if (duration - currentTime <= 3) {
    promptVisibleIndex.value = index
  } else {
    if (promptVisibleIndex.value === index) {
      promptVisibleIndex.value = null
    }
  }
}

const fetchData = async () => {
  try {
    const res = await fetch('https://be.24h24s.com/api/videos')
    const data = await res.json()
    const likedIds = getLikedVideos(route.params.title)
    const categoryOrder = Object.keys(data)
    const categoryMap = {}

    for (const cat of categoryOrder) {
      categoryMap[cat] = data[cat].map(v => ({
        ...v,
        liked: likedIds.includes(v.id),
        _category: cat,
      }))
    }

    const result = []
    let anyLeft = true

    while (anyLeft) {
      anyLeft = false
      for (const cat of categoryOrder) {
        const videos = categoryMap[cat]
        if (videos.length > 0) {
          const randomIndex = Math.floor(Math.random() * videos.length)
          const [video] = videos.splice(randomIndex, 1)
          if (video) {
            result.push(video)
            anyLeft = true
          }
        }
      }
    }

    posts.value = result
    console.log("📺 فيديوهات العرض النهائي:")
    result.forEach((video, index) => {
      console.log(`${index + 1}. [${video._category}] ${video.title || video.id}`)
    })
  } catch (err) {
    error.value = 'Failed to load videos.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.mySwiper {
  width: 100%;
  height: 100vh;
}

.swiper-slide {
  display: flex;
  justify-content: center;
  align-items: center;
}

.post-card {
  background: white;
  border-radius: 10px;
  padding: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-width: 350px;
  margin: 20px auto;
}

.video-wrapper {
  position: relative;
}

.post-video {
  width: 100%;
  border-radius: 10px;
  pointer-events: none;
}

.mute-button {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  padding: 6px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
}

.likes-views {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.likes-views button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 5px;
}

.right-info {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
  color: #9e9e9e;
}

.right-info span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.error {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 16px;
}

.swipe-prompt {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  z-index: 10;
  white-space: nowrap;
  font-size: 18px;
  font-weight: bold;
  animation: slideDownUp 3s ease-in-out forwards;
  text-shadow: 0 0 4px black, 0 0 6px black;
}

@keyframes slideDownUp {
  0% {
    opacity: 0;
    transform: translate(-50%, -80%);
  }
  15% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  85% {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -70%);
  }
}
</style>

<style>
body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  background-image: url("@/assets/background.png");
  background-position: center;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  background-attachment: fixed;
  font-family: "GSK Precision", sans-serif;
}
.likes-views button {
  font-family: "GSK Precision", sans-serif;
}
</style>
