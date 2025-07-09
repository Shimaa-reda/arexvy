import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/font/fonts.css';
import 'swiper/css';
import 'swiper/css/pagination';



import '@fortawesome/fontawesome-free/css/all.css';
// import 'bootstrap/dist/css/bootstrap.min.css'
// import 'bootstrap/dist/js/bootstrap.bundle.min.js'
// 
createApp(App).use(router).mount('#app')
