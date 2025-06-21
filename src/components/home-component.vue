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
        <div>
          <video
            :src="`https://be.24h24s.com/${post.video_url}`"
            :data-video-id="post.id"
            autoplay
            loop
            muted
            playsinline
            class="post-video"
          ></video>
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
              <span
                ><i class="fas fa-clock"></i>
                {{ calculateDaysAgo(post.created_at) }} Days ago</span
              >
              <span><i class="fas fa-play"></i> {{ post.views }} Views</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const posts = ref([]);
const loading = ref(false);
const error = ref(null);

// LocalStorage functions for liked videos
const getLikedVideos = (title) => {
  try {
    let likedVideosKey;
    if (title) {
      likedVideosKey = `likedVideos_${title}`;
    } else {
      likedVideosKey = `likedVideos_default`;
    }
    const likedVideos = localStorage.getItem(likedVideosKey);
    return likedVideos ? JSON.parse(likedVideos) : [];
  } catch (error) {
    console.error("Error reading liked videos from localStorage:", error);
    return [];
  }
};

const saveLikedVideo = (videoId, title) => {
  try {
    let likedVideosKey;
    if (title) {
      likedVideosKey = `likedVideos_${title}`;
    } else {
      likedVideosKey = `likedVideos_default`;
    }
    const likedVideos = getLikedVideos(title);
    if (!likedVideos.includes(videoId)) {
      likedVideos.push(videoId);
      localStorage.setItem(likedVideosKey, JSON.stringify(likedVideos));
    }
  } catch (error) {
    console.error("Error saving liked video to localStorage:", error);
  }
};

const removeLikedVideo = (videoId, title) => {
  try {
    let likedVideosKey;
    if (title) {
      likedVideosKey = `likedVideos_${title}`;
    } else {
      likedVideosKey = `likedVideos_default`;
    }
    const likedVideos = getLikedVideos(title);
    const updatedLikedVideos = likedVideos.filter((id) => id !== videoId);
    localStorage.setItem(likedVideosKey, JSON.stringify(updatedLikedVideos));
  } catch (error) {
    console.error("Error removing liked video from localStorage:", error);
  }
};

const isVideoLiked = (videoId, title) => {
  const likedVideos = getLikedVideos(title);
  return likedVideos.includes(videoId);
};

// Track viewed videos to avoid counting multiple views
const viewedVideos = ref([]);
// Track videos currently being processed to prevent duplicate calls
const processingVideos = ref(new Set());
// Debounce timer for scroll events
let scrollTimeout = null;

const incrementView = async (videoId) => {
  // Check if we've already counted a view for this video in this session
  const videoIdInt = parseInt(videoId);

  // Check if already viewed or currently being processed
  if (
    viewedVideos.value.includes(videoIdInt) ||
    processingVideos.value.has(videoIdInt)
  ) {
    return;
  }

  // Mark as being processed
  processingVideos.value.add(videoIdInt);

  try {
    const response = await fetch(
      `https://be.24h24s.com/api/video/${videoId}/view`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const result = await response.json();

      // Mark this video as viewed in this session
      viewedVideos.value.push(videoIdInt);

      // Find the post and update the view count
      const post = posts.value.find((p) => p.id === videoId);
      if (post) {
        // If server returns updated view count, use it; otherwise increment by 1
        if (result.data && result.data.views) {
          post.views = result.data.views;
        } else {
          post.views += 1;
        }
      }
    } else {
      console.error("Failed to increment view, status:", response.status);
    }
  } catch (error) {
    console.error("Error incrementing view:", error);
  } finally {
    // Remove from processing set
    processingVideos.value.delete(videoIdInt);
  }
};

const fetchData = async (titleParam) => {
  console.log("fetchData called with titleParam:", titleParam);

  if (!titleParam) {
    console.log("No titleParam provided, returning");
    return;
  }

  console.log("Setting loading to true");
  loading.value = true;
  error.value = null;

  try {
    console.log(
      "Making API call to:",
      `https://be.24h24s.com/api/arrangement/${titleParam}`
    );
    const response = await fetch(
      `https://be.24h24s.com/api/arrangement/${titleParam}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("API response received:", data);

    // Update posts with the fetched data and set liked state from localStorage
    const fetchedPosts = data.posts || data || [];
    console.log("Fetched posts:", fetchedPosts);

    fetchedPosts.forEach((post) => {
      post.liked = isVideoLiked(post.id, titleParam);
    });
    posts.value = fetchedPosts;
    console.log("Posts updated:", posts.value);
  } catch (err) {
    console.error("Error fetching data:", err);
    error.value = "Failed to load data. Please try again.";
  } finally {
    console.log("Setting loading to false");
    loading.value = false;
  }
};

const calculateDaysAgo = (createdAt) => {
  if (!createdAt) return 0;

  const createdDate = new Date(createdAt);
  const currentDate = new Date();
  const timeDifference = currentDate.getTime() - createdDate.getTime();
  const daysDifference = Math.floor(timeDifference / (1000 * 3600 * 24));

  return daysDifference;
};

// Watch for changes in the title parameter
watch(
  () => route.params.title,
  (newTitle) => {
    console.log("Route title changed:", newTitle);
    if (newTitle) {
      console.log("Calling fetchData with title:", newTitle);
      fetchData(newTitle);
    } else {
      console.log("No title, using default posts");
      // If no title, use default posts
      fetchData("default");
    }
  },
  { immediate: true }
);

const postCards = ref([]);

const increaseLikes = async (postId) => {
  try {
    // Find the post by ID
    const post = posts.value.find((p) => p.id === postId);
    if (!post) return;

    // Check if user has already liked this video
    if (post.liked) {
      return;
    }

    // Optimistically update the UI first
    post.liked = true;
    post.likes += 1;

    // Save to localStorage
    saveLikedVideo(postId, route.params.title);

    // Make API call to update the like on the server
    const response = await fetch(
      `https://be.24h24s.com/api/video/${postId}/like`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      // If API call fails, revert the optimistic update
      post.liked = false;
      post.likes -= 1;
      removeLikedVideo(postId, route.params.title);
      console.error("Failed to update like on server");
    }
  } catch (error) {
    console.error("Error updating like:", error);
    // Revert optimistic update on error
    const post = posts.value.find((p) => p.id === postId);
    if (post) {
      post.liked = false;
      post.likes -= 1;
      removeLikedVideo(postId, route.params.title);
    }
  }
};

const playFirstVisibleVideoOnMobile = () => {
  // Find first video element that is completely visible on the viewport
  let foundVideoToPlay = false;

  postCards.value.forEach((el) => {
    const video = el.querySelector("video");
    if (!video) return;

    const rect = el.getBoundingClientRect();

    // Check if the element is completely visible in viewport vertically
    const isCompletelyVisible =
      rect.top >= 0 && rect.bottom <= window.innerHeight;

    if (isCompletelyVisible && !foundVideoToPlay) {
      // Play this first completely visible video
      video.play().catch(() => {});
      foundVideoToPlay = true;

      // Get video ID from data attribute and increment view only once
      const videoId = video.getAttribute("data-video-id");
      const videoIdInt = parseInt(videoId);
      if (videoId && !viewedVideos.value.includes(videoIdInt)) {
        incrementView(videoId);
      }
    } else {
      // Pause other videos
      video.pause();
    }
  });

  // If no videos completely visible, pause all just in case
  if (!foundVideoToPlay) {
    postCards.value.forEach((el) => {
      const video = el.querySelector("video");
      if (video) video.pause();
    });
  }
};

const playOnlyCenteredVideo = () => {
  let minDistance = Infinity;
  let centeredVideo = null;

  postCards.value.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const elCenter = rect.top + rect.height / 2;
    const screenCenter = window.innerHeight / 2;
    const distance = Math.abs(elCenter - screenCenter);

    const video = el.querySelector("video");

    // Only consider videos that are completely visible
    const isCompletelyVisible =
      rect.top >= 0 && rect.bottom <= window.innerHeight;

    if (video && isCompletelyVisible && distance < minDistance) {
      minDistance = distance;
      centeredVideo = video;
    }
  });

  postCards.value.forEach((el) => {
    const video = el.querySelector("video");
    if (video) {
      if (video === centeredVideo) {
        video.play().catch(() => {});

        // Get video ID from data attribute and increment view only once
        const videoId = video.getAttribute("data-video-id");
        const videoIdInt = parseInt(videoId);
        if (videoId && !viewedVideos.value.includes(videoIdInt)) {
          incrementView(videoId);
        }
      } else {
        video.pause();
      }
    }
  });
};

const handleScroll = () => {
  // Clear existing timeout
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }

  // Set new timeout to debounce scroll events
  scrollTimeout = setTimeout(() => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      playFirstVisibleVideoOnMobile();
    } else {
      playOnlyCenteredVideo();
    }
  }, 100); // 100ms debounce
};

onMounted(() => {
  console.log("Component mounted, route title:", route.params.title);

  // Call fetchData on mount if there's a title
  if (route.params.title) {
    console.log("Calling fetchData on mount with title:", route.params.title);
    fetchData(route.params.title);
  }

  window.addEventListener("scroll", handleScroll);

  // Initial call with delay to ensure DOM is ready
  setTimeout(() => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      playFirstVisibleVideoOnMobile();
    } else {
      playOnlyCenteredVideo();
    }
  }, 500); // 500ms delay to ensure videos are loaded
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleScroll);
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
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
.post-container {
  padding: 20px;
  min-height: 100vh;
}

.skeleton-container {
  padding: 20px;
  min-height: 100vh;
}

.skeleton-card {
  background: white;
  border-radius: 10px;
  padding: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-width: 350px;
  margin: 20px auto;
}

.skeleton-video {
  width: 100%;
  height: 200px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 10px;
  margin-bottom: 10px;
}

.skeleton-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skeleton-likes {
  width: 80px;
  height: 20px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 4px;
}

.skeleton-views {
  display: flex;
  gap: 10px;
}

.skeleton-text {
  width: 60px;
  height: 16px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
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

.right-info {
  color: #9e9e9e;
}

.post-card {
  background: white;
  border-radius: 10px;
  padding: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-width: 350px;
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

.error {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 16px;
}
</style>
