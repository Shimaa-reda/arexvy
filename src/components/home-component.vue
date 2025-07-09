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
        <swiper-slide v-for="(post, index) in posts" :key="index">
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
              ></video>

              <!-- Swipe Prompt -->
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
                  <i :class="post.liked ? 'fa-solid fa-heart liked' : 'fa-regular fa-heart'"></i>
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
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { Swiper, SwiperSlide } from "swiper/vue";
import { Mousewheel } from "swiper/modules";

const modules = [Mousewheel];

const route = useRoute();
const posts = ref([]);
const loading = ref(false);
const error = ref(null);
const isMuted = ref(true);
const viewedVideos = ref([]);
const processingVideos = ref(new Set());
const promptVisibleIndex = ref(null); // Show swipe message

const toggleMute = () => {
  const slides = document.querySelectorAll(".swiper-slide");
  isMuted.value = !isMuted.value;
  slides.forEach((slide) => {
    const video = slide.querySelector("video");
    if (video) video.muted = isMuted.value;
  });
};

const getLikedVideos = (title) => {
  const key = title ? `likedVideos_${title}` : "likedVideos_default";
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveLikedVideo = (id, title) => {
  const key = title ? `likedVideos_${title}` : "likedVideos_default";
  const liked = getLikedVideos(title);
  if (!liked.includes(id)) {
    liked.push(id);
    localStorage.setItem(key, JSON.stringify(liked));
  }
};

const removeLikedVideo = (id, title) => {
  const key = title ? `likedVideos_${title}` : "likedVideos_default";
  const liked = getLikedVideos(title);
  const updated = liked.filter((x) => x !== id);
  localStorage.setItem(key, JSON.stringify(updated));
};

const isVideoLiked = (id, title) => getLikedVideos(title).includes(id);

const incrementView = async (id) => {
  const videoIdInt = parseInt(id);
  if (viewedVideos.value.includes(videoIdInt) || processingVideos.value.has(videoIdInt)) return;
  processingVideos.value.add(videoIdInt);

  try {
    const res = await fetch(`https://be.24h24s.com/api/video/${id}/view`);
    if (res.ok) {
      const result = await res.json();
      viewedVideos.value.push(videoIdInt);
      const post = posts.value.find((p) => p.id === id);
      if (post) post.views = result.data?.views ?? post.views + 1;
    }
  } catch (err) {
    console.error("View error", err);
  } finally {
    processingVideos.value.delete(videoIdInt);
  }
};

const toggleLike = async (id) => {
  const post = posts.value.find((p) => p.id === id);
  if (!post) return;

  const key = route.params.title;

  if (post.liked) {
    post.liked = false;
    post.likes--;
    removeLikedVideo(id, key);
    try {
      await fetch(`https://be.24h24s.com/api/video/${id}/unlike`);
    } catch {
      post.liked = true;
      post.likes++;
      saveLikedVideo(id, key);
    }
  } else {
    post.liked = true;
    post.likes++;
    saveLikedVideo(id, key);
    try {
      await fetch(`https://be.24h24s.com/api/video/${id}/like`);
    } catch {
      post.liked = false;
      post.likes--;
      removeLikedVideo(id, key);
    }
  }
};

const calculateDaysAgo = (createdAt) => {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now - created) / (1000 * 3600 * 24));
};

const onSlideChange = (swiper) => {
  const currentIndex = swiper.activeIndex;
  const slides = document.querySelectorAll(".swiper-slide");
  const el = slides[currentIndex];
  const video = el?.querySelector("video");

  if (video) {
    slides.forEach((slide) => {
      const vid = slide.querySelector("video");
      if (vid && vid !== video) vid.pause();
    });
    video.muted = isMuted.value;
    video.play().catch(() => {});
    const videoId = parseInt(video.getAttribute("data-video-id"));
    if (!viewedVideos.value.includes(videoId)) incrementView(videoId);

    promptVisibleIndex.value = currentIndex;
    setTimeout(() => {
      if (promptVisibleIndex.value === currentIndex) {
        promptVisibleIndex.value = null;
      }
    }, 2000);
  }
};

const fetchData = async (titleParam) => {
  if (!titleParam) return;
  loading.value = true;
  error.value = null;

  try {
    const response = await fetch(`https://be.24h24s.com/api/arrangement/${titleParam}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const fetchedPosts = data.posts || data || [];
    fetchedPosts.forEach((post) => (post.liked = isVideoLiked(post.id, titleParam)));
    posts.value = fetchedPosts;
  } catch (err) {
    error.value = "Failed to load data. Please try again.";
  } finally {
    loading.value = false;
  }
};

watch(
  () => route.params.title,
  (newTitle) => {
    fetchData(newTitle || "default");
  },
  { immediate: true }
);

onMounted(() => {
  fetchData(route.params.title);
  promptVisibleIndex.value = 0;
  setTimeout(() => {
    if (promptVisibleIndex.value === 0) promptVisibleIndex.value = null;
  }, 5000);
});
</script>

<style scoped>
.mySwiper {
  width: 100%;
  height: 100vh;
}

.skeleton-card,
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

.liked {
  color: orange !important;
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

/* Swipe prompt styles */
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
  text-shadow:
    0 0 4px black,
    0 0 6px black;
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
