// sw.js - Service Worker for 회원 관리 앱

const CACHE_NAME = 'cmcsw-v1.0.0';
const urlsToCache = [
  './',
  './index.html',
  './css/base.css',
  './css/lock.css',
  './css/camera.css',
  './css/member.css',
  './css/calendar.css',
  './css/coach.css',
  './css/responsive.css',
  './js/base.js',
  './js/lock.js',
  './js/modal.js',
  './js/camera.js',
  './js/member.js',
  './js/form.js',
  './js/calendar.js',
  './js/coach.js',
  './js/settings.js',
  './etc/manifest.json'
];

// 설치 이벤트 - 캐시 생성
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 설치 중...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 캐시 파일 저장 중...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] 설치 완료');
        return self.skipWaiting(); // 즉시 활성화
      })
      .catch((error) => {
        console.error('[Service Worker] 캐시 저장 실패:', error);
      })
  );
});

// 활성화 이벤트 - 오래된 캐시 삭제
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 활성화 중...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] 오래된 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] 활성화 완료');
        return self.clients.claim(); // 즉시 제어권 획득
      })
  );
});

// 캐시 가능한 요청인지 확인하는 헬퍼 함수
function isCacheable(request) {
  const url = new URL(request.url);
  
  // 캐시 불가능한 스킴 필터링
  const unsupportedSchemes = ['chrome-extension', 'chrome', 'about', 'data', 'blob'];
  if (unsupportedSchemes.includes(url.protocol.replace(':', ''))) {
    return false;
  }
  
  // Firebase 및 외부 API 제외
  if (url.hostname.includes('firebasedatabase.app') || 
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('cdnjs.cloudflare.com')) {
    return false;
  }
  
  // GET 요청만 캐시
  if (request.method !== 'GET') {
    return false;
  }
  
  return true;
}

// Fetch 이벤트 - 네트워크 우선, 캐시 폴백 전략
self.addEventListener('fetch', (event) => {
  // 캐시 불가능한 요청은 그냥 통과
  if (!isCacheable(event.request)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 유효한 응답이면 캐시에 저장
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              // 캐시 저장 시도 - 실패해도 앱은 계속 작동
              cache.put(event.request, responseToCache).catch((error) => {
                console.warn('[Service Worker] 캐시 저장 실패:', event.request.url, error);
              });
            });
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 가져오기
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[Service Worker] 캐시에서 제공:', event.request.url);
              return cachedResponse;
            }
            
            // 캐시에도 없으면 기본 오프라인 응답
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            
            // 그 외의 경우 에러 반환
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// 메시지 이벤트 - 캐시 업데이트 등
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'UPDATE_CACHE') {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => {
          return cache.addAll(urlsToCache);
        })
    );
  }
});