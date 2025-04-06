<template>
  <div>
    <!-- Navbar -->
    <nav class="navbar">
      <img src="@/assets/GSK_logo.png" alt="" />
    </nav>

    <div class="post-container">
      <div
        class="post-card"
        v-for="(post, index) in posts"
        :key="index"
        ref="videoRefs"
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
                :class="
                  post.liked ? 'fa-solid fa-heart liked' : 'fa-regular fa-heart'
                "
              ></i>
              {{ post.likes }} Likes
            </button>
            <div class="right-info">
              <span><i class="fas fa-clock"></i> {{ post.daysAgo }} Days ago</span>
              <span><i class="fas fa-play"></i> {{ post.views }} Views</span>
            </div>
          </div>
          <div class="content-info">
            <h3>{{ post.title }}</h3>
            <p>{{ post.description }}</p>
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
    mediaUrl: new URL("@/assets/videos/vid1.mp4", import.meta.url).href,
    mediaType: "video",
    likes: 100,
    views: 2563,
    daysAgo: 2,
    title: "Headline ",
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
    liked: false,
  },
  {
    mediaUrl: new URL("@/assets/videos/vid2.mp4", import.meta.url).href,
    mediaType: "video",
    likes: 150,
    views: 3600,
    daysAgo: 1,
    title: "Second Video",
    description: "This is the second local video.",
    liked: false,
  },
  {
    mediaUrl: new URL("@/assets/videos/vid3.mp4", import.meta.url).href,
    mediaType: "video",
    likes: 150,
    views: 3600,
    daysAgo: 1,
    title: "Third Video",
    description: "This is the third local video.",
    liked: true,
  },
]);

const videoRefs = ref([]);

const increaseLikes = (index) => {
  const post = posts.value[index];
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
};

let observer;

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target.querySelector('video');
        if (video) {
          if (entry.isIntersecting) {
            video.play();
          } else {
            video.pause();
          }
        }
      });
    },
    { threshold: 0.6 }
  );

  // observe each video wrapper
  videoRefs.value.forEach((el) => {
    if (el) observer.observe(el);
  });
});

onBeforeUnmount(() => {
  if (observer) observer.disconnect();
});
</script>

<style>
nav {
  padding: 0px;
}
.navbar {
  width: 100%;
  height: 50px;
  background: transparent;
  color: orangered;
  padding: 10px;
  text-align: center;
  z-index: 1000;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  background-image: url("@/assets/background.png");
  background-position: center;
  background-size: 100% 100%;
  background-repeat: no-repeat;
}

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

.pi-heart {
  transition: color 0.3s ease;
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

h3 {
  margin-top: 10px;
  text-align: left;
  margin-bottom: 0px;
  font-weight: bold;
}

p {
  font-size: 14px;
  color: gray;
  text-align: left;
  margin-top: 5px;
}
</style>
