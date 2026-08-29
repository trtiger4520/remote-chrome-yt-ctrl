<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

interface PairingQrCode {
  imageUrl: string;
  url: string;
}

const pairingCodes = ref<PairingQrCode[]>([]);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);
const hasMultipleCodes = computed(() => pairingCodes.value.length > 1);

async function loadPairingCodes() {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    const response = await fetch('/api/pairing', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('無法取得配對 QR Code');
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload) || !payload.every(isPairingQrCode)) {
      throw new Error('配對資料格式不正確');
    }

    pairingCodes.value = payload;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '無法取得配對 QR Code';
  } finally {
    isLoading.value = false;
  }
}

function isPairingQrCode(value: unknown): value is PairingQrCode {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.url === 'string' && typeof candidate.imageUrl === 'string';
}

function displayAddress(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

onMounted(() => {
  void loadPairingCodes();
});
</script>

<template>
  <!-- THESIS: the Server computer becomes a calm darkroom contact sheet where one scan hands the remote safely to a phone. OWN-WORLD: graphite, amber safelight, silver measurements, and a QR plate with intentional contrast. STORY: open locally, choose the matching LAN address, scan, then return to control. FIRST VIEWPORT: the pairing instruction and first scannable code are visible without scrolling on a phone-sized screen. FORM: darkroom direction inherited from the remote control surface. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md -->
  <main class="connect-shell">
    <header class="top-rail">
      <div class="brand-lockup">
        <span class="brand-mark" aria-hidden="true">YR</span>
        <div>
          <p class="eyebrow">YouTube Remote</p>
          <p class="microcopy">PAIRING STATION</p>
        </div>
      </div>
      <a class="return-link" href="/">遙控頁</a>
    </header>

    <section class="connect-intro" aria-labelledby="connect-title">
      <h1 id="connect-title">掃描後開始控制</h1>
      <p>請使用與 Server 位於同一私人網路的手機相機掃描 QR Code。配對連結只會在手機上保存 Token。</p>
    </section>

    <p v-if="isLoading" class="connect-status" role="status">正在準備配對 QR Code</p>

    <section v-else-if="errorMessage" class="connect-error" role="alert" aria-labelledby="connect-error-title">
      <h2 id="connect-error-title">QR Code 尚未準備完成</h2>
      <p>{{ errorMessage }}</p>
      <button class="secondary-button" type="button" @click="loadPairingCodes">重新載入</button>
    </section>

    <section v-else class="qr-sheet" aria-label="配對 QR Code">
      <p v-if="hasMultipleCodes" class="connect-note">選擇與手機相同網路的連線</p>
      <ol class="qr-list">
        <li v-for="(pairingCode, index) in pairingCodes" :key="pairingCode.url" class="qr-entry">
          <div class="qr-plate">
            <img :src="pairingCode.imageUrl" :alt="`配對 QR Code：${displayAddress(pairingCode.url)}`" />
          </div>
          <div class="qr-caption">
            <span>{{ hasMultipleCodes ? `網路連線 ${index + 1}` : '私人網路連線' }}</span>
            <strong>{{ displayAddress(pairingCode.url) }}</strong>
          </div>
        </li>
      </ol>
    </section>

    <p class="connect-footnote">此頁僅供配對使用。掃描後，請在手機上使用 YouTube Remote。</p>
  </main>
</template>
