[file name]: base.js
[file content begin]
// Service Worker 등록 (에러 핸들링 추가)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('✅ Service Worker 등록 성공:', registration.scope);
            })
            .catch(error => {
                console.log('❌ Service Worker 등록 실패:', error);
            });
    });
}

// 공유 변수 및 Firebase 설정
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
    coaches: ['', '', '', '']
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
            if (typeof renderMembers === 'function') {
                renderMembers();
            }
            if (typeof renderSchedule === 'function') {
                renderSchedule();
            }
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

            const clubNameDisplay = document.getElementById('clubNameDisplay');
            if (clubNameDisplay) {
                clubNameDisplay.textContent = settings.clubName || '구장명을 설정하세요';
            }
            updateFeePresetButtons();
            renderCoachButtons();
        } else {
            settings.lockTimeout = 60;
            settings.coaches = ['', '', '', ''];
        }
    });
}

// Firebase 변경 감지
function listenToFirebaseChanges() {
    firebaseDb.ref('members').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            members = Object.values(data).map(normalizeMember);

            const searchInput = document.getElementById('searchInput');
            const currentSearch = searchInput ? searchInput.value : '';
            if (currentSearch) {
                filteredMembers = members.filter(member => {
                    return member.name.toLowerCase().includes(currentSearch.toLowerCase()) ||
                           (member.phone && member.phone.includes(currentSearch));
                });
            } else {
                filteredMembers = [...members];
            }

            if (typeof currentSort !== 'undefined') {
                sortMembers(currentSort, true);
            }
            if (typeof renderSchedule === 'function') {
                renderSchedule();
            }
        }
    });
}

// Firebase에 저장
function saveToFirebase() {
    function cleanObject(obj) {
        const cleaned = {};
        for (const key in obj) {
            if (obj[key] !== undefined) {
                if (obj[key] === null) {
                    cleaned[key] = null;
                } else if (Array.isArray(obj[key])) {
                    cleaned[key] = obj[key].map(item => {
                        if (item && typeof item === 'object' && !Array.isArray(item)) {
                            return cleanObject(item);
                        }
                        return item;
                    });
                } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                    cleaned[key] = cleanObject(obj[key]);
                } else {
                    cleaned[key] = obj[key];
                }
            }
        }
        return cleaned;
    }

    const membersObj = {};
    members.forEach((member, index) => {
        membersObj[index] = cleanObject(member);
    });

    console.log('Firebase에 저장할 데이터:', membersObj);
    
    firebaseDb.ref('members').set(membersObj);
    firebaseDb.ref('settings').set(cleanObject(settings));
    
    setTimeout(() => {
        console.log('저장 완료, members 배열 확인:');
        members.forEach((member, index) => {
            console.log(`멤버 ${index} (${member.name}) 스케줄:`, member.schedules);
        });
    }, 1000);
}

// 회원 정규화 헬퍼
function normalizeMember(member) {
    const cleaned = {};
    for (const key in member) {
        if (member[key] !== undefined) {
            if (key === 'phone' && member[key] !== null) {
                cleaned[key] = String(member[key]);
            } else if (key === 'name' && member[key] !== null) {
                cleaned[key] = String(member[key]);
            } else if (key === 'coach' && member[key] !== null) {
                cleaned[key] = String(member[key]);
            } else if (key === 'schedules' && Array.isArray(member[key])) {
                cleaned[key] = member[key].map(schedule => ({
                    id: schedule.id || Date.now() + Math.random(),
                    day: schedule.day || '',
                    startTime: schedule.startTime || '',
                    endTime: schedule.endTime || ''
                }));
            } else {
                cleaned[key] = member[key];
            }
        }
    }
    
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
    if (!feePresetsEl) {
        console.warn('feePresets 엘리먼트를 찾을 수 없습니다');
        return;
    }
    
    feePresetsEl.innerHTML = '';

    settings.feePresets.forEach((fee, index) => {
        if (fee) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'fee-preset-btn';
            button.textContent = `${formatNumber(fee)}원`;
            button.onclick = () => {
                const feeInput = document.getElementById('fee');
                if (feeInput) {
                    feeInput.value = fee;
                }
            };
            feePresetsEl.appendChild(button);
        }
    });
}

// 숫자 포맷팅
function formatNumber(num) {
    if (num === null || num === undefined || num === '') {
        return '0';
    }
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

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const registerDateInput = document.getElementById('registerDate');
        if (registerDateInput) {
            registerDateInput.value = new Date().toISOString().split('T')[0];
        }
        
        const targetCount = document.getElementById('targetCount');
        const currentCount = document.getElementById('currentCount');
        
        if (targetCount && targetCount.value === '') {
            targetCount.value = "0";
        }
        if (currentCount && currentCount.value === '') {
            currentCount.value = "0";
        }
        
        updateFeePresetButtons();
        renderCoachButtons();
        
        if (typeof updateLockStatus === 'function') {
            updateLockStatus();
        }
        
        setTimeout(() => {
            if (members.length > 0 && typeof renderMembers === 'function') {
                renderMembers();
                if (typeof renderSchedule === 'function') {
                    renderSchedule();
                }
            }
        }, 1000);
    }, 500);
});

// 글로벌 currentSort 변수 정의
let currentSort = 'name';
let sortAscending = true;
[file content end]