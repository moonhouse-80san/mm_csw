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

            document.getElementById('clubNameDisplay').textContent = settings.clubName || '구장명을 설정하세요';
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

// Firebase에 저장
function saveToFirebase() {
    function cleanObject(obj) {
        const cleaned = {};
        for (const key in obj) {
            if (obj[key] !== undefined) {
                if (obj[key] === null) {
                    cleaned[key] = null;
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

    firebaseDb.ref('members').set(membersObj);
    firebaseDb.ref('settings').set(cleanObject(settings));
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

// 숫자 포맷팅
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 날짜 포맷팅
function formatDate(dateString) {
    if (!dateString) return '';
    const [y, m, d] = dateString.split('-');
    return `${y}.${m}.${d}`;
}

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('registerDate').valueAsDate = new Date();
    document.getElementById('startTime1').value = "12:00";
    document.getElementById('endTime1').value = "12:20";
    document.getElementById('startTime2').value = "12:00";
    document.getElementById('endTime2').value = "12:20";
    document.getElementById('targetCount').value = "0";
    document.getElementById('currentCount').value = "0";
    
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
    }, 500);

});