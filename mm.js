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

let members = [];

// 달력 관련 변수
let currentYear = 2026;
let currentMonth = 0; // 0-11 (1월 = 0)
let selectedDate = null;
let filteredMembers = [];
let currentEditIndex = null;
let deleteIndex = null;
let currentSort = 'name';
let settings = { 
	clubName: '',
	feePresets: [40000, 70000, 100000, 200000, 300000],
	adminPassword: '0000',
	editPassword: '0000', // 수정/삭제용 암호 추가
	lockTimeout: 60 // 자동 잠금 시간 (분)
};
let firebaseDb = null;
let currentPhotoData = null;
let cameraStream = null;
let currentCameraType = 'user';

// 보안 관련 변수
let isUnlocked = false;
let lockTimer = null;
let remainingTime = 60 * 60; // 60분 (초 단위)
let lockInterval = null;

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

// ========== 개선된 보안 기능 ==========

// 잠금 상태 업데이트
function updateLockStatus() {
	const lockStatusEl = document.getElementById('lockStatus');
	const updateBtn = document.getElementById('updateBtn');

	if (isUnlocked) {
		lockStatusEl.innerHTML = `🔓 잠금 해제됨 - ${formatTime(remainingTime)} 후 자동 잠금 <span class="lock-timer" id="lockTimer"></span>`;
		lockStatusEl.classList.remove('locked');
		lockStatusEl.classList.add('unlocked');

		// 수정 버튼 활성화
		updateBtn.classList.remove('btn-disabled');
		updateBtn.classList.add('btn-update');
		updateBtn.textContent = '수정';

		// 회원 목록의 수정/삭제 버튼 표시
		showMemberButtons();
	} else {
		lockStatusEl.innerHTML = `🔒 잠김 상태 - 수정/삭제 버튼 숨김 <span class="lock-timer" id="lockTimer"></span>`;
		lockStatusEl.classList.remove('unlocked');
		lockStatusEl.classList.add('locked');

		// 수정 버튼 비활성화
		updateBtn.classList.remove('btn-update');
		updateBtn.classList.add('btn-disabled');
		updateBtn.textContent = '수정';

		// 회원 목록의 수정/삭제 버튼 숨기기
		hideMemberButtons();
	}
}

// 잠금 해제
function unlockEditButtons() {
	const password = document.getElementById('lockPassword').value;

	if (!password) {
		showAlert('암호를 입력해주세요!');
		return;
	}

	// 이미 잠금 해제된 상태에서 올바른 암호를 입력하면 즉시 잠금
	if (isUnlocked && password === settings.editPassword) {
		isUnlocked = false;
		remainingTime = settings.lockTimeout * 60;

		// 자동 잠금 타이머 중지
		if (lockInterval) {
			clearInterval(lockInterval);
			lockInterval = null;
		}

		// 암호 입력칸 초기화
		document.getElementById('lockPassword').value = '';

		// 상태 업데이트
		updateLockStatus();

		// 알림 메시지
		showAlert('앱이 잠겼습니다!');
		return;
	}

	if (password === settings.editPassword) {
		isUnlocked = true;
		remainingTime = settings.lockTimeout * 60; // 설정된 시간으로 리셋

		// 자동 잠금 타이머 시작
		startAutoLockTimer();

		// 암호 입력칸 초기화
		document.getElementById('lockPassword').value = '';

		// 상태 업데이트
		updateLockStatus();

		// 알림 메시지
		showAlert(`잠금이 해제되었습니다! ${settings.lockTimeout}분 후 자동으로 잠깁니다.`);

		// 활동 타이머 리셋 함수 연결
		resetLockTimer();
	} else {
		showAlert('암호가 틀렸습니다!');
	}
}

// 자동 잠금 타이머 시작
function startAutoLockTimer() {
	if (lockInterval) {
		clearInterval(lockInterval);
	}

	lockInterval = setInterval(() => {
		remainingTime--;

		// 타이머 업데이트
		updateTimerDisplay();

		if (remainingTime <= 0) {
			lockEditButtons();
		}
	}, 1000);
}

// 타이머 표시 업데이트
function updateTimerDisplay() {
	if (isUnlocked) {
		document.getElementById('lockTimer').textContent = `(${formatTime(remainingTime)})`;
	} else {
		document.getElementById('lockTimer').textContent = '';
	}
}

// 시간 형식화 (MM:SS)
function formatTime(seconds) {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 잠금
function lockEditButtons() {
	isUnlocked = false;

	if (lockInterval) {
		clearInterval(lockInterval);
		lockInterval = null;
	}

	updateLockStatus();
	showAlert('자동 잠금되었습니다. 다시 암호를 입력해주세요.');
}

// 타이머 리셋 (활동 감지)
function resetLockTimer() {
	if (isUnlocked) {
		remainingTime = settings.lockTimeout * 60; // 설정된 시간으로 리셋
		updateTimerDisplay();
	}
}

// 회원 목록의 수정/삭제 버튼 숨기기
function hideMemberButtons() {
	document.querySelectorAll('.btn-edit, .btn-delete, .btn-edit-disabled, .btn-delete-disabled').forEach(btn => {
		btn.classList.add('btn-hidden');
	});
}

// 회원 목록의 수정/삭제 버튼 표시하기
function showMemberButtons() {
	document.querySelectorAll('.btn-edit, .btn-delete').forEach(btn => {
		btn.classList.remove('btn-hidden');
	});
}

// 수정 전 잠금 확인
function checkLockBeforeUpdate() {
	if (!isUnlocked) {
		showAlert('수정 기능을 사용하려면 먼저 잠금을 해제해주세요!');
		document.getElementById('lockPassword').focus();
		return false;
	}
	resetLockTimer(); // 활동 감지 - 타이머 리셋
	updateMember();
	return true;
}

// 삭제 전 잠금 확인
function checkLockBeforeDelete(index) {
	if (!isUnlocked) {
		showAlert('삭제 기능을 사용하려면 먼저 잠금을 해제해주세요!');
		document.getElementById('lockPassword').focus();
		return false;
	}
	resetLockTimer(); // 활동 감지 - 타이머 리셋
	showDeleteModal(index);
	return true;
}

// 현재 수정 중인 회원의 출석 초기화
function resetCurrentAttendance() {
	if (!isUnlocked) {
		showAlert('먼저 잠금을 해제해주세요!');
		return;
	}

	if (currentEditIndex === null) {
		showAlert('먼저 수정할 회원을 선택해주세요!');
		return;
	}

	if (confirm('현재 회원의 출석 횟수를 초기화하시겠습니까?')) {
		const member = members[currentEditIndex];
		member.currentCount = 0;
		member.attendanceDates = [];
		
		// 현재 출석 횟수 입력창 업데이트
		document.getElementById('currentCount').value = 0;
		
		// 저장 및 화면 업데이트
		saveToFirebase();
		renderMembers();
		
		// 달력이 열려있으면 다시 렌더링
		const calendar = document.getElementById('formCalendar');
		if (calendar.style.display !== 'none') {
			renderFormCalendar();
		}
		
		showAlert(`${member.name} 회원의 출석이 만료되었습니다. (0/${member.targetCount || 0}회)`);
		resetLockTimer();
	}
}

// 카메라 전환 함수
function switchCamera(cameraType) {
	currentCameraType = cameraType;

	document.getElementById('frontCameraBtn').classList.toggle('active', cameraType === 'user');
	document.getElementById('rearCameraBtn').classList.toggle('active', cameraType === 'environment');

	restartCamera();
}

// 카메라 재시작
async function restartCamera() {
	if (cameraStream) {
		cameraStream.getTracks().forEach(track => track.stop());
	}

	try {
		const constraints = {
			video: {
				facingMode: currentCameraType,
				width: { ideal: 1280 },
				height: { ideal: 1280 }
			},
			audio: false
		};

		cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
		const video = document.getElementById('cameraVideo');
		video.srcObject = cameraStream;

		if (currentCameraType === 'user') {
			video.style.transform = 'scaleX(-1)';
		} else {
			video.style.transform = 'none';
		}
		
	} catch (error) {
		console.error('카메라 재시작 실패:', error);
		showAlert('카메라에 접근할 수 없습니다.');
	}
}

// 카메라 열기
async function openCamera() {
	try {
		const constraints = {
			video: {
				facingMode: currentCameraType,
				width: { ideal: 1280 },
				height: { ideal: 1280 }
			},
			audio: false
		};

		cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
		const video = document.getElementById('cameraVideo');
		video.srcObject = cameraStream;

		if (currentCameraType === 'user') {
			video.style.transform = 'scaleX(-1)';
		}

		document.getElementById('cameraModal').classList.add('active');

	} catch (error) {
		console.error('카메라 접근 실패:', error);
		showAlert('카메라에 접근할 수 없습니다. 갤러리에서 사진을 선택해주세요.');
		document.getElementById('photoInput').click();
	}
}

// 카메라 닫기
function closeCamera() {
	if (cameraStream) {
		cameraStream.getTracks().forEach(track => track.stop());
		cameraStream = null;
	}

	const video = document.getElementById('cameraVideo');
	video.srcObject = null;
	video.style.transform = '';
	document.getElementById('cameraModal').classList.remove('active');
}

// 사진 찍기
function capturePhoto() {
	const video = document.getElementById('cameraVideo');
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');

	canvas.width = 400;
	canvas.height = 400;

	const videoAspect = video.videoWidth / video.videoHeight;
	const canvasAspect = 1;

	let drawWidth, drawHeight, offsetX, offsetY;

	if (videoAspect > canvasAspect) {
		drawHeight = video.videoHeight;
		drawWidth = video.videoHeight * canvasAspect;
		offsetX = (video.videoWidth - drawWidth) / 2;
		offsetY = 0;
	} else {
		drawWidth = video.videoWidth;
		drawHeight = video.videoWidth / canvasAspect;
		offsetX = 0;
		offsetY = (video.videoHeight - drawHeight) / 2;
	}

	context.drawImage(
		video, 
		offsetX, offsetY, drawWidth, drawHeight,
		0, 0, canvas.width, canvas.height
	);

	if (currentCameraType === 'user') {
		const tempCanvas = document.createElement('canvas');
		const tempContext = tempCanvas.getContext('2d');
		tempCanvas.width = canvas.width;
		tempCanvas.height = canvas.height;

		tempContext.translate(canvas.width, 0);
		tempContext.scale(-1, 1);
		tempContext.drawImage(canvas, 0, 0);

		context.clearRect(0, 0, canvas.width, canvas.height);
		context.drawImage(tempCanvas, 0, 0);
	}

	canvas.toBlob((blob) => {
		if (blob) {
			const reader = new FileReader();
			reader.onload = function(e) {
				currentPhotoData = e.target.result;
				displayPhotoPreview();
				closeCamera();
				showAlert('사진이 촬영되었습니다!');
			};
			reader.readAsDataURL(blob);
		}
	}, 'image/jpeg', 0.8);
}

// 사진 업로드 처리
function handlePhotoUpload(event) {
	const file = event.target.files[0];
	if (!file) return;

	if (file.size > 5 * 1024 * 1024) {
		showAlert('사진 크기는 5MB 이하여야 합니다.');
		return;
	}

	const reader = new FileReader();
	reader.onload = function(e) {
		const img = new Image();
		img.onload = function() {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');

			canvas.width = 400;
			canvas.height = 400;

			const scale = Math.max(
				400 / img.width,
				400 / img.height
			);

			const newWidth = img.width * scale;
			const newHeight = img.height * scale;
			const x = (400 - newWidth) / 2;
			const y = (400 - newHeight) / 2;

			ctx.drawImage(img, x, y, newWidth, newHeight);

			currentPhotoData = canvas.toDataURL('image/jpeg', 0.8);
			displayPhotoPreview();
			showAlert('사진이 업로드되었습니다!');
		};
		img.src = e.target.result;
	};
	reader.readAsDataURL(file);
}

// 사진 미리보기 표시
function displayPhotoPreview() {
	const container = document.getElementById('photoPreviewContainer');
	const preview = document.getElementById('photoPreview');

	if (currentPhotoData) {
		preview.src = currentPhotoData;
		container.style.display = 'block';
	} else {
		container.style.display = 'none';
	}
}

// 사진 삭제
function removePhoto() {
	currentPhotoData = null;
	displayPhotoPreview();
	document.getElementById('photoInput').value = '';
}

function loadFromFirebase() {
	firebaseDb.ref('members').once('value', (snapshot) => {
		const data = snapshot.val();
		if (data) {
			// undefined 값 정리
			members = Object.values(data).map(member => {
				const cleaned = {};
				for (const key in member) {
					if (member[key] !== undefined) {
						cleaned[key] = member[key];
					}
				}
				// photo가 없으면 빈 문자열로 설정
				if (!cleaned.photo) {
					cleaned.photo = '';
				}
				return cleaned;
			});
			filteredMembers = [...members];
			renderMembers();
			renderSchedule();
		}
	});

	firebaseDb.ref('settings').once('value', (snapshot) => {
		const data = snapshot.val();
		if (data) {
			// settings를 완전히 덮어쓰기
			settings.clubName = data.clubName !== undefined ? data.clubName : settings.clubName;
			settings.feePresets = data.feePresets !== undefined ? data.feePresets : settings.feePresets;
			settings.adminPassword = data.adminPassword !== undefined ? data.adminPassword : settings.adminPassword;
			settings.editPassword = data.editPassword !== undefined ? data.editPassword : settings.editPassword;
			settings.lockTimeout = data.lockTimeout !== undefined ? data.lockTimeout : 60;

			document.getElementById('clubNameDisplay').textContent = settings.clubName || '구장명을 설정하세요';
			updateFeePresetButtons();

			// 초기 잠금 상태 설정
			remainingTime = settings.lockTimeout * 60;
			updateLockStatus();
		} else {
			// Firebase에 설정 데이터가 없는 경우 기본값 설정
			settings.lockTimeout = 60;
		}
	});
}

function listenToFirebaseChanges() {
	firebaseDb.ref('members').on('value', (snapshot) => {
		const data = snapshot.val();
		if (data) {
			// undefined 값 정리
			members = Object.values(data).map(member => {
				const cleaned = {};
				for (const key in member) {
					if (member[key] !== undefined) {
						cleaned[key] = member[key];
					}
				}
				// photo가 없으면 빈 문자열로 설정
				if (!cleaned.photo) {
					cleaned.photo = '';
				}
				return cleaned;
			});
			filteredMembers = [...members];
			renderMembers();
			renderSchedule();
		}
	});
}

function saveToFirebase() {
	// undefined 값을 제거하는 헬퍼 함수
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
		// 각 회원 데이터에서 undefined 제거
		membersObj[index] = cleanObject(member);
	});

	firebaseDb.ref('members').set(membersObj);
	firebaseDb.ref('settings').set(cleanObject(settings));
}

function checkTimeConflict(day1, startTime1, endTime1, day2, startTime2, endTime2, excludeIndex = null) {
	for (let i = 0; i < members.length; i++) {
		if (excludeIndex !== null && i === excludeIndex) continue;

		const member = members[i];

		if (member.day1 === day1 && member.startTime1 && member.endTime1) {
			if ((startTime1 >= member.startTime1 && startTime1 < member.endTime1) ||
				(endTime1 > member.startTime1 && endTime1 <= member.endTime1) ||
				(startTime1 <= member.startTime1 && endTime1 >= member.endTime1)) {
				return {
					conflict: true,
					memberName: member.name,
					existingTime: `${dayNames[member.day1]} ${member.startTime1}~${member.endTime1}`
				};
			}
		}

		if (member.day2 === day1 && member.startTime2 && member.endTime2) {
			if ((startTime1 >= member.startTime2 && startTime1 < member.endTime2) ||
				(endTime1 > member.startTime2 && endTime1 <= member.endTime2) ||
				(startTime1 <= member.startTime2 && endTime1 >= member.endTime2)) {
				return {
					conflict: true,
					memberName: member.name,
					existingTime: `${dayNames[member.day2]} ${member.startTime2}~${member.endTime2}`
				};
			}
		}

		if (day2) {
			if (member.day1 === day2 && member.startTime1 && member.endTime1) {
				if ((startTime2 >= member.startTime1 && startTime2 < member.endTime1) ||
					(endTime2 > member.startTime1 && endTime2 <= member.endTime1) ||
					(startTime2 <= member.startTime1 && endTime2 >= member.endTime1)) {
					return {
						conflict: true,
						memberName: member.name,
						existingTime: `${dayNames[member.day1]} ${member.startTime1}~${member.endTime1}`
					};
				}
			}

			if (member.day2 === day2 && member.startTime2 && member.endTime2) {
				if ((startTime2 >= member.startTime2 && startTime2 < member.endTime2) ||
					(endTime2 > member.startTime2 && endTime2 <= member.endTime2) ||
					(startTime2 <= member.startTime2 && endTime2 >= member.endTime2)) {
					return {
						conflict: true,
						memberName: member.name,
						existingTime: `${dayNames[member.day2]} ${member.startTime2}~${member.endTime2}`
					};
				}
			}
		}
	}
	return { conflict: false };
}

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

function searchMembers() {
	const searchTerm = document.getElementById('searchInput').value.toLowerCase();

	if (searchTerm === '') {
		filteredMembers = [...members];
	} else {
		filteredMembers = members.filter(member => {
			return member.name.toLowerCase().includes(searchTerm) ||
				   (member.phone && member.phone.includes(searchTerm));
		});
	}

	sortMembers(currentSort);
}

function sortMembers(sortBy) {
	currentSort = sortBy;

	document.querySelectorAll('.filter-btn').forEach(btn => {
		btn.classList.remove('active');
	});
	event.target.classList.add('active');

	switch(sortBy) {
		case 'name':
			filteredMembers.sort((a, b) => a.name.localeCompare(b.name));
			break;
		case 'registerDate':
			filteredMembers.sort((a, b) => {
				if (!a.registerDate) return 1;
				if (!b.registerDate) return -1;
				return new Date(b.registerDate) - new Date(a.registerDate);
			});
			break;
		case 'fee':
			filteredMembers.sort((a, b) => (b.fee || 0) - (a.fee || 0));
			break;
	}

	renderMembers();
}

function renderMembers() {
	const listEl = document.getElementById('listSection');
	const countEl = document.getElementById('memberCount');

	countEl.textContent = members.length;

	if (filteredMembers.length === 0) {
		listEl.innerHTML = `
			<div class="empty-state">
				<svg fill="currentColor" viewBox="0 0 20 20">
					<path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
				</svg>
				<p>${document.getElementById('searchInput').value ? '검색 결과가 없습니다' : '등록된 회원이 없습니다'}</p>
			</div>
		`;
		return;
	}

	listEl.innerHTML = filteredMembers.map((member, index) => {
		const originalIndex = members.indexOf(member);
		const phoneLink = member.phone ? 
			`<div><a href="tel:${member.phone.replace(/-/g, '')}" class="phone-link">📞 ${member.phone}</a></div>` : '';

		let scheduleBadges = '';
		if (member.day1 && member.startTime1 && member.endTime1) {
			scheduleBadges += `<span class="schedule-badge">${dayNames[member.day1]} ${member.startTime1}~${member.endTime1}</span>`;
		}
		if (member.day2 && member.startTime2 && member.endTime2) {
			scheduleBadges += `<span class="schedule-badge">${dayNames[member.day2]} ${member.startTime2}~${member.endTime2}</span>`;
		}
		const currentCount = member.currentCount || 0;
		const targetCount = member.targetCount || 0;

		// 출석 횟수 표시
		let attendanceCount = '';
		if (targetCount > 0) {
			attendanceCount = `
				<span class="attendance-count" style="margin-left: 8px; font-size: 12px; padding: 2px 6px; background: #e3f2fd; border-radius: 10px;">
					📊 ${currentCount}/${targetCount}회
				</span>
			`;
		}

		// 버튼 숨김/표시 처리
		const editBtnClass = isUnlocked ? 'btn-edit' : 'btn-edit btn-hidden';
		const deleteBtnClass = isUnlocked ? 'btn-delete' : 'btn-delete btn-hidden';

		return `
		<div class="member-card">
			<div class="member-content">
				<div class="member-header">
					<div class="member-name" style="cursor: pointer; color: #2196F3; text-decoration: underline;" 
						 onclick="showMemberDetails(${originalIndex})">
						${member.name}
						${attendanceCount}
					</div>
					<div class="member-actions">
						<button class="${editBtnClass}" data-index="${originalIndex}" onclick="editMember(${originalIndex}); resetLockTimer();">
							수정
						</button>
						<button class="${deleteBtnClass}" data-index="${originalIndex}" onclick="checkLockBeforeDelete(${originalIndex});">
							삭제
						</button>
					</div>
				</div>
				<div class="member-info">
					${phoneLink}
					${scheduleBadges ? `<div class="schedule-container">${scheduleBadges}</div>` : ''}
				</div>
			</div>
		</div>
	`}).join('');
}

// 회원 상세 정보 팝업 표시 함수 추가
function showMemberDetails(index) {
	const member = members[index];
	
	let detailsHTML = `
		<div class="member-details-modal">
			<div class="member-details-header">
				<h2>${member.name}</h2>
				<button class="close-btn" onclick="closeMemberDetails()">×</button>
			</div>
			
			<div class="member-details-content">
	`;
	
	// 사진 표시
	if (member.photo) {
		detailsHTML += `
			<div class="member-details-photo">
				<img src="${member.photo}" alt="${member.name}" style="width: 200px; height: 200px; border-radius: 10px; object-fit: cover; margin-bottom: 20px;">
			</div>
		`;
	}
	
	// 기본 정보
	detailsHTML += `
		<div class="member-details-section">
			<h3>기본 정보</h3>
			<table class="member-details-table">
	`;
	
	if (member.phone) {
		detailsHTML += `<tr><td>📞 전화번호:</td><td><a href="tel:${member.phone.replace(/-/g, '')}">${member.phone}</a></td></tr>`;
	}
	
	if (member.email) {
		detailsHTML += `<tr><td>📧 이메일:</td><td>${member.email}</td></tr>`;
	}
	
	if (member.address) {
		detailsHTML += `<tr><td>📍 주소:</td><td>${member.address}</td></tr>`;
	}
	
	if (member.registerDate) {
		detailsHTML += `<tr><td>📅 등록일:</td><td>${formatDate(member.registerDate)}</td></tr>`;
	}
	
	if (member.fee) {
		detailsHTML += `<tr><td>💰 월회비:</td><td>${formatNumber(member.fee)}원</td></tr>`;
	}
	
	// 출석 정보
	const targetCount = member.targetCount || 0;
	const currentCount = member.currentCount || 0;
	if (targetCount > 0) {
		detailsHTML += `<tr><td>📊 출석:</td><td>${currentCount}/${targetCount}회</td></tr>`;
	}
	
	detailsHTML += `
			</table>
		</div>
	`;
	
	// 스케줄 정보
	if (member.day1 && member.startTime1 && member.endTime1 || 
		member.day2 && member.startTime2 && member.endTime2) {
		detailsHTML += `
			<div class="member-details-section">
				<h3>스케줄</h3>
				<table class="member-details-table">
		`;
		
		if (member.day1 && member.startTime1 && member.endTime1) {
			detailsHTML += `<tr><td>📅 스케줄 1:</td><td>${dayNames[member.day1]} ${member.startTime1}~${member.endTime1}</td></tr>`;
		}
		
		if (member.day2 && member.startTime2 && member.endTime2) {
			detailsHTML += `<tr><td>📅 스케줄 2:</td><td>${dayNames[member.day2]} ${member.startTime2}~${member.endTime2}</td></tr>`;
		}
		
		detailsHTML += `
				</table>
			</div>
		`;
	}
	
	// 출석 기록
	if (member.attendanceDates && member.attendanceDates.length > 0) {
		detailsHTML += `
			<div class="member-details-section">
				<h3>출석 기록 (최근 ${Math.min(member.attendanceDates.length, 10)}건)</h3>
				<div class="attendance-dates">
		`;
		
		const recentDates = [...member.attendanceDates].reverse().slice(0, 10);
		recentDates.forEach(date => {
			const formattedDate = formatDate(date);
			detailsHTML += `<span class="attendance-date-badge">${formattedDate}</span>`;
		});
		
		detailsHTML += `
				</div>
			</div>
		`;
	}
	
	detailsHTML += `
			</div>
			<div class="member-details-footer">
				<button class="btn btn-edit" onclick="editMember(${index}); closeMemberDetails();">수정</button>
				<button class="btn btn-secondary" onclick="closeMemberDetails()">닫기</button>
			</div>
		</div>
	`;
	
	// 모달 생성 및 표시
	const modal = document.createElement('div');
	modal.id = 'memberDetailsModal';
	modal.className = 'modal active';
	modal.innerHTML = detailsHTML;
	document.body.appendChild(modal);
	
	// 모달 닫기 이벤트
	modal.addEventListener('click', function(e) {
		if (e.target === modal) {
			closeMemberDetails();
		}
	});
	
	resetLockTimer();
}

// 회원 상세 정보 팝업 닫기 함수
function closeMemberDetails() {
	const modal = document.getElementById('memberDetailsModal');
	if (modal) {
		modal.remove();
	}
}

function renderSchedule() {
	const scheduleEl = document.getElementById('scheduleContent');

	const scheduleByDay = {};
	daysOfWeek.forEach(day => {
		scheduleByDay[day] = [];
	});

	members.forEach(member => {
		if (member.day1 && member.startTime1 && member.endTime1) {
			scheduleByDay[member.day1].push({
				name: member.name,
				startTime: member.startTime1,
				endTime: member.endTime1
			});
		}
		if (member.day2 && member.startTime2 && member.endTime2) {
			scheduleByDay[member.day2].push({
				name: member.name,
				startTime: member.startTime2,
				endTime: member.endTime2
			});
		}
	});

	let scheduleHTML = '';
	
	daysOfWeek.forEach(day => {
		const dayMembers = scheduleByDay[day];

		const timeSlots = {};
		dayMembers.forEach(member => {
			const timeKey = `${member.startTime}-${member.endTime}`;
			if (!timeSlots[timeKey]) {
				timeSlots[timeKey] = {
					startTime: member.startTime,
					endTime: member.endTime,
					members: []
				};
			}
			timeSlots[timeKey].members.push(member.name);
		});

		const sortedTimeSlots = Object.values(timeSlots).sort((a, b) => {
			return a.startTime.localeCompare(b.startTime);
		});

		scheduleHTML += `
			<div class="day-schedule">
				<div class="day-header">
					<div class="day-name">
						${dayNames[day]}
						<span class="day-count">${dayMembers.length}명</span>
					</div>
				</div>
		`;

		if (sortedTimeSlots.length === 0) {
			scheduleHTML += `
				<div class="no-schedule">
					등록된 스케줄이 없습니다
				</div>
			`;
		} else {
			sortedTimeSlots.forEach(slot => {
				scheduleHTML += `
					<div class="time-slot">
						<div class="time-range">${slot.startTime} ~ ${slot.endTime}</div>
						<div class="time-members">
							${slot.members.map(name => `<span class="time-member">${name}</span>`).join('')}
						</div>
					</div>
				`;
			});
		}

		scheduleHTML += `</div>`;
	});
	
	scheduleEl.innerHTML = scheduleHTML;
}

function formatDate(dateString) {
	const date = new Date(dateString);
	return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function formatNumber(num) {
	return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function addMember() {
	const name = document.getElementById('name').value.trim();
	const phone = document.getElementById('phone').value.trim();
	const registerDate = document.getElementById('registerDate').value;
	const fee = document.getElementById('fee').value;
	const day1 = document.getElementById('day1').value;
	const startTime1 = document.getElementById('startTime1').value;
	const endTime1 = document.getElementById('endTime1').value;
	const day2 = document.getElementById('day2').value;
	const startTime2 = document.getElementById('startTime2').value;
	const endTime2 = document.getElementById('endTime2').value;
	const email = document.getElementById('email').value.trim();
	const address = document.getElementById('address').value.trim();

	if (!name) {
		showAlert('이름을 입력해주세요!');
		return;
	}

	const schedules = [];
	
	if (day1 && startTime1 && endTime1) {
		if (startTime1 >= endTime1) {
			showAlert('첫 번째 스케줄의 종료시간은 시작시간보다 커야 합니다!');
			return;
		}
		schedules.push({ day: day1, startTime: startTime1, endTime: endTime1 });
	}

	if (day2 && startTime2 && endTime2) {
		if (startTime2 >= endTime2) {
			showAlert('두 번째 스케줄의 종료시간은 시작시간보다 커야 합니다!');
			return;
		}
		schedules.push({ day: day2, startTime: startTime2, endTime: endTime2 });
	}

	for (const schedule of schedules) {
		const conflict = checkTimeConflict(
			schedule.day, 
			schedule.startTime, 
			schedule.endTime,
			null, null, null
		);
		if (conflict.conflict) {
			showAlert(`시간 충돌! ${conflict.memberName} 회원이 이미 ${conflict.existingTime}에 등록되어 있습니다.`);
			return;
		}
	}

	// 출석 관련 필드 처리
	const targetCountInput = document.getElementById('targetCount').value;
	const currentCountInput = document.getElementById('currentCount').value;
	
	const targetCount = targetCountInput === "" ? 0 : parseInt(targetCountInput) || 0;
	const currentCount = currentCountInput === "" ? 0 : parseInt(currentCountInput) || 0;

	const member = {
		name,
		phone,
		photo: currentPhotoData || '',
		registerDate: registerDate || new Date().toISOString().split('T')[0],
		fee: fee ? parseInt(fee) : null,
		targetCount: targetCount,
		currentCount: currentCount,
		attendanceDates: [],
		day1: day1 || null,
		startTime1: startTime1 || null,
		endTime1: endTime1 || null,
		day2: day2 || null,
		startTime2: startTime2 || null,
		endTime2: endTime2 || null,
		email,
		address
	};

	members.push(member);
	saveToFirebase();
	filteredMembers = [...members];
	renderMembers();
	renderSchedule();
	clearForm();
	showAlert('회원이 추가되었습니다!');
}

function updateMember() {
	if (currentEditIndex === null) {
		showAlert('수정할 회원을 선택해주세요!');
		return;
	}

	const name = document.getElementById('name').value.trim();
	const phone = document.getElementById('phone').value.trim();
	const registerDate = document.getElementById('registerDate').value;
	const fee = document.getElementById('fee').value;
	const day1 = document.getElementById('day1').value;
	const startTime1 = document.getElementById('startTime1').value;
	const endTime1 = document.getElementById('endTime1').value;
	const day2 = document.getElementById('day2').value;
	const startTime2 = document.getElementById('startTime2').value;
	const endTime2 = document.getElementById('endTime2').value;
	const email = document.getElementById('email').value.trim();
	const address = document.getElementById('address').value.trim();

	if (!name) {
		showAlert('이름을 입력해주세요!');
		return;
	}

	const schedules = [];

	if (day1 && startTime1 && endTime1) {
		if (startTime1 >= endTime1) {
			showAlert('첫 번째 스케줄의 종료시간은 시작시간보다 커야 합니다!');
			return;
		}
		schedules.push({ day: day1, startTime: startTime1, endTime: endTime1 });
	}

	if (day2 && startTime2 && endTime2) {
		if (startTime2 >= endTime2) {
			showAlert('두 번째 스케줄의 종료시간은 시작시간보다 커야 합니다!');
			return;
		}
		schedules.push({ day: day2, startTime: startTime2, endTime: endTime2 });
	}

	for (const schedule of schedules) {
		const conflict = checkTimeConflict(
			schedule.day, 
			schedule.startTime, 
			schedule.endTime,
			null, null, null,
			currentEditIndex
		);
		if (conflict.conflict) {
			showAlert(`시간 충돌! ${conflict.memberName} 회원이 이미 ${conflict.existingTime}에 등록되어 있습니다.`);
			return;
		}
	}

	// 출석 관련 필드 처리 - 수정 시 빈 값이면 기존 값 유지
	const targetCountInput = document.getElementById('targetCount').value;
	const currentCountInput = document.getElementById('currentCount').value;
	
	const targetCount = targetCountInput === "" ? 
					   members[currentEditIndex].targetCount || 0 : 
					   parseInt(targetCountInput) || 0;
	const currentCount = currentCountInput === "" ? 
						members[currentEditIndex].currentCount || 0 : 
						parseInt(currentCountInput) || 0;

	members[currentEditIndex] = {
		name,
		phone,
		photo: currentPhotoData !== null ? currentPhotoData : (members[currentEditIndex].photo || ''),
		registerDate: registerDate || members[currentEditIndex].registerDate,
		fee: fee ? parseInt(fee) : null,
		targetCount: targetCount,
		currentCount: currentCount,
		attendanceDates: members[currentEditIndex].attendanceDates || [],
		day1: day1 || null,
		startTime1: startTime1 || null,
		endTime1: endTime1 || null,
		day2: day2 || null,
		startTime2: startTime2 || null,
		endTime2: endTime2 || null,
		email,
		address
	};

	saveToFirebase();
	filteredMembers = [...members];
	renderMembers();
	renderSchedule();
	clearForm();
	showAlert('회원 정보가 수정되었습니다!');
	resetLockTimer(); // 활동 감지
}

function editMember(index) {
	const member = members[index];
	document.getElementById('name').value = member.name;
	document.getElementById('phone').value = member.phone || '';
	document.getElementById('registerDate').value = member.registerDate || '';
	document.getElementById('fee').value = member.fee || '';
	document.getElementById('day1').value = member.day1 || '';
	document.getElementById('startTime1').value = member.startTime1 || '';
	document.getElementById('endTime1').value = member.endTime1 || '';
	document.getElementById('day2').value = member.day2 || '';
	document.getElementById('startTime2').value = member.startTime2 || '';
	document.getElementById('endTime2').value = member.endTime2 || '';
	document.getElementById('email').value = member.email || '';
	document.getElementById('address').value = member.address || '';
	document.getElementById("targetCount").value = member.targetCount || 0;
	document.getElementById("currentCount").value = member.currentCount || 0;
	if (member.photo) {
		currentPhotoData = member.photo;
		displayPhotoPreview();
	} else {
		removePhoto();
	}

	currentEditIndex = index;
	window.scrollTo({ top: 0, behavior: 'smooth' });
	resetLockTimer(); // 활동 감지
}

function showDeleteModal(index) {
	deleteIndex = index;
	document.getElementById('deleteModal').classList.add('active');
	resetLockTimer(); // 활동 감지
}

function confirmDelete() {
	if (deleteIndex !== null) {
		members.splice(deleteIndex, 1);
		saveToFirebase();
		filteredMembers = [...members];
		renderMembers();
		renderSchedule();
		deleteIndex = null;
		closeModal();
		showAlert('회원이 삭제되었습니다!');
		resetLockTimer(); // 활동 감지
	}
}

function closeModal() {
	document.getElementById('deleteModal').classList.remove('active');
}

function showAlert(message) {
	document.getElementById('alertMessage').textContent = message;
	document.getElementById('alertModal').classList.add('active');
}

function closeAlertModal() {
	document.getElementById('alertModal').classList.remove('active');
}

function clearForm() {
	document.getElementById('name').value = '';
	document.getElementById('phone').value = '';
	document.getElementById('registerDate').value = '';
	document.getElementById('fee').value = '';
	document.getElementById('day1').value = '';
	document.getElementById('startTime1').value = '';
	document.getElementById('endTime1').value = '';
	document.getElementById('day2').value = '';
	document.getElementById('startTime2').value = '';
	document.getElementById('endTime2').value = '';
	document.getElementById('email').value = '';
	document.getElementById('address').value = '';
	document.getElementById("targetCount").value = "0";
	document.getElementById("currentCount").value = "0";

	removePhoto();
	currentEditIndex = null;
	resetLockTimer(); // 활동 감지
}

function switchTab(tabName) {
	document.querySelectorAll('.tab-btn').forEach(btn => {
		btn.classList.remove('active');
	});

	document.querySelectorAll('.schedule-section').forEach(section => {
		section.classList.remove('active');
	});

	if (tabName === 'list') {
		document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
		document.getElementById('listSection').style.display = 'block';
		document.getElementById('scheduleSection').classList.remove('active');
	} else if (tabName === 'schedule') {
		document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
		document.getElementById('listSection').style.display = 'none';
		document.getElementById('scheduleSection').classList.add('active');
		renderSchedule();
	}
	resetLockTimer(); // 활동 감지
}

function openSettings() {
	document.getElementById('passwordInput').value = '';
	document.getElementById('passwordModal').classList.add('active');
}

function closePasswordModal() {
	document.getElementById('passwordModal').classList.remove('active');
}

function checkPassword() {
	const inputPassword = document.getElementById('passwordInput').value;
	if (inputPassword === settings.adminPassword) {
		closePasswordModal();
		openSettingsDialog();
	} else {
		showAlert('비밀번호가 틀렸습니다!');
	}
}

function openSettingsDialog() {
	document.getElementById('clubNameInput').value = settings.clubName || '';
	document.getElementById('lockTimeoutInput').value = settings.lockTimeout || 60;
	document.getElementById('feePreset1').value = settings.feePresets[0] || '';
	document.getElementById('feePreset2').value = settings.feePresets[1] || '';
	document.getElementById('feePreset3').value = settings.feePresets[2] || '';
	document.getElementById('feePreset4').value = settings.feePresets[3] || '';
	document.getElementById('feePreset5').value = settings.feePresets[4] || '';
	document.getElementById('editPassword').value = settings.editPassword || '0000';
	document.getElementById('adminPassword').value = '';
	document.getElementById('settingsModal').classList.add('active');
}

function closeSettings() {
	document.getElementById('settingsModal').classList.remove('active');
}

function saveSettings() {
	settings.clubName = document.getElementById('clubNameInput').value.trim();

	// 자동 잠금 시간 저장
	const lockTimeout = parseInt(document.getElementById('lockTimeoutInput').value);
	if (lockTimeout && lockTimeout >= 1 && lockTimeout <= 120) {
		settings.lockTimeout = lockTimeout;
	} else {
		settings.lockTimeout = 60;
	}

	settings.feePresets = [
		parseInt(document.getElementById('feePreset1').value) || 0,
		parseInt(document.getElementById('feePreset2').value) || 0,
		parseInt(document.getElementById('feePreset3').value) || 0,
		parseInt(document.getElementById('feePreset4').value) || 0,
		parseInt(document.getElementById('feePreset5').value) || 0
	];

	const newEditPassword = document.getElementById('editPassword').value;
	if (newEditPassword) {
		settings.editPassword = newEditPassword;
	}

	const newPassword = document.getElementById('adminPassword').value;
	if (newPassword) {
		settings.adminPassword = newPassword;
	}

	saveToFirebase();
	if (settings.clubName) {
		document.getElementById('clubNameDisplay').textContent = settings.clubName;
	}
	updateFeePresetButtons();
	closeSettings();
	showAlert('설정이 저장되었습니다!');

	// 암호 변경 시 현재 잠금 상태 초기화
	if (newEditPassword || lockTimeout) {
		isUnlocked = false;
		remainingTime = settings.lockTimeout * 60;
		updateLockStatus();
	}
}

function exportData() {
	const data = {
		members: members,
		settings: settings,
		exportDate: new Date().toISOString()
	};

	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `회원데이터_${new Date().toISOString().split('T')[0]}.json`;
	a.click();
	URL.revokeObjectURL(url);
	
	showAlert('데이터가 내보내기되었습니다!');
	resetLockTimer(); // 활동 감지
}

function importData(event) {
	const file = event.target.files[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = function(e) {
		try {
			const data = JSON.parse(e.target.result);
			
			if (data.members) {
				members = data.members;
				filteredMembers = [...members];
				saveToFirebase();
			}

			if (data.settings) {
				if (data.settings.clubName) {
					settings.clubName = data.settings.clubName;
					document.getElementById('clubNameDisplay').textContent = settings.clubName;
				}
				if (data.settings.feePresets) {
					settings.feePresets = data.settings.feePresets;
				}
				if (data.settings.adminPassword) {
					settings.adminPassword = data.settings.adminPassword;
				}
				if (data.settings.editPassword) {
					settings.editPassword = data.settings.editPassword;
				}
				if (data.settings.lockTimeout) {
					settings.lockTimeout = data.settings.lockTimeout;
				}
				updateFeePresetButtons();
			}

			renderMembers();
			renderSchedule();
			closeSettings();
			showAlert('데이터를 성공적으로 가져왔습니다!');

			// 데이터 가져오기 시 잠금 상태 초기화
			isUnlocked = false;
			remainingTime = settings.lockTimeout * 60;
			updateLockStatus();

		} catch (error) {
			showAlert('잘못된 파일 형식입니다!');
		}
	};
	reader.readAsText(file);
}

// 초기화
document.getElementById('registerDate').valueAsDate = new Date();
document.getElementById('startTime1').value = "13:00";
document.getElementById('endTime1').value = "13:20";
document.getElementById('startTime2').value = "13:00";
document.getElementById('endTime2').value = "13:20";
document.getElementById('targetCount').value = "0";
document.getElementById('currentCount').value = "0";

updateFeePresetButtons();
updateLockStatus(); // 초기 잠금 상태 설정

// 활동 감지 이벤트 리스너 추가
document.addEventListener('click', resetLockTimer);
document.addEventListener('keydown', resetLockTimer);
document.addEventListener('scroll', resetLockTimer);

// ========== 출석 관리 함수 ==========

function playNotificationSound() {
	const audio = document.getElementById('notificationSound');
	audio.play().catch(e => console.log('알림음 재생 실패:', e));
}

function showAttendanceAlert(memberName, currentCount, targetCount) {
	const message = `<strong>${memberName}</strong> 회원님<br>현재 출석: <strong>${currentCount}회</strong> / 출석: <strong>${targetCount}회</strong><br><br>회비입금이 임박했습니다!`;
	document.getElementById('attendanceAlertMessage').innerHTML = message;
	document.getElementById('attendanceAlertModal').classList.add('active');
	playNotificationSound();
}

function closeAttendanceAlert() {
	document.getElementById('attendanceAlertModal').classList.remove('active');
}

// 달력 토글
function toggleCalendar() {
	if (members.length === 0) {
		showAlert('등록된 회원이 없습니다.');
		return;
	}
	
	// 목표 횟수가 설정된 회원이 있는지 확인
	const hasMembersWithTarget = members.some(member => {
		const targetCount = member.targetCount || 0;
		return targetCount > 0;
	});
	
	if (!hasMembersWithTarget) {
		showAlert('목표 출석 횟수가 설정된 회원이 없습니다.\n회원 정보에서 목표 출석 횟수를 설정해주세요.');
		return;
	}
	
	const calendar = document.getElementById('formCalendar');
	const toggleText = document.getElementById('calendarToggleText');
	
	if (calendar.style.display === 'none') {
		calendar.style.display = 'block';
		toggleText.textContent = '달력 닫기';
		renderFormCalendar();
	} else {
		calendar.style.display = 'none';
		toggleText.textContent = '달력 열기';
	}
	resetLockTimer();
}

// 달력 렌더링
function renderFormCalendar() {
	const grid = document.getElementById('formCalendarGrid');
	grid.innerHTML = '';

	const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
	document.getElementById('formCalendarTitle').textContent = `${currentYear}년 ${monthNames[currentMonth]}`;

	const dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];
	dayHeaders.forEach(day => {
		const header = document.createElement('div');
		header.className = 'calendar-day-header';
		header.textContent = day;
		grid.appendChild(header);
	});

	const firstDay = new Date(currentYear, currentMonth, 1).getDay();
	const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
	const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

	const today = new Date();
	const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;
	const todayDate = today.getDate();

	// 이전 달 날짜
	for (let i = firstDay - 1; i >= 0; i--) {
		const day = document.createElement('div');
		day.className = 'calendar-day other-month';
		day.innerHTML = `<div class="calendar-day-number">${daysInPrevMonth - i}</div>`;
		grid.appendChild(day);
	}

	// 현재 달 날짜
	for (let date = 1; date <= daysInMonth; date++) {
		const day = document.createElement('div');
		day.className = 'calendar-day';
		
		if (isCurrentMonth && date === todayDate) {
			day.classList.add('today');
		}

		const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;

		// 출석 체크 확인
		let hasAttendance = false;
		members.forEach(member => {
			if (member.attendanceDates && member.attendanceDates.includes(dateStr)) {
				hasAttendance = true;
			}
		});

		if (hasAttendance) {
			day.classList.add('has-attendance');
		}

		day.innerHTML = `
			<div class="calendar-day-number">${date}</div>
			${hasAttendance ? '<div class="calendar-attendance-dot"></div>' : ''}
		`;

		day.onclick = () => selectDate(currentYear, currentMonth, date);
		grid.appendChild(day);
	}

	// 다음 달 날짜
	const remainingCells = 42 - (firstDay + daysInMonth);
	for (let date = 1; date <= remainingCells; date++) {
		const day = document.createElement('div');
		day.className = 'calendar-day other-month';
		day.innerHTML = `<div class="calendar-day-number">${date}</div>`;
		grid.appendChild(day);
	}
}

function previousMonthForm() {
	currentMonth--;
	if (currentMonth < 0) {
		currentMonth = 11;
		currentYear--;
	}
	renderFormCalendar();
}

function nextMonthForm() {
	currentMonth++;
	if (currentMonth > 11) {
		currentMonth = 0;
		currentYear++;
	}
	renderFormCalendar();
}

function selectDate(year, month, date) {
	// 목표 횟수가 설정된 회원이 있는지 확인
	const hasMembersWithTarget = members.some(member => {
		const targetCount = member.targetCount || 0;
		return targetCount > 0;
	});
	
	if (!hasMembersWithTarget) {
		showAlert('목표 출석 횟수가 설정된 회원이 없습니다.\n회원 정보에서 목표 출석 횟수를 설정해주세요.');
		return;
	}

	selectedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
	showAttendanceSelectModal();
}

function showAttendanceSelectModal() {
	const modal = document.getElementById('attendanceSelectModal');
	const list = document.getElementById('memberSelectList');
	const searchInput = document.getElementById('attendanceSearchInput');
	
	// 검색창 초기화
	if (searchInput) {
		searchInput.value = '';
	}
	
	list.innerHTML = '';

	// 목표 횟수가 설정된 회원만 필터링
	const validMembers = members.filter(member => {
		const targetCount = member.targetCount || 0;
		return targetCount > 0; // 목표 횟수가 0보다 큰 회원만
	});

	if (validMembers.length === 0) {
		list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">목표 출석 횟수가 설정된 회원이 없습니다.<br>회원 정보에서 목표 출석 횟수를 설정해주세요.</p>';
		modal.classList.add('active');
		return;
	}

	renderAttendanceMemberList(validMembers);
	modal.classList.add('active');
}

// 출석 회원 목록 렌더링 함수 (재사용)
function renderAttendanceMemberList(membersToShow) {
	const list = document.getElementById('memberSelectList');
	list.innerHTML = '';
	
	if (membersToShow.length === 0) {
		list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">검색 결과가 없습니다.</p>';
		return;
	}

	membersToShow.forEach((member, index) => {
		// 원본 members 배열에서의 인덱스 찾기
		const originalIndex = members.indexOf(member);
		const alreadyChecked = member.attendanceDates && member.attendanceDates.includes(selectedDate);
		const currentCount = member.currentCount || 0;
		const targetCount = member.targetCount || 8;

		const item = document.createElement('div');
		item.style.cssText = 'padding: 15px; border-bottom: 1px solid #e0e0e0; cursor: pointer; transition: background 0.3s;';
		item.innerHTML = `
			<div style="display: flex; align-items: center; gap: 10px;">
				<div style="flex: 1;">
					<div style="font-weight: 600; font-size: 16px;">${member.name}
						<span style="font-size: 13px; color: #666; margin-left:15px;">출석: ${currentCount} / ${targetCount}회</span>
					</div>
				</div>
				<div style="color: ${alreadyChecked ? '#4CAF50' : '#999'}; font-size: 24px;">
					${alreadyChecked ? '✓' : '○'}
				</div>
			</div>
		`;
		
		item.onmouseover = () => item.style.background = '#f8f9fa';
		item.onmouseout = () => item.style.background = 'white';
		item.onclick = () => toggleAttendance(originalIndex); // 원본 인덱스 사용
		
		list.appendChild(item);
	});
}

// 출석 회원 검색 필터링 함수
function filterAttendanceMembers() {
	const searchInput = document.getElementById('attendanceSearchInput');
	const searchTerm = searchInput.value.toLowerCase().trim();
	
	// 목표 횟수가 설정된 회원만 필터링
	let validMembers = members.filter(member => {
		const targetCount = member.targetCount || 0;
		return targetCount > 0;
	});
	
	// 검색어가 있으면 이름으로 필터링
	if (searchTerm) {
		validMembers = validMembers.filter(member => 
			member.name.toLowerCase().includes(searchTerm)
		);
	}
	
	renderAttendanceMemberList(validMembers);
}


function closeAttendanceSelectModal() {
	document.getElementById('attendanceSelectModal').classList.remove('active');
	selectedDate = null;
}

function toggleAttendance(memberIndex) {
	const member = members[memberIndex];

	if (!member.attendanceDates) {
		member.attendanceDates = [];
	}

	const dateIndex = member.attendanceDates.indexOf(selectedDate);

	if (dateIndex === -1) {
		// 출석 추가
		member.attendanceDates.push(selectedDate);
		member.currentCount = (member.currentCount || 0) + 1;

		const targetCount = member.targetCount || 0;

		// 목표 1회 전 알림 (목표가 0보다 큰 경우에만)
		if (targetCount > 0 && member.currentCount === targetCount - 1) {
			showAttendanceAlert(member.name, member.currentCount, targetCount);
		}
		// 목표 도달 시 초기화 (목표가 0보다 큰 경우에만)
		else if (targetCount > 0 && member.currentCount >= targetCount) {
			// 목표 도달 메시지
			showAlert(`${member.name} 회원님 목표 ${targetCount}회를 달성했습니다!`);
			
			// 출석 횟수 초기화
			member.currentCount = 0;
			member.attendanceDates = [];

			// 즉시 저장 및 화면 업데이트
			saveToFirebase();
			renderMembers();
			
			// 초기화 알림
			showAlert(`${member.name} 회원님의 출석 횟수가 초기화되었습니다. (0/${targetCount}회)`);
		} else if (targetCount > 0) {
			// 목표가 설정된 경우
			showAlert(`${member.name} 출석 체크 완료! (${member.currentCount}/${targetCount}회)`);
		} else {
			// 목표가 0인 경우 (출석 관리 제외)
			showAlert(`${member.name} 출석 체크 완료!`);
		}
	} else {
		// 출석 취소
		member.attendanceDates.splice(dateIndex, 1);
		member.currentCount = Math.max(0, (member.currentCount || 0) - 1);
		const targetCount = member.targetCount || 0;
		if (targetCount > 0) {
			showAlert(`${member.name} 출석이 취소되었습니다. (${member.currentCount}/${targetCount}회)`);
		} else {
			showAlert(`${member.name} 출석이 취소되었습니다.`);
		}
	}

	saveToFirebase();
	renderMembers();

	// 달력이 열려있으면 다시 렌더링
	const calendar = document.getElementById('formCalendar');
	if (calendar.style.display !== 'none') {
		renderFormCalendar();
	}

	closeAttendanceSelectModal();
}

// 현재 날짜로 달력 초기화
const now = new Date();
currentYear = now.getFullYear();
currentMonth = now.getMonth();