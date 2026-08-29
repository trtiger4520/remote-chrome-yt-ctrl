import { createApp } from 'vue';
import App from './App.vue';
import ConnectPage from './ConnectPage.vue';
import './styles.css';

const path = window.location.pathname.replace(/\/+$/, '') || '/';
createApp(path === '/connect' ? ConnectPage : App).mount('#app');
