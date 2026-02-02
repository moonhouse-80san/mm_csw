const CACHE_NAME = 'mm_csw-v1';
const urlsToCache = [
  '/mm_csw/',
  '/mm_csw/index.html',
  '/mm_csw/etc/manifest.json'
];

// 설치 이벤트 - 캐시 생성
self.addEventListener('install', event => {
  console.log('Service Worker: 설치 중...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: 캐시 생성 완료');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.log('Service Worker: 캐시 생성 실패', err);
      })
  );
  // 즉시 활성화
  self.skipWaiting();
});

// 활성화 이벤트 - 오래된 캐시 삭제
self.addEventListener('activate', event => {
  console.log('Service Worker: 활성화 중...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 오래된 캐시 삭제', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 즉시 제어 시작
  return self.clients.claim();
});

// Fetch 이벤트 - 네트워크 우선, 캐시 대체 전략
self.addEventListener('fetch', event => {
  // Firebase 요청은 캐시하지 않음
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('firebasedatabase')) {
    return;
  }

  event.respondWith(
    // 네트워크 우선 시도
    fetch(event.request)
      .then(response => {
        // 응답이 유효하면 캐시에 저장
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 가져오기
        return caches.match(event.request)
          .then(response => {
            if (response) {
              console.log('Service Worker: 캐시에서 제공', event.request.url);
              return response;
            }
            // 캐시에도 없으면 오프라인 페이지 반환 (선택사항)
            return new Response('오프라인입니다. 인터넷 연결을 확인해주세요.', {
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
      })
  );
});

// 메시지 이벤트 - 캐시 업데이트 요청 처리
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }).then(() => {
        console.log('Service Worker: 모든 캐시 삭제 완료');
      })
    );
  }
});

// 백그라운드 동기화 (선택사항)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-members') {
    console.log('Service Worker: 백그라운드 동기화 실행');
    // 여기에 동기화 로직 추가 가능
  }
});

// 푸시 알림 (선택사항)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : '새로운 업데이트가 있습니다',
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%232196F3" width="100" height="100" rx="20"/%3E%3Ctext x="50" y="70" font-size="60" text-anchor="middle" fill="white"%3E👥%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%232196F3" width="100" height="100" rx="20"/%3E%3Ctext x="50" y="70" font-size="60" text-anchor="middle" fill="white"%3E👥%3C/text%3E%3C/svg%3E',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('최세욱탁구클럽 회원관리 앱', options)
  );
});

// 알림 클릭 이벤트
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/mm_csw/')
  );
});

console.log('Service Worker: 로드 완료');