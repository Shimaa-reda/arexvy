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
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    <div v-else class="post-container">
      <div
        class="post-card"
        v-for="(post, index) in posts"
        :key="index"
        ref="postCards"
      >
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
          <button class="mute-button" @click="toggleMute">
            <i :class="isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up'"></i>
          </button>
        </div>

        <div class="post-info" style="margin-top: 10px">
          <div class="likes-views">
            <button @click="increaseLikes(post.id)">
              <i
                :class="
                  post.liked ? 'fa-solid fa-heart liked' : 'fa-regular fa-heart'
                "
              ></i>
              {{ post.likes }} Likes
            </button>
            <div class="right-info">
              <span>
                <i class="fas fa-clock"></i>
                {{ calculateDaysAgo(post.created_at) }} Days ago
              </span>
              <span><i class="fas fa-play"></i> {{ post.views }} Views</span>
            </div>
          </div>
        </div>
      </div>

      <!-- test local -->
    <!-- <div class="post-card">
  <div class="video-wrapper " style="height:100vh">
    <video
      :src="testVideo"
      autoplay
      loop
      playsinline
      :muted="isMuted"
      class="post-video"
    ></video>
    <button class="mute-button" @click="toggleMute">
      <i :class="isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up'"></i>
    </button>
  </div>
  <div class="post-info" style="margin-top: 10px">
    <div class="likes-views">
      <span>Test Video with Sound (Local)</span>
    </div>
  </div>
</div> -->

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute } from "vue-router";
// import testVideo from '@/assets/videos/vid3.mp4';

const route = useRoute();

const posts = ref([]);
const loading = ref(false);
const error = ref(null);
const isMuted = ref(true); // global mute state

const toggleMute = () => {
  isMuted.value = !isMuted.value;
  postCards.value.forEach((el) => {
    const video = el.querySelector("video");
    if (video) {
      video.muted = isMuted.value;
    }
  });
};

// LocalStorage functions
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

// Track viewed videos
const viewedVideos = ref([]);
const processingVideos = ref(new Set());
let scrollTimeout = null;

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

const calculateDaysAgo = (createdAt) => {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now - created) / (1000 * 3600 * 24));
};

watch(
  () => route.params.title,
  (newTitle) => {
    fetchData(newTitle || "default");
  },
  { immediate: true }
);

const postCards = ref([]);

const increaseLikes = async (id) => {
  const post = posts.value.find((p) => p.id === id);
  if (!post || post.liked) return;
  post.liked = true;
  post.likes++;
  saveLikedVideo(id, route.params.title);

  try {
    const response = await fetch(`https://be.24h24s.com/api/video/${id}/like`);
    if (!response.ok) throw new Error();
  } catch {
    post.liked = false;
    post.likes--;
    removeLikedVideo(id, route.params.title);
  }
};

const playFirstVisibleVideoOnMobile = () => {
  let found = false;
  postCards.value.forEach((el) => {
    const video = el.querySelector("video");
    const rect = el.getBoundingClientRect();
    const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    video.muted = isMuted.value;

    if (video && isVisible && !found) {
      video.play().catch(() => {});
      found = true;
      const videoId = parseInt(video.getAttribute("data-video-id"));
      if (!viewedVideos.value.includes(videoId)) incrementView(videoId);
    } else {
      video.pause();
    }
  });
};

const playOnlyCenteredVideo = () => {
  let minDist = Infinity;
  let centerVideo = null;

  postCards.value.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const screenCenter = window.innerHeight / 2;
    const distance = Math.abs(center - screenCenter);
    const video = el.querySelector("video");
    const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    video.muted = isMuted.value;

    if (video && isVisible && distance < minDist) {
      minDist = distance;
      centerVideo = video;
    }
  });

  postCards.value.forEach((el) => {
    const video = el.querySelector("video");
    if (video === centerVideo) {
      video.play().catch(() => {});
      const videoId = parseInt(video.getAttribute("data-video-id"));
      if (!viewedVideos.value.includes(videoId)) incrementView(videoId);
    } else if (video) {
      video.pause();
    }
  });
};

const handleScroll = () => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    window.innerWidth <= 768 ? playFirstVisibleVideoOnMobile() : playOnlyCenteredVideo();
  }, 100);
};

onMounted(() => {
  fetchData(route.params.title);
  window.addEventListener("scroll", handleScroll);
  setTimeout(() => {
    window.innerWidth <= 768 ? playFirstVisibleVideoOnMobile() : playOnlyCenteredVideo();
  }, 500);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleScroll);
  clearTimeout(scrollTimeout);
});
</script>

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

<style scoped>
.post-container,
.skeleton-container {
  padding: 20px;
  min-height: 100vh;
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

.skeleton-video,
.skeleton-likes,
.skeleton-text {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 10px;
}

.skeleton-video {
  width: 100%;
  height: 200px;
  margin-bottom: 10px;
}

.skeleton-likes {
  width: 80px;
  height: 20px;
  border-radius: 4px;
}

.skeleton-views {
  display: flex;
  gap: 10px;
}

.skeleton-text {
  width: 60px;
  height: 16px;
  border-radius: 4px;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.post-card video {
  width: 100%;
  border-radius: 10px;
  pointer-events: none;
}

.video-wrapper {
  position: relative;
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
  z-index: 2;
}

.mute-button:hover {
  background: rgba(0, 0, 0, 0.8);
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
</style>
