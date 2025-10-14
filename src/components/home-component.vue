<template>
  <div>

    <!-- <div class="logo-container">
      <img src="@/assets/Icon.svg" alt="Logo" class="logo" />
    </div> -->


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
    :src="`https://be.shing-shorts.com/${post.video_url}`" 
    :data-video-id="post.id"
    loop
    playsinline
    :muted="isMuted"
    class="post-video"
    @timeupdate="handleTimeUpdate($event, index)"
  ></video>

  <div v-if="promptVisibleIndex === index" class="swipe-prompt">
    Swipe Up for more videos
  </div>

  <button class="mute-button" @click="toggleMute">
    <i :class="isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up'"></i>
  </button>
</div>

<!-- 👇 الماركيه بعد الميوت ايكون -->
<marquee 
  class="marquee-text" 
  behavior="scroll" 
  direction="left" 
  :key="marqueeKey"
>
  For more information, please refer to the prescribing information or contact GSK:
  P. O Box 58558, Jeddah, 21544, Kingdom of Saudi Arabia. Telephone: +966 12 633 6666 or via gcc.medinfo@gsk.com

  &nbsp;&nbsp;&nbsp;&nbsp;

  To report Adverse Events associated with the use of GSK product(s), please contact us via saudi.safety@gsk.com

  &nbsp;&nbsp;&nbsp;&nbsp;

  To report Product quality related complaint(s) associated with the use of GSK product(s), please contact us via Gulf.KSA-Product-Complaints@gsk.com

  &nbsp;&nbsp;&nbsp;&nbsp;

  Trademarks are owned by or licensed to the GSK group of companies. ©2023 GSK group of companies or its licensor.
</marquee>




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
const marqueeKey = ref(0)

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
      await fetch(`https://be.shing-shorts.com/api/videos/${id}/unlike`)
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
      await fetch(`https://be.shing-shorts.com/api/videos/${id}/like`)
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
    const res = await fetch(`https://be.shing-shorts.com/api/videos/${id}/view`)
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
  const currentIndex = swiper.activeIndex;
  const slides = document.querySelectorAll(".swiper-slide");
  const currentSlide = slides[currentIndex];
  const currentVideo = currentSlide?.querySelector("video");

  if (currentVideo) {
    slides.forEach(slide => {
      const video = slide.querySelector("video");
      if (video && video !== currentVideo) video.pause();
    });

    currentVideo.muted = isMuted.value;
    currentVideo.play().catch(() => {});

    const post = posts.value[currentIndex];
    if (post) incrementView(post.id);

    // 👇 نجبر الماركيه يبدأ من الأول
    marqueeKey.value++;
  }
};



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
    const res = await fetch('https://be.shing-shorts.com/api/videos')
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

// onMounted(() => {
//   fetchData()
// })
onMounted(() => {
  fetchData().then(() => {
    // بعد ما الفيديوهات تتحمل نشغل أول فيديو بس
    const firstSlide = document.querySelector(".swiper-slide-active")
    const firstVideo = firstSlide?.querySelector("video")
    if (firstVideo) {
      firstVideo.muted = isMuted.value
      firstVideo.play().catch(() => {})
    }
  })
})

</script>

<style scoped>
.logo-container {
  position: fixed; 
  top: 10px;
  left: 40px;
  z-index: 1000; 
}

.marquee-text {
  margin-block: 5px;
  font-size: 10px;
  font-weight: bold; 
  color: white;
  line-height: 1.6;
  text-shadow: none; 
  /* background-color: #898D93; */
  padding: 2px;
  /* font-weight: 100; */
  background-color: rgba(106, 107, 110, 0.7)
  
}
.logo {
  height: 60px; 
  width: auto;
  cursor: pointer;
}

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
  object-fit: contain; /* مهم عشان الفيديو ما يتمددش */
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

/* 📱 للموبايل */
@media (max-width: 768px) {
  /* اللوجو يفضل ثابت فوق */
  .logo-container {
    position: fixed;
    top: 10px;
    left: 20px;
    z-index: 2000;
  }

  .logo {
    height: 50px; 
    width: auto;
    cursor: pointer;
  }

  /* نخلي الفيديو يبدأ بعد اللوجو بمسافة */
  .mySwiper {
    margin-top: 33px; /* ← عدلي الرقم حسب المسافة اللي تحبيها */
  }

  .post-card {
    max-width: 85%;
    margin: 20px auto;
    background: white;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 15px;
  }

  .post-video {
    max-height: calc(100vh - 140px); /* بحيث يفضل تحته فراغ للوجو */
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
