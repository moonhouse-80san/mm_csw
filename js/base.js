// Service Worker 등록 (에러 핸들링 추가)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('✅ Service Worker 등록 성공:', registration.scope);
                
                // 업데이트 확인
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('🔄 새로운 버전이 있습니다. 페이지를 새로고침하세요.');
                        }
                    });
                });
            })
            .catch(error => {
                console.log('❌ Service Worker 등록 실패:', error);
                // 실패해도 앱은 정상 작동
            });
    });
}

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyD4GrNs2Vw9tSxGHSpKp9MvE8hsJwGo34U",
    authDomain: "mmcsw-880ce.firebaseapp.com",
    databaseURL: "https://mmcsw-880ce-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "mmcsw-880ce",
    storageBucket: "mmcsw-880ce.firebasestorage.app",
    messagingSenderId: "78114283532",
    appId: "1:78114283532:web:7d32e87fae15796e684e29"
};

// 전역 변수
let members = [];
let filteredMembers = [];
let settings = { 
    clubName: '',
    feePresets: [40000, 70000, 100000, 200000, 300000],
    adminPassword: '0000',
    editPassword: '0000',
    lockTimeout: 60,
    coaches: ['', '', '', ''],
    showEmail: true,  // 추가: 이메일 표시 여부
    showBirthYear: true  // 추가: 생년 표시 여부
};
let firebaseDb = null;

// 요일 배열
const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];
const dayNames = {
    '월': '월요일',
    '화': '화요일',
    '수': '수요일',
    '목': '목요일',
    '금': '금요일',
    '토': '토요일',
    '일': '일요일'
};

// Firebase 초기화
try {
    firebase.initializeApp(firebaseConfig);
    firebaseDb = firebase.database();
    loadFromFirebase();
    listenToFirebaseChanges();
} catch (error) {
    console.error('Firebase 초기화 실패:', error);
}

// Firebase 데이터 로드
function loadFromFirebase() {
    firebaseDb.ref('members').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            members = Object.values(data).map(normalizeMember);
            filteredMembers = [...members];
            renderMembers();
            renderSchedule();
        }
    });

    firebaseDb.ref('settings').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            settings.clubName = data.clubName !== undefined ? data.clubName : settings.clubName;
            settings.feePresets = data.feePresets !== undefined ? data.feePresets : settings.feePresets;
            settings.adminPassword = data.adminPassword !== undefined ? data.adminPassword : settings.adminPassword;
            settings.editPassword = data.editPassword !== undefined ? data.editPassword : settings.editPassword;
            settings.lockTimeout = data.lockTimeout !== undefined ? data.lockTimeout : 60;
            settings.coaches = data.coaches !== undefined ? data.coaches : ['', '', '', ''];
            // 추가: 이메일/생년 표시 설정 로드
            settings.showEmail = data.showEmail !== undefined ? data.showEmail : true;
            settings.showBirthYear = data.showBirthYear !== undefined ? data.showBirthYear : true;

            document.getElementById('clubNameDisplay').textContent = settings.clubName || '구장명을 설정하세요';
            updateFeePresetButtons();
            renderCoachButtons();
            // 추가: 설정에 따른 UI 업데이트
            updateFormVisibility();
        } else {
            settings.lockTimeout = 60;
            settings.coaches = ['', '', '', ''];
            settings.showEmail = true;
            settings.showBirthYear = true;
        }
    });
}

// Firebase 변경 감지
function listenToFirebaseChanges() {
    firebaseDb.ref('members').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            members = Object.values(data).map(normalizeMember);

            // 현재 검색/정렬 상태 보존
            const currentSearch = document.getElementById('searchInput').value;
            if (currentSearch) {
                filteredMembers = members.filter(member => {
                    return member.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
                           (member.phone && member.phone.includes(currentSearch));
                });
            } else {
                filteredMembers = [...members];
            }

            sortMembers(currentSort, true);
            renderSchedule();
        }
    });
}

// Firebase에 저장 - 개선된 버전
function saveToFirebase() {
    console.log('saveToFirebase - 저장 시작');
    console.log('saveToFirebase - members 데이터:', JSON.stringify(members, null, 2));
    
    // 객체 정리 함수 - undefined와 함수 제거, schedules 배열 보존
    function cleanObject(obj) {
        if (obj === null || obj === undefined) {
            return null;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => cleanObject(item)).filter(item => item !== undefined);
        }
        
        if (typeof obj === 'object') {
            const cleaned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const value = obj[key];
                    
                    // undefined와 함수는 제외
                    if (value === undefined || typeof value === 'function') {
                        continue;
                    }
                    
                    // null은 그대로 유지
                    if (value === null) {
                        cleaned[key] = null;
                        continue;
                    }
                    
                    // 배열과 객체는 재귀적으로 정리
                    if (Array.isArray(value)) {
                        cleaned[key] = cleanObject(value);
                    } else if (typeof value === 'object') {
                        cleaned[key] = cleanObject(value);
                    } else {
                        cleaned[key] = value;
                    }
                }
            }
            return cleaned;
        }
        
        return obj;
    }

    try {
        // 회원 데이터를 객체로 변환
        const membersObj = {};
        members.forEach((member, index) => {
            // 각 회원 데이터 정리
            const cleanedMember = cleanObject(member);
            
            // schedules 배열이 제대로 있는지 확인
            if (cleanedMember.schedules) {
                console.log(`회원 ${index} (${cleanedMember.name}) - schedules:`, cleanedMember.schedules);
            }
            
            membersObj[index] = cleanedMember;
        });

        console.log('saveToFirebase - 정리된 membersObj:', JSON.stringify(membersObj, null, 2));

        // Firebase에 저장
        firebaseDb.ref('members').set(membersObj)
            .then(() => {
                console.log('✅ Firebase 저장 성공');
            })
            .catch((error) => {
                console.error('❌ Firebase 저장 실패:', error);
                showAlert('데이터 저장에 실패했습니다: ' + error.message);
            });

        // 설정 저장
        const cleanedSettings = cleanObject(settings);
        firebaseDb.ref('settings').set(cleanedSettings)
            .then(() => {
                console.log('✅ 설정 저장 성공');
            })
            .catch((error) => {
                console.error('❌ 설정 저장 실패:', error);
            });
            
    } catch (error) {
        console.error('❌ saveToFirebase 오류:', error);
        showAlert('데이터 저장 중 오류가 발생했습니다: ' + error.message);
    }
}

// 회원 정규화 헬퍼
function normalizeMember(member) {
    const cleaned = {};
    for (const key in member) {
        if (member[key] !== undefined) {
            // 특정 필드의 데이터 타입 보장
            if (key === 'phone' && member[key] !== null) {
                cleaned[key] = String(member[key]);
            } else if (key === 'name' && member[key] !== null) {
                cleaned[key] = String(member[key]);
            } else if (key === 'coach' && member[key] !== null) {
                cleaned[key] = String(member[key]);
            } else if (key === 'schedules' && Array.isArray(member[key])) {
                // schedules 배열 보존
                cleaned[key] = member[key];
            } else {
                cleaned[key] = member[key];
            }
        }
    }
    
    // 필수 필드 기본값 설정
    if (!cleaned.photo) cleaned.photo = '';
    if (!cleaned.attendanceHistory) cleaned.attendanceHistory = [];
    if (!cleaned.coach) cleaned.coach = '';
    if (!cleaned.paymentHistory) cleaned.paymentHistory = [];
    if (!cleaned.phone) cleaned.phone = '';
    if (!cleaned.schedules) cleaned.schedules = [];
    
    return cleaned;
}

// 회비 프리셋 버튼 업데이트
function updateFeePresetButtons() {
    const feePresetsEl = document.getElementById('feePresets');
    feePresetsEl.innerHTML = '';

    settings.feePresets.forEach((fee, index) => {
        if (fee) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'fee-preset-btn';
            button.textContent = `${formatNumber(fee)}원`;
            button.onclick = () => {
                document.getElementById('fee').value = fee;
            };
            feePresetsEl.appendChild(button);
        }
    });
}

// 숫자 포맷팅 (안전성 추가)
function formatNumber(num) {
    // null, undefined, 빈 문자열 체크
    if (num === null || num === undefined || num === '') {
        return '0';
    }
    // 숫자로 변환
    const number = typeof num === 'number' ? num : parseFloat(num);
    if (isNaN(number)) {
        return '0';
    }
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 날짜 포맷팅
function formatDate(dateString) {
    if (!dateString) return '';
    const [y, m, d] = dateString.split('-');
    return `${y}.${m}.${d}`;
}

// 폼 표시 여부 업데이트 함수
function updateFormVisibility() {
    const emailField = document.querySelector('.form-group:nth-child(8)'); // 이메일 필드
    const birthYearField = document.querySelector('.form-group1:nth-child(2)'); // 생년 필드
    
    if (emailField) {
        emailField.style.display = settings.showEmail ? 'block' : 'none';
    }
    
    if (birthYearField) {
        birthYearField.style.display = settings.showBirthYear ? 'block' : 'none';
    }
}

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    const registerDateEl = document.getElementById('registerDate');
    const targetCountEl = document.getElementById('targetCount');
    const currentCountEl = document.getElementById('currentCount');
    
    // 요소가 존재하는 경우에만 값 설정
    if (registerDateEl) {
        registerDateEl.valueAsDate = new Date();
    }
    if (targetCountEl) {
        targetCountEl.value = "0";
    }
    if (currentCountEl) {
        currentCountEl.value = "0";
    }
    
    updateFeePresetButtons();
    renderCoachButtons();
    
    // 잠금 상태 초기화 및 회원 목록 렌더링
    updateLockStatus();
    
    // Firebase 로딩이 완료되면 회원 목록 렌더링
    // Firebase 로드가 비동기이므로 약간의 지연 후 실행
    setTimeout(() => {
        if (members.length > 0) {
            renderMembers();
            renderSchedule();
        }
        // 추가: 설정에 따른 UI 업데이트
        updateFormVisibility();
    }, 500);
});