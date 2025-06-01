<template>
  <div>
    <div class="post-container">
      <div
        class="post-card"
        v-for="(post, index) in posts"
        :key="index"
        ref="postCards"
      >
        <div v-if="post.mediaType === 'video'">
          <video
            :src="post.mediaUrl"
            autoplay
            loop
            muted
            playsinline
            class="post-video"
          ></video>
        </div>
        <div v-else>
          <img :src="post.mediaUrl" alt="Post Image" />
        </div>

        <div class="post-info">
          <div class="likes-views">
            <button @click="increaseLikes(index)">
              <i
                :class="post.liked ? 'fa-solid fa-heart liked' : 'fa-regular fa-heart'"
              ></i>
              {{ post.likes }} Likes
            </button>
            <div class="right-info">
              <span><i class="fas fa-clock"></i> {{ post.daysAgo }} Days ago</span>
              <span><i class="fas fa-play"></i> {{ post.views }} Views</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const posts = ref([
  {
    mediaUrl: new URL('@/assets/videos/vid1.mp4', import.meta.url).href,
    mediaType: 'video',
    likes: 100,
    views: 2563,
    daysAgo: 2,
    liked: false,
  },
  {
    mediaUrl: new URL('@/assets/videos/vid2.mp4', import.meta.url).href,
    mediaType: 'video',
    likes: 150,
    views: 3600,
    daysAgo: 1,
    liked: false,
  },
  {
    mediaUrl: new URL('@/assets/videos/vid3.mp4', import.meta.url).href,
    mediaType: 'video',
    likes: 150,
    views: 3600,
    daysAgo: 1,
    liked: true,
  },
]);

const postCards = ref([]);

const increaseLikes = (index) => {
  const post = posts.value[index];
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
};

const playOnlyCenteredVideo = () => {
  let minDistance = Infinity;
  let centeredVideo = null;

  postCards.value.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const elCenter = rect.top + rect.height / 2;
    const screenCenter = window.innerHeight / 2;
    const distance = Math.abs(elCenter - screenCenter);

    const video = el.querySelector('video');

    if (video && distance < minDistance) {
      minDistance = distance;
      centeredVideo = video;
    }
  });

  postCards.value.forEach((el) => {
    const video = el.querySelector('video');
    if (video) {
      if (video === centeredVideo) {
        if (video.paused) {
          video.play().catch(() => {});
        }
      } else {
        video.pause();
      }
    }
  });
};

const handleScroll = () => {
  playOnlyCenteredVideo();
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
  playOnlyCenteredVideo(); // initial run
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll);
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
}
</style>

<style scoped>

.post-container {
  padding: 20px;
  min-height: 100vh;
}

.post-card {
  background: white;
  border-radius: 10px;
  padding: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-width: 650px;
  margin: 20px auto;
}

.post-card img,
.post-card video {
  width: 100%;
  border-radius: 10px;
}

.post-card video {
  pointer-events: none;
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
}
.right-info span {
  display: flex;
  align-items: center;
  gap: 5px;
}
</style>
