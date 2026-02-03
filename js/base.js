// Service Worker 등록
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .catch(error => console.log('Service Worker 등록 실패:', error));
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

// 글로벌 변수
let currentSort = 'name';
let sortAscending = true;

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
    if (!firebaseDb) return;
    
    firebaseDb.ref('members').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            members = Object.values(data).map(normalizeMember);
            filteredMembers = [...members];
            if (typeof renderMembers === 'function') renderMembers();
            if (typeof renderSchedule === 'function') renderSchedule();
        }
    });

    firebaseDb.ref('settings').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            settings.clubName = data.clubName || settings.clubName;
            settings.feePresets = data.feePresets || settings.feePresets;
            settings.adminPassword = data.adminPassword || settings.adminPassword;
            settings.editPassword = data.editPassword || settings.editPassword;
            settings.lockTimeout = data.lockTimeout || 60;
            settings.coaches = data.coaches || ['', '', '', ''];

            const clubNameDisplay = document.getElementById('clubNameDisplay');
            if (clubNameDisplay) {
                clubNameDisplay.textContent = settings.clubName || '구장명을 설정하세요';
            }
            updateFeePresetButtons();
            renderCoachButtons();
        }
    });
}

// Firebase 변경 감지
function listenToFirebaseChanges() {
    if (!firebaseDb) return;
    
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

            if (typeof sortMembers === 'function') {
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
    if (!firebaseDb) return;
    
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
    if (!feePresetsEl) return;
    
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
        
        const targetCountInput = document.getElementById('targetCount');
        const currentCountInput = document.getElementById('currentCount');
        
        if (targetCountInput && targetCountInput.value === '') {
            targetCountInput.value = "0";
        }
        if (currentCountInput && currentCountInput.value === '') {
            currentCountInput.value = "0";
        }
        
        updateFeePresetButtons();
        renderCoachButtons();
        
        if (typeof updateLockStatus === 'function') {
            updateLockStatus();
        }
        
        setTimeout(() => {
            if (members.length > 0) {
                if (typeof renderMembers === 'function') renderMembers();
                if (typeof renderSchedule === 'function') renderSchedule();
            }
        }, 1000);
    }, 500);
});

// 코치 버튼 렌더링
function renderCoachButtons() {
    const container = document.getElementById('coachBtnGroup');
    if (!container) return;

    const activeCoaches = settings.coaches.filter(name => name && name.trim() !== '');

    if (activeCoaches.length === 0) {
        container.innerHTML = '<div style="font-size: 13px; color: #999; padding: 8px 0;">코치가 등록되지 않았습니다. 관리자 설정에서 코치를 추가해주세요.</div>';
        return;
    }

    const noneBtn = document.createElement('button');
    noneBtn.type = 'button';
    noneBtn.className = 'coach-btn active';
    noneBtn.dataset.value = '';
    noneBtn.textContent = '미선택';
    noneBtn.onclick = () => selectCoachBtn(noneBtn);
    container.appendChild(noneBtn);

    activeCoaches.forEach((name) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'coach-btn';
        btn.dataset.value = name;
        btn.textContent = name;
        btn.onclick = () => selectCoachBtn(btn);
        container.appendChild(btn);
    });
}

// 코치 버튼 선택 처리
function selectCoachBtn(clickedBtn) {
    document.querySelectorAll('.coach-btn').forEach(btn => btn.classList.remove('active'));
    clickedBtn.classList.add('active');
}

// 선택된 코치 값 가져오기
function getSelectedCoach() {
    const active = document.querySelector('.coach-btn.active');
    return active ? active.dataset.value : '';
}

// 코치 버튼에 값 설정
function setSelectedCoach(coachName) {
    document.querySelectorAll('.coach-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === coachName);
    });
    const hasMatch = document.querySelector(`.coach-btn[data-value="${coachName}"]`);
    if (!hasMatch) {
        const noneBtn = document.querySelector('.coach-btn[data-value=""]');
        if (noneBtn) noneBtn.classList.add('active');
    }
}